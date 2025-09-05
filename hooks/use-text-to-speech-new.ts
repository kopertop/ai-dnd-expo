import { apple, AppleSpeech } from '@react-native-ai/apple';
import { experimental_generateSpeech as speech } from 'ai';
import { useCallback, useEffect, useState } from 'react';

export interface TextToSpeechOptions {
	voice?: string;
	language?: string;
	pitch?: number;
	rate?: number;
	volume?: number;
	onStart?: () => void;
	onDone?: () => void;
	onStopped?: () => void;
	onError?: (error: string) => void;
}

export interface Voice {
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
	availableVoices: Voice[];
	selectedVoice: string | undefined;
	setSelectedVoice: (voiceId: string | undefined) => void;
	speak: (text: string, options?: TextToSpeechOptions) => Promise<void>;
	stop: () => void;
	isAvailable: boolean;
}

/**
 * Hook for text-to-speech functionality using expo-speech
 * Provides voice selection and speech synthesis capabilities
 */
export const useTextToSpeech = (): TextToSpeechResult => {
	const [isSpeaking, setIsSpeaking] = useState(false);
	const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
	const [selectedVoice, setSelectedVoice] = useState<string | undefined>();
	const [isAvailable, setIsAvailable] = useState(false);

	const loadAvailableVoices = useCallback(async () => {
		try {
			const voices = await AppleSpeech.getVoices();
			const formattedVoices: Voice[] = voices.map((voice: AppleVoice) => ({
				identifier: voice.identifier,
				name: voice.name,
				language: voice.language,
				quality: voice.quality,
				isPersonalVoice: voice.isPersonalVoice,
				isNoveltyVoice: voice.isNoveltyVoice,
			}));

			setAvailableVoices(formattedVoices);
			setIsAvailable(true);

			// Set default voice if none selected
			if (!selectedVoice && formattedVoices.length > 0) {
				// Try to find a good default voice (English, high quality)
				const defaultVoice =
					formattedVoices.find(
						voice =>
							voice.language.startsWith('en') &&
							(voice.quality === 'enhanced' || voice.quality === 'premium'),
					) || formattedVoices[0];

				setSelectedVoice(defaultVoice.identifier);
			}
		} catch (error) {
			console.error('Failed to load available voices:', error);
			setIsAvailable(false);
		}
	}, [selectedVoice]);

	// Load available voices on mount
	useEffect(() => {
		loadAvailableVoices();
	}, [loadAvailableVoices]);

	const speak = useCallback(
		async (text: string, options: TextToSpeechOptions = {}) => {
			if (!isAvailable || !text.trim()) {
				return;
			}

			try {
				// Stop any current speech
				if (isSpeaking) {
					setIsSpeaking(false);
				}

				setIsSpeaking(true);
				options.onStart?.();

				// Generate speech using Apple Speech API
				await speech({
					model: apple.speechModel(),
					text: text,
					voice: options.voice || selectedVoice,
					language: options.language || 'en-US',
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
		[isAvailable, isSpeaking, selectedVoice],
	);

	const stop = useCallback(() => {
		// Note: Apple Speech API generates audio but doesn't provide direct stop control
		// In a real implementation, you would need to stop audio playback
		setIsSpeaking(false);
	}, []);

	return {
		isSpeaking,
		availableVoices,
		selectedVoice,
		setSelectedVoice,
		speak,
		stop,
		isAvailable,
	};
};
