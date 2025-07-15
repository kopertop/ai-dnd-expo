import * as Audio from 'expo-audio';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Alert } from 'react-native';

export interface VoiceRecognitionOptions {
	language?: string;
	maxDuration?: number; // in milliseconds
	onTranscription?: (text: string, isFinal: boolean) => void;
	onError?: (error: string) => void;
}

export interface VoiceRecognitionResult {
	isListening: boolean;
	isSupported: boolean;
	transcript: string;
	error: string | null;
	startListening: () => Promise<void>;
	stopListening: () => Promise<void>;
	hasPermission: boolean;
	requestPermission: () => Promise<boolean>;
}

/**
 * Hook for voice recognition using iOS Speech Recognition API
 * Falls back to basic audio recording on other platforms
 */
export const useVoiceRecognition = (
	options: VoiceRecognitionOptions = {},
): VoiceRecognitionResult => {
	const [isListening, setIsListening] = useState(false);
	const [transcript, setTranscript] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [hasPermission, setHasPermission] = useState(false);
	const [isSupported, setIsSupported] = useState(false);

	const recordingRef = useRef<any>(null);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Check if speech recognition is supported
	useEffect(() => {
		// For now, assume iOS has speech recognition support
		setIsSupported(Platform.OS === 'ios');
		console.log('🎤 Speech recognition support (iOS):', Platform.OS === 'ios');
	}, []);

	/**
	 * Request microphone permissions (using audio for now)
	 */
	const requestPermission = useCallback(async (): Promise<boolean> => {
		try {
			const { granted } = await Audio.requestRecordingPermissionsAsync();
			setHasPermission(granted);
			console.log('🔐 Audio permission:', granted);

			if (!granted) {
				Alert.alert(
					'Microphone Permission Required',
					'Please enable microphone access in Settings to use voice commands with the Dungeon Master.',
					[{ text: 'OK' }],
				);
			}

			return granted;
		} catch (err) {
			console.error('❌ Permission request failed:', err);
			setError('Failed to request microphone permission');
			return false;
		}
	}, []);

	/**
	 * Check permissions on mount
	 */
	useEffect(() => {
		const checkPermissions = async () => {
			try {
				const { granted } = await Audio.getRecordingPermissionsAsync();
				setHasPermission(granted);
				console.log('🔍 Current audio permission:', granted);
			} catch (err) {
				console.log('❌ Could not check permissions:', err);
				setHasPermission(false);
			}
		};
		checkPermissions();
	}, []);

	/**
	 * Start listening for voice input
	 */
	const startListening = useCallback(async () => {
		if (isListening) return;

		console.log('🎤 startListening called');
		setError(null);
		setTranscript('');

		try {
			// Request permission if not granted
			if (!hasPermission) {
				const granted = await requestPermission();
				if (!granted) return;
			}

			if (isSupported) {
				// Use real iOS speech recognition
				console.log('🎯 Using iOS speech recognition');
				await startIOSSpeechRecognition();
			} else {
				// Fallback to audio recording for unsupported platforms
				console.log('🤖 Using fallback audio recording');
				await startAudioRecording();
			}

			console.log('📡 Setting isListening to true');
			setIsListening(true);

			// Set maximum duration timeout
			const maxDuration = options.maxDuration || 60000; // 60 seconds default for better UX
			timeoutRef.current = setTimeout(() => {
				stopListening();
			}, maxDuration);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
			setError(errorMessage);
			options.onError?.(errorMessage);
		}
	}, [hasPermission, isListening, options, requestPermission]);

	/**
	 * Stop listening
	 */
	const stopListening = useCallback(async () => {
		if (!isListening) return;

		try {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}

			if (isSupported) {
				await stopIOSSpeechRecognition();
			} else {
				await stopAudioRecording();
			}

			setIsListening(false);
		} catch (err) {
			console.error('Error stopping voice recognition:', err);
			setError('Failed to stop voice recognition');
		}
	}, [isListening]);

	/**
	 * iOS Speech Recognition using expo-speech-recognition
	 */
	const startIOSSpeechRecognition = useCallback(async () => {
		console.log('🎯 Starting iOS speech recognition...');

		try {
			// Request speech recognition permissions
			const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
			if (!granted) {
				throw new Error('Speech recognition permission not granted');
			}

			// Start speech recognition with iOS optimized settings
			ExpoSpeechRecognitionModule.start({
				lang: options.language || 'en-US',
				interimResults: true,
				maxAlternatives: 3,
				continuous: true, // Allow continuous recognition
				requiresOnDeviceRecognition: true, // Use on-device recognition for iOS
				addsPunctuation: false, // Don't add punctuation to avoid delays
			});

			console.log('🎤 Speech recognition start() called');
		} catch (err) {
			console.error('❌ Failed to start speech recognition:', err);
			setError('Failed to start speech recognition');
		}
	}, [options]);

	// Set up speech recognition event listeners with comprehensive logging
	useSpeechRecognitionEvent('start', event => {
		console.log('🎤 SPEECH RECOGNITION STARTED EVENT:', event);
		setIsListening(true);
	});

	useSpeechRecognitionEvent('audiostart', event => {
		console.log('🔊 AUDIO CAPTURE STARTED:', event);
	});

	useSpeechRecognitionEvent('speechstart', event => {
		console.log('🗣️ SPEECH INPUT DETECTED:', event);
	});

	useSpeechRecognitionEvent('result', event => {
		console.log('🎤 SPEECH RECOGNITION RESULT:', JSON.stringify(event, null, 2));
		if (event.results && event.results.length > 0) {
			const transcript = event.results[0].transcript;
			const isFinal = event.isFinal;
			console.log(`📝 TRANSCRIPT: "${transcript}", isFinal: ${isFinal}`);
			setTranscript(transcript);
			options.onTranscription?.(transcript, isFinal);
		}
	});

	useSpeechRecognitionEvent('speechend', event => {
		console.log('🤐 SPEECH INPUT ENDED:', event);
	});

	useSpeechRecognitionEvent('audioend', event => {
		console.log('🔇 AUDIO CAPTURE ENDED:', event);
	});

	useSpeechRecognitionEvent('end', event => {
		console.log('🛑 SPEECH RECOGNITION ENDED:', event);
		setIsListening(false);
	});

	useSpeechRecognitionEvent('error', event => {
		console.error('❌ SPEECH RECOGNITION ERROR:', JSON.stringify(event, null, 2));

		// Handle "no-speech" error more gracefully - it's often not a real error
		if (event.error === 'no-speech') {
			console.log('🔇 No speech detected - this is normal, continuing...');
			setError(null); // Don't show error for no speech
			// Don't stop listening, let it continue
			return;
		}

		setError(event.message);
		setIsListening(false);
		options.onError?.(event.message);
	});

	/**
	 * Stop iOS Speech Recognition
	 */
	const stopIOSSpeechRecognition = useCallback(async () => {
		console.log('🛑 Stopping iOS speech recognition...');
		try {
			ExpoSpeechRecognitionModule.stop();
		} catch (err) {
			console.error('❌ Failed to stop speech recognition:', err);
		}
	}, []);

	/**
	 * Audio recording fallback for non-iOS platforms
	 */
	const startAudioRecording = useCallback(async () => {
		try {
			// For now, simulate recording with a timer
			// In a real implementation, you'd use expo-audio recording
			console.log('Starting audio recording simulation...');

			recordingRef.current = { isRecording: true };

			// For demo purposes, simulate a realistic D&D action
			console.log('⏰ Setting 2-second timeout for fallback transcription');
			setTimeout(() => {
				if (isListening) {
					const demoAction = 'I want to attack the goblin with my sword';
					console.log(`📝 Fallback transcription: "${demoAction}"`);
					setTranscript(demoAction);
					console.log('🎤 Calling onTranscription with isFinal: true');
					options.onTranscription?.(demoAction, true);
				} else {
					console.log('❌ Fallback transcription skipped - not listening');
				}
			}, 2000);
		} catch (err) {
			throw new Error(
				`Failed to start recording: ${err instanceof Error ? err.message : 'Unknown error'}`,
			);
		}
	}, [isListening, options]);

	/**
	 * Stop audio recording
	 */
	const stopAudioRecording = useCallback(async () => {
		if (recordingRef.current) {
			try {
				// For simulation, just clear the ref
				console.log('Stopping audio recording simulation...');
				recordingRef.current = null;
			} catch (err) {
				console.error('Error stopping recording:', err);
			}
		}
	}, []);

	/**
	 * Cleanup on unmount
	 */
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
			if (recordingRef.current) {
				recordingRef.current = null;
			}
		};
	}, []);

	return {
		isListening,
		isSupported,
		transcript,
		error,
		startListening,
		stopListening,
		hasPermission,
		requestPermission,
	};
};

/**
 * Helper function to convert speech to text using iOS Speech Recognition
 * This would be implemented with a native iOS Speech Recognition library
 */
export const convertSpeechToText = async (
	audioUri: string,
	language: string = 'en-US',
): Promise<string> => {
	// Placeholder implementation
	// In a real app, this would use iOS Speech Recognition APIs
	// or a cloud service like Google Speech-to-Text

	console.log(`Converting speech to text: ${audioUri}, language: ${language}`);

	// Simulate processing delay
	await new Promise(resolve => setTimeout(resolve, 1000));

	// Return placeholder text
	return 'I want to attack the goblin with my sword';
};

/**
 * Configuration for different voice recognition engines
 */
export const VoiceRecognitionConfig = {
	iOS: {
		language: 'en-US',
		continuous: true,
		interimResults: true,
		maxAlternatives: 1,
	},
	fallback: {
		maxDuration: 30000, // 30 seconds
		android: {
			extension: '.m4a',
			outputFormat: 'mpeg4',
			audioEncoder: 'aac',
		},
		ios: {
			extension: '.m4a',
			outputFormat: 'mpeg4aac',
			audioQuality: Audio.AudioQuality.MAX,
		},
	},
} as const;
