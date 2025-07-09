import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Button, ScrollView, Text, TextInput, View } from 'react-native';

import { CharacterReview } from '../components/character-review';
import { CharacterSheetBuilder } from '../components/character-sheet-builder';
import { ClassChooser } from '../components/class-chooser';
import { LocationChooser } from '../components/location-chooser';
import { RaceChooser } from '../components/race-chooser';
import { WorldChooser } from '../components/world-chooser';
import { ClassOption } from '../constants/classes';
import { LocationOption } from '../constants/locations';
import { RaceOption } from '../constants/races';
import { StatBlock } from '../constants/stats';
import { WorldOption } from '../constants/worlds';
import { newGameStyles } from '../styles/new-game.styles';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type WizardStep = 'world' | 'location' | 'race' | 'class' | 'character' | 'story' | 'summary';

const getDefaultBaseStats = (): StatBlock => ({ STR: 8, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 });

const NewGameScreen: React.FC = () => {
	const [currentStep, setCurrentStep] = useState<WizardStep>('world');
	const [selectedWorld, setSelectedWorld] = useState<WorldOption | null>(null);
	const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null);
	const [selectedRace, setSelectedRace] = useState<RaceOption | null>(null);
	const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null);
	const [showCharacterBuilder, setShowCharacterBuilder] = useState(false);

	const [characterName, setCharacterName] = useState('');
	const [gameWorld, setGameWorld] = useState('');
	const [startingArea, setStartingArea] = useState('');
	const [startingLevels, setStartingLevels] = useState('1');
	const [numCharacters, setNumCharacters] = useState('1');
	const [playerRace, setPlayerRace] = useState('');
	const [playerClass, setPlayerClass] = useState('');
	const [customStory, setCustomStory] = useState('');
	const [fullCharacterSheet, setFullCharacterSheet] = useState<object | null>(null);

	const handleWorldSelect = (world: WorldOption) => {
		setSelectedWorld(world);
		setGameWorld(world.name);
		setCurrentStep('location');
	};

	const handleLocationSelect = (location: LocationOption) => {
		setSelectedLocation(location);
		setStartingArea(location.name);
		setCurrentStep('race');
	};

	const handleRaceSelect = (race: RaceOption) => {
		setSelectedRace(race);
		setPlayerRace(race.name);
		setCurrentStep('class');
	};

	const handleClassSelect = (classOption: ClassOption) => {
		setSelectedClass(classOption);
		setPlayerClass(classOption.name);
		setCurrentStep('character');
	};

	const handleNextStep = () => {
		switch (currentStep) {
		case 'character':
			setCurrentStep('story');
			break;
		case 'story':
			setCurrentStep('summary');
			break;
		default:
			break;
		}
	};

	const handlePreviousStep = () => {
		switch (currentStep) {
		case 'location':
			setCurrentStep('world');
			break;
		case 'race':
			setCurrentStep('location');
			break;
		case 'class':
			setCurrentStep('race');
			break;
		case 'character':
			setCurrentStep('class');
			break;
		case 'story':
			setCurrentStep('character');
			break;
		case 'summary':
			setCurrentStep('story');
			break;
		default:
			break;
		}
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
			selectedLocation,
			selectedRace,
			selectedClass,
			fullCharacterSheet,
		};

		try {
			await AsyncStorage.setItem('gameState', JSON.stringify(gameState));
			Alert.alert('Game Saved', 'Your game state has been saved locally.');
			router.replace('/');
		} catch (error) {
			console.error('Failed to save game state:', error);
			Alert.alert('Error', 'Failed to save game state.');
		}
	};

	const handleCharacterCreate = (characterData: { name: string; race: string; class: string; level: number; [key: string]: any }) => {
		setFullCharacterSheet(characterData);
		setCharacterName(characterData.name);
		setPlayerRace(characterData.race);
		setPlayerClass(characterData.class);
		setStartingLevels(characterData.level.toString());
		setShowCharacterBuilder(false);
	};

	const getStepNumber = (step: WizardStep): number => {
		const steps = ['world', 'location', 'race', 'class', 'character', 'story', 'summary'];
		return steps.indexOf(step);
	};

	const renderStepIndicator = () => {
		const steps = ['world', 'location', 'race', 'class', 'character', 'story', 'summary'];
		const currentStepIndex = getStepNumber(currentStep);

		return (
			<View style={newGameStyles.stepIndicator}>
				{steps.map((step, index) => (
					<React.Fragment key={step}>
						<View
							style={[
								newGameStyles.stepDot,
								index === currentStepIndex && newGameStyles.stepDotActive,
								index < currentStepIndex && newGameStyles.stepDotCompleted,
							]}
						/>
						{index < steps.length - 1 && (
							<View
								style={[
									newGameStyles.stepLine,
									index < currentStepIndex && newGameStyles.stepLineCompleted,
								]}
							/>
						)}
					</React.Fragment>
				))}
			</View>
		);
	};

	const renderStepContent = () => {
		if (showCharacterBuilder) {
			return (
				<CharacterSheetBuilder
					onCharacterCreate={handleCharacterCreate}
					onCancel={() => setShowCharacterBuilder(false)}
					initialData={{
						name: characterName,
						race: playerRace,
						class: playerClass,
						level: parseInt(startingLevels) || 1,
					}}
				/>
			);
		}

		switch (currentStep) {
		case 'world':
			return <WorldChooser onSelect={handleWorldSelect} />;
		case 'location':
			return <LocationChooser onSelect={handleLocationSelect} />;
		case 'race':
			return <RaceChooser onSelect={handleRaceSelect} />;
		case 'class':
			return <ClassChooser onSelect={handleClassSelect} />;
		case 'character':
			return renderCharacterStep();
		case 'story':
			return renderStoryStep();
		case 'summary':
			return renderSummaryStep();
		default:
			return null;
		}
	};

	const renderCharacterStep = () => (
		<ScrollView contentContainerStyle={newGameStyles.scrollViewContent}>
			<ThemedText type="title" style={newGameStyles.title}>
				<Text>Character Creation</Text>
			</ThemedText>

			<View style={newGameStyles.sectionBox}>
				<ThemedText style={newGameStyles.label}>
					<Text>Your Character Name:</Text>
				</ThemedText>
				<TextInput
					style={newGameStyles.input}
					placeholder="Enter your character's name"
					value={characterName}
					onChangeText={setCharacterName}
				/>

				<ThemedText style={newGameStyles.label}>
					<Text>Starting Levels:</Text>
				</ThemedText>
				<TextInput
					style={newGameStyles.input}
					placeholder="e.g., 1"
					keyboardType="numeric"
					value={startingLevels}
					onChangeText={setStartingLevels}
				/>

				<ThemedText style={newGameStyles.label}>
					<Text>Number of Characters Playing (including yours):</Text>
				</ThemedText>
				<TextInput
					style={newGameStyles.input}
					placeholder="e.g., 4"
					keyboardType="numeric"
					value={numCharacters}
					onChangeText={setNumCharacters}
				/>
			</View>

			<View style={newGameStyles.sectionBox}>
				<ThemedText type="subtitle" style={newGameStyles.sectionTitle}>
					<Text>Your Character Details (D&D 5e)</Text>
				</ThemedText>
				<ThemedText style={newGameStyles.label}>
					<Text>Race:</Text>
				</ThemedText>
				<TextInput
					style={newGameStyles.input}
					placeholder="e.g., Human, Elf, Dwarf"
					value={playerRace}
					onChangeText={setPlayerRace}
				/>
				<ThemedText style={newGameStyles.label}>
					<Text>Class:</Text>
				</ThemedText>
				<TextInput
					style={newGameStyles.input}
					placeholder="e.g., Fighter, Wizard, Rogue"
					value={playerClass}
					onChangeText={setPlayerClass}
				/>

				<Button
					title="Create Detailed Character Sheet"
					onPress={() => setShowCharacterBuilder(true)}
				/>

				{fullCharacterSheet && (
					<ThemedText style={newGameStyles.infoText}>
						<Text>Full character sheet created for {characterName}</Text>
					</ThemedText>
				)}
			</View>

			<View style={newGameStyles.wizardNavigation}>
				<Button title="Back" onPress={handlePreviousStep} />
				<Button title="Next" onPress={handleNextStep} />
			</View>
		</ScrollView>
	);

	const renderStoryStep = () => (
		<ScrollView contentContainerStyle={newGameStyles.scrollViewContent}>
			<ThemedText type="title" style={newGameStyles.title}>
				<Text>Story Selection</Text>
			</ThemedText>

			<View style={newGameStyles.sectionBox}>
				<ThemedText style={newGameStyles.label}>
					<Text>Custom Story (Optional):</Text>
				</ThemedText>
				<TextInput
					style={[newGameStyles.input, newGameStyles.textArea]}
					placeholder="Enter your custom story idea or leave blank for a generated one."
					multiline
					numberOfLines={4}
					value={customStory}
					onChangeText={setCustomStory}
				/>
				<ThemedText style={newGameStyles.infoText}>
					<Text>Pre-defined stories will be available in a future update.</Text>
				</ThemedText>
			</View>

			<View style={newGameStyles.wizardNavigation}>
				<Button title="Back" onPress={handlePreviousStep} />
				<Button title="Next" onPress={handleNextStep} />
			</View>
		</ScrollView>
	);

	const renderSummaryStep = () => {
		if (!selectedRace || !selectedClass) {
			return (
				<View style={newGameStyles.sectionBox}>
					<Text>Missing race or class selection.</Text>
				</View>
			);
		}

		const baseStats = getDefaultBaseStats();
		const racialBonuses = selectedRace.statBonuses || {};

		return (
			<CharacterReview
				name={characterName}
				description={customStory || 'No background provided.'}
				race={selectedRace}
				classOption={selectedClass}
				baseStats={baseStats}
				racialBonuses={racialBonuses}
				onBack={handlePreviousStep}
				onFinish={handleStartGame}
			/>
		);
	};

	return (
		<ThemedView style={newGameStyles.container}>
			<Stack.Screen options={{ headerShown: false }} />
			{!showCharacterBuilder && renderStepIndicator()}
			{renderStepContent()}
		</ThemedView>
	);
};

NewGameScreen.displayName = 'NewGameScreen';
export default NewGameScreen;
