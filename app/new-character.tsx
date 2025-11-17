import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
	Alert,
	PanResponder,
	Platform,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { newGameStyles } from '../styles/new-game.styles';

import { AttributePicker } from '@/components/attribute-picker';
import { ClassChooser } from '@/components/class-chooser';
import { LocationChooser } from '@/components/location-chooser';
import { RaceChooser } from '@/components/race-chooser';
import { SkillChooser } from '@/components/skill-chooser';
import { ThemedView } from '@/components/themed-view';
import { TraitChooser } from '@/components/trait-chooser';
import { WorldChooser } from '@/components/world-chooser';
import { generateRandomBackground } from '@/constants/backgrounds';
import { useGameState } from '@/hooks/use-game-state';
import { useScreenSize } from '@/hooks/use-screen-size';
import { multiplayerClient } from '@/services/api/multiplayer-client';
import { ClassOption } from '@/types/class-option';
import { Character } from '@/types/character';
import { LocationOption } from '@/types/location-option';
import { RaceOption } from '@/types/race-option';
import { Skill } from '@/types/skill';
import { StatBlock } from '@/types/stats';
import { TraitOption } from '@/types/trait-option';
import { WorldOption } from '@/types/world-option';

type WizardStep = 'world' | 'location' | 'race' | 'class' | 'trait' | 'attributes' | 'skills' | 'character';

const SOLO_WIZARD_STEPS: WizardStep[] = [
	'world',
	'location',
	'race',
	'class',
	'trait',
	'attributes',
	'skills',
	'character',
];

const CHARACTER_ONLY_STEPS: WizardStep[] = ['race', 'class', 'trait', 'attributes', 'skills', 'character'];

const NewGameScreen: React.FC = () => {
	const params = useLocalSearchParams<{ mode?: string }>();
	const modeParam = Array.isArray(params.mode) ? params.mode[0] : params.mode;
	const wizardMode = modeParam === 'character' ? 'character' : 'solo';
	const isCharacterMode = wizardMode === 'character';
	const steps = useMemo<WizardStep[]>(
		() => (isCharacterMode ? CHARACTER_ONLY_STEPS : SOLO_WIZARD_STEPS),
		[isCharacterMode],
	);
	const [currentStep, setCurrentStep] = useState<WizardStep>(steps[0]);
	const [selectedWorld, setSelectedWorld] = useState<WorldOption | null>(null);
	const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null);
	const [selectedRace, setSelectedRace] = useState<RaceOption | null>(null);
	const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null);
	const [selectedTrait, setSelectedTrait] = useState<TraitOption | null>(null);
	const [selectedAttributes, setSelectedAttributes] = useState<StatBlock | null>(null);
	const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
	const [characterName, setCharacterName] = useState('');
	const [customStory, setCustomStory] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const { isMobile } = useScreenSize();
	const insets = useSafeAreaInsets();

	useEffect(() => {
		setCurrentStep(steps[0]);
	}, [steps]);

	const { save } = useGameState();
	const addItem = async (item: string, quantity: number) => { };
	const equipItem = async (item: string) => { };

	// Pan responder for swipe gestures
	const panResponder = PanResponder.create({
		onMoveShouldSetPanResponder: (evt, gestureState) => {
			// Only respond to horizontal swipes that are significant and from the edge
			const isHorizontalSwipe = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
			const isSignificantSwipe = Math.abs(gestureState.dx) > 30;
			const isFromLeftEdge = evt.nativeEvent.pageX < 50; // Only trigger from left edge

			return isHorizontalSwipe && isSignificantSwipe && isFromLeftEdge && currentStep !== steps[0];
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
				handleBackNavigation();
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
		setCurrentStep('trait');
	};

	const handleTraitSelect = (trait: TraitOption) => {
		setSelectedTrait(trait);
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

	const generateCharacterId = () =>
		`character-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

	const buildCharacterPayload = (): Character => ({
		id: generateCharacterId(),
		level: 1,
		race: selectedRace?.name ?? 'Unknown',
		name: characterName.trim(),
		class: selectedClass?.name ?? 'Adventurer',
		trait: selectedTrait?.name,
		description: customStory.trim(),
		stats: selectedAttributes!,
		skills: selectedSkills.map(skill => skill.id),
		inventory: [],
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
		health: 10,
		maxHealth: 10,
		actionPoints: 3,
		maxActionPoints: 3,
	});

	const handleFinalizeCharacter = async () => {
		if (!selectedRace || !selectedClass || !selectedTrait || !selectedAttributes) {
			Alert.alert('Missing Info', 'Please complete all prior steps before continuing.');
			return;
		}

		if (!characterName.trim() || !customStory.trim()) {
			Alert.alert('Missing Info', 'Enter a name and background for your character.');
			return;
		}

		if (!isCharacterMode && (!selectedWorld || !selectedLocation)) {
			Alert.alert('Missing Info', 'Select a world and starting location to begin.');
			return;
		}

		const characterPayload = buildCharacterPayload();
		setIsSaving(true);

		try {
			if (isCharacterMode) {
				await multiplayerClient.createCharacter(characterPayload);
				Alert.alert(
					'Character Saved',
					`${characterPayload.name} has been added to your roster.`,
				);
				router.replace('/characters');
			} else {
				const gameState = {
					characters: [characterPayload],
					playerCharacterId: characterPayload.id,
					gameWorld: selectedWorld?.name ?? '',
					startingArea: selectedLocation?.name ?? '',
				};

				await save(gameState);
				await addItem('rations', 2);
				await addItem('tent', 1);
				await addItem('healing_potion', 2);

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
			}
		} catch (error) {
			console.error('Failed to finalize character:', error);
			Alert.alert(
				'Error',
				isCharacterMode
					? 'Failed to save your character. Please try again.'
					: 'Failed to start the game. Please try again.',
			);
		} finally {
			setIsSaving(false);
		}
	};

	// Add this function to handle going back a step
	const handlePreviousStep = () => {
		console.log('🔄 Going back from step:', currentStep);
		const stepsList = steps;
		const currentIndex = stepsList.indexOf(currentStep);
		if (currentIndex > 0) {
			const previousStep = stepsList[currentIndex - 1];
			console.log('🔄 Going back to step:', previousStep);
			setCurrentStep(previousStep);

			// Clear data that depends on the step we're going back to
			if (previousStep === 'world') {
				// Going back to world selection - clear everything
				setSelectedWorld(null);
				setSelectedLocation(null);
				setSelectedRace(null);
				setSelectedClass(null);
				setSelectedTrait(null);
				setSelectedAttributes(null);
				setSelectedSkills([]);
				setCharacterName('');
				setCustomStory('');
			} else if (previousStep === 'location') {
				// Going back to location - clear location and everything after
				setSelectedLocation(null);
				setSelectedRace(null);
				setSelectedClass(null);
				setSelectedTrait(null);
				setSelectedAttributes(null);
				setSelectedSkills([]);
				setCharacterName('');
				setCustomStory('');
			} else if (previousStep === 'race') {
				// Going back to race - clear race and everything after
				setSelectedRace(null);
				setSelectedClass(null);
				setSelectedTrait(null);
				setSelectedAttributes(null);
				setSelectedSkills([]);
				setCharacterName('');
				setCustomStory('');
			} else if (previousStep === 'class') {
				// Going back to class - clear class and everything after
				setSelectedClass(null);
				setSelectedTrait(null);
				setSelectedAttributes(null);
				setSelectedSkills([]);
				setCharacterName('');
				setCustomStory('');
			} else if (previousStep === 'trait') {
				// Going back to trait - clear trait and everything after
				setSelectedTrait(null);
				setSelectedAttributes(null);
				setSelectedSkills([]);
				setCharacterName('');
				setCustomStory('');
			} else if (previousStep === 'attributes') {
				// Going back to attributes - clear attributes and everything after
				setSelectedAttributes(null);
				setSelectedSkills([]);
				setCharacterName('');
				setCustomStory('');
			} else if (previousStep === 'skills') {
				// Going back to skills - clear skills and character data
				setSelectedSkills([]);
				setCharacterName('');
				setCustomStory('');
			}
		}
	};

	const handleBackNavigation = () => {
		const currentIndex = steps.indexOf(currentStep);
		if (currentIndex > 0) {
			handlePreviousStep();
			return;
		}

		if (Platform.OS === 'web') {
			if (typeof window !== 'undefined' && window.history.length > 0) {
				window.history.back();
			} else {
				router.back();
			}
		} else {
			router.back();
		}
	};

	const getStepNumber = (step: WizardStep): number => steps.indexOf(step);

	const renderStepIndicator = () => {
		const currentSteps = steps;
		const currentStepIndex = getStepNumber(currentStep);

		return (
			<View
				style={isMobile ? newGameStyles.stepIndicatorMobile : newGameStyles.stepIndicator}
			>
				{currentSteps.map((step, index) => (
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
						{index < currentSteps.length - 1 && (
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
			case 'trait':
				return (
					<View
						style={isMobile ? newGameStyles.sectionBoxMobile : newGameStyles.sectionBox}
					>
						<TraitChooser onSelect={handleTraitSelect} />
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
				if (!selectedRace || !selectedClass || !selectedTrait || !selectedAttributes) {
					return (
						<View
							style={
								isMobile ? newGameStyles.sectionBoxMobile : newGameStyles.sectionBox
							}
						>
							<Text>Missing race, class, trait, or attributes selection.</Text>
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
									if (isSaving) {
										return;
									}
									handleFinalizeCharacter().catch(() => undefined);
								}}
							>
								<Text
									style={[
										newGameStyles.submitButtonText,
										isMobile && { fontSize: 18 },
									]}
								>
									{isSaving
										? 'Saving...'
										: isCharacterMode
											? 'Save Character'
											: 'Start Game'}
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
			<Stack.Screen
				options={{
					headerShown: false,
				}}
			/>
			<View {...panResponder.panHandlers} style={{ flex: 1 }}>
				<ScrollView
					contentContainerStyle={[
						newGameStyles.scrollViewContent,
						isMobile && newGameStyles.scrollViewContentMobile,
						{
							paddingTop: insets.top,
						},
					]}
					showsVerticalScrollIndicator={true}
					bounces={false}
				>
					{renderStepIndicator()}
					{/* Swipe hint */}
					{currentStep !== 'world' && (
						<TouchableOpacity
							onPress={handleBackNavigation}
							activeOpacity={0.7}
						>
							<View style={newGameStyles.swipeHint}>
								<Text style={newGameStyles.swipeHintText}>
									← Swipe right to go back
								</Text>
							</View>
						</TouchableOpacity>
					)}
					{renderStepContent()}
				</ScrollView>
			</View>
		</ThemedView>
	);
};

NewGameScreen.displayName = 'NewGameScreen';
export default NewGameScreen;
