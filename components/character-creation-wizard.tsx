import React from 'react';
import {
    PanResponder,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { newGameStyles } from '../styles/new-game.styles';

import { AttributePicker } from '@/components/attribute-picker';
import { CharacterReview } from '@/components/character-review';
import { ClassChooser } from '@/components/class-chooser';
import { LocationChooser } from '@/components/location-chooser';
import { RaceChooser } from '@/components/race-chooser';
import { SkillChooser } from '@/components/skill-chooser';
import { ThemedView } from '@/components/themed-view';
import { TraitChooser } from '@/components/trait-chooser';
import { WorldChooser } from '@/components/world-chooser';
import { useScreenSize } from '@/hooks/use-screen-size';

type WizardStep = 'world' | 'location' | 'race' | 'class' | 'trait' | 'attributes' | 'skills' | 'character';

interface CharacterCreationWizardProps {
	currentStep: WizardStep;
	steps: WizardStep[];
	isCharacterMode: boolean;
	selectedWorld?: any;
	selectedLocation?: any;
	selectedRace: any;
	selectedClass: any;
	selectedTrait: any;
	selectedAttributes: any;
	selectedSkills: any[];
	characterName: string;
	customStory: string;
	onStepChange: (step: WizardStep) => void;
	onWorldSelect?: (world: any) => void;
	onLocationSelect?: (location: any) => void;
	onRaceSelect: (race: any) => void;
	onClassSelect: (classOption: any) => void;
	onTraitSelect: (trait: any) => void;
	onAttributesConfirm: (attributes: any) => void;
	onSkillsSelect: (skills: any[]) => void;
	onFinalize: (data: {
		name: string;
		description: string;
		stats: any;
		icon?: any;
	}) => Promise<void>;
	onBack: () => void;
}

export const CharacterCreationWizard: React.FC<CharacterCreationWizardProps> = ({
	currentStep,
	steps,
	isCharacterMode,
	selectedWorld,
	selectedLocation,
	selectedRace,
	selectedClass,
	selectedTrait,
	selectedAttributes,
	selectedSkills,
	characterName,
	customStory,
	onStepChange,
	onWorldSelect,
	onLocationSelect,
	onRaceSelect,
	onClassSelect,
	onTraitSelect,
	onAttributesConfirm,
	onSkillsSelect,
	onFinalize,
	onBack,
}) => {
	const { isMobile } = useScreenSize();
	const insets = useSafeAreaInsets();

	// Pan responder for swipe gestures
	const panResponder = PanResponder.create({
		onMoveShouldSetPanResponder: (evt, gestureState) => {
			const isHorizontalSwipe = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
			const isSignificantSwipe = Math.abs(gestureState.dx) > 30;
			const isFromLeftEdge = evt.nativeEvent.pageX < 50;

			return isHorizontalSwipe && isSignificantSwipe && isFromLeftEdge && currentStep !== steps[0];
		},
		onPanResponderGrant: () => {
			// Gesture started
		},
		onPanResponderMove: () => {
			// Optional: Add visual feedback during swipe
		},
		onPanResponderRelease: (evt, gestureState) => {
			if (gestureState.dx > 50 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
				onBack();
			}
		},
	});

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
						<WorldChooser onSelect={onWorldSelect || (() => onStepChange('location'))} />
					</View>
				);
			case 'location':
				return (
					<View
						style={isMobile ? newGameStyles.sectionBoxMobile : newGameStyles.sectionBox}
					>
						<LocationChooser onSelect={onLocationSelect || (() => onStepChange('race'))} />
					</View>
				);
			case 'race':
				return (
					<View
						style={isMobile ? newGameStyles.sectionBoxMobile : newGameStyles.sectionBox}
					>
						<RaceChooser onSelect={onRaceSelect} />
					</View>
				);
			case 'class':
				return (
					<View
						style={isMobile ? newGameStyles.sectionBoxMobile : newGameStyles.sectionBox}
					>
						<ClassChooser onSelect={onClassSelect} />
					</View>
				);
			case 'trait':
				return (
					<View
						style={isMobile ? newGameStyles.sectionBoxMobile : newGameStyles.sectionBox}
					>
						<TraitChooser onSelect={onTraitSelect} />
					</View>
				);
			case 'attributes':
				if (!selectedClass) return null;
				return (
					<View style={{ flex: 1, position: 'relative' }}>
						<AttributePicker
							classOption={selectedClass}
							onConfirm={onAttributesConfirm}
						/>
					</View>
				);
			case 'skills':
				return (
					<View style={{ flex: 1, position: 'relative' }}>
						<SkillChooser
							onSelect={onSkillsSelect}
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
						racialBonuses={selectedRace.statBonuses || {}}
						skills={selectedSkills.map(s => typeof s === 'string' ? s : s.id)}
						onBack={onBack}
						onFinish={onFinalize}
					/>
				);
			}
			default:
				return null;
		}
	};

	return (
		<ThemedView style={[newGameStyles.container, isMobile && newGameStyles.containerMobile]}>
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
					{currentStep !== steps[0] && (
						<TouchableOpacity
							onPress={onBack}
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
