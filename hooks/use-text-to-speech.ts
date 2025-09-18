// Apple Speech imports removed to avoid runtime module registration
import { Platform } from 'react-native';

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
 * Platform‑specific TTS hook
 */
export const useTextToSpeech = Platform.OS === 'ios'
	? // eslint-disable-next-line @typescript-eslint/no-var-requires
		require('./use-text-to-speech.ios').useTextToSpeech
	: // eslint-disable-next-line @typescript-eslint/no-var-requires
		require('./use-text-to-speech.stub').useTextToSpeech;
