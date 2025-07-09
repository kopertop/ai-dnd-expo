import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Button, ScrollView, Text, TextInput, View } from 'react-native';

import { WorldChooser } from '../components/world-chooser';
import { WorldOption } from '../constants/worlds';
import { setupStyles } from '../styles/setup.styles';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const SetupScreen: React.FC = () => {
	const [worldChooserVisible, setWorldChooserVisible] = useState(true);
	const [selectedWorld, setSelectedWorld] = useState<WorldOption | null>(null);

	const [characterName, setCharacterName] = useState('');
	const [gameWorld, setGameWorld] = useState('');
	const [startingArea, setStartingArea] = useState('');
	const [startingLevels, setStartingLevels] = useState('1');
	const [numCharacters, setNumCharacters] = useState('1');
	const [playerRace, setPlayerRace] = useState('');
	const [playerClass, setPlayerClass] = useState('');
	const [customStory, setCustomStory] = useState('');

	const handleWorldSelect = (world: WorldOption) => {
		setSelectedWorld(world);
		setGameWorld(world.name);
		setWorldChooserVisible(false);
	};

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
			selectedWorld,
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
		<ThemedView style={setupStyles.container}>
			<Stack.Screen options={{ headerShown: false }} />
			<WorldChooser visible={worldChooserVisible} onSelect={handleWorldSelect} />
			{!worldChooserVisible && (
				<ScrollView contentContainerStyle={setupStyles.scrollViewContent}>
					<ThemedText type="title" style={setupStyles.title}>
						<Text>AI D&D Platform</Text>
					</ThemedText>
					<ThemedText type="subtitle" style={setupStyles.subtitle}>
						<Text>Game Setup</Text>
					</ThemedText>

					<View style={setupStyles.sectionBox}>
						<ThemedText style={setupStyles.label}>
							<Text>Your Character Name:</Text>
						</ThemedText>
						<TextInput
							style={setupStyles.input}
							placeholder="Enter your character's name"
							value={characterName}
							onChangeText={setCharacterName}
						/>

						<ThemedText style={setupStyles.label}>
							<Text>Game World:</Text>
						</ThemedText>
						<TextInput
							style={setupStyles.input}
							placeholder="e.g., Faerûn, Eberron"
							value={gameWorld}
							onChangeText={setGameWorld}
							editable={selectedWorld?.isCustom}
						/>

						<ThemedText style={setupStyles.label}>
							<Text>Starting Area:</Text>
						</ThemedText>
						<TextInput
							style={setupStyles.input}
							placeholder="e.g., Tavern, Dungeon Entrance"
							value={startingArea}
							onChangeText={setStartingArea}
						/>

						<ThemedText style={setupStyles.label}>
							<Text>Starting Levels:</Text>
						</ThemedText>
						<TextInput
							style={setupStyles.input}
							placeholder="e.g., 1"
							keyboardType="numeric"
							value={startingLevels}
							onChangeText={setStartingLevels}
						/>

						<ThemedText style={setupStyles.label}>
							<Text>Number of Characters Playing (including yours):</Text>
						</ThemedText>
						<TextInput
							style={setupStyles.input}
							placeholder="e.g., 4"
							keyboardType="numeric"
							value={numCharacters}
							onChangeText={setNumCharacters}
						/>
					</View>

					<View style={setupStyles.divider} />

					<View style={setupStyles.sectionBox}>
						<ThemedText type="subtitle" style={setupStyles.sectionTitle}>
							<Text>Your Character Details (D&D 4e)</Text>
						</ThemedText>
						<ThemedText style={setupStyles.label}>
							<Text>Race:</Text>
						</ThemedText>
						<TextInput
							style={setupStyles.input}
							placeholder="e.g., Human, Elf, Dwarf"
							value={playerRace}
							onChangeText={setPlayerRace}
						/>
						<ThemedText style={setupStyles.label}>
							<Text>Class:</Text>
						</ThemedText>
						<TextInput
							style={setupStyles.input}
							placeholder="e.g., Fighter, Wizard, Rogue"
							value={playerClass}
							onChangeText={setPlayerClass}
						/>
					</View>

					<View style={setupStyles.divider} />

					<View style={setupStyles.sectionBox}>
						<ThemedText type="subtitle" style={setupStyles.sectionTitle}>
							<Text>NPC Characters (Placeholder)</Text>
						</ThemedText>
						<ThemedText style={setupStyles.infoText}>
							<Text>
								NPC character setup will be implemented in a future iteration. For now, the AI will generate them based on the number of characters playing.
							</Text>
						</ThemedText>
					</View>

					<View style={setupStyles.divider} />

					<View style={setupStyles.sectionBox}>
						<ThemedText type="subtitle" style={setupStyles.sectionTitle}>
							<Text>Story Selection</Text>
						</ThemedText>
						<ThemedText style={setupStyles.label}>
							<Text>Custom Story (Optional):</Text>
						</ThemedText>
						<TextInput
							style={[setupStyles.input, setupStyles.textArea]}
							placeholder="Enter your custom story idea or leave blank for a generated one."
							multiline
							numberOfLines={4}
							value={customStory}
							onChangeText={setCustomStory}
						/>
						<ThemedText style={setupStyles.infoText}>
							<Text>Pre-defined stories will be available in a future update.</Text>
						</ThemedText>
					</View>

					<Button title="Start Game" onPress={handleStartGame} />
				</ScrollView>
			)}
		</ThemedView>
	);
};
SetupScreen.displayName = 'SetupScreen';
export default SetupScreen;
