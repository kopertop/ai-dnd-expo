import { Stack, router } from 'expo-router';
import React, { useState } from 'react';
import {
	Alert,
	PanResponder,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';

import { AttributePicker } from '@/components/attribute-picker';
import { ClassChooser } from '@/components/class-chooser';
import { LocationChooser } from '@/components/location-chooser';
import { RaceChooser } from '@/components/race-chooser';
import { SkillChooser } from '@/components/skill-chooser';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { WorldChooser } from '@/components/world-chooser';
import { generateRandomBackground } from '@/constants/backgrounds';
import { useGameState } from '@/hooks/use-game-state';
import { newGameStyles } from '../styles/new-game.styles';
import { ClassOption } from '@/types/class-option';
import { LocationOption } from '@/types/location-option';
import { RaceOption } from '@/types/race-option';
import { Skill } from '@/types/skill';
import { StatBlock } from '@/types/stats';
import { WorldOption } from '@/types/world-option';

import { ThemedView } from '@/components/themed-view';
import { useScreenSize } from '@/hooks/use-screen-size';

type WizardStep = 'world' | 'location' | 'race' | 'class' | 'attributes' | 'skills' | 'character';

const NewGameScreen: React.FC = () => {
	const [currentStep, setCurrentStep] = useState<WizardStep>('world');
	const [selectedWorld, setSelectedWorld] = useState<WorldOption | null>(null);
	const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null);
	const [selectedRace, setSelectedRace] = useState<RaceOption | null>(null);
	const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null);
	const [selectedAttributes, setSelectedAttributes] = useState<StatBlock | null>(null);
	const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
	const [characterName, setCharacterName] = useState('');
	const [customStory, setCustomStory] = useState('');
	const [showConfirm, setShowConfirm] = useState(false);
	const [pendingCharacter, setPendingCharacter] = useState<any>(null);
	const { isMobile } = useScreenSize();

	const { save } = useGameState();
	const addItem = async (item: string, quantity: number) => {};
	const equipItem = async (item: string) => {};

	// Pan responder for swipe gestures
	const panResponder = PanResponder.create({
		onMoveShouldSetPanResponder: (evt, gestureState) => {
			// Only respond to horizontal swipes that are significant
			return (
				Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
				Math.abs(gestureState.dx) > 20
			);
		},
		onPanResponderGrant: () => {
			// Gesture started
		},
		onPanResponderMove: () => {
			// Optional: Add visual feedback during swipe
		},
		onPanResponderRelease: (evt, gestureState) => {
			// Swipe right (positive dx) = go back
			if (gestureState.dx > 50 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
				handlePreviousStep();
			}
			// Swipe left (negative dx) could be used for forward navigation if desired
			// For now, we'll only implement back navigation
		},
	});

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
		setCurrentStep('attributes');
	};

	const handleAttributesConfirm = (attributes: StatBlock) => {
		setSelectedAttributes(attributes);
		setCurrentStep('skills');
	};

	const handleSkillsSelect = (skills: Skill[]) => {
		setSelectedSkills(skills);
		setCurrentStep('character');
	};

	const handleConfirmStart = async () => {
		if (
			!pendingCharacter ||
			!selectedWorld ||
			!selectedLocation ||
			!selectedRace ||
			!selectedClass
		) {
			console.error('❌ Missing required data for character creation');
			return;
		}

		// Generate unique character ID
		const characterId = `character-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

		// Create proper Character object that matches CharacterSchema
		const character = {
			id: characterId,
			level: 1, // Always start at level 1
			race: selectedRace.name, // Required field from race selection
			name: pendingCharacter.name,
			class: selectedClass.name, // Required field from class selection
			description: pendingCharacter.description || '',
			stats: pendingCharacter.stats,
			skills: selectedSkills.map(s => s.id), // Use selectedSkills
			inventory: [], // Will be populated below
			equipped: {
				helmet: null,
				chest: null,
				arms: null,
				legs: null,
				boots: null,
				mainHand: null,
				offHand: null,
				accessory: null,
			},
			health: pendingCharacter.health || 10,
			maxHealth: pendingCharacter.maxHealth || 10,
			actionPoints: pendingCharacter.actionPoints || 3,
			maxActionPoints: pendingCharacter.maxActionPoints || 3,
		};

		// Create proper GameState structure
		const gameState = {
			characters: [character],
			playerCharacterId: characterId,
			gameWorld: selectedWorld.name,
			startingArea: selectedLocation.name,
		};

		try {
			// Save the properly structured game state using the new hook
			await save(gameState);
			setShowConfirm(false);
			setPendingCharacter(null);

			// Now add items to inventory using the inventory manager
			// (which can now successfully load the character)
			await addItem('rations', 2);
			await addItem('tent', 1);
			await addItem('healing_potion', 2);

			// Add class-appropriate gear
			if (selectedClass.id === 'fighter') {
				await addItem('sword', 1);
				await equipItem('sword');
			}
			if (selectedClass.id === 'wizard') {
				await addItem('staff', 1);
				await equipItem('staff');
			}
			if (selectedClass.id === 'rogue') {
				await addItem('dagger', 1);
				await equipItem('dagger');
			}
			if (selectedClass.id === 'cleric') {
				await addItem('mace', 1);
				await equipItem('mace');
			}

			router.replace('/game');
		} catch (error) {
			console.error('Failed to save game state:', error);
			Alert.alert('Error', 'Failed to save game state.');
		}
	};

	// Add this function to handle going back a step
	const handlePreviousStep = () => {
		const steps: WizardStep[] = [
			'world',
			'location',
			'race',
			'class',
			'attributes',
			'skills',
			'character',
		];
		const currentIndex = steps.indexOf(currentStep);
		if (currentIndex > 0) {
			setCurrentStep(steps[currentIndex - 1]);
		}
	};

	const getStepNumber = (step: WizardStep): number => {
		const steps = ['world', 'location', 'race', 'class', 'attributes', 'skills', 'character'];
		return steps.indexOf(step);
	};

	const renderStepIndicator = () => {
		const steps = ['world', 'location', 'race', 'class', 'attributes', 'skills', 'character'];
		const currentStepIndex = getStepNumber(currentStep);

		return (
			<View
				style={isMobile ? newGameStyles.stepIndicatorMobile : newGameStyles.stepIndicator}
			>
				{steps.map((step, index) => (
					<React.Fragment key={step}>
						<View
							style={[
								isMobile ? newGameStyles.stepDotMobile : newGameStyles.stepDot,
								index === currentStepIndex &&
									(isMobile
										? newGameStyles.stepDotActiveMobile
										: newGameStyles.stepDotActive),
								index < currentStepIndex && newGameStyles.stepDotCompleted,
							]}
						/>
						{index < steps.length - 1 && (
							<View
								style={[
									isMobile
										? newGameStyles.stepLineMobile
										: newGameStyles.stepLine,
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
		switch (currentStep) {
			case 'world':
				return (
					<View
						style={isMobile ? newGameStyles.sectionBoxMobile : newGameStyles.sectionBox}
					>
						<WorldChooser onSelect={handleWorldSelect} />
					</View>
				);
			case 'location':
				return (
					<View
						style={isMobile ? newGameStyles.sectionBoxMobile : newGameStyles.sectionBox}
					>
						<LocationChooser onSelect={handleLocationSelect} />
					</View>
				);
			case 'race':
				return (
					<View
						style={isMobile ? newGameStyles.sectionBoxMobile : newGameStyles.sectionBox}
					>
						<RaceChooser onSelect={handleRaceSelect} />
					</View>
				);
			case 'class':
				return (
					<View
						style={isMobile ? newGameStyles.sectionBoxMobile : newGameStyles.sectionBox}
					>
						<ClassChooser onSelect={handleClassSelect} />
					</View>
				);
			case 'attributes':
				if (!selectedClass) return null;
				return (
					<View style={{ flex: 1, position: 'relative' }}>
						<AttributePicker
							classOption={selectedClass}
							onConfirm={handleAttributesConfirm}
						/>
					</View>
				);
			case 'skills':
				return (
					<View style={{ flex: 1, position: 'relative' }}>
						<SkillChooser
							onSelect={handleSkillsSelect}
							initialSkills={selectedSkills}
							maxSkills={4}
						/>
					</View>
				);
			case 'character': {
				if (!selectedRace || !selectedClass || !selectedAttributes) {
					return (
						<View
							style={
								isMobile ? newGameStyles.sectionBoxMobile : newGameStyles.sectionBox
							}
						>
							<Text>Missing race, class, or attributes selection.</Text>
						</View>
					);
				}
				// Handler for generating a random background
				const handleRandomBackground = (raceName: string, className: string) => {
					const randomBg = generateRandomBackground(raceName, className);
					setCustomStory(randomBg);
				};
				return (
					<View style={{ flex: 1, flexDirection: 'column' }}>
						{/* Header Section */}
						<View
							style={{
								paddingHorizontal: isMobile ? 16 : 24,
								paddingTop: isMobile ? 16 : 24,
								paddingBottom: isMobile ? 8 : 12,
							}}
						>
							<Text
								style={isMobile ? newGameStyles.titleMobile : newGameStyles.title}
							>
								Finalize Your Character
							</Text>
						</View>

						{/* Scrollable Content */}
						<ScrollView
							style={{ flex: 1 }}
							contentContainerStyle={{
								paddingHorizontal: isMobile ? 16 : 24,
								paddingBottom: isMobile ? 20 : 24,
								flexGrow: 1,
							}}
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator={true}
						>
							{/* Character Name Section */}
							<View style={{ marginBottom: isMobile ? 16 : 24 }}>
								<Text style={newGameStyles.label}>Character Name</Text>
								<TextInput
									style={[
										newGameStyles.input,
										isMobile && { fontSize: 16, paddingVertical: 12 },
									]}
									placeholder="Enter character name"
									value={characterName}
									onChangeText={setCharacterName}
									maxLength={32}
								/>
							</View>

							{/* Background Section - Flexible */}
							<View style={{ flex: 1, flexDirection: 'column' }}>
								<Text style={newGameStyles.label}>Background / Description</Text>
								<TouchableOpacity
									style={[
										newGameStyles.submitButton,
										{
											marginBottom: 10,
											width: '100%',
											paddingVertical: isMobile ? 14 : 10,
										},
									]}
									onPress={() =>
										handleRandomBackground(
											selectedRace.name,
											selectedClass.name,
										)
									}
								>
									<Text style={newGameStyles.submitButtonText}>
										Generate Random Background
									</Text>
								</TouchableOpacity>
								<TextInput
									style={[
										newGameStyles.input,
										{
											flex: 1,
											minHeight: isMobile ? 200 : 150,
											fontSize: 18,
											padding: 16,
											lineHeight: 26,
											textAlignVertical: 'top',
											borderWidth: 2,
											borderRadius: 8,
										},
									]}
									placeholder="Describe your character's background, goals, or story..."
									value={customStory}
									onChangeText={setCustomStory}
									multiline
									scrollEnabled={true}
									maxLength={400}
								/>
							</View>
						</ScrollView>
						{/* Fixed Bottom Button */}
						<View
							style={{
								backgroundColor: isMobile
									? 'rgba(249, 246, 239, 0.98)'
									: 'rgba(255,255,255,0.95)',
								padding: isMobile ? 16 : 12,
								borderTopWidth: isMobile ? 2 : 1,
								borderTopColor: isMobile ? '#C9B037' : '#eee',
								shadowColor: '#000',
								shadowOffset: { width: 0, height: -2 },
								shadowOpacity: 0.1,
								shadowRadius: 4,
								elevation: 8,
							}}
						>
							<TouchableOpacity
								style={[
									characterName.trim() && customStory.trim()
										? newGameStyles.submitButton
										: newGameStyles.submitButtonDisabled,
									{
										width: '100%',
										margin: 0,
										borderRadius: 8,
										paddingVertical: isMobile ? 16 : 12,
										minHeight: isMobile ? 54 : 'auto',
									},
								]}
								disabled={!(characterName.trim() && customStory.trim())}
								onPress={async () => {
									const characterData = {
										name: characterName,
										description: customStory,
										stats: selectedAttributes,
										skills: selectedSkills.map(s => s.id),
									};

									if (
										!selectedWorld ||
										!selectedLocation ||
										!selectedRace ||
										!selectedClass ||
										!selectedAttributes
									) {
										console.error(
											'❌ Missing required data for character creation',
										);
										Alert.alert(
											'Error',
											'Missing required character data. Please go back and complete all steps.',
										);
										return;
									}

									try {
										// Generate unique character ID
										const characterId = `character-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

										// Create proper Character object that matches CharacterSchema
										const character = {
											id: characterId,
											level: 1, // Always start at level 1
											race: selectedRace.name, // Required field from race selection
											name: characterData.name,
											class: selectedClass.name, // Required field from class selection
											description: characterData.description || '',
											stats: characterData.stats,
											skills: selectedSkills.map(s => s.id), // Use selectedSkills
											inventory: [], // Will be populated below
											equipped: {
												helmet: null,
												chest: null,
												arms: null,
												legs: null,
												boots: null,
												mainHand: null,
												offHand: null,
												accessory: null,
											},
											health: 10, // Default starting health
											maxHealth: 10,
											actionPoints: 3, // Default starting action points
											maxActionPoints: 3,
										};

										// Create proper GameState structure
										const gameState = {
											characters: [character],
											playerCharacterId: characterId,
											gameWorld: selectedWorld.name,
											startingArea: selectedLocation.name,
										};

										// Save the properly structured game state using the new hook
										await save(gameState);

										// Now add items to inventory using the inventory manager
										// (which can now successfully load the character)
										await addItem('rations', 2);
										await addItem('tent', 1);
										await addItem('healing_potion', 2);

										// Add class-appropriate gear
										if (selectedClass.id === 'fighter') {
											await addItem('sword', 1);
											await equipItem('sword');
										}
										if (selectedClass.id === 'wizard') {
											await addItem('staff', 1);
											await equipItem('staff');
										}
										if (selectedClass.id === 'rogue') {
											await addItem('dagger', 1);
											await equipItem('dagger');
										}
										if (selectedClass.id === 'cleric') {
											await addItem('mace', 1);
											await equipItem('mace');
										}
										router.replace('/game');
									} catch (error) {
										console.error('Failed to save game state:', error);
										Alert.alert(
											'Error',
											'Failed to save game state. Please try again.',
										);
									}
								}}
							>
								<Text
									style={[
										newGameStyles.submitButtonText,
										isMobile && { fontSize: 18 },
									]}
								>
									Start Game
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				);
			}
			default:
				return null;
		}
	};

	return (
		<ThemedView style={[newGameStyles.container, isMobile && newGameStyles.containerMobile]}>
			<Stack.Screen options={{ headerShown: !isMobile }} />
			<View {...panResponder.panHandlers} style={{ flex: 1 }}>
				<ScrollView
					contentContainerStyle={[
						newGameStyles.scrollViewContent,
						isMobile && newGameStyles.scrollViewContentMobile,
					]}
					showsVerticalScrollIndicator={true}
					bounces={false}
				>
					{renderStepIndicator()}
					{renderStepContent()}
				</ScrollView>
			</View>
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
