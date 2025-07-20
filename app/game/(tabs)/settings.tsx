import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsModal } from '@/components/settings-modal';

const SettingsTab: React.FC = () => {
	return (
		<SafeAreaView style={styles.settingsContainer} edges={['top', 'left', 'right']}>
			<Stack.Screen options={{ headerShown: false }} />

			{/* Use the existing SettingsModal but always visible */}
			<SettingsModal
				visible={true}
				onClose={() => {
					// In tab mode, we don't close the modal
					// This could navigate back or do nothing
				}}
			/>
		</SafeAreaView>
	);
};

export default SettingsTab;

const styles = StyleSheet.create({
	settingsContainer: {
		flex: 1,
		backgroundColor: '#F9F6EF',
	},
});
