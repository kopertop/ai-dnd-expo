import { Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CharacterSheetModal } from '@/components/character-sheet-modal';
import { ThemedText } from '@/components/themed-text';
import { useGameState } from '@/hooks/use-game-state';

const CharacterTab: React.FC = () => {
	const { loading, gameState } = useGameState();

	if (loading) {
		return (
			<SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
				<ActivityIndicator size="large" color="#C9B037" />
				<ThemedText>
					<Text>Loading character...</Text>
				</ThemedText>
			</SafeAreaView>
		);
	}

	if (!gameState) {
		return (
			<SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
				<ThemedText type="title">
					<Text>No saved game found.</Text>
				</ThemedText>
				<ThemedText style={{ marginTop: 8 }}>
					<Text>Please start a new game from the main menu.</Text>
				</ThemedText>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.characterContainer} edges={['top', 'left', 'right']}>
			<Stack.Screen options={{ headerShown: false }} />

			{/* Use the existing CharacterSheetModal but always visible */}
			<CharacterSheetModal
				visible={true}
				onClose={() => {
					// In tab mode, we don't close the modal
					// This could navigate back or do nothing
				}}
			/>
		</SafeAreaView>
	);
};

export default CharacterTab;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
		backgroundColor: '#F9F6EF',
	},
	characterContainer: {
		flex: 1,
		backgroundColor: '#F9F6EF',
	},
});
