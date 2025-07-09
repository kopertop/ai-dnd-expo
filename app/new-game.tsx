import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { CharacterReview } from '../components/character-review';
import { ClassChooser } from '../components/class-chooser';
import { LocationChooser } from '../components/location-chooser';
import { RaceChooser } from '../components/race-chooser';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { WorldChooser } from '../components/world-chooser';
import { ClassOption } from '../constants/classes';
import { LocationOption } from '../constants/locations';
import { RaceOption } from '../constants/races';
import { StatBlock } from '../constants/stats';
import { WorldOption } from '../constants/worlds';
import { newGameStyles } from '../styles/new-game.styles';

import { ThemedView } from '@/components/themed-view';

type WizardStep = 'world' | 'location' | 'race' | 'class' | 'character';

const getDefaultBaseStats = (): StatBlock => ({ STR: 8, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 });

const NewGameScreen: React.FC = () => {
	const [currentStep, setCurrentStep] = useState<WizardStep>('world');
	const [selectedWorld, setSelectedWorld] = useState<WorldOption | null>(null);
	const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null);
	const [selectedRace, setSelectedRace] = useState<RaceOption | null>(null);
	const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null);
	const [characterName, setCharacterName] = useState('');
	const [customStory, setCustomStory] = useState('');
	const [showConfirm, setShowConfirm] = useState(false);
	const [pendingCharacter, setPendingCharacter] = useState<any>(null);

	const handleWorldSelect = (world: WorldOption) => {
		setSelectedWorld(world);
		setCurrentStep('location');
	};

	const handleLocationSelect = (location: LocationOption) => {
		setSelectedLocation(location);
		setCurrentStep('race');
	};

	const handleRaceSelect = (race: RaceOption) => {
		setSelectedRace(race);
		setCurrentStep('class');
	};

	const handleClassSelect = (classOption: ClassOption) => {
		setSelectedClass(classOption);
		setCurrentStep('character');
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
		default:
			break;
		}
	};

	const handleCharacterFinish = (characterData: any) => {
		setPendingCharacter(characterData);
		setShowConfirm(true);
	};

	const handleConfirmStart = async () => {
		if (!pendingCharacter || !selectedWorld || !selectedLocation || !selectedRace || !selectedClass) return;
		const gameState = {
			characterName: pendingCharacter.name,
			gameWorld: selectedWorld.name,
			startingArea: selectedLocation.name,
			startingLevels: 1,
			numCharacters: 1,
			playerRace: selectedRace.name,
			playerClass: selectedClass.name,
			customStory,
			selectedWorld,
			selectedLocation,
			selectedRace,
			selectedClass,
			characterSheet: pendingCharacter,
		};
		try {
			await AsyncStorage.setItem('gameState', JSON.stringify(gameState));
			setShowConfirm(false);
			setPendingCharacter(null);
			router.replace('/');
		} catch (error) {
			console.error('Failed to save game state:', error);
			Alert.alert('Error', 'Failed to save game state.');
		}
	};

	const getStepNumber = (step: WizardStep): number => {
		const steps = ['world', 'location', 'race', 'class', 'character'];
		return steps.indexOf(step);
	};

	const renderStepIndicator = () => {
		const steps = ['world', 'location', 'race', 'class', 'character'];
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
		let baseStats: StatBlock | undefined;
		let racialBonuses: Partial<StatBlock> | undefined;

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
			if (!selectedRace || !selectedClass) {
				return (
					<View style={newGameStyles.sectionBox}>
						<Text>Missing race or class selection.</Text>
					</View>
				);
			}
			baseStats = getDefaultBaseStats();
			racialBonuses = selectedRace.statBonuses || {};
			return (
				<CharacterReview
					name={characterName}
					description={customStory}
					race={selectedRace}
					classOption={selectedClass}
					baseStats={baseStats}
					racialBonuses={racialBonuses}
					onBack={handlePreviousStep}
					onFinish={handleCharacterFinish}
				/>
			);
		default:
			return null;
		}
	};

	return (
		<ThemedView style={newGameStyles.container}>
			<Stack.Screen options={{ headerShown: false }} />
			{renderStepIndicator()}
			{renderStepContent()}
			<ConfirmModal
				visible={showConfirm}
				title="Start Game?"
				message="Are you sure you want to start the game with this character? This will save your progress."
				onConfirm={handleConfirmStart}
				onCancel={() => setShowConfirm(false)}
				confirmLabel="Start"
				cancelLabel="Cancel"
			/>
		</ThemedView>
	);
};

NewGameScreen.displayName = 'NewGameScreen';
export default NewGameScreen;
