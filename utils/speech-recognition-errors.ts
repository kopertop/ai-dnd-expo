import { Alert, Platform } from 'react-native';

export interface SpeechRecognitionError {
	code: string;
	message: string;
	userMessage: string;
	canRetry: boolean;
	isTemporary: boolean;
	requiresAction: boolean;
	actionText?: string;
	onAction?: () => void;
}

/**
 * Speech recognition error handling utility
 * Provides user-friendly error messages and recovery suggestions
 */
export class SpeechRecognitionErrorHandler {
	private static instance: SpeechRecognitionErrorHandler;

	public static getInstance(): SpeechRecognitionErrorHandler {
		if (!SpeechRecognitionErrorHandler.instance) {
			SpeechRecognitionErrorHandler.instance = new SpeechRecognitionErrorHandler();
		}
		return SpeechRecognitionErrorHandler.instance;
	}

	/**
	 * Parse and handle speech recognition errors
	 */
	handleError(error: any): SpeechRecognitionError {
		const errorInfo = this.parseError(error);

		// Log error for debugging
		console.error('Speech Recognition Error:', {
			code: errorInfo.code,
			message: errorInfo.message,
			platform: Platform.OS,
		});

		return errorInfo;
	}

	/**
	 * Parse error into structured information
	 */
	private parseError(error: any): SpeechRecognitionError {
		// Handle expo-speech-recognition specific errors
		if (error && typeof error === 'object') {
			const errorCode = error.error || error.code;
			const errorMessage = error.message || error.toString();

			switch (errorCode) {
				case 'not-allowed':
				case 'permission-denied':
					return {
						code: 'PERMISSION_DENIED',
						message: errorMessage,
						userMessage:
							'Microphone permission is required for voice input. Please enable it in Settings.',
						canRetry: true,
						isTemporary: false,
						requiresAction: true,
						actionText: 'Open Settings',
						onAction: () => this.openSettings(),
					};

				case 'network':
				case 'network-error':
					return {
						code: 'NETWORK_ERROR',
						message: errorMessage,
						userMessage:
							'Network connection is required for voice recognition. Please check your internet connection and try again.',
						canRetry: true,
						isTemporary: true,
						requiresAction: false,
					};

				case 'no-speech':
				case 'no-speech-detected':
					return {
						code: 'NO_SPEECH',
						message: errorMessage,
						userMessage: 'No speech was detected. Please speak clearly and try again.',
						canRetry: true,
						isTemporary: true,
						requiresAction: false,
					};

				case 'aborted':
				case 'cancelled':
					return {
						code: 'CANCELLED',
						message: errorMessage,
						userMessage: 'Voice recognition was cancelled.',
						canRetry: true,
						isTemporary: true,
						requiresAction: false,
					};

				case 'audio-capture':
				case 'audio-capture-error':
					return {
						code: 'AUDIO_CAPTURE_ERROR',
						message: errorMessage,
						userMessage:
							'Unable to access microphone. Please check that no other app is using it and try again.',
						canRetry: true,
						isTemporary: true,
						requiresAction: false,
					};

				case 'service-not-allowed':
				case 'service-unavailable':
					return {
						code: 'SERVICE_UNAVAILABLE',
						message: errorMessage,
						userMessage: Platform.select({
							ios: 'Speech recognition service is unavailable. Please check your internet connection and try again.',
							android:
								'Speech recognition service is unavailable. Please ensure Google app is installed and updated.',
							default:
								'Speech recognition service is unavailable. Please try again later.',
						}),
						canRetry: true,
						isTemporary: true,
						requiresAction: false,
					};

				case 'language-not-supported':
					return {
						code: 'LANGUAGE_NOT_SUPPORTED',
						message: errorMessage,
						userMessage:
							'The selected language is not supported for voice recognition.',
						canRetry: false,
						isTemporary: false,
						requiresAction: false,
					};

				case 'recognizer-busy':
					return {
						code: 'RECOGNIZER_BUSY',
						message: errorMessage,
						userMessage:
							'Voice recognition is busy. Please wait a moment and try again.',
						canRetry: true,
						isTemporary: true,
						requiresAction: false,
					};

				default:
					// Check for common error patterns in message
					if (errorMessage.toLowerCase().includes('permission')) {
						return {
							code: 'PERMISSION_ERROR',
							message: errorMessage,
							userMessage:
								'Permission error occurred. Please check microphone permissions in Settings.',
							canRetry: true,
							isTemporary: false,
							requiresAction: true,
							actionText: 'Open Settings',
							onAction: () => this.openSettings(),
						};
					}

					if (errorMessage.toLowerCase().includes('network')) {
						return {
							code: 'NETWORK_ERROR',
							message: errorMessage,
							userMessage:
								'Network error occurred. Please check your internet connection.',
							canRetry: true,
							isTemporary: true,
							requiresAction: false,
						};
					}

					if (errorMessage.toLowerCase().includes('timeout')) {
						return {
							code: 'TIMEOUT_ERROR',
							message: errorMessage,
							userMessage: 'Voice recognition timed out. Please try speaking again.',
							canRetry: true,
							isTemporary: true,
							requiresAction: false,
						};
					}
			}
		}

		// Generic error fallback
		const message =
			error instanceof Error ? error.message : error?.toString() || 'Unknown error';
		return {
			code: 'UNKNOWN_ERROR',
			message,
			userMessage: 'An unexpected error occurred with voice recognition. Please try again.',
			canRetry: true,
			isTemporary: true,
			requiresAction: false,
		};
	}

	/**
	 * Show user-friendly error dialog
	 */
	showErrorDialog(errorInfo: SpeechRecognitionError, onRetry?: () => void): void {
		const buttons: any[] = [];

		// Add retry button if error is retryable
		if (errorInfo.canRetry && onRetry) {
			buttons.push({
				text: 'Try Again',
				onPress: onRetry,
			});
		}

		// Add action button if required
		if (errorInfo.requiresAction && errorInfo.onAction) {
			buttons.push({
				text: errorInfo.actionText || 'Action',
				onPress: errorInfo.onAction,
			});
		}

		// Always add OK/Cancel button
		buttons.push({
			text: buttons.length > 0 ? 'Cancel' : 'OK',
			style: 'cancel',
		});

		Alert.alert('Voice Recognition Error', errorInfo.userMessage, buttons);
	}

	/**
	 * Get visual feedback state for UI components
	 */
	getErrorState(errorInfo: SpeechRecognitionError): {
		showError: boolean;
		errorText: string;
		errorColor: string;
		canRetry: boolean;
	} {
		return {
			showError: true,
			errorText: errorInfo.userMessage,
			errorColor: errorInfo.isTemporary ? '#ff9500' : '#ff4444', // Orange for temporary, red for permanent
			canRetry: errorInfo.canRetry,
		};
	}

	/**
	 * Check if error should be shown to user or handled silently
	 */
	shouldShowError(errorInfo: SpeechRecognitionError): boolean {
		// Don't show errors for cancelled operations or no speech detected
		return !['CANCELLED', 'NO_SPEECH'].includes(errorInfo.code);
	}

	/**
	 * Get recovery suggestions for different error types
	 */
	getRecoverySuggestions(errorInfo: SpeechRecognitionError): string[] {
		switch (errorInfo.code) {
			case 'PERMISSION_DENIED':
				return [
					'Enable microphone permission in Settings',
					'Restart the app after enabling permissions',
				];

			case 'NETWORK_ERROR':
				return [
					'Check your internet connection',
					'Try switching between WiFi and mobile data',
					'Wait a moment and try again',
				];

			case 'NO_SPEECH':
				return [
					'Speak clearly and loudly',
					"Ensure you're in a quiet environment",
					'Hold the device closer to your mouth',
				];

			case 'AUDIO_CAPTURE_ERROR':
				return [
					'Close other apps that might be using the microphone',
					'Check that your microphone is not muted',
					'Try restarting the app',
				];

			case 'SERVICE_UNAVAILABLE':
				return (
					Platform.select({
						ios: [
							'Check your internet connection',
							'Ensure Siri is enabled in Settings',
							'Try again in a few moments',
						],
						android: [
							'Ensure Google app is installed and updated',
							'Check your internet connection',
							'Clear Google app cache if needed',
						],
						default: ['Check your internet connection', 'Try again in a few moments'],
					}) || []
				);

			default:
				return [
					'Try again in a few moments',
					'Check your internet connection',
					'Restart the app if the problem persists',
				];
		}
	}

	/**
	 * Open device settings
	 */
	private async openSettings(): Promise<void> {
		try {
			const { Linking } = await import('react-native');
			await Linking.openSettings();
		} catch (error) {
			console.error('Failed to open settings:', error);
		}
	}
}

/**
 * Convenience function to get the singleton instance
 */
export const getSpeechRecognitionErrorHandler = () => SpeechRecognitionErrorHandler.getInstance();

/**
 * Utility function to handle speech recognition errors with user feedback
 */
export const handleSpeechRecognitionError = (
	error: any,
	onRetry?: () => void,
	showDialog: boolean = true,
): SpeechRecognitionError => {
	const handler = getSpeechRecognitionErrorHandler();
	const errorInfo = handler.handleError(error);

	if (showDialog && handler.shouldShowError(errorInfo)) {
		handler.showErrorDialog(errorInfo, onRetry);
	}

	return errorInfo;
};
