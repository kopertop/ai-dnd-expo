import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useRouter, useRouterState } from '@tanstack/react-router';
import * as React from 'react';

import { generateRandomBackground } from '@/constants/backgrounds';
import { generateRandomName } from '@/constants/character-names';
import { ATTRIBUTE_DESCRIPTIONS } from '@/constants/stats';
import type { ClassOption } from '@/types/class-option';
import type { RaceOption } from '@/types/race-option';
import type { Skill } from '@/types/skill';
import type { StatBlock, StatKey } from '@/types/stats';
import { STAT_KEYS } from '@/types/stats';
import type { TraitOption } from '@/types/trait-option';
import { addIconsToInventoryItems } from '@/utils/add-equipment-icons';
import { calculateAC, calculatePassivePerception, getAbilityModifier } from '@/utils/combat-utils';
import { generateStartingEquipment } from '@/utils/starting-equipment';

import DiceIcon from '~/components/dice-icon';
import { PortraitSelectorModal } from '~/components/portrait-selector-modal';
import RouteShell from '~/components/route-shell';
import { Tooltip } from '~/components/tooltip';
import { WEB_CLASSES, WEB_RACES, WEB_SKILLS, WEB_TRAITS } from '~/data/character-options';
import { charactersQueryOptions, createCharacter } from '~/utils/characters';
import { deleteImage, uploadedImagesQueryOptions, uploadImage } from '~/utils/images';

const STANDARD_ARRAY: StatBlock = {
	STR: 15,
	DEX: 14,
	CON: 13,
	INT: 12,
	WIS: 10,
	CHA: 8,
};

// Point-buy system constants (matching old attribute-picker.tsx)
const POINT_BUY_COST: Record<number, number> = {
	8: 0,
	9: 1,
	10: 2,
	11: 3,
	12: 4,
	13: 5,
	14: 7,
	15: 9,
};
const MIN_STAT = 8;
const MAX_STAT = 15;
const POINT_BUY_TOTAL = 27;

function getPointBuyTotal(stats: StatBlock): number {
	return STAT_KEYS.reduce((sum: number, key: StatKey) => sum + POINT_BUY_COST[stats[key]], 0);
}

type WizardStep = 'race' | 'class' | 'trait' | 'attributes' | 'skills' | 'character';

const MAX_SKILLS = 4;

const STEP_LABELS: Record<WizardStep, string> = {
	race: 'Race',
	class: 'Class',
	trait: 'Trait',
	attributes: 'Attributes',
	skills: 'Skills',
	character: 'Character',
};

type CharacterCreationFlowProps = {
	selections: string[]
};

const createSlug = (value: string) =>
	value
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '');

const findBySlug = <T extends { name: string }>(
	options: T[],
	slug?: string,
) => {
	if (!slug) return null;
	return options.find((option) => createSlug(option.name) === slug) ?? null;
};

const getStepIndex = (steps: WizardStep[], step: WizardStep) =>
	steps.indexOf(step);

const CharacterCreationFlow: React.FC<CharacterCreationFlowProps> = ({
	selections,
}) => {
	const router = useRouter();
	const location = useRouterState({ select: (state) => state.location });
	const queryClient = useQueryClient();

	const uploadedImagesQuery = useSuspenseQuery(uploadedImagesQueryOptions('both'));
	const uploadedImages = uploadedImagesQuery.data || [];
	const steps = React.useMemo<WizardStep[]>(
		() => ['race', 'class', 'trait', 'attributes', 'skills', 'character'],
		[],
	);

	const [currentStep, setCurrentStep] = React.useState<WizardStep>('race');
	const [selectedRace, setSelectedRace] = React.useState<RaceOption | null>(null);
	const [selectedClass, setSelectedClass] = React.useState<ClassOption | null>(null);
	const [selectedTrait, setSelectedTrait] = React.useState<TraitOption | null>(null);
	const [selectedAttributes, setSelectedAttributes] = React.useState<StatBlock | null>(null);
	const [selectedSkillIds, setSelectedSkillIds] = React.useState<string[]>([]);
	const [characterName, setCharacterName] = React.useState('');
	const [customStory, setCustomStory] = React.useState('');
	const [characterIcon, setCharacterIcon] = React.useState('');
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
	const [isSaving, setIsSaving] = React.useState(false);
	const [isPortraitModalOpen, setIsPortraitModalOpen] = React.useState(false);
	const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);

	// Auto-select portrait based on race and class
	React.useEffect(() => {
		// Only auto-select if no portrait is manually chosen
		if (characterIcon || !selectedRace || !selectedClass) return;

		// Helper function to convert name to kebab-case for path
		const toKebabCase = (str: string): string => {
			return str
				.replace(/([a-z])([A-Z])/g, '$1-$2')
				.replace(/[\s_]+/g, '-')
				.toLowerCase();
		};

		// Convert race name to kebab-case for directory
		const raceDir = toKebabCase(selectedRace.name);

		// Class name mapping: some classes have alternative names in portraits
		// e.g., "Fighter" might be "Warrior" for some races, "Wizard" might be "Mage"
		const classToPortraitName: Record<string, string[]> = {
			'Fighter': ['fighter', 'warrior'],
			'Wizard': ['wizard', 'mage'],
		};

		const className = selectedClass.name;
		const classVariants = classToPortraitName[className] || [toKebabCase(className)];

		// Helper to check if image exists
		const checkImageExists = (url: string): Promise<boolean> => {
			return new Promise((resolve) => {
				const img = new Image();
				img.onload = () => resolve(true);
				img.onerror = () => resolve(false);
				img.src = url;
			});
		};

		// Try race-class combinations, then race-base, then race-blank
		(async () => {
			// Try each class variant
			for (const classVariant of classVariants) {
				const raceClassPath = `/assets/images/characters/${raceDir}/${raceDir}-${classVariant}.png`;
				if (await checkImageExists(raceClassPath)) {
					setCharacterIcon(raceClassPath);
					return;
				}
			}

			// Try race-base as fallback
			const raceBasePath = `/assets/images/characters/${raceDir}/${raceDir}-base.png`;
			if (await checkImageExists(raceBasePath)) {
				setCharacterIcon(raceBasePath);
				return;
			}

			// Try race-blank as fallback
			const raceBlankPath = `/assets/images/characters/${raceDir}/${raceDir}-blank.png`;
			if (await checkImageExists(raceBlankPath)) {
				setCharacterIcon(raceBlankPath);
				return;
			}
		})();
	}, [selectedRace, selectedClass, characterIcon]);

	const restoringRef = React.useRef(false);
	const lastRestoredRef = React.useRef('');
	const lastSerializedRef = React.useRef('');

	const updateUrl = React.useCallback(
		(
			race: RaceOption | null,
			classOption: ClassOption | null,
			trait: TraitOption | null,
			attributes: StatBlock | null,
			skills: string[],
			forceIncludeAttrs = false,
		) => {
			if (restoringRef.current) return;

			const segments: string[] = [];
			if (race) segments.push(createSlug(race.name));
			if (classOption) segments.push(createSlug(classOption.name));
			if (trait) segments.push(createSlug(trait.name));

			const queryParams = new URLSearchParams();
			// Only add attrs to URL if:
			// 1. We're NOT on the attributes step (i.e., user has confirmed/navigated away), OR
			// 2. forceIncludeAttrs is true (e.g., when user clicks Continue from attributes step)
			if (attributes && (forceIncludeAttrs || currentStep !== 'attributes')) {
				queryParams.set(
					'attrs',
					STAT_KEYS.map((key) => attributes[key]).join(','),
				);
			}
			if (skills.length > 0) {
				queryParams.set('skills', skills.join(','));
			}

			const queryString = queryParams.toString();
			const basePath = segments.length
				? `/new-character/${segments.join('/')}`
				: '/new-character';
			const nextPath = queryString ? `${basePath}?${queryString}` : basePath;
			const stateKey = `${segments.join('/')}${queryString ? `?${queryString}` : ''}`;

			if (lastSerializedRef.current === stateKey) return;

			lastSerializedRef.current = stateKey;
			const currentPath = `${location.pathname}${location.search}`;
			if (currentPath !== nextPath) {
				router.navigate({ to: nextPath, replace: true });
			}
		},
		[location.pathname, location.search, router, currentStep],
	);

	React.useEffect(() => {
		updateUrl(
			selectedRace,
			selectedClass,
			selectedTrait,
			selectedAttributes,
			selectedSkillIds,
		);
	}, [
		selectedRace,
		selectedClass,
		selectedTrait,
		selectedAttributes,
		selectedSkillIds,
		updateUrl,
	]);

	React.useEffect(() => {
		const locationKey = `${selections.join('/')}${location.search}`;
		if (lastRestoredRef.current === locationKey) return;

		restoringRef.current = true;
		lastRestoredRef.current = locationKey;

		const searchParams = new URLSearchParams(location.search);
		const clonedDataParam = searchParams.get('clonedData');

		// Handle cloned character data
		if (clonedDataParam) {
			try {
				const clonedCharacter = JSON.parse(clonedDataParam);

				// Find matching race
				const race = WEB_RACES.find(r => r.name === clonedCharacter.race);
				if (race) {
					setSelectedRace(race);
				}

				// Find matching class
				const classOption = WEB_CLASSES.find(c => c.name === clonedCharacter.class);
				if (classOption) {
					setSelectedClass(classOption);
				}

				// Find matching trait
				if (clonedCharacter.trait) {
					const trait = WEB_TRAITS.find(t => t.name === clonedCharacter.trait);
					if (trait) {
						setSelectedTrait(trait);
					}
				}

				// Set attributes
				if (clonedCharacter.stats) {
					setSelectedAttributes(clonedCharacter.stats);
				}

				// Set skills
				if (clonedCharacter.skills && Array.isArray(clonedCharacter.skills)) {
					setSelectedSkillIds(clonedCharacter.skills);
				}

				// Set character details
				if (clonedCharacter.name) {
					// Remove "(Copy)" suffix if present
					const name = clonedCharacter.name.replace(/\s*\(Copy\)\s*$/, '');
					setCharacterName(name);
				}
				if (clonedCharacter.icon) {
					setCharacterIcon(clonedCharacter.icon);
				}
				if (clonedCharacter.description) {
					setCustomStory(clonedCharacter.description);
				}

				// Navigate to character step (final step) so user can customize
				setCurrentStep('character');
				restoringRef.current = false;
				return;
			} catch (error) {
				console.error('Failed to parse cloned character data:', error);
			}
		}

		const [raceSlug, classSlug, traitSlug] = selections;
		const nextRace = findBySlug(WEB_RACES, raceSlug);
		const nextClass = findBySlug(WEB_CLASSES, classSlug);
		const nextTrait = findBySlug(WEB_TRAITS, traitSlug);

		setSelectedRace(nextRace);
		setSelectedClass(nextClass);
		setSelectedTrait(nextTrait);

		const attrsParam = searchParams.get('attrs');
		const skillsParam = searchParams.get('skills');

		if (attrsParam) {
			const values = attrsParam.split(',').map((value) => Number(value));
			if (values.length === STAT_KEYS.length && values.every((value) => Number.isFinite(value))) {
				const attributes = STAT_KEYS.reduce<StatBlock>((acc, key, index) => {
					acc[key] = values[index] ?? STANDARD_ARRAY[key];
					return acc;
				}, { ...STANDARD_ARRAY });
				setSelectedAttributes(attributes);
			}
		} else if (nextTrait) {
			// Set standard array but ensure we stay on attributes step to show it
			setSelectedAttributes({ ...STANDARD_ARRAY });
		}

		if (skillsParam) {
			const skills = skillsParam
				.split(',')
				.filter(Boolean)
				.slice(0, MAX_SKILLS);
			setSelectedSkillIds(skills);
		}

		const stepOrder: WizardStep[] = [
			'race',
			'class',
			'trait',
			'attributes',
			'skills',
			'character',
		];
		let nextStep: WizardStep = 'race';
		if (nextRace) nextStep = 'class';
		if (nextClass) nextStep = 'trait';
		if (nextTrait) {
			// Always show attributes step when trait is selected, even if standard array is set
			nextStep = 'attributes';
		}
		// Only advance past attributes if:
		// 1. attrs are explicitly in URL (user has confirmed), AND
		// 2. we're NOT currently on the attributes step (to prevent auto-advance)
		if (attrsParam && nextTrait && currentStep !== 'attributes') {
			nextStep = 'skills';
		}
		if (skillsParam && attrsParam && currentStep !== 'attributes') {
			nextStep = 'character';
		}
		if (!stepOrder.includes(nextStep)) nextStep = 'race';

		setCurrentStep(nextStep);
		restoringRef.current = false;
	}, [location.search, selections, currentStep]);

	React.useEffect(() => {
		if (currentStep === 'attributes' && !selectedAttributes) {
			setSelectedAttributes({ ...STANDARD_ARRAY });
		}
	}, [currentStep, selectedAttributes]);

	const setStep = (step: WizardStep) => {
		setErrorMessage(null);
		setCurrentStep(step);
	};

	const handleBack = () => {
		const currentIndex = getStepIndex(steps, currentStep);
		if (currentIndex <= 0) {
			router.navigate({ to: '/characters' });
			return;
		}

		const previousStep = steps[currentIndex - 1];
		setStep(previousStep);

		if (previousStep === 'race') {
			setSelectedRace(null);
			setSelectedClass(null);
			setSelectedTrait(null);
			setSelectedAttributes(null);
			setSelectedSkillIds([]);
		} else if (previousStep === 'class') {
			setSelectedClass(null);
			setSelectedTrait(null);
			setSelectedAttributes(null);
			setSelectedSkillIds([]);
		} else if (previousStep === 'trait') {
			setSelectedTrait(null);
			setSelectedAttributes(null);
			setSelectedSkillIds([]);
		} else if (previousStep === 'attributes') {
			setSelectedAttributes(null);
			setSelectedSkillIds([]);
		} else if (previousStep === 'skills') {
			setSelectedSkillIds([]);
		}
	};

	const handleRaceSelect = (race: RaceOption) => {
		setSelectedRace(race);
		setSelectedClass(null);
		setSelectedTrait(null);
		setSelectedAttributes(null);
		setSelectedSkillIds([]);
		setStep('class');
	};

	const handleClassSelect = (classOption: ClassOption) => {
		setSelectedClass(classOption);
		setSelectedTrait(null);
		setSelectedAttributes(null);
		setSelectedSkillIds([]);
		setStep('trait');
	};

	const handleTraitSelect = (trait: TraitOption) => {
		setSelectedTrait(trait);
		setSelectedAttributes({ ...STANDARD_ARRAY });
		setSelectedSkillIds([]);
		setStep('attributes');
	};

	const handleAttributeChange = (key: StatKey, delta: number) => {
		const currentAttributes = selectedAttributes ?? STANDARD_ARRAY;
		const newValue = currentAttributes[key] + delta;

		// Enforce min/max bounds
		if (newValue < MIN_STAT || newValue > MAX_STAT) return;

		// Check point-buy budget
		const newAttributes = { ...currentAttributes, [key]: newValue };
		if (getPointBuyTotal(newAttributes) > POINT_BUY_TOTAL) return;

		setSelectedAttributes(newAttributes);
	};

	const handleSkillToggle = (skill: Skill) => {
		setSelectedSkillIds((prev) => {
			if (prev.includes(skill.id)) {
				setErrorMessage(null);
				return prev.filter((id) => id !== skill.id);
			}
			if (prev.length >= MAX_SKILLS) {
				setErrorMessage(`Choose up to ${MAX_SKILLS} skills.`);
				return prev;
			}
			setErrorMessage(null);
			return [...prev, skill.id];
		});
	};

	const handleRandomName = () => {
		if (!selectedRace || !selectedClass) return;
		setCharacterName(generateRandomName(selectedRace.name, selectedClass.name));
	};

	const handleRandomBackground = () => {
		if (!selectedRace || !selectedClass) return;
		setCustomStory(generateRandomBackground(selectedRace.name, selectedClass.name));
	};

	const handleNext = () => {
		const currentIndex = getStepIndex(steps, currentStep);
		if (currentIndex === -1 || currentIndex === steps.length - 1) return;

		if (currentStep === 'race' && !selectedRace) {
			setErrorMessage('Select a race to continue.');
			return;
		}
		if (currentStep === 'class' && !selectedClass) {
			setErrorMessage('Select a class to continue.');
			return;
		}
		if (currentStep === 'trait' && !selectedTrait) {
			setErrorMessage('Select a trait to continue.');
			return;
		}
		if (currentStep === 'attributes') {
			if (!selectedAttributes) {
				setSelectedAttributes({ ...STANDARD_ARRAY });
			}
			// Validate that all points are allocated
			const attributes = selectedAttributes ?? STANDARD_ARRAY;
			const pointsRemaining = POINT_BUY_TOTAL - getPointBuyTotal(attributes);
			if (pointsRemaining !== 0) {
				setErrorMessage(`Allocate all ${POINT_BUY_TOTAL} points before continuing. You have ${pointsRemaining} points remaining.`);
				return;
			}
			// Explicitly update URL with attributes when user confirms and moves to next step
			// This ensures attrs are in URL for the next step
			updateUrl(selectedRace, selectedClass, selectedTrait, attributes, selectedSkillIds, true);
		}

		setStep(steps[currentIndex + 1]);
	};

	const handleFinalize = async () => {
		setErrorMessage(null);

		if (!selectedRace || !selectedClass || !selectedTrait) {
			setErrorMessage('Complete race, class, and trait selections first.');
			return;
		}

		const attributes = selectedAttributes ?? STANDARD_ARRAY;
		const name = characterName.trim();
		const description = customStory.trim();

		if (!name || !description) {
			setErrorMessage('Enter a character name and background.');
			return;
		}

		setIsSaving(true);

		const { inventory, equipped } = generateStartingEquipment(
			selectedClass.id,
			selectedRace.id,
		);

		const payload = {
			id: `character-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
			level: 1,
			race: selectedRace.name,
			name,
			class: selectedClass.name,
			trait: selectedTrait.name,
			icon: characterIcon.trim() || undefined,
			description,
			stats: attributes,
			skills: selectedSkillIds,
			inventory: addIconsToInventoryItems(inventory),
			equipped,
			health: 10,
			maxHealth: 10,
			actionPoints: 3,
			maxActionPoints: 3,
			statusEffects: [],
			preparedSpells: [],
		};

		try {
			await createCharacter({ data: payload });
			queryClient.invalidateQueries({ queryKey: charactersQueryOptions().queryKey });
			await router.navigate({ to: '/characters' });
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Failed to create character.';
			setErrorMessage(message);
		} finally {
			setIsSaving(false);
		}
	};

	const renderOptionsGrid = <T extends { id: string; name: string; description: string; image?: unknown }>(
		options: T[],
		selectedId: string | null,
		onSelect: (option: T) => void,
	) => (
		<div className="grid gap-4 md:grid-cols-2">
			{options.map((option) => {
				const imageSrc =
					typeof option.image === 'string'
						? option.image
						: typeof (option.image as { uri?: string } | undefined)?.uri === 'string'
							? (option.image as { uri: string }).uri
							: null;
				return (
					<button
						key={option.id}
						type="button"
						onClick={() => onSelect(option)}
						className={`rounded-lg border p-0 text-left transition-all ${
							selectedId === option.id
								? 'border-amber-400 bg-amber-50 shadow-sm'
								: 'border-slate-200 bg-white hover:border-amber-200 hover:shadow-sm'
						}`}
					>
						<div className="flex h-full items-center justify-center gap-3">
							<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-slate-100">
								{imageSrc ? (
									<img
										src={imageSrc}
										alt={option.name}
										className="h-full w-full object-contain"
									/>
								) : (
									<span className="text-xs text-slate-400">No image</span>
								)}
							</div>
							<div className="min-w-0 flex-1">
								<div className="text-sm font-semibold text-slate-900">
									{option.name}
								</div>
								<p className="mt-1 text-xs text-slate-600">
									{option.description}
								</p>
							</div>
						</div>
					</button>
				);
			})}
		</div>
	);

	const renderAttributes = () => {
		const attributes = selectedAttributes ?? STANDARD_ARRAY;
		const pointsUsed = getPointBuyTotal(attributes);
		const pointsRemaining = POINT_BUY_TOTAL - pointsUsed;

		const isPrimary = (key: StatKey) => selectedClass?.primaryStats.includes(key) ?? false;
		const isSecondary = (key: StatKey) => selectedClass?.secondaryStats?.includes(key) ?? false;

		return (
			<div className="space-y-4">
				<div className="text-center">
					<div className="text-lg font-bold text-slate-900">
						Points Left: {pointsRemaining}
					</div>
				</div>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{STAT_KEYS.map((key) => {
						const value = attributes[key];
						const canDecrease = value > MIN_STAT;
						const canIncrease = value < MAX_STAT &&
							getPointBuyTotal({ ...attributes, [key]: value + 1 }) <= POINT_BUY_TOTAL;

						return (
							<div
								key={key}
								className={`relative rounded-lg border-2 p-4 ${
									isPrimary(key)
										? 'border-amber-400 bg-amber-50'
										: isSecondary(key)
											? 'border-red-700 bg-red-50'
											: 'border-slate-200 bg-white'
								}`}
							>
								{/* Help icon */}
								<div className="absolute right-2 top-2">
									<Tooltip
										content={ATTRIBUTE_DESCRIPTIONS[key] || `${key} information`}
										position="bottom"
									>
										<button
											type="button"
											className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-600 bg-slate-100 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200"
										>
											?
										</button>
									</Tooltip>
								</div>

								<div className="text-center">
									<div className="mb-2 text-sm font-semibold text-slate-700">{key}</div>
									<div className="mb-2 flex items-center justify-center gap-3">
										<button
											type="button"
											onClick={() => handleAttributeChange(key, -1)}
											disabled={!canDecrease}
											className={`rounded-md px-3 py-1 text-xl font-bold transition-colors ${
												canDecrease
													? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
													: 'cursor-not-allowed bg-slate-100 text-slate-400 opacity-40'
											}`}
										>
											-
										</button>
										<span className="min-w-[3rem] text-center text-2xl font-bold text-slate-900">
											{value}
										</span>
										<button
											type="button"
											onClick={() => handleAttributeChange(key, 1)}
											disabled={!canIncrease}
											className={`rounded-md px-3 py-1 text-xl font-bold transition-colors ${
												canIncrease
													? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
													: 'cursor-not-allowed bg-slate-100 text-slate-400 opacity-40'
											}`}
										>
											+
										</button>
									</div>
									{isPrimary(key) && (
										<div className="text-xs font-semibold text-amber-700">PRIMARY</div>
									)}
									{!isPrimary(key) && isSecondary(key) && (
										<div className="text-xs font-semibold text-green-700">SECONDARY</div>
									)}
								</div>
							</div>
						);
					})}
				</div>
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => setSelectedAttributes({ ...STANDARD_ARRAY })}
						className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-amber-200 hover:bg-amber-50"
					>
						Use Standard Array
					</button>
				</div>
			</div>
		);
	};

	const renderSkills = () => (
		<div>
			<div className="mb-3 text-xs font-semibold text-slate-500">
				Choose {MAX_SKILLS} skills ({selectedSkillIds.length}/{MAX_SKILLS})
			</div>
			<div className="mb-4 text-xs text-slate-500">
				{STAT_KEYS.map((key) => {
					const score = (selectedAttributes ?? STANDARD_ARRAY)[key];
					const mod = Math.floor((score - 10) / 2);
					const hasBonus = mod > 0;
					const label = mod >= 0 ? `+${mod}` : `${mod}`;
					return (
						<span
							key={key}
							className={`mr-3 inline-flex items-center gap-1 ${
								hasBonus ? 'font-semibold text-amber-700' : ''
							}`}
						>
							{key}
							<span className="text-[10px] text-slate-400">{label}</span>
						</span>
					);
				})}
			</div>
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{WEB_SKILLS.map((skill) => {
					const isSelected = selectedSkillIds.includes(skill.id);
					const isDisabled = !isSelected && selectedSkillIds.length >= MAX_SKILLS;
					const abilityKey = skill.ability as StatKey;
					const abilityScore =
						(selectedAttributes ?? STANDARD_ARRAY)[abilityKey] ?? 10;
					const abilityMod = Math.floor((abilityScore - 10) / 2);
					const abilityLabel =
						abilityMod >= 0 ? `+${abilityMod}` : `${abilityMod}`;
					const abilityHasBonus = abilityMod > 0;
					const imageSrc =
						typeof skill.image === 'string'
							? skill.image
							: typeof (skill.image as { uri?: string } | undefined)?.uri === 'string'
								? (skill.image as { uri: string }).uri
								: null;
					return (
						<label
							key={skill.id}
							className={`flex items-center gap-3 rounded-md border px-3 py-2 transition ${
								isSelected
									? 'border-amber-400 bg-amber-50'
									: 'border-slate-200 bg-white'
							} ${isDisabled ? 'opacity-50' : 'hover:border-amber-200'}`}
						>
							<input
								type="checkbox"
								checked={isSelected}
								onChange={() => handleSkillToggle(skill)}
								disabled={isDisabled}
								className="h-4 w-4 rounded border-slate-300"
							/>
							<div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-100">
								{imageSrc ? (
									<img
										src={imageSrc}
										alt={skill.name}
										className="h-10 w-10 object-contain"
									/>
								) : (
									<span className="text-[10px] text-slate-400">No image</span>
								)}
							</div>
							<div>
								<div className="text-sm font-semibold text-slate-800">
									{skill.name}
								</div>
								<div
									className={`text-xs ${
										abilityHasBonus
											? 'font-semibold text-amber-700'
											: 'text-slate-500'
									}`}
								>
									{skill.ability} {abilityLabel}
								</div>
							</div>
						</label>
					);
				})}
			</div>
		</div>
	);

	const renderCharacterDetails = () => {
		// Calculate combat stats for preview
		const attributes = selectedAttributes ?? STANDARD_ARRAY;
		const abilityMods = STAT_KEYS.reduce((acc, key) => {
			acc[key] = getAbilityModifier(attributes[key]);
			return acc;
		}, {} as Record<StatKey, number>);

		// Create a temporary character object for calculations
		const tempCharacter = {
			stats: attributes,
			skills: selectedSkillIds,
			equipped: {},
			inventory: [],
		} as any;

		const armorClass = calculateAC(tempCharacter);
		const initiative = abilityMods.DEX ?? 0;
		const passivePerception = calculatePassivePerception(tempCharacter);

		return (
			<div className="space-y-6">
				{/* Header Section */}
				<div className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm">
					{/* Portrait with Trait Background */}
					<div className="relative shrink-0">
						<button
							type="button"
							onClick={() => setIsPortraitModalOpen(true)}
							className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg bg-slate-100 transition-all hover:bg-slate-200 hover:ring-2 hover:ring-amber-400"
							title="Click to change portrait"
						>
							{/* Trait Background Image */}
							{selectedTrait?.image && (
								<img
									src={selectedTrait.image}
									alt={selectedTrait.name}
									className="absolute inset-0 h-full w-full object-cover opacity-50"
								/>
							)}
							{/* Character Portrait */}
							{characterIcon ? (
								<div className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden rounded-lg">
									<img src={characterIcon} alt="Character portrait" className="h-full w-full object-contain" />
								</div>
							) : (
								<span className="relative z-10 text-4xl font-semibold text-slate-400">
									{characterName.charAt(0).toUpperCase() || '?'}
								</span>
							)}
						</button>
					</div>

					{/* Character Name and Summary */}
					<div className="flex-1">
						<div className="flex items-center gap-2">
							<div className="relative flex-1">
								<input
									type="text"
									value={characterName}
									onChange={(event) => setCharacterName(event.target.value)}
									className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 pr-9 text-2xl font-bold text-slate-900 transition-colors focus:border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-300"
									placeholder="Character Name"
								/>
								<button
									type="button"
									onClick={handleRandomName}
									className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 transition-colors hover:bg-slate-100"
									title="Random name"
									style={{ color: 'rgb(201, 176, 55)' }}
								>
									<DiceIcon size={24} className="text-current" />
								</button>
							</div>
						</div>
						<p className="mt-1 text-sm text-slate-600">
							{selectedClass?.name ?? 'Class'} • {selectedRace?.name ?? 'Race'}{selectedTrait ? ` • ${selectedTrait.name}` : ''} • Level 1
						</p>
					</div>

					{/* Combat Stats */}
					<div className="flex flex-col gap-2">
						<div className="relative rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-center">
							<div className="absolute right-2 top-2">
								<Tooltip
									content="AC is the roll value someone needs to pass to 'hit' you"
									position="bottom"
								>
									<button
										type="button"
										className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-600 bg-slate-100 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200"
									>
										?
									</button>
								</Tooltip>
							</div>
							<div className="text-xs font-semibold text-slate-600">AC</div>
							<div className="mt-1 text-lg font-bold text-slate-900">{armorClass}</div>
						</div>
						<div className="relative rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-center">
							<div className="absolute right-2 top-2">
								<Tooltip
									content="Initiative is a bonus to your initiative roll, which determines when you will go"
									position="bottom"
								>
									<button
										type="button"
										className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-600 bg-slate-100 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200"
									>
										?
									</button>
								</Tooltip>
							</div>
							<div className="text-xs font-semibold text-slate-600">INITIATIVE</div>
							<div className="mt-1 text-lg font-bold text-slate-900">
								{initiative >= 0 ? '+' : ''}{initiative}
							</div>
						</div>
						<div className="relative rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-center">
							<div className="absolute right-2 top-2">
								<Tooltip
									content="Passive perception is your ability to notice things without directly looking/inspecting them"
									position="bottom"
								>
									<button
										type="button"
										className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-600 bg-slate-100 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200"
									>
										?
									</button>
								</Tooltip>
							</div>
							<div className="text-xs font-semibold text-slate-600">PASSIVE PERCEPTION</div>
							<div className="mt-1 text-lg font-bold text-slate-900">{passivePerception}</div>
						</div>
					</div>
				</div>

				{/* Background Section */}
				<label className="flex flex-col gap-1">
					<span className="text-xs font-semibold text-slate-500">Background</span>
					<div className="relative">
						<textarea
							rows={4}
							value={customStory}
							onChange={(event) => setCustomStory(event.target.value)}
							className="w-full rounded-md border border-slate-200 px-3 py-2 pr-9 text-sm transition-colors focus:border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-300"
							placeholder="Share a brief backstory and motivation."
						/>
						<button
							type="button"
							onClick={handleRandomBackground}
							className="absolute right-2 top-2 rounded p-1.5 transition-colors hover:bg-slate-100"
							title="Random background"
							style={{ color: 'rgb(201, 176, 55)' }}
						>
							<DiceIcon size={24} className="text-current" />
						</button>
					</div>
				</label>
			</div>
		);
	};

	return (
		<RouteShell
			title="New Character"
			description="Build a hero for your next adventure."
		>
			<div className="flex flex-wrap gap-2">
				{steps.map((step) => (
					<button
						key={step}
						type="button"
						onClick={() => setStep(step)}
						className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
							step === currentStep
								? 'border-amber-400 bg-amber-50 text-amber-800 shadow-sm'
								: 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
						}`}
					>
						{STEP_LABELS[step]}
					</button>
				))}
			</div>
			<div className="mt-6 space-y-6">
				{currentStep === 'race' &&
					renderOptionsGrid(WEB_RACES, selectedRace?.id ?? null, handleRaceSelect)}
				{currentStep === 'class' &&
					renderOptionsGrid(WEB_CLASSES, selectedClass?.id ?? null, handleClassSelect)}
				{currentStep === 'trait' &&
					renderOptionsGrid(WEB_TRAITS, selectedTrait?.id ?? null, handleTraitSelect)}
				{currentStep === 'attributes' && renderAttributes()}
				{currentStep === 'skills' && renderSkills()}
				{currentStep === 'character' && renderCharacterDetails()}
			</div>
			{errorMessage ? (
				<div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					{errorMessage}
				</div>
			) : null}
			<div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6">
				<button
					type="button"
					onClick={handleBack}
					className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
				>
					Back
				</button>
				{currentStep === 'character' ? (
					<button
						type="button"
						onClick={handleFinalize}
						disabled={isSaving}
						className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isSaving ? 'Saving...' : 'Create Character'}
					</button>
				) : (
					<button
						type="button"
						onClick={handleNext}
						disabled={
							currentStep === 'attributes' &&
							(() => {
								const attributes = selectedAttributes ?? STANDARD_ARRAY;
								const pointsRemaining = POINT_BUY_TOTAL - getPointBuyTotal(attributes);
								return pointsRemaining !== 0;
							})()
						}
						className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
					>
						Continue
					</button>
				)}
			</div>

			{/* Portrait Selector Modal */}
			<PortraitSelectorModal
				isOpen={isPortraitModalOpen}
				onClose={() => setIsPortraitModalOpen(false)}
				onSelect={(imageUrl) => {
					setCharacterIcon(imageUrl);
					setIsPortraitModalOpen(false);
				}}
				uploadedImages={uploadedImages}
				onUploadClick={() => {
					setIsPortraitModalOpen(false);
					setIsUploadModalOpen(true);
				}}
				onDeleteImage={async (imageId) => {
					try {
						await deleteImage({ data: { path: `/images/${imageId}` } });
						queryClient.invalidateQueries({ queryKey: uploadedImagesQueryOptions('both').queryKey });
					} catch (error) {
						console.error('Failed to delete image:', error);
					}
				}}
				isAdmin={false}
			/>

			{/* Image Upload Modal */}
			{isUploadModalOpen && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
					onClick={() => setIsUploadModalOpen(false)}
				>
					<div
						className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="mb-4 flex items-center justify-between">
							<h3 className="text-lg font-bold text-slate-900">Upload Portrait</h3>
							<button
								type="button"
								onClick={() => setIsUploadModalOpen(false)}
								className="text-slate-400 hover:text-slate-600"
							>
								×
							</button>
						</div>
						<label className="mb-4 block">
							<div className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 transition-colors hover:border-slate-400 hover:bg-slate-100">
								<div className="text-center">
									<div className="mb-2 text-2xl">📤</div>
									<div className="text-sm font-semibold text-slate-700">Click to select image</div>
									<div className="mt-1 text-xs text-slate-500">PNG, JPG, or GIF up to 10MB</div>
								</div>
							</div>
							<input
								type="file"
								accept="image/*"
								onChange={async (e) => {
									const file = e.target.files?.[0];
									if (file) {
										try {
											const uploaded = await uploadImage({
												data: {
													file,
													image_type: 'character',
												},
											});
											await queryClient.invalidateQueries({ queryKey: uploadedImagesQueryOptions('both').queryKey });
											setCharacterIcon(uploaded.public_url);
											setIsUploadModalOpen(false);
										} catch (error) {
											console.error('Failed to upload image:', error);
											alert(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
										}
									}
								}}
								className="hidden"
							/>
						</label>
						<div className="flex justify-end gap-3">
							<button
								type="button"
								onClick={() => setIsUploadModalOpen(false)}
								className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</RouteShell>
	);
};

export default CharacterCreationFlow;
