import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface SpeechRecognitionOptions {
	language?: string;
	continuous?: boolean;
	interimResults?: boolean;
	maxAlternatives?: number;
	onStart?: () => void;
	onEnd?: () => void;
	onError?: (error: string) => void;
}

export interface SpeechRecognitionResult {
	recognizing: boolean;
	transcript: string;
	error: string | null;
	isSupported: boolean;
	hasPermission: boolean;
	startListening: () => Promise<void>;
	stopListening: () => void;
	requestPermission: () => Promise<boolean>;
}

/**
 * Hook for speech recognition using expo-speech-recognition
 * Provides a clean interface for voice input functionality
 */
export const useSpeechRecognition = (
	options: SpeechRecognitionOptions = {},
): SpeechRecognitionResult => {
	const [recognizing, setRecognizing] = useState(false);
	const [transcript, setTranscript] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [hasPermission, setHasPermission] = useState(false);
	const [isSupported, setIsSupported] = useState(false);

	// Check if speech recognition is supported on this platform
	useEffect(() => {
		// expo-speech-recognition supports both iOS and Android
		setIsSupported(Platform.OS === 'ios' || Platform.OS === 'android');
	}, []);

	const checkPermissions = useCallback(async () => {
		try {
			const result = await ExpoSpeechRecognitionModule.getPermissionsAsync();
			setHasPermission(result.granted);
		} catch (err) {
			console.error('Error checking speech recognition permissions:', err);
			setHasPermission(false);
		}
	}, []);

	// Check permissions on mount
	useEffect(() => {
		checkPermissions();
	}, [checkPermissions]);

	const requestPermission = useCallback(async (): Promise<boolean> => {
		try {
			const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
			setHasPermission(result.granted);
			return result.granted;
		} catch (err) {
			console.error('Error requesting speech recognition permissions:', err);
			setHasPermission(false);
			return false;
		}
	}, []);

	const startListening = useCallback(async () => {
		if (!isSupported) {
			setError('Speech recognition is not supported on this platform');
			return;
		}

		if (recognizing) {
			return;
		}

		setError(null);
		setTranscript('');

		try {
			// Request permission if not granted
			if (!hasPermission) {
				const granted = await requestPermission();
				if (!granted) {
					setError('Microphone permission is required for voice input');
					return;
				}
			}

			// Configure recognition options with platform-specific optimizations
			const recognitionOptions = {
				lang: options.language || 'en-US',
				interimResults: options.interimResults ?? true,
				maxAlternatives: options.maxAlternatives || 1,
				continuous: options.continuous ?? false,
				// Platform-specific optimizations
				...(Platform.OS === 'ios' && {
					requiresOnDeviceRecognition: true,
					addsPunctuation: false,
				}),
			};

			ExpoSpeechRecognitionModule.start(recognitionOptions);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : 'Failed to start speech recognition';
			setError(errorMessage);
			options.onError?.(errorMessage);
		}
	}, [isSupported, recognizing, hasPermission, options, requestPermission]);

	const stopListening = useCallback(() => {
		if (!recognizing) {
			return;
		}

		try {
			ExpoSpeechRecognitionModule.stop();
		} catch (err) {
			console.error('Error stopping speech recognition:', err);
		}
	}, [recognizing]);

	// Set up speech recognition event listeners
	useSpeechRecognitionEvent('start', () => {
		setRecognizing(true);
		setError(null);
		options.onStart?.();
	});

	useSpeechRecognitionEvent('end', () => {
		setRecognizing(false);
		options.onEnd?.();
	});

	useSpeechRecognitionEvent('result', event => {
		if (event.results && event.results.length > 0) {
			const result = event.results[0];
			if (result?.transcript) {
				setTranscript(result.transcript);
			}
		}
	});

	useSpeechRecognitionEvent('error', event => {
		const errorMessage = event.message || 'Speech recognition error occurred';

		// Handle "no-speech" error more gracefully
		if (event.error === 'no-speech') {
			// Don't treat no speech as an error, just continue
			return;
		}

		setError(errorMessage);
		setRecognizing(false);
		options.onError?.(errorMessage);
	});

	return {
		recognizing,
		transcript,
		error,
		isSupported,
		hasPermission,
		startListening,
		stopListening,
		requestPermission,
	};
};
