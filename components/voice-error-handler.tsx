import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SpeechRecognitionError } from '@/utils/speech-recognition-errors';

interface VoiceErrorHandlerProps {
	error: SpeechRecognitionError | null;
	onRetry?: () => void;
	onDismiss?: () => void;
	compact?: boolean;
}

/**
 * Reusable component for displaying voice-related errors with appropriate actions
 */
export const VoiceErrorHandler: React.FC<VoiceErrorHandlerProps> = ({
	error,
	onRetry,
	onDismiss,
	compact = false,
}) => {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme ?? 'light'];

	if (!error) {
		return null;
	}

	const getErrorColor = () => {
		if (error.isTemporary) {
			return '#ff9500'; // Orange for temporary errors
		}
		return '#ff4444'; // Red for permanent errors
	};

	const getErrorIcon = () => {
		switch (error.code) {
			case 'PERMISSION_DENIED':
			case 'PERMISSION_ERROR':
				return 'lock';
			case 'NETWORK_ERROR':
				return 'wifi';
			case 'NO_SPEECH':
				return 'microphone-slash';
			case 'AUDIO_CAPTURE_ERROR':
				return 'microphone';
			case 'SERVICE_UNAVAILABLE':
				return 'cloud';
			default:
				return 'exclamation-triangle';
		}
	};

	const styles = createStyles(colors, getErrorColor());

	if (compact) {
		return (
			<View style={styles.compactContainer}>
				<FontAwesome
					name={getErrorIcon()}
					size={12}
					color="#FFFFFF"
					style={styles.compactIcon}
				/>
				<Text style={styles.compactText} numberOfLines={1}>
					{error.userMessage}
				</Text>
				{error.canRetry && onRetry && (
					<TouchableOpacity style={styles.compactRetryButton} onPress={onRetry}>
						<FontAwesome name="refresh" size={12} color="#FFFFFF" />
					</TouchableOpacity>
				)}
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<FontAwesome name={getErrorIcon()} size={16} color="#FFFFFF" style={styles.icon} />
				<Text style={styles.title}>
					{error.isTemporary ? 'Temporary Issue' : 'Voice Error'}
				</Text>
				{onDismiss && (
					<TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
						<FontAwesome name="times" size={14} color="#FFFFFF" />
					</TouchableOpacity>
				)}
			</View>

			<Text style={styles.message}>{error.userMessage}</Text>

			{(error.canRetry || error.requiresAction) && (
				<View style={styles.actions}>
					{error.canRetry && onRetry && (
						<TouchableOpacity style={styles.actionButton} onPress={onRetry}>
							<FontAwesome name="refresh" size={14} color="#FFFFFF" />
							<Text style={styles.actionButtonText}>Try Again</Text>
						</TouchableOpacity>
					)}
					{error.requiresAction && error.onAction && (
						<TouchableOpacity
							style={[styles.actionButton, styles.primaryActionButton]}
							onPress={error.onAction}
						>
							<FontAwesome name="cog" size={14} color="#FFFFFF" />
							<Text style={styles.actionButtonText}>
								{error.actionText || 'Settings'}
							</Text>
						</TouchableOpacity>
					)}
				</View>
			)}
		</View>
	);
};

const createStyles = (colors: typeof Colors.light, errorColor: string) =>
	StyleSheet.create({
		container: {
			backgroundColor: errorColor,
			borderRadius: 8,
			padding: 12,
			marginVertical: 4,
		},
		compactContainer: {
			backgroundColor: errorColor,
			borderRadius: 6,
			paddingHorizontal: 8,
			paddingVertical: 4,
			flexDirection: 'row',
			alignItems: 'center',
		},
		header: {
			flexDirection: 'row',
			alignItems: 'center',
			marginBottom: 4,
		},
		icon: {
			marginRight: 8,
		},
		compactIcon: {
			marginRight: 6,
		},
		title: {
			color: '#FFFFFF',
			fontSize: 14,
			fontWeight: '600',
			flex: 1,
		},
		dismissButton: {
			padding: 4,
		},
		message: {
			color: '#FFFFFF',
			fontSize: 13,
			lineHeight: 18,
		},
		compactText: {
			color: '#FFFFFF',
			fontSize: 12,
			flex: 1,
		},
		actions: {
			flexDirection: 'row',
			marginTop: 8,
			gap: 8,
		},
		actionButton: {
			backgroundColor: 'rgba(255, 255, 255, 0.2)',
			paddingHorizontal: 12,
			paddingVertical: 6,
			borderRadius: 6,
			flexDirection: 'row',
			alignItems: 'center',
		},
		primaryActionButton: {
			backgroundColor: 'rgba(255, 255, 255, 0.3)',
		},
		actionButtonText: {
			color: '#FFFFFF',
			fontSize: 12,
			fontWeight: '600',
			marginLeft: 6,
		},
		compactRetryButton: {
			backgroundColor: 'rgba(255, 255, 255, 0.2)',
			padding: 4,
			borderRadius: 4,
			marginLeft: 6,
		},
	});
