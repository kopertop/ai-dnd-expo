// Stub implementation of Text-to-Speech for non‑iOS platforms
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
 * Simple timeout‑based stub for TTS – mimics speech by waiting.
 */
export const useTextToSpeech = (): TextToSpeechResult => {
	const [isSpeaking, setIsSpeaking] = useState(false);
	const [availableVoices, setAvailableVoices] = useState<TTSVoice[]>([]);
	const [isAvailable, setIsAvailable] = useState(false);
	const { voice: voiceSettings } = useSettingsStore();

	useEffect(() => {
		// Stub does not load real voices
		setIsAvailable(false);
		setAvailableVoices([]);
	}, []);

	const stop = useCallback(() => {
		setIsSpeaking(false);
	}, []);

	const speak = useCallback(
		async (text: string, options: TTSOptions = {}) => {
			if (!text.trim()) return;
			try {
				if (isSpeaking) stop();
				setIsSpeaking(true);
				options.onStart?.();
				const estimatedDuration = Math.max(500, text.length * 30);
				setTimeout(() => {
					setIsSpeaking(false);
					options.onDone?.();
				}, estimatedDuration);
			} catch (error) {
				setIsSpeaking(false);
				options.onError?.('Stub TTS error');
			}
		},
		[isSpeaking, stop],
	);

	const pause = useCallback(() => {
		// No real pause in stub
	}, []);

	const resume = useCallback(() => {
		// No real resume in stub
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
