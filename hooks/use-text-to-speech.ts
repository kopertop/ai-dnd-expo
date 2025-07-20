import * as Speech from 'expo-speech';
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
	quality: string;
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

				// Get available voices
				const voices = await Speech.getAvailableVoicesAsync();
				const formattedVoices: TTSVoice[] = voices.map(voice => ({
					identifier: voice.identifier,
					name: voice.name,
					language: voice.language,
					quality: voice.quality,
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
					Speech.stop();
				}

				setIsSpeaking(true);

				// Configure speech options
				const speechOptions: Speech.SpeechOptions = {
					language: options.language || getDMVoiceLanguage(),
					pitch: options.pitch || getDMVoicePitch(),
					rate: options.rate || getDMVoiceRate(),
					voice: options.voice || getDMVoiceIdentifier(voiceSettings.selectedVoiceId),
					onStart: () => {
						setIsSpeaking(true);
						options.onStart?.();
					},
					onDone: () => {
						setIsSpeaking(false);
						options.onDone?.();
					},
					onStopped: () => {
						setIsSpeaking(false);
						options.onStopped?.();
					},
					onError: (error: any) => {
						setIsSpeaking(false);
						const errorMessage =
							error?.error || error?.message || 'Speech synthesis failed';
						console.error('TTS Error:', errorMessage);
						options.onError?.(errorMessage);
					},
				};

				await Speech.speak(text, speechOptions);
			} catch (error) {
				setIsSpeaking(false);
				const errorMessage = error instanceof Error ? error.message : 'Unknown TTS error';
				console.error('TTS Error:', errorMessage);
				options.onError?.(errorMessage);
			}
		},
		[isAvailable, isSpeaking],
	);

	/**
	 * Stop current speech
	 */
	const stop = useCallback(() => {
		Speech.stop();
		setIsSpeaking(false);
	}, []);

	/**
	 * Pause current speech
	 */
	const pause = useCallback(() => {
		if (Platform.OS === 'ios') {
			Speech.pause();
		}
	}, []);

	/**
	 * Resume paused speech
	 */
	const resume = useCallback(() => {
		if (Platform.OS === 'ios') {
			Speech.resume();
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

/**
 * Get preferred DM voice pitch (0.5 - 2.0)
 */
const getDMVoicePitch = (): number => {
	// Slightly lower pitch for a more authoritative DM voice
	return 0.8;
};

/**
 * Get preferred DM voice rate (0.1 - 0.75)
 */
const getDMVoiceRate = (): number => {
	// Slightly slower rate for dramatic effect
	return 0.5;
};

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
