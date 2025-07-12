import * as Audio from 'expo-audio';
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
		// iOS has native speech recognition, Android/Web will use fallback
		setIsSupported(Platform.OS === 'ios');
	}, []);

	/**
	 * Request microphone permissions
	 */
	const requestPermission = useCallback(async (): Promise<boolean> => {
		try {
			const { granted } = await Audio.requestRecordingPermissionsAsync();
			setHasPermission(granted);
			
			if (!granted) {
				Alert.alert(
					'Microphone Permission Required',
					'Please enable microphone access in Settings to use voice commands with the Dungeon Master.',
					[{ text: 'OK' }],
				);
			}
			
			return granted;
		} catch (err) {
			console.error('Permission request failed:', err);
			setError('Failed to request microphone permission');
			return false;
		}
	}, []);

	/**
	 * Check permissions on mount
	 */
	useEffect(() => {
		const checkPermissions = async () => {
			const { granted } = await Audio.getRecordingPermissionsAsync();
			setHasPermission(granted);
		};
		checkPermissions();
	}, []);

	/**
	 * Start listening for voice input
	 */
	const startListening = useCallback(async () => {
		if (isListening) return;
		
		setError(null);
		setTranscript('');

		try {
			// Request permission if not granted
			if (!hasPermission) {
				const granted = await requestPermission();
				if (!granted) return;
			}

			if (Platform.OS === 'ios') {
				// Use iOS Speech Recognition
				await startIOSSpeechRecognition();
			} else {
				// Fallback to audio recording for other platforms
				await startAudioRecording();
			}

			setIsListening(true);

			// Set maximum duration timeout
			const maxDuration = options.maxDuration || 30000; // 30 seconds default
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

			if (Platform.OS === 'ios') {
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
	 * iOS Speech Recognition implementation
	 */
	const startIOSSpeechRecognition = useCallback(async () => {
		// Note: This would typically use react-native-voice or a similar library
		// For now, we'll simulate with a fallback approach
		console.log('Starting iOS Speech Recognition...');
		
		// Simulate speech recognition with audio recording
		// In a real implementation, you'd use:
		// import Voice from '@react-native-voice/voice';
		// Voice.start(options.language || 'en-US');
		
		// For demo purposes, we'll start audio recording and simulate transcription
		await startAudioRecording();
		
		// Simulate partial transcription updates
		const simulateTranscription = () => {
			const phrases = [
				'I want to...',
				'I want to attack the...',
				'I want to attack the goblin',
				'I want to attack the goblin with my sword',
			];
			
			let index = 0;
			const interval = setInterval(() => {
				if (index < phrases.length && isListening) {
					setTranscript(phrases[index]);
					options.onTranscription?.(phrases[index], index === phrases.length - 1);
					index++;
				} else {
					clearInterval(interval);
				}
			}, 1000);
		};

		// Enable demo mode for testing
		simulateTranscription();
	}, [isListening, options]);

	/**
	 * Stop iOS Speech Recognition
	 */
	const stopIOSSpeechRecognition = useCallback(async () => {
		console.log('Stopping iOS Speech Recognition...');
		// Voice.stop();
		await stopAudioRecording();
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
			setTimeout(() => {
				if (isListening) {
					const demoAction = 'I want to attack the goblin with my sword';
					setTranscript(demoAction);
					options.onTranscription?.(demoAction, true);
				}
			}, 2000);

		} catch (err) {
			throw new Error(`Failed to start recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
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