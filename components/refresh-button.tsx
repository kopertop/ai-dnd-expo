import Feather from '@expo/vector-icons/Feather';
import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';

interface RefreshButtonProps {
	onPress: () => void;
	disabled?: boolean;
	variant?: 'small' | 'default' | 'large';
	showLabel?: boolean;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
	onPress,
	disabled = false,
	variant = 'default',
	showLabel = false,
}) => {
	const buttonStyle: StyleProp<ViewStyle>[] = [
		styles.lobbyButton,
		variant === 'small' && styles.smallButton,
		variant === 'large' && styles.largeButton,
		disabled && { opacity: 0.5 },
	];

	const iconSize = variant === 'small' ? 14 : variant === 'large' ? 18 : 16;

	return (
		<TouchableOpacity style={buttonStyle} onPress={onPress} disabled={disabled}>
			<Feather name="refresh-cw" size={iconSize} color={disabled ? '#666666' : '#FFFFFF'} />
			{showLabel && (
				<ThemedText style={styles.lobbyButtonText}>
					Refresh
				</ThemedText>
			)}
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	lobbyButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 6,
		backgroundColor: '#8B6914',
		borderRadius: 6,
		marginRight: 8,
	},
	smallButton: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		marginRight: 4,
	},
	largeButton: {
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	lobbyButtonText: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: '600',
	},
	disabledButton: {
		opacity: 0.5,
	},
	disabledText: {
		color: '#9CA3AF',
	},
});

