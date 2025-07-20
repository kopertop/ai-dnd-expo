import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { getVoicePermissionManager } from '@/utils/voice-permissions';

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

			const manager = getVoicePermissionManager();
			const result = await manager.requestPermissions();

			setHasPermissions(result.granted);

			if (!result.granted) {
				const errorMessage =
					'Voice permissions are required for speech recognition features';
				setError(errorMessage);
			}

			return result.granted;
		} catch (err) {
			const manager = getVoicePermissionManager();
			const errorInfo = manager.getPermissionError(err);

			console.error('❌ Permission request failed:', errorInfo);
			setError(errorInfo.userMessage);
			setHasPermissions(false);
			return false;
		} finally {
			setIsLoading(false);
		}
	}, []);

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
