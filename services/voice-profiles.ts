import { Platform } from 'react-native';

import { CharacterType, VoiceProfile } from '@/types/voice';

/**
 * Pre-defined voice profiles for different character types
 * Includes platform-specific voice identifiers and ChatterboxTTS definitions
 */
export class VoiceProfileService {
	private static profiles: VoiceProfile[] = [
		// Kokoro TTS voices (web and native)
		{
			id: 'kokoro-warrior-deep',
			name: 'kokoro-warrior-deep',
			displayName: 'Kokoro Deep Warrior',
			engine: 'kokoro',
			engineVoiceId: 'warrior-deep',
			language: 'en-US',
			characteristics: {
				gender: 'male',
				age: 'adult',
				pitch: 0.7,
				rate: 0.5,
				quality: 'high',
			},
			suitableFor: ['player', 'npc', 'companion'],
			personality: ['brave', 'strong', 'authoritative', 'warrior', 'fighter', 'paladin'],
			isAssigned: false,
		},
		{
			id: 'kokoro-scholar-wise',
			name: 'kokoro-scholar-wise',
			displayName: 'Kokoro Wise Scholar',
			engine: 'kokoro',
			engineVoiceId: 'scholar-wise',
			language: 'en-US',
			characteristics: {
				gender: 'male',
				age: 'elderly',
				pitch: 0.9,
				rate: 0.4,
				quality: 'high',
			},
			suitableFor: ['player', 'npc', 'companion'],
			personality: ['wise', 'intelligent', 'scholarly', 'wizard', 'cleric', 'sage'],
			isAssigned: false,
		},
		{
			id: 'kokoro-mage-mystical',
			name: 'kokoro-mage-mystical',
			displayName: 'Kokoro Mystical Mage',
			engine: 'kokoro',
			engineVoiceId: 'mage-mystical',
			language: 'en-US',
			characteristics: {
				gender: 'neutral',
				age: 'adult',
				pitch: 0.8,
				rate: 0.5,
				quality: 'high',
			},
			suitableFor: ['player', 'npc', 'companion'],
			personality: ['mystical', 'magical', 'arcane', 'wizard', 'sorcerer', 'warlock'],
			isAssigned: false,
		},
		// Male voices for various character types
		{
			id: 'male-warrior-deep',
			name: 'warrior-deep',
			displayName: 'Deep Warrior',
			engine: 'platform',
			engineVoiceId:
				Platform.OS === 'ios'
					? 'com.apple.ttsbundle.Daniel-compact'
					: 'en-us-x-sfg#male_2-local',
			language: 'en-US',
			characteristics: {
				gender: 'male',
				age: 'adult',
				pitch: 0.7,
				rate: 0.5,
				quality: 'high',
			},
			suitableFor: ['player', 'npc', 'companion'],
			personality: ['brave', 'strong', 'authoritative', 'warrior', 'fighter', 'paladin'],
			isAssigned: false,
		},
		{
			id: 'male-scholar-wise',
			name: 'scholar-wise',
			displayName: 'Wise Scholar',
			engine: 'platform',
			engineVoiceId:
				Platform.OS === 'ios' ? 'com.apple.ttsbundle.Alex' : 'en-us-x-iog#male_1-local',
			language: 'en-US',
			characteristics: {
				gender: 'male',
				age: 'elderly',
				pitch: 0.9,
				rate: 0.4,
				quality: 'high',
			},
			suitableFor: ['player', 'npc', 'companion'],
			personality: ['wise', 'intelligent', 'scholarly', 'wizard', 'cleric', 'sage'],
			isAssigned: false,
		},
		{
			id: 'male-rogue-quick',
			name: 'rogue-quick',
			displayName: 'Quick Rogue',
			engine: 'platform',
			engineVoiceId:
				Platform.OS === 'ios' ? 'com.apple.ttsbundle.Tom' : 'en-us-x-tpd#male_1-local',
			language: 'en-US',
			characteristics: {
				gender: 'male',
				age: 'young',
				pitch: 1.1,
				rate: 0.7,
				quality: 'medium',
			},
			suitableFor: ['player', 'npc', 'companion'],
			personality: ['cunning', 'quick', 'sneaky', 'rogue', 'bard', 'trickster'],
			isAssigned: false,
		},

		// Female voices for various character types
		{
			id: 'female-mage-mystical',
			name: 'mage-mystical',
			displayName: 'Mystical Mage',
			engine: 'platform',
			engineVoiceId:
				Platform.OS === 'ios'
					? 'com.apple.ttsbundle.Samantha'
					: 'en-us-x-sfg#female_2-local',
			language: 'en-US',
			characteristics: {
				gender: 'female',
				age: 'adult',
				pitch: 1.0,
				rate: 0.45,
				quality: 'high',
			},
			suitableFor: ['player', 'npc', 'companion'],
			personality: ['mystical', 'magical', 'wise', 'sorcerer', 'wizard', 'druid'],
			isAssigned: false,
		},
		{
			id: 'female-ranger-nature',
			name: 'ranger-nature',
			displayName: 'Nature Ranger',
			engine: 'platform',
			engineVoiceId:
				Platform.OS === 'ios'
					? 'com.apple.ttsbundle.Victoria'
					: 'en-us-x-iom#female_1-local',
			language: 'en-US',
			characteristics: {
				gender: 'female',
				age: 'adult',
				pitch: 0.9,
				rate: 0.55,
				quality: 'high',
			},
			suitableFor: ['player', 'npc', 'companion'],
			personality: ['natural', 'outdoorsy', 'calm', 'ranger', 'druid', 'barbarian'],
			isAssigned: false,
		},
		{
			id: 'female-noble-elegant',
			name: 'noble-elegant',
			displayName: 'Elegant Noble',
			engine: 'platform',
			engineVoiceId:
				Platform.OS === 'ios' ? 'com.apple.ttsbundle.Fiona' : 'en-us-x-iog#female_2-local',
			language: 'en-US',
			characteristics: {
				gender: 'female',
				age: 'adult',
				pitch: 1.1,
				rate: 0.4,
				quality: 'high',
			},
			suitableFor: ['player', 'npc', 'companion'],
			personality: ['noble', 'elegant', 'refined', 'paladin', 'bard', 'aristocrat'],
			isAssigned: false,
		},

		// Special voices for DM and narrator
		{
			id: 'dm-authoritative',
			name: 'dm-master',
			displayName: 'Dungeon Master',
			engine: 'platform',
			engineVoiceId:
				Platform.OS === 'ios'
					? 'com.apple.ttsbundle.Daniel-compact'
					: 'en-us-x-sfg#male_3-local',
			language: 'en-US',
			characteristics: {
				gender: 'male',
				age: 'adult',
				pitch: 0.8,
				rate: 0.5,
				quality: 'high',
			},
			suitableFor: ['dm'],
			personality: ['authoritative', 'dramatic', 'storyteller', 'guide'],
			isAssigned: false,
		},
		{
			id: 'narrator-storyteller',
			name: 'narrator-voice',
			displayName: 'Story Narrator',
			engine: 'platform',
			engineVoiceId:
				Platform.OS === 'ios' ? 'com.apple.ttsbundle.Alex' : 'en-us-x-iog#male_2-local',
			language: 'en-US',
			characteristics: {
				gender: 'neutral',
				age: 'adult',
				pitch: 0.9,
				rate: 0.45,
				quality: 'high',
			},
			suitableFor: ['narrator'],
			personality: ['narrative', 'descriptive', 'atmospheric', 'storyteller'],
			isAssigned: false,
		},

		// Neutral/creature voices
		{
			id: 'creature-growling',
			name: 'creature-voice',
			displayName: 'Creature Voice',
			engine: 'platform',
			engineVoiceId:
				Platform.OS === 'ios' ? 'com.apple.ttsbundle.Ralph' : 'en-us-x-tpd#male_2-local',
			language: 'en-US',
			characteristics: {
				gender: 'neutral',
				age: 'adult',
				pitch: 0.6,
				rate: 0.3,
				quality: 'medium',
			},
			suitableFor: ['npc'],
			personality: ['monster', 'creature', 'beast', 'otherworldly'],
			isAssigned: false,
		},
	];

	/**
	 * Get all available voice profiles
	 */
	public static getAllProfiles(): VoiceProfile[] {
		return [...this.profiles];
	}

	/**
	 * Get voice profiles suitable for a specific character type
	 */
	public static getProfilesForType(characterType: CharacterType): VoiceProfile[] {
		return this.profiles.filter(profile => profile.suitableFor.includes(characterType));
	}

	/**
	 * Get a specific voice profile by ID
	 */
	public static getProfileById(id: string): VoiceProfile | undefined {
		return this.profiles.find(profile => profile.id === id);
	}

	/**
	 * Find voice profiles that match character traits
	 */
	public static findMatchingProfiles(
		characterType: CharacterType,
		traits: {
			race?: string;
			class?: string;
			gender?: 'male' | 'female' | 'neutral';
			personality?: string[];
		},
	): VoiceProfile[] {
		let candidates = this.getProfilesForType(characterType);

		// Filter by gender if specified
		if (traits.gender) {
			candidates = candidates.filter(
				profile =>
					profile.characteristics.gender === traits.gender ||
					profile.characteristics.gender === 'neutral',
			);
		}

		// Score profiles based on personality match
		const scoredProfiles = candidates.map(profile => {
			let score = 0;

			// Check class match
			if (traits.class) {
				const classLower = traits.class.toLowerCase();
				if (profile.personality.some(p => p.toLowerCase().includes(classLower))) {
					score += 10;
				}
			}

			// Check personality traits match
			if (traits.personality) {
				const personalityMatches = traits.personality.filter(trait =>
					profile.personality.some(
						p =>
							p.toLowerCase().includes(trait.toLowerCase()) ||
							trait.toLowerCase().includes(p.toLowerCase()),
					),
				);
				score += personalityMatches.length * 5;
			}

			// Check race-based personality match
			if (traits.race) {
				const raceLower = traits.race.toLowerCase();
				if (profile.personality.some(p => p.toLowerCase().includes(raceLower))) {
					score += 3;
				}
			}

			return { profile, score };
		});

		// Sort by score (highest first) and return profiles
		return scoredProfiles.sort((a, b) => b.score - a.score).map(item => item.profile);
	}

	/**
	 * Get available (unassigned) profiles for a character type
	 */
	public static getAvailableProfiles(characterType: CharacterType): VoiceProfile[] {
		return this.getProfilesForType(characterType).filter(profile => !profile.isAssigned);
	}

	/**
	 * Mark a profile as assigned
	 */
	public static markProfileAsAssigned(profileId: string, characterId: string): void {
		const profile = this.profiles.find(p => p.id === profileId);
		if (profile) {
			profile.isAssigned = true;
			profile.assignedTo = characterId;
			profile.lastUsed = Date.now();
		}
	}

	/**
	 * Mark a profile as unassigned
	 */
	public static markProfileAsUnassigned(profileId: string): void {
		const profile = this.profiles.find(p => p.id === profileId);
		if (profile) {
			profile.isAssigned = false;
			profile.assignedTo = undefined;
		}
	}

	/**
	 * Update profile usage tracking
	 */
	public static updateProfileUsage(profileId: string): void {
		const profile = this.profiles.find(p => p.id === profileId);
		if (profile) {
			profile.lastUsed = Date.now();
		}
	}
}
