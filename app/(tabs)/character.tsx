import { Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { CharacterSheetModal } from '@/components/character-sheet-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useGameState } from '@/hooks/use-game-state';

const CharacterTab: React.FC = () => {
	const { loading, gameState } = useGameState();

	if (loading) {
		return (
			<ThemedView style={styles.container}>
				<ActivityIndicator size="large" color="#C9B037" />
				<ThemedText>
					<Text>Loading character...</Text>
				</ThemedText>
			</ThemedView>
		);
	}

	if (!gameState) {
		return (
			<ThemedView style={styles.container}>
				<ThemedText type="title">
					<Text>No saved game found.</Text>
				</ThemedText>
				<ThemedText style={{ marginTop: 8 }}>
					<Text>Please start a new game from the main menu.</Text>
				</ThemedText>
			</ThemedView>
		);
	}

	return (
		<View style={styles.characterContainer}>
			<Stack.Screen options={{ headerShown: false }} />

			{/* Use the existing CharacterSheetModal but always visible */}
			<CharacterSheetModal
				visible={true}
				onClose={() => {
					// In tab mode, we don't close the modal
					// This could navigate back or do nothing
				}}
			/>
		</View>
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
