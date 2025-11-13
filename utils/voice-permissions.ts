import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { Alert, Linking, Platform } from 'react-native';

export interface PermissionResult {
	granted: boolean;
	canAskAgain: boolean;
	status: 'granted' | 'denied' | 'undetermined' | 'restricted';
}

export interface VoicePermissionError {
	code: string;
	message: string;
	userMessage: string;
	canRetry: boolean;
	showSettings: boolean;
}

/**
 * Comprehensive voice permission handling utility
 * Provides user-friendly error messages and graceful fallbacks
 */
export class VoicePermissionManager {
	private static instance: VoicePermissionManager;

	public static getInstance(): VoicePermissionManager {
		if (!VoicePermissionManager.instance) {
			VoicePermissionManager.instance = new VoicePermissionManager();
		}
		return VoicePermissionManager.instance;
	}

	/**
	 * Check current voice permissions without requesting them
	 */
	async checkPermissions(): Promise<PermissionResult> {
		try {
			const result = await ExpoSpeechRecognitionModule.getPermissionsAsync();

			return {
				granted: result.granted,
				canAskAgain: result.canAskAgain ?? true,
				status: result.granted ? 'granted' : result.canAskAgain ? 'undetermined' : 'denied',
			};
		} catch (error) {
			console.error('Failed to check voice permissions:', error);
			return {
				granted: false,
				canAskAgain: false,
				status: 'denied',
			};
		}
	}

	/**
	 * Request voice permissions with user-friendly error handling
	 */
	async requestPermissions(): Promise<PermissionResult> {
		try {
			// First check if we already have permissions
			const currentStatus = await this.checkPermissions();
			if (currentStatus.granted) {
				return currentStatus;
			}

			// If we can't ask again, show settings dialog
			if (!currentStatus.canAskAgain) {
				this.showPermissionDeniedDialog();
				return currentStatus;
			}

			// Request permissions
			const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();

			const permissionResult: PermissionResult = {
				granted: result.granted,
				canAskAgain: result.canAskAgain ?? true,
				status: result.granted ? 'granted' : result.canAskAgain ? 'undetermined' : 'denied',
			};

			// Handle permission denial
			if (!result.granted) {
				this.handlePermissionDenied(permissionResult);
			}

			return permissionResult;
		} catch (error) {
			console.error('Failed to request voice permissions:', error);
			this.handlePermissionError(error);

			return {
				granted: false,
				canAskAgain: false,
				status: 'denied',
			};
		}
	}

	/**
	 * Handle permission denial with appropriate user messaging
	 */
	private handlePermissionDenied(result: PermissionResult): void {
		if (!result.canAskAgain) {
			this.showPermissionDeniedDialog();
		} else {
			this.showPermissionRequiredDialog();
		}
	}

	/**
	 * Show dialog when permissions are permanently denied
	 */
	private showPermissionDeniedDialog(): void {
		const title = 'Voice Features Disabled';
		const message = Platform.select({
			ios: 'Microphone and Speech Recognition permissions have been denied. To enable voice features, please go to Settings > Privacy & Security > Microphone and Speech Recognition, then enable permissions for this app.',
			android:
				'Microphone permission has been denied. To enable voice features, please go to Settings > Apps > Permissions > Microphone and enable permission for this app.',
			default:
				'Voice permissions have been denied. Please enable them in your device settings to use voice features.',
		});

		Alert.alert(title, message, [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Open Settings',
				onPress: () => {
					Linking.openSettings().catch(err => {
						console.error('Failed to open settings:', err);
					});
				},
			},
		]);
	}

	/**
	 * Show dialog when permissions are required but not permanently denied
	 */
	private showPermissionRequiredDialog(): void {
		const title = 'Voice Features Require Permission';
		const message = Platform.select({
			ios: 'This app needs access to your microphone and speech recognition to provide voice chat features. You can enable these in the next dialog or later in Settings.',
			android:
				'This app needs access to your microphone to provide voice chat features. You can enable this in the next dialog or later in Settings.',
			default:
				'Voice features require microphone permission. Please enable it to use voice chat.',
		});

		Alert.alert(title, message, [{ text: 'OK' }]);
	}

	/**
	 * Handle permission request errors
	 */
	private handlePermissionError(error: unknown): void {
		const errorMessage = error instanceof Error ? error.message : 'Unknown permission error';

		Alert.alert(
			'Permission Error',
			`Failed to request voice permissions: ${errorMessage}. Voice features will be disabled.`,
			[{ text: 'OK' }],
		);
	}

	/**
	 * Get user-friendly error information for voice permission issues
	 */
	getPermissionError(error: unknown): VoicePermissionError {
		if (error instanceof Error) {
			// Handle specific error types
			if (error.message.includes('permission')) {
				return {
					code: 'PERMISSION_DENIED',
					message: error.message,
					userMessage:
						'Voice features require microphone permission. Please enable it in Settings.',
					canRetry: true,
					showSettings: true,
				};
			}

			if (error.message.includes('not supported')) {
				return {
					code: 'NOT_SUPPORTED',
					message: error.message,
					userMessage: 'Voice features are not supported on this device.',
					canRetry: false,
					showSettings: false,
				};
			}
		}

		// Generic error
		return {
			code: 'UNKNOWN_ERROR',
			message: error instanceof Error ? error.message : 'Unknown error',
			userMessage: 'Voice features are temporarily unavailable. Please try again later.',
			canRetry: true,
			showSettings: false,
		};
	}

	/**
	 * Check if voice features are supported on the current platform
	 */
	isVoiceSupported(): boolean {
		return Platform.OS === 'ios' || Platform.OS === 'android';
	}

	/**
	 * Get platform-specific permission requirements for documentation
	 */
	getPermissionRequirements() {
		return Platform.select({
			ios: {
				microphone: 'NSMicrophoneUsageDescription',
				speechRecognition: 'NSSpeechRecognitionUsageDescription',
				description: 'iOS requires both microphone and speech recognition permissions',
			},
			android: {
				microphone: 'android.permission.RECORD_AUDIO',
				description: 'Android requires microphone permission for speech recognition',
			},
			default: {
				description: 'Voice features are not supported on this platform',
			},
		});
	}

	/**
	 * Show a graceful fallback message when voice features are unavailable
	 */
	showVoiceUnavailableMessage(reason: 'permissions' | 'not_supported' | 'error' = 'error'): void {
		let title = 'Voice Features Unavailable';
		let message = '';

		switch (reason) {
			case 'permissions':
				message =
					'Voice features require microphone permission. You can still use text input to chat with the DM.';
				break;
			case 'not_supported':
				message =
					'Voice features are not supported on this device. You can use text input to chat with the DM.';
				break;
			case 'error':
			default:
				message =
					'Voice features are temporarily unavailable. You can use text input to chat with the DM.';
				break;
		}

		Alert.alert(title, message, [{ text: 'OK' }]);
	}
}

/**
 * Convenience function to get the singleton instance
 */
export const getVoicePermissionManager = () => VoicePermissionManager.getInstance();

/**
 * Utility function to check if voice features should be enabled
 */
export const shouldEnableVoiceFeatures = async (): Promise<boolean> => {
	const manager = getVoicePermissionManager();

	if (!manager.isVoiceSupported()) {
		return false;
	}

	const permissions = await manager.checkPermissions();
	return permissions.granted;
};
