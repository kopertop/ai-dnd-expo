import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface DMActionBannerProps {
	visible: boolean;
	message?: string;
}

export const DMActionBanner = ({ visible, message = 'DM is taking an action' }: DMActionBannerProps) => {
	if (!visible) return null;

	return (
		<ThemedView style={styles.wrapper}>
			<View
				style={styles.banner}
				accessibilityRole="alert"
				testID="dm-action-banner"
				data-testid="dm-action-banner"
			>
				<ThemedText style={styles.text}>⏸️ {message}</ThemedText>
			</View>
		</ThemedView>
	);
};

const styles = StyleSheet.create({
	wrapper: {
		marginBottom: 8,
	},
	banner: {
		backgroundColor: '#FEF3C7',
		borderColor: '#F59E0B',
		borderWidth: 2,
		borderRadius: 10,
		paddingVertical: 10,
		paddingHorizontal: 12,
		alignItems: 'center',
	},
	text: {
		color: '#92400E',
		fontWeight: '700',
		fontSize: 14,
		textAlign: 'center',
	},
});

export default DMActionBanner;
