import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useRouterState } from '@tanstack/react-router';
import * as React from 'react';

import { generateRandomBackground } from '@/constants/backgrounds';
import { generateRandomName } from '@/constants/character-names';
import type { ClassOption } from '@/types/class-option';
import type { RaceOption } from '@/types/race-option';
import type { Skill } from '@/types/skill';
import type { StatBlock, StatKey } from '@/types/stats';
import { STAT_KEYS } from '@/types/stats';
import type { TraitOption } from '@/types/trait-option';
import { addIconsToInventoryItems } from '@/utils/add-equipment-icons';
import { generateStartingEquipment } from '@/utils/starting-equipment';

import DiceIcon from '~/components/dice-icon';
import RouteShell from '~/components/route-shell';
import { WEB_CLASSES, WEB_RACES, WEB_SKILLS, WEB_TRAITS } from '~/data/character-options';
import { charactersQueryOptions, createCharacter } from '~/utils/characters';

const STANDARD_ARRAY: StatBlock = {
	STR: 15,
	DEX: 14,
	CON: 13,
	INT: 12,
	WIS: 10,
	CHA: 8,
};

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
		) => {
			if (restoringRef.current) return;

			const segments: string[] = [];
			if (race) segments.push(createSlug(race.name));
			if (classOption) segments.push(createSlug(classOption.name));
			if (trait) segments.push(createSlug(trait.name));

			const queryParams = new URLSearchParams();
			if (attributes) {
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
		[location.pathname, location.search, router],
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

		const [raceSlug, classSlug, traitSlug] = selections;
		const nextRace = findBySlug(WEB_RACES, raceSlug);
		const nextClass = findBySlug(WEB_CLASSES, classSlug);
		const nextTrait = findBySlug(WEB_TRAITS, traitSlug);

		setSelectedRace(nextRace);
		setSelectedClass(nextClass);
		setSelectedTrait(nextTrait);

		const searchParams = new URLSearchParams(location.search);
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
		if (nextTrait) nextStep = 'attributes';
		if (attrsParam) nextStep = 'skills';
		if (skillsParam) nextStep = 'character';
		if (!stepOrder.includes(nextStep)) nextStep = 'race';

		setCurrentStep(nextStep);
		restoringRef.current = false;
	}, [location.search, selections]);

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

	const handleAttributeChange = (key: StatKey, value: number) => {
		const nextAttributes = { ...(selectedAttributes ?? STANDARD_ARRAY) };
		nextAttributes[key] = value;
		setSelectedAttributes(nextAttributes);
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
		if (currentStep === 'attributes' && !selectedAttributes) {
			setSelectedAttributes({ ...STANDARD_ARRAY });
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
						className={`rounded-lg border px-4 py-3 text-left transition-all ${
							selectedId === option.id
								? 'border-amber-400 bg-amber-50 shadow-sm'
								: 'border-slate-200 bg-white hover:border-amber-200 hover:shadow-sm'
						}`}
					>
						<div className="flex items-start gap-3">
							<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-slate-100">
								{imageSrc ? (
									<img
										src={imageSrc}
										alt={option.name}
										className="h-12 w-12 object-contain"
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
		return (
			<div className="space-y-4">
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{STAT_KEYS.map((key) => (
						<label key={key} className="flex flex-col gap-1">
							<span className="text-xs font-semibold text-slate-500">{key}</span>
							<input
								type="number"
								min={3}
								max={20}
								value={attributes[key]}
								onChange={(event) =>
									handleAttributeChange(key, Number(event.target.value))
								}
								className="rounded-md border border-slate-200 px-3 py-2 text-sm transition-colors focus:border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-300"
							/>
						</label>
					))}
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

	const renderCharacterDetails = () => (
		<div className="space-y-4">
			<div className="grid gap-4 sm:grid-cols-2">
				<label className="flex flex-col gap-1">
					<span className="text-xs font-semibold text-slate-500">Name</span>
					<div className="relative">
					<input
						type="text"
						value={characterName}
						onChange={(event) => setCharacterName(event.target.value)}
						className="w-full rounded-md border border-slate-200 px-3 py-2 pr-9 text-sm transition-colors focus:border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-300"
						placeholder="Aria Stormcaller"
					/>
						<button
							type="button"
							onClick={handleRandomName}
							className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
							title="Random name"
						>
							<DiceIcon size={16} className="text-current" />
						</button>
					</div>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-xs font-semibold text-slate-500">Icon URL (optional)</span>
					<input
						type="text"
						value={characterIcon}
						onChange={(event) => setCharacterIcon(event.target.value)}
						className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm transition-colors focus:border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-300"
						placeholder="https://"
					/>
				</label>
			</div>
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
						className="absolute right-2 top-2 rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
						title="Random background"
					>
						<DiceIcon size={16} className="text-current" />
					</button>
				</div>
			</label>
			<div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
				<div className="text-xs font-semibold text-slate-700">Summary</div>
				<div className="mt-1.5 text-sm text-slate-600">
					{selectedRace?.name ?? 'Race'} • {selectedClass?.name ?? 'Class'} •{' '}
					{selectedTrait?.name ?? 'Trait'}
				</div>
			</div>
		</div>
	);

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
						className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
					>
						Continue
					</button>
				)}
			</div>
		</RouteShell>
	);
};

export default CharacterCreationFlow;
