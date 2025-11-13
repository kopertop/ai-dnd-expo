/**
 * Web Stubs for Native Modules
 * 
 * Provides empty implementations of native-only modules for web platform
 */

// Stub for cactus-react-native
export const CactusLM = {
	init: async () => {
		console.warn('CactusLM is not available on web platform');
		return { lm: null, error: 'Not available on web' };
	},
};

// Stub for onnxruntime-react-native
export const InferenceSession = {
	create: async () => {
		throw new Error('ONNX Runtime is not available on web platform');
	},
};

export const Tensor = class {
	constructor() {
		throw new Error('Tensor is not available on web platform');
	}
};

// Stub for expo-speech-recognition
export const ExpoSpeechRecognitionModule = {
	start: () => {
		console.warn('Speech recognition is not available on web platform');
	},
	stop: () => {
		console.warn('Speech recognition is not available on web platform');
	},
};

export const useSpeechRecognitionEvent = () => {
	// No-op hook for web
};

// Default export
export default {
	CactusLM,
	InferenceSession,
	Tensor,
	ExpoSpeechRecognitionModule,
	useSpeechRecognitionEvent,
};

