import { useCallback, useState } from 'react';

import {
	getSpeechRecognitionErrorHandler,
	SpeechRecognitionError,
} from '@/utils/speech-recognition-errors';
import { getVoicePermissionManager } from '@/utils/voice-permissions';

export interface VoiceErrorState {
	currentError: SpeechRecognitionError | null;
	hasError: boolean;
	isTemporary: boolean;
	canRetry: boolean;
	showError: boolean;
}

export interface VoiceErrorHandling {
	errorState: VoiceErrorState;
	handleError: (error: any, context?: string) => SpeechRecognitionError;
	handlePermissionError: (error: any) => void;
	clearError: () => void;
	retryWithErrorHandling: (operation: () => Promise<void>) => Promise<void>;
	showErrorDialog: (onRetry?: () => void) => void;
}

/**
 * Comprehensive hook for handling voice-related errors
 * Provides centralized error management with user feedback
 */
export const useVoiceErrorHandling = (): VoiceErrorHandling => {
	const [currentError, setCurrentError] = useState<SpeechRecognitionError | null>(null);

	const errorState: VoiceErrorState = {
		currentError,
		hasError: currentError !== null,
		isTemporary: currentError?.isTemporary ?? false,
		canRetry: currentError?.canRetry ?? false,
		showError: currentError !== null,
	};

	/**
	 * Handle speech recognition errors with context
	 */
	const handleError = useCallback((error: any, context?: string): SpeechRecognitionError => {
		const handler = getSpeechRecognitionErrorHandler();
		const errorInfo = handler.handleError(error);

		// Add context to error if provided
		if (context) {
			console.error(`Voice error in ${context}:`, errorInfo);
		}

		setCurrentError(errorInfo);
		return errorInfo;
	}, []);

	/**
	 * Handle permission-specific errors
	 */
	const handlePermissionError = useCallback((error: any) => {
		const manager = getVoicePermissionManager();
		const errorInfo = manager.getPermissionError(error);

		// Convert permission error to speech recognition error format
		const speechError: SpeechRecognitionError = {
			code: errorInfo.code,
			message: errorInfo.message,
			userMessage: errorInfo.userMessage,
			canRetry: errorInfo.canRetry,
			isTemporary: false,
			requiresAction: errorInfo.showSettings,
			actionText: 'Open Settings',
			onAction: errorInfo.showSettings
				? () => {
						manager.showVoiceUnavailableMessage('permissions');
					}
				: undefined,
		};

		setCurrentError(speechError);
	}, []);

	/**
	 * Clear current error state
	 */
	const clearError = useCallback(() => {
		setCurrentError(null);
	}, []);

	/**
	 * Retry an operation with automatic error handling
	 */
	const retryWithErrorHandling = useCallback(
		async (operation: () => Promise<void>) => {
			try {
				clearError();
				await operation();
			} catch (error) {
				handleError(error, 'retry operation');
			}
		},
		[clearError, handleError],
	);

	/**
	 * Show error dialog with retry option
	 */
	const showErrorDialog = useCallback(
		(onRetry?: () => void) => {
			if (!currentError) return;

			const handler = getSpeechRecognitionErrorHandler();
			handler.showErrorDialog(currentError, onRetry);
		},
		[currentError],
	);

	return {
		errorState,
		handleError,
		handlePermissionError,
		clearError,
		retryWithErrorHandling,
		showErrorDialog,
	};
};

/**
 * Hook for handling voice errors with automatic UI feedback
 */
export const useVoiceErrorWithFeedback = () => {
	const errorHandling = useVoiceErrorHandling();

	/**
	 * Handle error and automatically show user feedback
	 */
	const handleErrorWithFeedback = useCallback(
		(error: unknown, context?: string, onRetry?: () => void, showDialog: boolean = false) => {
			const errorInfo = errorHandling.handleError(error, context);

			if (showDialog) {
				errorHandling.showErrorDialog(onRetry);
			}

			return errorInfo;
		},
		[errorHandling],
	);

	return {
		...errorHandling,
		handleErrorWithFeedback,
	};
};
