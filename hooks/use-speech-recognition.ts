import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import {
	handleSpeechRecognitionError,
	SpeechRecognitionError,
} from '../utils/speech-recognition-errors';
import { getVoicePermissionManager } from '../utils/voice-permissions';

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
	errorInfo: SpeechRecognitionError | null;
	isSupported: boolean;
	hasPermission: boolean;
	startListening: () => Promise<void>;
	stopListening: () => void;
	requestPermission: () => Promise<boolean>;
	retryLastOperation: () => Promise<void>;
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
	const [errorInfo, setErrorInfo] = useState<SpeechRecognitionError | null>(null);
	const [hasPermission, setHasPermission] = useState(false);
	const [isSupported, setIsSupported] = useState(false);
	const [lastOperation, setLastOperation] = useState<'start' | null>(null);

	// Check if speech recognition is supported on this platform
	useEffect(() => {
		// expo-speech-recognition supports both iOS and Android
		setIsSupported(Platform.OS === 'ios' || Platform.OS === 'android');
	}, []);

	const checkPermissions = useCallback(async () => {
		try {
			const manager = getVoicePermissionManager();
			const result = await manager.checkPermissions();
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
			const manager = getVoicePermissionManager();
			const result = await manager.requestPermissions();
			setHasPermission(result.granted);
			return result.granted;
		} catch (err) {
			const manager = getVoicePermissionManager();
			const permissionError = manager.getPermissionError(err);

			// Convert permission error to speech recognition error format
			const speechError: SpeechRecognitionError = {
				code: permissionError.code,
				message: permissionError.message,
				userMessage: permissionError.userMessage,
				canRetry: permissionError.canRetry,
				isTemporary: false,
				requiresAction: permissionError.showSettings,
			};

			setError(speechError.userMessage);
			setErrorInfo(speechError);
			setHasPermission(false);
			return false;
		}
	}, []);

	const startListening = useCallback(async () => {
		if (!isSupported) {
			const manager = getVoicePermissionManager();
			manager.showVoiceUnavailableMessage('not_supported');
			return;
		}

		if (recognizing) {
			return;
		}

		setError(null);
		setErrorInfo(null);
		setTranscript('');
		setLastOperation('start');

		try {
			// Request permission if not granted
			if (!hasPermission) {
				const granted = await requestPermission();
				if (!granted) {
					const manager = getVoicePermissionManager();
					manager.showVoiceUnavailableMessage('permissions');
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
			const errorInfo = handleSpeechRecognitionError(err, () => startListening(), false);
			setError(errorInfo.userMessage);
			setErrorInfo(errorInfo);
			options.onError?.(errorInfo.userMessage);
		}
	}, [isSupported, recognizing, hasPermission, options, requestPermission]);

	const stopListening = useCallback(() => {
		if (!recognizing) {
			return;
		}

		try {
			ExpoSpeechRecognitionModule.stop();
			setLastOperation(null);
		} catch (err) {
			const errorInfo = handleSpeechRecognitionError(err, undefined, false);
			console.error('Error stopping speech recognition:', errorInfo);
		}
	}, [recognizing]);

	const retryLastOperation = useCallback(async () => {
		if (lastOperation === 'start') {
			await startListening();
		}
	}, [lastOperation, startListening]);

	// Set up speech recognition event listeners
	useSpeechRecognitionEvent('start', () => {
		setRecognizing(true);
		setError(null);
		setErrorInfo(null);
		options.onStart?.();
	});

	useSpeechRecognitionEvent('end', () => {
		setRecognizing(false);
		setLastOperation(null);
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
		const errorInfo = handleSpeechRecognitionError(event, retryLastOperation, false);

		// Only set error state for errors that should be shown to user
		if (errorInfo.code !== 'NO_SPEECH' && errorInfo.code !== 'CANCELLED') {
			setError(errorInfo.userMessage);
			setErrorInfo(errorInfo);
		}

		setRecognizing(false);
		setLastOperation(null);
		options.onError?.(errorInfo.userMessage);
	});

	return {
		recognizing,
		transcript,
		error,
		errorInfo,
		isSupported,
		hasPermission,
		startListening,
		stopListening,
		requestPermission,
		retryLastOperation,
	};
};
