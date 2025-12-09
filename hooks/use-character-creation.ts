import { router, useLocalSearchParams, useSegments } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';

import { CLASSES } from '@/constants/classes';
import { RACES } from '@/constants/races';
import { SKILL_LIST } from '@/constants/skills';
import { TRAITS } from '@/constants/traits';
import { useGameState } from '@/hooks/use-game-state';
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

// Helper to create URL-friendly slug from name
const createSlug = (name: string): string => {
	return name
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '');
};

// Helper to find option by slug
const findOptionBySlug = <T extends { name: string }>(options: T[], slug: string): T | undefined => {
	return options.find(opt => createSlug(opt.name) === slug);
};

export const useCharacterCreation = () => {
	const params = useLocalSearchParams<{
		mode?: string;
		selections?: string | string[];
		attrs?: string | string[];
		skills?: string | string[];
	}>();
	const segments = useSegments();

	// Handle both old query param style and new path-based style
	const modeParam = Array.isArray(params.mode) ? params.mode[0] : params.mode;

	// Try to get selections from params first, then fall back to segments
	let selectionsParam: string[] = [];
	if (params.selections) {
		selectionsParam = Array.isArray(params.selections) ? params.selections : [params.selections];
	} else if (segments.length > 1 && segments[0] === 'new-character') {
		// Extract segments after 'new-character'
		selectionsParam = segments.slice(1);
	}

	// Debug logging
	if (__DEV__) {
		console.log('[useCharacterCreation] params:', params);
		console.log('[useCharacterCreation] segments:', segments);
		console.log('[useCharacterCreation] selectionsParam:', selectionsParam);
	}

	const wizardMode = modeParam === 'character' || selectionsParam.length > 0 ? 'character' : 'solo';
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

	// Use refs to track if we're updating from URL (to prevent infinite loops)
	const isRestoringFromURL = useRef(false);
	const lastRestoredState = useRef<string>('');

	const { save } = useGameState();
	const addItem = async (item: string, quantity: number) => { };
	const equipItem = async (item: string) => { };

	// Function to update URL based on current selections
	const updateURL = (
		race: RaceOption | null,
		classOption: ClassOption | null,
		trait: TraitOption | null,
		attributes?: StatBlock | null,
		skills?: Skill[] | null
	) => {
		if (!isCharacterMode) return; // Only update URL for character mode
		if (isRestoringFromURL.current) return; // Don't update URL while restoring from URL

		const segments: string[] = [];
		if (race) segments.push(createSlug(race.name));
		if (classOption) segments.push(createSlug(classOption.name));
		if (trait) segments.push(createSlug(trait.name));

		const basePath = segments.length > 0
			? `/new-character/${segments.join('/')}`
			: '/new-character';

		// Get current URL to preserve existing query params
		const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
		const queryParams = new URLSearchParams();
		
		// Parse existing query params from current URL if available
		if (currentUrl) {
			try {
				const url = new URL(currentUrl);
				url.searchParams.forEach((value, key) => {
					queryParams.set(key, value);
				});
			} catch (e) {
				// If URL parsing fails, continue with empty params
			}
		}

		// Add/update attributes in query string if provided
		if (attributes) {
			// Encode attributes as a compact string: STR,DEX,CON,INT,WIS,CHA
			const attrString = [
				attributes.STR,
				attributes.DEX,
				attributes.CON,
				attributes.INT,
				attributes.WIS,
				attributes.CHA,
			].join(',');
			queryParams.set('attrs', attrString);
		}

		// Add/update skills in query string if provided
		if (skills && skills.length > 0) {
			// Encode skills as comma-separated IDs
			const skillIds = skills.map(skill => typeof skill === 'string' ? skill : skill.id);
			queryParams.set('skills', skillIds.join(','));
		}

		const queryString = queryParams.toString();
		const fullPath = queryString ? `${basePath}?${queryString}` : basePath;

		// Create a state key to check if we're updating to the same state
		const stateKey = `${segments.join('/')}${queryString ? `?${queryString}` : ''}`;
		if (lastRestoredState.current === stateKey) {
			// Already at this state, don't update URL
			return;
		}

		lastRestoredState.current = stateKey;
		router.replace(fullPath);
	};

	// Parse URL segments and query params to restore state when URL changes
	useEffect(() => {
		// Create a state key from current URL to check if we've already restored this state
		const stateKey = `${selectionsParam.join('/')}${params.attrs ? `?attrs=${Array.isArray(params.attrs) ? params.attrs[0] : params.attrs}` : ''}`;

		// Skip if we've already restored this exact state
		if (lastRestoredState.current === stateKey) {
			return;
		}

		isRestoringFromURL.current = true;

		try {
			if (isCharacterMode && selectionsParam.length > 0) {
				const [raceSlug, classSlug, traitSlug] = selectionsParam;

				if (raceSlug) {
					const race = findOptionBySlug(RACES, raceSlug);
					if (race && selectedRace?.name !== race.name) {
						setSelectedRace(race);
					}
					if (classSlug) {
						const classOption = findOptionBySlug(CLASSES, classSlug);
						if (classOption && selectedClass?.name !== classOption.name) {
							setSelectedClass(classOption);
						}
						if (traitSlug) {
							const trait = findOptionBySlug(TRAITS, traitSlug);
							if (trait && selectedTrait?.name !== trait.name) {
								setSelectedTrait(trait);
							}

									// Check for attributes in query string
									const attrsParam = params.attrs;
									if (attrsParam) {
										const attrValues = (Array.isArray(attrsParam) ? attrsParam[0] : attrsParam).split(',');
										if (attrValues.length === 6) {
											const attributes: StatBlock = {
												STR: parseInt(attrValues[0], 10),
												DEX: parseInt(attrValues[1], 10),
												CON: parseInt(attrValues[2], 10),
												INT: parseInt(attrValues[3], 10),
												WIS: parseInt(attrValues[4], 10),
												CHA: parseInt(attrValues[5], 10),
											};
											// Only update if attributes are different
											if (!selectedAttributes ||
												selectedAttributes.STR !== attributes.STR ||
												selectedAttributes.DEX !== attributes.DEX ||
												selectedAttributes.CON !== attributes.CON ||
												selectedAttributes.INT !== attributes.INT ||
												selectedAttributes.WIS !== attributes.WIS ||
												selectedAttributes.CHA !== attributes.CHA) {
												setSelectedAttributes(attributes);
											}

											// Check for skills in query string
											const skillsParam = params.skills;
											if (skillsParam) {
												const skillIds = (Array.isArray(skillsParam) ? skillsParam[0] : skillsParam).split(',');
												if (skillIds.length > 0) {
													const restoredSkills = skillIds
														.map(id => SKILL_LIST.find(s => s.id === id))
														.filter(Boolean) as Skill[];
													if (restoredSkills.length > 0) {
														setSelectedSkills(restoredSkills);
													}
													setCurrentStep('character');
													lastRestoredState.current = stateKey;
													return;
												}
											}

											setCurrentStep('skills');
											lastRestoredState.current = stateKey;
											return;
										}
									}

									setCurrentStep('attributes');
									lastRestoredState.current = stateKey;
									return; // Early return to prevent step reset
						} else {
							setCurrentStep('trait');
							lastRestoredState.current = stateKey;
							return;
						}
					} else {
						setCurrentStep('class');
						lastRestoredState.current = stateKey;
						return;
					}
				} else {
					setCurrentStep('class');
					lastRestoredState.current = stateKey;
					return;
				}
			} else if (isCharacterMode && selectionsParam.length === 0) {
				// No selections in URL, start at race step
				setCurrentStep('race');
				lastRestoredState.current = stateKey;
			}
		} finally {
			// Reset the flag after a short delay to allow state updates to complete
			setTimeout(() => {
				isRestoringFromURL.current = false;
			}, 100);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectionsParam.length, isCharacterMode, params.attrs]); // Only depend on length and attrs to avoid infinite loops

	// Only reset to first step if we're not in character mode or if we have no selections
	// This should NOT run if we're in character mode with selections
	useEffect(() => {
		if (!isCharacterMode) {
			setCurrentStep(steps[0]);
		} else if (isCharacterMode && selectionsParam.length === 0) {
			// Character mode but no selections - start at race
			setCurrentStep('race');
		}
	}, [steps, isCharacterMode]);

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
		updateURL(race, null, null, null, null);
	};

	const handleClassSelect = (classOption: ClassOption) => {
		setSelectedClass(classOption);
		setCurrentStep('trait');
		updateURL(selectedRace, classOption, null, null, null);
	};

	const handleTraitSelect = (trait: TraitOption) => {
		setSelectedTrait(trait);
		setCurrentStep('attributes');
		updateURL(selectedRace, selectedClass, trait, null, null);
	};

	const handleAttributesConfirm = (attributes: StatBlock) => {
		setSelectedAttributes(attributes);
		setCurrentStep('skills');
		updateURL(selectedRace, selectedClass, selectedTrait, attributes, selectedSkills);
	};

	const handleSkillsSelect = (skills: Skill[]) => {
		setSelectedSkills(skills);
		setCurrentStep('character');
		updateURL(selectedRace, selectedClass, selectedTrait, selectedAttributes, skills);
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

	const handlePreviousStep = () => {
		const stepsList = steps;
		const currentIndex = stepsList.indexOf(currentStep);
		if (currentIndex > 0) {
			const previousStep = stepsList[currentIndex - 1];
			setCurrentStep(previousStep);

			// Clear data that depends on the step we're going back to
			if (previousStep === 'world') {
				setSelectedWorld(null);
				setSelectedLocation(null);
				setSelectedRace(null);
				setSelectedClass(null);
				setSelectedTrait(null);
				setSelectedAttributes(null);
				setSelectedSkills([]);
				setCharacterName('');
				setCustomStory('');
				updateURL(null, null, null, null, null);
			} else if (previousStep === 'location') {
				setSelectedLocation(null);
				setSelectedRace(null);
				setSelectedClass(null);
				setSelectedTrait(null);
				setSelectedAttributes(null);
				setSelectedSkills([]);
				setCharacterName('');
				setCustomStory('');
			} else if (previousStep === 'race') {
				setSelectedRace(null);
				setSelectedClass(null);
				setSelectedTrait(null);
				setSelectedAttributes(null);
				setSelectedSkills([]);
				setCharacterName('');
				setCustomStory('');
				updateURL(null, null, null, null, null);
			} else if (previousStep === 'class') {
				setSelectedClass(null);
				setSelectedTrait(null);
				setSelectedAttributes(null);
				setSelectedSkills([]);
				setCharacterName('');
				setCustomStory('');
				updateURL(selectedRace, null, null, null, null);
			} else if (previousStep === 'trait') {
				setSelectedTrait(null);
				setSelectedAttributes(null);
				setSelectedSkills([]);
				setCharacterName('');
				setCustomStory('');
				updateURL(selectedRace, selectedClass, null, null, null);
			} else if (previousStep === 'attributes') {
				setSelectedAttributes(null);
				setSelectedSkills([]);
				setCharacterName('');
				setCustomStory('');
				updateURL(selectedRace, selectedClass, selectedTrait, null, selectedSkills);
			} else if (previousStep === 'skills') {
				setSelectedSkills([]);
				setCharacterName('');
				setCustomStory('');
				updateURL(selectedRace, selectedClass, selectedTrait, selectedAttributes, null);
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

	return {
		// State
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
		characterIcon,
		customStory,
		isSaving,
		// Setters
		setCharacterName,
		setCustomStory,
		setCharacterIcon,
		setCurrentStep,
		// Handlers
		handleWorldSelect,
		handleLocationSelect,
		handleRaceSelect,
		handleClassSelect,
		handleTraitSelect,
		handleAttributesConfirm,
		handleSkillsSelect,
		handleFinalizeCharacterWithData,
		handleBackNavigation,
	};
};
