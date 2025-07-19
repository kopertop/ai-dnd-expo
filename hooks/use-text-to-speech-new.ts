import * as Speech from 'expo-speech';
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
	quality: string;
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
			const voices = await Speech.getAvailableVoicesAsync();
			const formattedVoices: Voice[] = voices.map(voice => ({
				identifier: voice.identifier,
				name: voice.name,
				language: voice.language,
				quality: voice.quality,
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
					Speech.stop();
				}

				setIsSpeaking(true);

				// Configure speech options
				const speechOptions: Speech.SpeechOptions = {
					voice: options.voice || selectedVoice,
					language: options.language || 'en-US',
					pitch: options.pitch || 1.0,
					rate: options.rate || 0.75,
					volume: options.volume || 1.0,
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
		[isAvailable, isSpeaking, selectedVoice],
	);

	const stop = useCallback(() => {
		Speech.stop();
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
