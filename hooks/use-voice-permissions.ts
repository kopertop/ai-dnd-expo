import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

export interface VoicePermissionsResult {
	hasPermissions: boolean;
	isLoading: boolean;
	error: string | null;
	checkPermissions: () => Promise<boolean>;
	requestPermissions: () => Promise<boolean>;
}

/**
 * Hook for managing voice-related permissions
 * Pre-checks permissions to avoid unnecessary prompts
 */
export const useVoicePermissions = (): VoicePermissionsResult => {
	const [hasPermissions, setHasPermissions] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	/**
	 * Check current permissions without requesting them
	 */
	const checkPermissions = useCallback(async (): Promise<boolean> => {
		try {
			setIsLoading(true);
			setError(null);

			// Check speech recognition permissions
			const speechResult = await ExpoSpeechRecognitionModule.getPermissionsAsync();

			console.log('🔍 Current speech recognition permissions:', speechResult);

			const granted = speechResult.granted;
			setHasPermissions(granted);

			return granted;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to check permissions';
			console.error('❌ Permission check failed:', errorMessage);
			setError(errorMessage);
			setHasPermissions(false);
			return false;
		} finally {
			setIsLoading(false);
		}
	}, []);

	/**
	 * Request permissions if not already granted
	 */
	const requestPermissions = useCallback(async (): Promise<boolean> => {
		try {
			setIsLoading(true);
			setError(null);

			// First check if we already have permissions to avoid unnecessary prompts
			const currentPermissions = await checkPermissions();
			if (currentPermissions) {
				console.log('✅ Permissions already granted, skipping request');
				return true;
			}

			console.log('🔐 Requesting speech recognition permissions...');

			// Request speech recognition permissions
			const speechResult = await ExpoSpeechRecognitionModule.requestPermissionsAsync();

			console.log('🔐 Speech recognition permission result:', speechResult);

			const granted = speechResult.granted;
			setHasPermissions(granted);

			if (!granted) {
				const errorMessage =
					'Voice permissions are required for speech recognition features';
				setError(errorMessage);

				// Show user-friendly alert
				Alert.alert(
					'Permissions Required',
					Platform.select({
						ios: 'Microphone and Speech Recognition permissions are needed for voice commands. Please enable them in Settings.',
						android:
							'Microphone permission is needed for voice commands. Please enable it in Settings.',
						default: 'Voice permissions are needed for speech recognition features.',
					}),
					[{ text: 'OK' }],
				);
			}

			return granted;
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : 'Failed to request permissions';
			console.error('❌ Permission request failed:', errorMessage);
			setError(errorMessage);
			setHasPermissions(false);
			return false;
		} finally {
			setIsLoading(false);
		}
	}, [checkPermissions]);

	/**
	 * Check permissions on mount
	 */
	useEffect(() => {
		checkPermissions();
	}, [checkPermissions]);

	return {
		hasPermissions,
		isLoading,
		error,
		checkPermissions,
		requestPermissions,
	};
};

/**
 * Utility function to check if voice features are supported on the current platform
 */
export const isVoiceSupported = (): boolean => {
	// Speech recognition is supported on iOS and Android
	return Platform.OS === 'ios' || Platform.OS === 'android';
};

/**
 * Utility function to get platform-specific permission requirements
 */
export const getVoicePermissionRequirements = () => {
	return Platform.select({
		ios: {
			microphone: 'NSMicrophoneUsageDescription',
			speechRecognition: 'NSSpeechRecognitionUsageDescription',
		},
		android: {
			microphone: 'android.permission.RECORD_AUDIO',
		},
		default: {},
	});
};
