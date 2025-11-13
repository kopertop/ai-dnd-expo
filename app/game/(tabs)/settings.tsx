import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsView } from '@/components/settings-view';

const SettingsTab: React.FC = () => {
	return (
		<SafeAreaView style={styles.settingsContainer} edges={['left', 'right']}>
			<SettingsView />
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
