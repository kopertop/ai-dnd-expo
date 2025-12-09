import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
	Alert,
	PanResponder,
	Platform,
	ScrollView,
	Text,
	TouchableOpacity,
	View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { newGameStyles } from '../styles/new-game.styles';

import { CharacterReview } from '@/components/character-review';
import { ClassChooser } from '@/components/class-chooser';
import { LocationChooser } from '@/components/location-chooser';
import { RaceChooser } from '@/components/race-chooser';
import { SkillChooser } from '@/components/skill-chooser';
import { ThemedView } from '@/components/themed-view';
import { TraitChooser } from '@/components/trait-chooser';
import { WorldChooser } from '@/components/world-chooser';
import { useGameState } from '@/hooks/use-game-state';
import { useScreenSize } from '@/hooks/use-screen-size';
import { multiplayerClient } from '@/services/api/multiplayer-client';
import { Character } from '@/types/character';
import { ClassOption } from '@/types/class-option';
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
	const [characterIcon, setCharacterIcon] = useState('');
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
		icon: characterIcon || undefined,
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
		statusEffects: [],
		preparedSpells: [],
	});

	const handleFinalizeCharacterWithData = async (data: {
		name: string;
		description: string;
		stats: StatBlock;
		icon?: any;
	}) => {
		if (!selectedRace || !selectedClass || !selectedTrait || !selectedAttributes) {
			Alert.alert('Missing Info', 'Please complete all prior steps before continuing.');
			return;
		}

		const name = data.name.trim();
		const description = data.description.trim();

		if (!name || !description) {
			Alert.alert('Missing Info', 'Enter a name and background for your character.');
			return;
		}

		if (!isCharacterMode && (!selectedWorld || !selectedLocation)) {
			Alert.alert('Missing Info', 'Select a world and starting location to begin.');
			return;
		}

		setIsSaving(true);

		// Helper to resolve icon to string
		let finalIcon = characterIcon;
		if (data.icon) {
			if (typeof data.icon === 'string') {
				finalIcon = data.icon;
			} else if (typeof data.icon === 'object' && data.icon.uri) {
				finalIcon = data.icon.uri;
			}
			// If it's a number (require result), we might need to find the key from CHARACTER_IMAGE_OPTIONS
			// But for now, if it's not a string, we fallback to default logic or empty
		}

		const characterPayload: Character = {
			id: generateCharacterId(),
			level: 1,
			race: selectedRace?.name ?? 'Unknown',
			name: name,
			class: selectedClass?.name ?? 'Adventurer',
			trait: selectedTrait?.name,
			icon: finalIcon || undefined,
			description: description,
			stats: data.stats,
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
			statusEffects: [],
			preparedSpells: [],
		};

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

	const handleFinalizeCharacter = async () => {
		// Legacy handler - redirects to new handler with state
		await handleFinalizeCharacterWithData({
			name: characterName,
			description: customStory,
			stats: selectedAttributes!,
			icon: characterIcon
		});
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

				return (
					<CharacterReview
						name={characterName}
						description={customStory}
						race={selectedRace}
						classOption={selectedClass}
						baseStats={selectedAttributes}
						racialBonuses={selectedRace.stats}
						skills={selectedSkills.map(s => s.id)}
						onBack={handleBackNavigation}
						onFinish={async (finalData) => {
							// Update state with final values
							setCharacterName(finalData.name);
							setCustomStory(finalData.description);
							setSelectedAttributes(finalData.stats);
							// Handle icon if provided
							if (finalData.icon) {
								if (typeof finalData.icon === 'string') {
									// It's a URI string (uploaded image) or a key
									setCharacterIcon(finalData.icon);
								} else if (typeof finalData.icon === 'object' && finalData.icon.uri) {
									// Uploaded image object
									setCharacterIcon(finalData.icon.uri);
								} else {
									// Resource ID (number) or other format - store as is if possible or map
									// For now we might need to handle this carefully if backend expects string
									// If it's a local require(), we can't easily serialize it to backend without mapping
									// But CharacterReview passes what we gave it.

									// If it's a preset from our list, we should try to find its key
									// The PortraitSelector returns the source, but we might want the key for persistence
									// Let's rely on the fact that for now we might be just saving locally or ensuring we get a valid value
								}
							}

							// Proceed to finalize
							await handleFinalizeCharacterWithData({
								name: finalData.name,
								description: finalData.description,
								stats: finalData.stats,
								icon: finalData.icon
							});
						}}
					/>
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
