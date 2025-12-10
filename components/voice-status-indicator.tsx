import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { ExpoIcon } from '@/components/expo-icon';
import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type VoiceStatus =
	| 'idle'
	| 'listening'
	| 'processing'
	| 'error'
	| 'permission_denied'
	| 'not_supported';

interface VoiceStatusIndicatorProps {
	status: VoiceStatus;
	message?: string;
	animated?: boolean;
	compact?: boolean;
}

/**
 * Visual indicator for voice recognition status
 * Provides clear feedback about current voice state
 */
export const VoiceStatusIndicator: React.FC<VoiceStatusIndicatorProps> = ({
	status,
	message,
	animated = true,
	compact = false,
}) => {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme ?? 'light'];
	const [pulseAnim] = React.useState(new Animated.Value(1));

	// Animate pulse effect for listening state
	React.useEffect(() => {
		if (status === 'listening' && animated) {
			const pulseAnimation = Animated.loop(
				Animated.sequence([
					Animated.timing(pulseAnim, {
						toValue: 1.2,
						duration: 800,
						useNativeDriver: true,
					}),
					Animated.timing(pulseAnim, {
						toValue: 1,
						duration: 800,
						useNativeDriver: true,
					}),
				]),
			);
			pulseAnimation.start();

			return () => {
				pulseAnimation.stop();
				pulseAnim.setValue(1);
			};
		}
	}, [status, animated, pulseAnim]);

	const getStatusConfig = () => {
		switch (status) {
			case 'idle':
				return {
					icon: 'microphone',
					color: colors.text + '60',
					backgroundColor: 'transparent',
					message: message || 'Tap to speak',
				};

			case 'listening':
				return {
					icon: 'microphone',
					color: '#FFFFFF',
					backgroundColor: '#4CAF50',
					message: message || 'Listening...',
				};

			case 'processing':
				return {
					icon: 'spinner',
					color: '#FFFFFF',
					backgroundColor: colors.tint,
					message: message || 'Processing...',
				};

			case 'error':
				return {
					icon: 'exclamation-triangle',
					color: '#FFFFFF',
					backgroundColor: '#ff4444',
					message: message || 'Error occurred',
				};

			case 'permission_denied':
				return {
					icon: 'lock',
					color: '#FFFFFF',
					backgroundColor: '#ff9500',
					message: message || 'Permission required',
				};

			case 'not_supported':
				return {
					icon: 'ban',
					color: colors.text + '60',
					backgroundColor: colors.text + '20',
					message: message || 'Not supported',
				};

			default:
				return {
					icon: 'microphone',
					color: colors.text + '60',
					backgroundColor: 'transparent',
					message: message || '',
				};
		}
	};

	const config = getStatusConfig();
	const styles = createStyles(colors, config.backgroundColor);

	if (compact) {
		return (
			<View style={styles.compactContainer}>
				<Animated.View
					style={[
						styles.compactIconContainer,
						status === 'listening' &&
							animated && {
							transform: [{ scale: pulseAnim }],
						},
					]}
				>
					<ExpoIcon icon={`FontAwesome:${config.icon}`} size={12} color={config.color} />
				</Animated.View>
				{config.message && (
					<Text style={styles.compactMessage} numberOfLines={1}>
						{config.message}
					</Text>
				)}
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<Animated.View
				style={[
					styles.iconContainer,
					status === 'listening' &&
						animated && {
						transform: [{ scale: pulseAnim }],
					},
				]}
			>
				<ExpoIcon icon={`FontAwesome:${config.icon}`} size={16} color={config.color} />
			</Animated.View>
			{config.message && <Text style={styles.message}>{config.message}</Text>}
		</View>
	);
};

const createStyles = (colors: typeof Colors.light, backgroundColor: string) =>
	StyleSheet.create({
		container: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingVertical: 8,
			paddingHorizontal: 12,
		},
		compactContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingVertical: 4,
			paddingHorizontal: 8,
		},
		iconContainer: {
			width: 32,
			height: 32,
			borderRadius: 16,
			backgroundColor,
			alignItems: 'center',
			justifyContent: 'center',
			marginRight: 12,
		},
		compactIconContainer: {
			width: 20,
			height: 20,
			borderRadius: 10,
			backgroundColor,
			alignItems: 'center',
			justifyContent: 'center',
			marginRight: 8,
		},
		message: {
			color: colors.text,
			fontSize: 14,
			fontWeight: '500',
		},
		compactMessage: {
			color: colors.text,
			fontSize: 12,
		},
	});
