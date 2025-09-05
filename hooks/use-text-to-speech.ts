import { apple, AppleSpeech } from '@react-native-ai/apple';
import { experimental_generateSpeech as speech } from 'ai';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { useSettingsStore } from '@/stores/settings-store';

export interface TTSOptions {
	language?: string;
	pitch?: number;
	rate?: number;
	voice?: string;
	onStart?: () => void;
	onDone?: () => void;
	onStopped?: () => void;
	onError?: (error: string) => void;
}

export interface TTSVoice {
	identifier: string;
	name: string;
	language: string;
	quality: 'default' | 'enhanced' | 'premium';
	isPersonalVoice?: boolean;
	isNoveltyVoice?: boolean;
}

interface AppleVoice {
	identifier: string;
	name: string;
	language: string;
	quality: 'default' | 'enhanced' | 'premium';
	isPersonalVoice?: boolean;
	isNoveltyVoice?: boolean;
}

export interface TextToSpeechResult {
	isSpeaking: boolean;
	availableVoices: TTSVoice[];
	speak: (text: string, options?: TTSOptions) => Promise<void>;
	stop: () => void;
	pause: () => void;
	resume: () => void;
	isAvailable: boolean;
}

/**
 * Hook for Text-to-Speech functionality using Expo Speech
 */
export const useTextToSpeech = (): TextToSpeechResult => {
	const [isSpeaking, setIsSpeaking] = useState(false);
	const [availableVoices, setAvailableVoices] = useState<TTSVoice[]>([]);
	const [isAvailable, setIsAvailable] = useState(false);
	const { voice: voiceSettings } = useSettingsStore();

	/**
	 * Check if TTS is available and load voices
	 */
	useEffect(() => {
		const checkAvailability = async () => {
			try {
				// Check if Speech API is available
				setIsAvailable(true);

				// Get available voices using Apple Speech API
				const voices = await AppleSpeech.getVoices();
				const formattedVoices: TTSVoice[] = voices.map((voice: AppleVoice) => ({
					identifier: voice.identifier,
					name: voice.name,
					language: voice.language,
					quality: voice.quality,
					isPersonalVoice: voice.isPersonalVoice,
					isNoveltyVoice: voice.isNoveltyVoice,
				}));
				// console.log('formattedVoices', formattedVoices);

				setAvailableVoices(formattedVoices);
			} catch (error) {
				console.error('TTS not available:', error);
				setIsAvailable(false);
			}
		};

		checkAvailability();
	}, []);

	/**
	 * Stop current speech
	 */
	const stop = useCallback(() => {
		// Note: Apple Speech API generates audio but doesn't provide direct stop control
		// In a real implementation, you would need to stop audio playback
		setIsSpeaking(false);
	}, []);

	/**
	 * Speak text with optional configuration
	 */
	const speak = useCallback(
		async (text: string, options: TTSOptions = {}) => {
			if (!isAvailable || !text.trim()) {
				return;
			}

			try {
				// Stop any current speech
				if (isSpeaking) {
					stop();
				}

				setIsSpeaking(true);
				options.onStart?.();

				// Generate speech using Apple Speech API
				await speech({
					model: apple.speechModel(),
					text: text,
					voice: options.voice || getDMVoiceIdentifier(voiceSettings.selectedVoiceId),
					language: options.language || getDMVoiceLanguage(),
				});

				// Note: The Apple Speech API generates audio but doesn't directly play it
				// For now, we'll simulate the speech completion
				// In a real implementation, you would need to play the audio buffer
				// using expo-audio or another audio playback library

				// Simulate speech duration based on text length
				const estimatedDuration = Math.max(1000, text.length * 50);

				setTimeout(() => {
					setIsSpeaking(false);
					options.onDone?.();
				}, estimatedDuration);

			} catch (error) {
				setIsSpeaking(false);
				const errorMessage = error instanceof Error ? error.message : 'Unknown TTS error';
				console.error('TTS Error:', errorMessage);
				options.onError?.(errorMessage);
			}
		},
		[isAvailable, isSpeaking, voiceSettings.selectedVoiceId, stop],
	);

	/**
	 * Pause current speech
	 */
	const pause = useCallback(() => {
		// Note: Apple Speech API doesn't provide direct pause control
		// In a real implementation, you would need to pause audio playback
		if (Platform.OS === 'ios') {
			// Pause functionality would need to be implemented with audio playback
		}
	}, []);

	/**
	 * Resume paused speech
	 */
	const resume = useCallback(() => {
		// Note: Apple Speech API doesn't provide direct resume control
		// In a real implementation, you would need to resume audio playback
		if (Platform.OS === 'ios') {
			// Resume functionality would need to be implemented with audio playback
		}
	}, []);

	return {
		isSpeaking,
		availableVoices,
		speak,
		stop,
		pause,
		resume,
		isAvailable,
	};
};

/**
 * Get preferred DM voice language
 */
const getDMVoiceLanguage = (): string => {
	// You can customize this based on user preferences
	return 'en-US';
};

// Note: Apple Speech API doesn't support pitch and rate parameters directly
// These would need to be handled through audio processing if needed

/**
 * Get preferred DM voice identifier
 */
const getDMVoiceIdentifier = (selectedVoiceId?: string): string | undefined => {
	// Use selected voice from settings if available
	if (selectedVoiceId) {
		return selectedVoiceId;
	}

	// Fall back to platform-specific defaults
	if (Platform.OS === 'ios') {
		return 'com.apple.voice.compact.en-US.Samantha';
	} else if (Platform.OS === 'android') {
		return 'en-us-x-sfg#male_2-local'; // Deep male voice on Android
	}
	return undefined;
};

/**
 * Utility function to clean text for better TTS pronunciation
 */
export const cleanTextForTTS = (text: string): string => {
	return (
		text
			// Remove dice notation for cleaner speech
			.replace(/\[ROLL:[^\]]+\]/g, '')
			// Remove character update commands
			.replace(/\[UPDATE:[^\]]+\]/g, '')
			// Remove rule lookup commands
			.replace(/\[LOOKUP:[^\]]+\]/g, '')
			// Clean up extra whitespace
			.replace(/\s+/g, ' ')
			.trim()
	);
};

/**
 * Pre-configured TTS options for different types of DM speech
 */
export const DMVoicePresets = {
	narration: {
		pitch: 0.8,
		rate: 0.5,
		language: 'en-US',
	},
	dialogue: {
		pitch: 0.9,
		rate: 0.6,
		language: 'en-US',
	},
	combat: {
		pitch: 0.7,
		rate: 0.4,
		language: 'en-US',
	},
	whisper: {
		pitch: 0.6,
		rate: 0.3,
		language: 'en-US',
	},
	dramatic: {
		pitch: 0.7,
		rate: 0.3,
		language: 'en-US',
	},
} as const;

/**
 * Hook specifically for DM voice with pre-configured settings
 */
export const useDMVoice = () => {
	const tts = useTextToSpeech();

	const speakAsNarrator = useCallback(
		(text: string) => {
			const cleanText = cleanTextForTTS(text);
			return tts.speak(cleanText, DMVoicePresets.narration);
		},
		[tts],
	);

	const speakAsCharacter = useCallback(
		(text: string, characterName?: string) => {
			const cleanText = cleanTextForTTS(text);
			const prefixedText = characterName ? `${characterName} says: ${cleanText}` : cleanText;
			return tts.speak(prefixedText, DMVoicePresets.dialogue);
		},
		[tts],
	);

	const speakCombatAction = useCallback(
		(text: string) => {
			const cleanText = cleanTextForTTS(text);
			return tts.speak(cleanText, DMVoicePresets.combat);
		},
		[tts],
	);

	const speakDramatically = useCallback(
		(text: string) => {
			const cleanText = cleanTextForTTS(text);
			return tts.speak(cleanText, DMVoicePresets.dramatic);
		},
		[tts],
	);

	return {
		...tts,
		speakAsNarrator,
		speakAsCharacter,
		speakCombatAction,
		speakDramatically,
		cleanTextForTTS,
	};
};
