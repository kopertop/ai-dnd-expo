// Apple Speech imports removed for safe default build
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
        setAvailableVoices([]);
        setIsAvailable(false);
    }, [selectedVoice]);

	// Load available voices on mount
	useEffect(() => {
		loadAvailableVoices();
	}, [loadAvailableVoices]);

    const speak = useCallback(
        async (text: string, options: TextToSpeechOptions = {}) => {
            if (!text.trim()) return;
            try {
                if (isSpeaking) setIsSpeaking(false);
                setIsSpeaking(true);
                options.onStart?.();
                const estimated = Math.max(500, text.length * 30);
                setTimeout(() => {
                    setIsSpeaking(false);
                    options.onDone?.();
                }, estimated);
            } catch (err) {
                setIsSpeaking(false);
                options.onError?.(err instanceof Error ? err.message : 'TTS error');
            }
        },
        [isSpeaking],
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
