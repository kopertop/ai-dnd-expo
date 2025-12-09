import { Stack } from 'expo-router';
import React from 'react';

import { CharacterCreationWizard } from '@/components/character-creation-wizard';
import { useCharacterCreation } from '@/hooks/use-character-creation';

const NewCharacterSelectionsScreen: React.FC = () => {
	const {
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
		setCharacterName,
		setCustomStory,
		setCharacterIcon,
		setCurrentStep,
		handleWorldSelect,
		handleLocationSelect,
		handleRaceSelect,
		handleClassSelect,
		handleTraitSelect,
		handleAttributesConfirm,
		handleSkillsSelect,
		handleFinalizeCharacterWithData,
		handleBackNavigation,
	} = useCharacterCreation();

	return (
		<>
			<Stack.Screen
				options={{
					headerShown: false,
				}}
			/>
			<CharacterCreationWizard
				currentStep={currentStep}
				steps={steps}
				isCharacterMode={isCharacterMode}
				selectedWorld={selectedWorld}
				selectedLocation={selectedLocation}
				selectedRace={selectedRace}
				selectedClass={selectedClass}
				selectedTrait={selectedTrait}
				selectedAttributes={selectedAttributes}
				selectedSkills={selectedSkills}
				characterName={characterName}
				customStory={customStory}
				onStepChange={setCurrentStep}
				onWorldSelect={handleWorldSelect}
				onLocationSelect={handleLocationSelect}
				onRaceSelect={handleRaceSelect}
				onClassSelect={handleClassSelect}
				onTraitSelect={handleTraitSelect}
				onAttributesConfirm={handleAttributesConfirm}
				onSkillsSelect={handleSkillsSelect}
				onFinalize={handleFinalizeCharacterWithData}
				onBack={handleBackNavigation}
			/>
		</>
	);
};

export default NewCharacterSelectionsScreen;
