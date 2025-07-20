/**
 * Cactus DM Screen
 *
 * A screen to showcase the Cactus DM integration
 */
import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import CactusDebugTest from '@/components/game/cactus-debug-test';
import { useColorScheme } from '@/hooks/use-color-scheme';

const CactusDMScreen: React.FC = () => {
	const colorScheme = useColorScheme();
	const backgroundColor = colorScheme === 'dark' ? '#121212' : '#F5F5F5';
	const textColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';

	return (
		<SafeAreaView style={[styles.container, { backgroundColor }]}>
			<View style={styles.header}>
				<Text style={[styles.title, { color: textColor }]}>AI Dungeon Master</Text>
				<Text style={[styles.subtitle, { color: textColor }]}>
					Powered by Cactus Compute
				</Text>
			</View>

			<View style={styles.content}>
				<CactusDebugTest />
			</View>
		</SafeAreaView>
	);
};

export default CactusDMScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		padding: 16,
		alignItems: 'center',
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
	},
	subtitle: {
		fontSize: 16,
		opacity: 0.7,
	},
	content: {
		flex: 1,
		padding: 10,
	},
});
