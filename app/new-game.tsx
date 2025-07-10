import { Stack, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, PanResponder, ScrollView, Text, View } from 'react-native';

import { CharacterReview } from '../components/character-review';
import { ClassChooser } from '../components/class-chooser';
import { LocationChooser } from '../components/location-chooser';
import { RaceChooser } from '../components/race-chooser';
import { SkillChooser } from '../components/skill-chooser';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { WorldChooser } from '../components/world-chooser';
import { useGameState } from '../hooks/use-game-state';
import { useInventoryManager } from '../hooks/use-inventory-manager';
import { newGameStyles } from '../styles/new-game.styles';
import { ClassOption } from '../types/class-option';
import { LocationOption } from '../types/location-option';
import { RaceOption } from '../types/race-option';
import { Skill } from '../types/skill';
import { StatBlock } from '../types/stats';
import { WorldOption } from '../types/world-option';

import { ThemedView } from '@/components/themed-view';


type WizardStep = 'world' | 'location' | 'race' | 'class' | 'skills' | 'character';

const getDefaultBaseStats = (): StatBlock => ({ STR: 8, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 });

const NewGameScreen: React.FC = () => {
	const [currentStep, setCurrentStep] = useState<WizardStep>('world');
	const [selectedWorld, setSelectedWorld] = useState<WorldOption | null>(null);
	const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null);
	const [selectedRace, setSelectedRace] = useState<RaceOption | null>(null);
	const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null);
	const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
	const [characterName, setCharacterName] = useState('');
	const [customStory, setCustomStory] = useState('');
	const [showConfirm, setShowConfirm] = useState(false);
	const [pendingCharacter, setPendingCharacter] = useState<any>(null);
	const [screenData, setScreenData] = useState(Dimensions.get('window'));

	const { save } = useGameState();
	const { addItem, equipItem } = useInventoryManager();

	// Track screen dimensions for responsive layout
	useEffect(() => {
		const onChange = (result: { window: any; screen: any }) => {
			setScreenData(result.window);
		};

		const subscription = Dimensions.addEventListener('change', onChange);
		return () => subscription?.remove();
	}, []);

	// Determine if we should use mobile layout
	const isMobile = screenData.width < 768; // Bootstrap md breakpoint

	// Pan responder for swipe gestures
	const panResponder = PanResponder.create({
		onMoveShouldSetPanResponder: (evt, gestureState) => {
			// Only respond to horizontal swipes that are significant
			return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 20;
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
		setCurrentStep('skills');
	};

	const handleSkillsSelect = (skills: Skill[]) => {
		setSelectedSkills(skills);
		setCurrentStep('character');
	};

	const handleCharacterFinish = (characterData: any) => {
		setPendingCharacter(characterData);
		setShowConfirm(true);
	};

	const handleConfirmStart = async () => {
		console.log('🚀 Starting character creation...');
		console.log('📝 Pending character:', pendingCharacter);
		console.log('🌍 Selected world:', selectedWorld?.name);
		console.log('📍 Selected location:', selectedLocation?.name);
		console.log('🧙 Selected race:', selectedRace?.name);
		console.log('⚔️ Selected class:', selectedClass?.name);

		if (!pendingCharacter || !selectedWorld || !selectedLocation || !selectedRace || !selectedClass) {
			console.error('❌ Missing required data for character creation');
			return;
		}

		// Generate unique character ID
		const characterId = `character-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		console.log('🆔 Generated character ID:', characterId);

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
		console.log('👤 Created character object:', JSON.stringify(character, null, 2));

		// Create proper GameState structure
		const gameState = {
			characters: [character],
			playerCharacterId: characterId,
			gameWorld: selectedWorld.name,
			startingArea: selectedLocation.name,
		};
		console.log('🎮 Created game state:', JSON.stringify(gameState, null, 2));

		try {
			// Save the properly structured game state using the new hook
			await save(gameState);
			setShowConfirm(false);
			setPendingCharacter(null);

			// Now add items to inventory using the inventory manager
			// (which can now successfully load the character)
			console.log('🎒 Adding starting inventory items...');
			await addItem('rations', 2);
			await addItem('tent', 1);
			await addItem('healing_potion', 2);

			// Add class-appropriate gear
			console.log('⚔️ Adding class-specific equipment for:', selectedClass.id);
			if (selectedClass.id === 'fighter') {
				await addItem('sword', 1);
				await equipItem('sword');
				console.log('🗡️ Added and equipped sword for fighter');
			}
			if (selectedClass.id === 'wizard') {
				await addItem('staff', 1);
				await equipItem('staff');
				console.log('🔮 Added and equipped staff for wizard');
			}
			console.log('✅ Character creation completed successfully!');
			if (selectedClass.id === 'rogue') {
				await addItem('dagger', 1);
				await equipItem('dagger');
			}
			if (selectedClass.id === 'cleric') {
				await addItem('mace', 1);
				await equipItem('mace');
			}

			router.replace('/');
		} catch (error) {
			console.error('Failed to save game state:', error);
			Alert.alert('Error', 'Failed to save game state.');
		}
	};

	// Add this function to handle going back a step
	const handlePreviousStep = () => {
		const steps: WizardStep[] = ['world', 'location', 'race', 'class', 'skills', 'character'];
		const currentIndex = steps.indexOf(currentStep);
		if (currentIndex > 0) {
			setCurrentStep(steps[currentIndex - 1]);
		}
	};

	const getStepNumber = (step: WizardStep): number => {
		const steps = ['world', 'location', 'race', 'class', 'skills', 'character'];
		return steps.indexOf(step);
	};

	const renderStepIndicator = () => {
		const steps = ['world', 'location', 'race', 'class', 'skills', 'character'];
		const currentStepIndex = getStepNumber(currentStep);

		return (
			<View style={isMobile ? newGameStyles.stepIndicatorMobile : newGameStyles.stepIndicator}>
				{steps.map((step, index) => (
					<React.Fragment key={step}>
						<View
							style={[
								isMobile ? newGameStyles.stepDotMobile : newGameStyles.stepDot,
								index === currentStepIndex && (isMobile ? newGameStyles.stepDotActiveMobile : newGameStyles.stepDotActive),
								index < currentStepIndex && newGameStyles.stepDotCompleted,
							]}
						/>
						{index < steps.length - 1 && (
							<View
								style={[
									isMobile ? newGameStyles.stepLineMobile : newGameStyles.stepLine,
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
			return (
				<View style={isMobile ? newGameStyles.sectionBoxMobile : newGameStyles.sectionBox}>
					<WorldChooser onSelect={handleWorldSelect} />
				</View>
			);
		case 'location':
			return (
				<View style={isMobile ? newGameStyles.sectionBoxMobile : newGameStyles.sectionBox}>
					<LocationChooser onSelect={handleLocationSelect} />
				</View>
			);
		case 'race':
			return (
				<View style={isMobile ? newGameStyles.sectionBoxMobile : newGameStyles.sectionBox}>
					<RaceChooser onSelect={handleRaceSelect} />
				</View>
			);
		case 'class':
			return (
				<View style={isMobile ? newGameStyles.sectionBoxMobile : newGameStyles.sectionBox}>
					<ClassChooser onSelect={handleClassSelect} />
				</View>
			);
		case 'skills':
			return (
				<View style={{ flex: 1, position: 'relative' }}>
					<SkillChooser onSelect={handleSkillsSelect} initialSkills={selectedSkills} maxSkills={4} />
				</View>
			);
		case 'character':
			if (!selectedRace || !selectedClass) {
				return (
					<View style={isMobile ? newGameStyles.sectionBoxMobile : newGameStyles.sectionBox}>
						<Text>Missing race or class selection.</Text>
					</View>
				);
			}
			baseStats = getDefaultBaseStats();
			racialBonuses = selectedRace.statBonuses || {};
			return (
				<View style={isMobile ? newGameStyles.sectionBoxMobile : newGameStyles.sectionBox}>
					<CharacterReview
						name={characterName}
						description={customStory}
						race={selectedRace}
						classOption={selectedClass}
						baseStats={baseStats}
						racialBonuses={racialBonuses}
						onBack={handlePreviousStep}
						onFinish={handleCharacterFinish}
						skills={selectedSkills.map(s => s.id)}
					/>
				</View>
			);
		default:
			return null;
		}
	};

	return (
		<ThemedView style={[
			newGameStyles.container,
			isMobile && newGameStyles.containerMobile,
		]}>
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
