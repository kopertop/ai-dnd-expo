import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import { CharacterVoiceRegistry } from './character-voice-registry';
import { VoiceProfileService } from './voice-profiles';

import { cleanTextForTTS } from '@/hooks/use-text-to-speech';
import { Character } from '@/types/character';
import {
	CharacterTTSOptions,
	CharacterTraits,
	CharacterType,
	VoiceProfile,
} from '@/types/voice';


/**
 * Character Voice Manager
 *
 * Manages voice assignment and speech synthesis for characters
 * Integrates with VoiceProfileService and CharacterVoiceRegistry
 */
export class CharacterVoiceManager {
	private static instance: CharacterVoiceManager;
	private isInitialized = false;
	private isSpeaking = false;
	private currentSpeakerId: string | null = null;

	/**
	* Get singleton instance
	*/
	public static getInstance(): CharacterVoiceManager {
		if (!CharacterVoiceManager.instance) {
			CharacterVoiceManager.instance = new CharacterVoiceManager();
		}
		return CharacterVoiceManager.instance;
	}

	/**
	* Private constructor for singleton pattern
	*/
	private constructor() { }

	/**
	* Initialize the voice manager
	*/
	public async initialize(): Promise<boolean> {
		if (this.isInitialized) return true;

		try {
			// Initialize voice registry
			await CharacterVoiceRegistry.initialize();
			this.isInitialized = true;
			return true;
		} catch (error) {
			console.error('Failed to initialize CharacterVoiceManager:', error);
			return false;
		}
	}

	/**
	* Ensure manager is initialized before operations
	*/
	private async ensureInitialized(): Promise<void> {
		if (!this.isInitialized) {
			await this.initialize();
		}
	}

	/**
	* Get character traits from a character object
	*/
	private getCharacterTraits(
		character: Character,
		characterType: CharacterType = 'npc',
	): CharacterTraits {
		// Extract gender from description if available
		let gender: 'male' | 'female' | 'neutral' = 'neutral';
		let personality: string | undefined;

		if (character.description) {
			const desc = character.description.toLowerCase();

			// Simple gender detection from description
			if (desc.includes('he ') || desc.includes('his ') || desc.includes('him ') ||
				desc.includes('male') || desc.includes('man')) {
				gender = 'male';
			} else if (desc.includes('she ') || desc.includes('her ') ||
				desc.includes('female') || desc.includes('woman')) {
				gender = 'female';
			}

			// Extract personality traits from description
			personality = character.description;
		}

		return {
			race: character.race,
			class: character.class,
			gender,
			personality,
			characterType,
		};
	}

	/**
	* Find the best voice profile for a character
	*/
	public async findVoiceForCharacter(
		character: Character,
		characterType: CharacterType = 'npc',
	): Promise<VoiceProfile | null> {
		await this.ensureInitialized();

		// Check if character already has an assigned voice
		const existingAssignment = await CharacterVoiceRegistry.getAssignment(character.id);
		if (existingAssignment) {
			const profile = VoiceProfileService.getProfileById(existingAssignment.voiceId);
			if (profile) {
				return profile;
			}
		}

		// Extract character traits for matching
		const traits = this.getCharacterTraits(character, characterType);

		// Find matching profiles
		const matchingProfiles = VoiceProfileService.findMatchingProfiles(
			characterType,
			{
				race: traits.race,
				class: traits.class,
				gender: traits.gender,
				personality: traits.personality ? [traits.personality] : undefined,
			},
		);

		// Filter to available (unassigned) profiles
		const availableProfiles = matchingProfiles.filter(async profile => {
			return !(await CharacterVoiceRegistry.isVoiceAssigned(profile.id));
		});

		// Return best match or any available profile
		return availableProfiles.length > 0
			? availableProfiles[0]
			: (matchingProfiles.length > 0 ? matchingProfiles[0] : null);
	}

	/**
	* Assign a voice to a character
	*/
	public async assignVoiceToCharacter(
		character: Character,
		characterType: CharacterType = 'npc',
		voiceProfileId?: string,
		isLocked: boolean = false,
	): Promise<VoiceProfile | null> {
		await this.ensureInitialized();

		let voiceProfile: VoiceProfile | null = null;

		// If specific voice ID provided, use that
		if (voiceProfileId) {
			voiceProfile = VoiceProfileService.getProfileById(voiceProfileId) || null;
		}
		// Otherwise find the best match
		else {
			voiceProfile = await this.findVoiceForCharacter(character, characterType);
		}

		if (!voiceProfile) {
			console.warn(`No suitable voice found for character ${character.name}`);
			return null;
		}

		// Save the assignment
		await CharacterVoiceRegistry.setAssignment(
			character.id,
			voiceProfile.id,
			characterType,
			character.name,
			isLocked,
		);

		// Mark profile as assigned
		VoiceProfileService.markProfileAsAssigned(voiceProfile.id, character.id);

		return voiceProfile;
	}

	/**
	* Remove voice assignment from a character
	*/
	public async removeVoiceAssignment(characterId: string): Promise<void> {
		await this.ensureInitialized();

		const assignment = await CharacterVoiceRegistry.getAssignment(characterId);
		if (assignment) {
			VoiceProfileService.markProfileAsUnassigned(assignment.voiceId);
			await CharacterVoiceRegistry.removeAssignment(characterId);
		}
	}

	/**
	* Get voice profile for a character
	*/
	public async getVoiceProfile(characterId: string): Promise<VoiceProfile | null> {
		await this.ensureInitialized();

		const assignment = await CharacterVoiceRegistry.getAssignment(characterId);
		if (!assignment) return null;

		return VoiceProfileService.getProfileById(assignment.voiceId) || null;
	}

	/**
	* Speak text using a character's voice
	*/
	public async speakAsCharacter(
		characterId: string,
		text: string,
		options: Partial<CharacterTTSOptions> = {},
	): Promise<boolean> {
		await this.ensureInitialized();

		// Clean text for better TTS pronunciation
		const cleanText = cleanTextForTTS(text);
		if (!cleanText) return false;

		// Get character's voice profile
		const voiceProfile = await this.getVoiceProfile(characterId);
		if (!voiceProfile) {
			console.warn(`No voice profile found for character ${characterId}`);
			return false;
		}

		// Stop any current speech
		if (this.isSpeaking) {
			Speech.stop();
		}

		try {
			this.isSpeaking = true;
			this.currentSpeakerId = characterId;

			// Track start time for usage statistics
			const startTime = Date.now();

			// Configure speech options
			const speechOptions: Speech.SpeechOptions = {
				language: options.language || voiceProfile.language,
				pitch: options.pitch || voiceProfile.characteristics.pitch,
				rate: options.rate || voiceProfile.characteristics.rate,
				voice: options.voiceId || voiceProfile.engineVoiceId,
				onStart: () => {
					options.onStart?.();
				},
				onDone: () => {
					const usageTime = Date.now() - startTime;
					CharacterVoiceRegistry.updateVoiceUsage(voiceProfile.id, usageTime);
					VoiceProfileService.updateProfileUsage(voiceProfile.id);

					this.isSpeaking = false;
					this.currentSpeakerId = null;
					options.onDone?.();
				},
				onStopped: () => {
					this.isSpeaking = false;
					this.currentSpeakerId = null;
					options.onStopped?.();
				},
				onError: (error: unknown) => {
					this.isSpeaking = false;
					this.currentSpeakerId = null;

					const errorMessage =
						error && typeof error === 'object' && 'message' in error
							? String(error.message)
							: 'Speech synthesis failed';
					console.error('Character TTS Error:', errorMessage);
					options.onError?.(errorMessage);
				},
			};

			Speech.speak(cleanText, speechOptions);
			return true;
		} catch (error) {
			this.isSpeaking = false;
			this.currentSpeakerId = null;

			const errorMessage = error instanceof Error ? error.message : 'Unknown TTS error';
			console.error('Character TTS Error:', errorMessage);
			options.onError?.(errorMessage);

			return false;
		}
	}

	/**
	* Stop current speech
	*/
	public stopSpeaking(): void {
		if (this.isSpeaking) {
			Speech.stop();
			this.isSpeaking = false;
			this.currentSpeakerId = null;
		}
	}

	/**
	* Pause current speech (iOS only)
	*/
	public pauseSpeaking(): void {
		if (this.isSpeaking && Platform.OS === 'ios') {
			Speech.pause();
		}
	}

	/**
	* Resume paused speech (iOS only)
	*/
	public resumeSpeaking(): void {
		if (this.isSpeaking && Platform.OS === 'ios') {
			Speech.resume();
		}
	}

	/**
	* Check if currently speaking
	*/
	public isSpeakingNow(): boolean {
		return this.isSpeaking;
	}

	/**
	* Get ID of character currently speaking
	*/
	public getCurrentSpeakerId(): string | null {
		return this.currentSpeakerId;
	}

	/**
	* Get all available voice profiles
	*/
	public getAllVoiceProfiles(): VoiceProfile[] {
		return VoiceProfileService.getAllProfiles();
	}

	/**
	* Get voice profiles for a specific character type
	*/
	public getVoiceProfilesForType(characterType: CharacterType): VoiceProfile[] {
		return VoiceProfileService.getProfilesForType(characterType);
	}

	/**
	* Create a custom hook for character voice
	*/
	public createCharacterVoiceHook(characterId: string) {
		const manager = this;

		return {
			speak: async (text: string, options: Partial<CharacterTTSOptions> = {}) => {
				return manager.speakAsCharacter(characterId, text, options);
			},
			stop: () => manager.stopSpeaking(),
			pause: () => manager.pauseSpeaking(),
			resume: () => manager.resumeSpeaking(),
			isSpeaking: () => manager.isSpeakingNow() && manager.getCurrentSpeakerId() === characterId,
			getVoiceProfile: async () => manager.getVoiceProfile(characterId),
		};
	}
}
