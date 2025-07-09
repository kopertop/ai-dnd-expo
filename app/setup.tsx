import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
	},
	scrollViewContent: {
		flexGrow: 1,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 10,
	},
	subtitle: {
		fontSize: 18,
		marginBottom: 10,
	},
	label: {
		fontSize: 16,
		marginBottom: 5,
	},
	input: {
		height: 40,
		borderColor: 'gray',
		borderWidth: 1,
		marginBottom: 10,
	},
	sectionTitle: {
		fontSize: 18,
		marginBottom: 10,
	},
	infoText: {
		fontSize: 14,
		marginBottom: 10,
	},
	textArea: {
		height: 100,
		textAlignVertical: 'top',
	},
});

const SetupScreen: React.FC = () => {
	const [characterName, setCharacterName] = useState('');
	const [gameWorld, setGameWorld] = useState('');
	const [startingArea, setStartingArea] = useState('');
	const [startingLevels, setStartingLevels] = useState('1');
	const [numCharacters, setNumCharacters] = useState('1');
	const [playerRace, setPlayerRace] = useState('');
	const [playerClass, setPlayerClass] = useState('');
	const [customStory, setCustomStory] = useState('');

	const handleStartGame = async () => {
		if (!characterName || !gameWorld || !startingArea || !startingLevels || !numCharacters || !playerRace || !playerClass) {
			Alert.alert('Missing Information', 'Please fill in all required fields.');
			return;
		}

		const gameState = {
			characterName,
			gameWorld,
			startingArea,
			startingLevels: parseInt(startingLevels, 10),
			numCharacters: parseInt(numCharacters, 10),
			playerRace,
			playerClass,
			customStory,
			// Add more game state as needed
		};

		try {
			await AsyncStorage.setItem('gameState', JSON.stringify(gameState));
			Alert.alert('Game Saved', 'Your game state has been saved locally.');
			router.replace('/'); // Navigate to the main game tabs
		} catch (error) {
			console.error('Failed to save game state:', error);
			Alert.alert('Error', 'Failed to save game state.');
		}
	};

	return (
		<ThemedView style={styles.container}>
			<Stack.Screen options={{ headerShown: false }} />
			<ScrollView contentContainerStyle={styles.scrollViewContent}>
				<ThemedText type="title" style={styles.title}>
					<Text>AI D&D Platform</Text>
				</ThemedText>
				<ThemedText type="subtitle" style={styles.subtitle}>
					<Text>Game Setup</Text>
				</ThemedText>

				<ThemedText style={styles.label}>
					<Text>Your Character Name:</Text>
				</ThemedText>
				<TextInput
					style={styles.input}
					placeholder="Enter your character's name"
					value={characterName}
					onChangeText={setCharacterName}
				/>

				<ThemedText style={styles.label}>
					<Text>Game World:</Text>
				</ThemedText>
				<TextInput
					style={styles.input}
					placeholder="e.g., Faerûn, Eberron"
					value={gameWorld}
					onChangeText={setGameWorld}
				/>

				<ThemedText style={styles.label}>
					<Text>Starting Area:</Text>
				</ThemedText>
				<TextInput
					style={styles.input}
					placeholder="e.g., Tavern, Dungeon Entrance"
					value={startingArea}
					onChangeText={setStartingArea}
				/>

				<ThemedText style={styles.label}>
					<Text>Starting Levels:</Text>
				</ThemedText>
				<TextInput
					style={styles.input}
					placeholder="e.g., 1"
					keyboardType="numeric"
					value={startingLevels}
					onChangeText={setStartingLevels}
				/>

				<ThemedText style={styles.label}>
					<Text>Number of Characters Playing (including yours):</Text>
				</ThemedText>
				<TextInput
					style={styles.input}
					placeholder="e.g., 4"
					keyboardType="numeric"
					value={numCharacters}
					onChangeText={setNumCharacters}
				/>

				<ThemedText type="subtitle" style={styles.sectionTitle}>
					<Text>Your Character Details (D&D 4e)</Text>
				</ThemedText>
				<ThemedText style={styles.label}>
					<Text>Race:</Text>
				</ThemedText>
				<TextInput
					style={styles.input}
					placeholder="e.g., Human, Elf, Dwarf"
					value={playerRace}
					onChangeText={setPlayerRace}
				/>
				<ThemedText style={styles.label}>
					<Text>Class:</Text>
				</ThemedText>
				<TextInput
					style={styles.input}
					placeholder="e.g., Fighter, Wizard, Rogue"
					value={playerClass}
					onChangeText={setPlayerClass}
				/>

				<ThemedText type="subtitle" style={styles.sectionTitle}>
					<Text>NPC Characters (Placeholder)</Text>
				</ThemedText>
				<ThemedText style={styles.infoText}>
					<Text>
						NPC character setup will be implemented in a future iteration.
						For now, the AI will generate them based on the number of characters playing.
					</Text>
				</ThemedText>

				<ThemedText type="subtitle" style={styles.sectionTitle}>
					<Text>Story Selection</Text>
				</ThemedText>
				<ThemedText style={styles.label}>
					<Text>Custom Story (Optional):</Text>
				</ThemedText>
				<TextInput
					style={[styles.input, styles.textArea]}
					placeholder="Enter your custom story idea or leave blank for a generated one."
					multiline
					numberOfLines={4}
					value={customStory}
					onChangeText={setCustomStory}
				/>
				<ThemedText style={styles.infoText}>
					<Text>
						Pre-defined stories will be available in a future update.
					</Text>
				</ThemedText>

				<Button title="Start Game" onPress={handleStartGame} />
			</ScrollView>
		</ThemedView>
	);
};
SetupScreen.displayName = 'SetupScreen';
export default SetupScreen;
