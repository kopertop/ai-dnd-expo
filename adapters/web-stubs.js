/**
 * Web Stubs for Native Modules
 * 
 * Provides empty implementations of native-only modules for web platform
 */

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

// Stub for expo-modules-core requireNativeViewManager
export const requireNativeViewManager = (viewName) => {
	console.warn(`Native view manager "${viewName}" is not available on web platform`);
	// Return a no-op component for web
	return () => null;
};

// Default export
export default {
	InferenceSession,
	Tensor,
	ExpoSpeechRecognitionModule,
	useSpeechRecognitionEvent,
	requireNativeViewManager,
};

