import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { SettingsModal } from './settings-modal';
import { ThemedText } from './themed-text';

export const AppFooter: React.FC = () => {
	const [settingsVisible, setSettingsVisible] = useState(false);

	return (
		<View style={styles.footer}>
			<View style={styles.linksRow}>
				<TouchableOpacity
					style={styles.linkButton}
					onPress={() => setSettingsVisible(true)}
					accessibilityRole="button"
					accessibilityLabel="Open Settings"
				>
					<ThemedText style={styles.linkText}>Settings</ThemedText>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.linkButton}
					onPress={() => router.push('/licenses')}
					accessibilityRole="button"
					accessibilityLabel="View Licenses and Credits"
				>
					<ThemedText style={styles.linkText}>Licenses &amp; Credits</ThemedText>
				</TouchableOpacity>
			</View>
			<SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
		</View>
	);
};

const styles = StyleSheet.create({
	footer: {
		borderTopWidth: 1,
		borderTopColor: '#E2D3B3',
		paddingVertical: 16,
		paddingHorizontal: 24,
		backgroundColor: '#FDF7EC',
	},
	linksRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 24,
		flexWrap: 'wrap',
	},
	linkButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 999,
		backgroundColor: '#E2D3B3',
	},
	linkText: {
		color: '#3B2F1B',
		fontWeight: '600',
	},
});


