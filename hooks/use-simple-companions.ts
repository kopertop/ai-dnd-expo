/**
 * Simple Companion Management Hook
 * Works with existing Character system
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import type { Companion, CompanionTemplate, PartyConfiguration } from '@/types/companion';

const COMPANIONS_STORAGE_KEY = 'ai-dnd-companions';
const PARTY_CONFIG_STORAGE_KEY = 'ai-dnd-party-config';

export interface CompanionManagerState {
	companions: Companion[];
	activeCompanions: Companion[];
	partyConfig: PartyConfiguration;
	isLoading: boolean;
	error: string | null;
}

export interface CompanionManager extends CompanionManagerState {
	// Companion management
	createCompanion: (template: CompanionTemplate) => Promise<Companion>;
	addToParty: (companionId: string) => Promise<boolean>;
	removeFromParty: (companionId: string) => Promise<boolean>;
	updateCompanion: (companionId: string, updates: Partial<Companion>) => Promise<boolean>;
	deleteCompanion: (companionId: string) => Promise<boolean>;

	// Utility
	getCompanion: (companionId: string) => Companion | undefined;
	canAddToParty: (companionId: string) => { canAdd: boolean; reason?: string };
	generateRandomCompanion: () => Promise<Companion>;

	// State management
	saveAll: () => Promise<void>;
	loadAll: () => Promise<void>;
}

/**
 * Generate a unique companion ID
 */
const generateCompanionId = (): string => {
	return `companion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Convert CompanionTemplate to Companion
 */
const templateToCompanion = (template: CompanionTemplate): Companion => {
	const baseStats = {
		STR: 10,
		DEX: 10,
		CON: 10,
		INT: 10,
		WIS: 10,
		CHA: 10,
	};

	return {
		// Base Character properties
		id: generateCompanionId(),
		level: template.level,
		race: template.race,
		name: template.name,
		class: template.class,
		image: template.image,
		description: template.description,
		stats: baseStats,
		skills: [],
		inventory: [],
		equipped: {},
		health: 20 + template.level * 5,
		maxHealth: 20 + template.level * 5,
		actionPoints: 2,
		maxActionPoints: 2,

		// Companion-specific properties
		type: 'companion',
		companionType: template.companionType,
		isActive: false,
		loyalty: 75, // Start with good loyalty

		behavior: {
			combatStyle: 'balanced',
			followDistance: 'medium',
			independence: 50,
		},

		voice: {
			personality: template.personality,
			speakingStyle: 'friendly',
			catchphrases: template.catchphrases,
		},

		recruitedAt: Date.now(),
		cost: template.cost,
	};
};

/**
 * Companion templates for random generation
 */
const COMPANION_TEMPLATES: CompanionTemplate[] = [
	{
		name: 'Aria Swiftblade',
		race: 'Elf',
		class: 'Ranger',
		level: 2,
		description: 'A skilled tracker with keen eyes and a quick wit.',
		personality: 'Observant and loyal, with a dry sense of humor',
		catchphrases: [
			'The trail leads this way.',
			"I've got your back.",
			"Something doesn't feel right here.",
		],
		companionType: 'hired',
		cost: { type: 'gold', amount: 100, description: 'Hiring fee for tracking services' },
	},
	{
		name: 'Thorek Ironbeard',
		race: 'Dwarf',
		class: 'Fighter',
		level: 3,
		description: 'A gruff but dependable warrior with years of combat experience.',
		personality: 'Gruff exterior but fiercely protective of allies',
		catchphrases: ['By my beard!', 'Stand fast!', "They'll not get past me!"],
		companionType: 'hired',
		cost: { type: 'gold', amount: 150, description: 'Payment for protection services' },
	},
	{
		name: 'Luna Starweaver',
		race: 'Human',
		class: 'Wizard',
		level: 2,
		description: 'A young mage eager to prove herself in the field.',
		personality: 'Curious and enthusiastic, sometimes reckless',
		catchphrases: ['Fascinating!', 'I have just the spell for this!', 'Knowledge is power!'],
		companionType: 'quest',
		cost: { type: 'favor', description: 'Seeking adventure and magical knowledge' },
	},
	{
		name: 'Kael Shadowstep',
		race: 'Halfling',
		class: 'Rogue',
		level: 2,
		description: 'A nimble scout with a talent for getting into places unnoticed.',
		personality: 'Sarcastic but reliable, values discretion',
		catchphrases: [
			"Trust me, I've got this.",
			'Quietly now...',
			'That was easier than expected.',
		],
		companionType: 'hired',
		cost: { type: 'gold', amount: 75, description: 'Fee for scouting and infiltration' },
	},
	{
		name: 'Brother Marcus',
		race: 'Human',
		class: 'Cleric',
		level: 3,
		description: 'A devoted healer who believes in helping those in need.',
		personality: 'Compassionate and wise, slow to anger',
		catchphrases: [
			'May the light guide us.',
			'I will tend to your wounds.',
			'Faith will see us through.',
		],
		companionType: 'story',
		cost: { type: 'favor', description: 'Serves out of duty to help others' },
	},
];

/**
 * Hook for managing companions
 */
export function useSimpleCompanions(): CompanionManager {
	const [state, setState] = useState<CompanionManagerState>({
		companions: [],
		activeCompanions: [],
		partyConfig: {
			maxSize: 4, // Player + 3 companions
			activeCompanions: [],
			leadershipStyle: 'democratic',
		},
		isLoading: true,
		error: null,
	});

	/**
	 * Update derived state when companions change
	 */
	const updateDerivedState = useCallback(
		(companions: Companion[], partyConfig: PartyConfiguration) => {
			const activeCompanions = companions.filter(comp =>
				partyConfig.activeCompanions.includes(comp.id),
			);

			setState(prev => ({
				...prev,
				companions,
				activeCompanions,
				partyConfig,
			}));
		},
		[],
	);

	/**
	 * Save all data to storage
	 */
	const saveAll = useCallback(async () => {
		try {
			await AsyncStorage.setItem(COMPANIONS_STORAGE_KEY, JSON.stringify(state.companions));
			await AsyncStorage.setItem(PARTY_CONFIG_STORAGE_KEY, JSON.stringify(state.partyConfig));
		} catch (error) {
			console.error('Failed to save companion data:', error);
			setState(prev => ({ ...prev, error: 'Failed to save companion data' }));
		}
	}, [state.companions, state.partyConfig]);

	/**
	 * Load all data from storage
	 */
	const loadAll = useCallback(async () => {
		try {
			setState(prev => ({ ...prev, isLoading: true, error: null }));

			const companionsData = await AsyncStorage.getItem(COMPANIONS_STORAGE_KEY);
			const partyConfigData = await AsyncStorage.getItem(PARTY_CONFIG_STORAGE_KEY);

			const companions: Companion[] = companionsData ? JSON.parse(companionsData) : [];
			const partyConfig: PartyConfiguration = partyConfigData
				? JSON.parse(partyConfigData)
				: {
						maxSize: 4,
						activeCompanions: [],
						leadershipStyle: 'democratic',
					};

			updateDerivedState(companions, partyConfig);

			setState(prev => ({
				...prev,
				isLoading: false,
			}));
		} catch (error) {
			console.error('Failed to load companion data:', error);
			setState(prev => ({
				...prev,
				error: 'Failed to load companion data',
				isLoading: false,
			}));
		}
	}, [updateDerivedState]);

	/**
	 * Get companion by ID
	 */
	const getCompanion = useCallback(
		(companionId: string): Companion | undefined => {
			return state.companions.find(comp => comp.id === companionId);
		},
		[state.companions],
	);

	/**
	 * Check if companion can be added to party
	 */
	const canAddToParty = useCallback(
		(companionId: string): { canAdd: boolean; reason?: string } => {
			const companion = getCompanion(companionId);
			if (!companion) {
				return { canAdd: false, reason: 'Companion not found' };
			}

			if (companion.isActive) {
				return { canAdd: false, reason: 'Already in party' };
			}

			if (state.partyConfig.activeCompanions.length >= state.partyConfig.maxSize - 1) {
				return { canAdd: false, reason: 'Party is full' };
			}

			return { canAdd: true };
		},
		[getCompanion, state.partyConfig],
	);

	/**
	 * Create companion from template
	 */
	const createCompanion = useCallback(
		async (template: CompanionTemplate): Promise<Companion> => {
			const companion = templateToCompanion(template);

			const newCompanions = [...state.companions, companion];
			updateDerivedState(newCompanions, state.partyConfig);

			await saveAll();
			return companion;
		},
		[state.companions, state.partyConfig, updateDerivedState, saveAll],
	);

	/**
	 * Add companion to party
	 */
	const addToParty = useCallback(
		async (companionId: string): Promise<boolean> => {
			const { canAdd, reason } = canAddToParty(companionId);
			if (!canAdd) {
				setState(prev => ({ ...prev, error: reason || 'Cannot add to party' }));
				return false;
			}

			const newPartyConfig = {
				...state.partyConfig,
				activeCompanions: [...state.partyConfig.activeCompanions, companionId],
			};

			const newCompanions = state.companions.map(comp =>
				comp.id === companionId ? { ...comp, isActive: true } : comp,
			);

			updateDerivedState(newCompanions, newPartyConfig);
			await saveAll();
			return true;
		},
		[canAddToParty, state.companions, state.partyConfig, updateDerivedState, saveAll],
	);

	/**
	 * Remove companion from party
	 */
	const removeFromParty = useCallback(
		async (companionId: string): Promise<boolean> => {
			const companion = getCompanion(companionId);
			if (!companion || !companion.isActive) {
				return false;
			}

			const newPartyConfig = {
				...state.partyConfig,
				activeCompanions: state.partyConfig.activeCompanions.filter(
					id => id !== companionId,
				),
			};

			const newCompanions = state.companions.map(comp =>
				comp.id === companionId ? { ...comp, isActive: false } : comp,
			);

			updateDerivedState(newCompanions, newPartyConfig);
			await saveAll();
			return true;
		},
		[getCompanion, state.companions, state.partyConfig, updateDerivedState, saveAll],
	);

	/**
	 * Update companion
	 */
	const updateCompanion = useCallback(
		async (companionId: string, updates: Partial<Companion>): Promise<boolean> => {
			const companion = getCompanion(companionId);
			if (!companion) return false;

			const newCompanions = state.companions.map(comp =>
				comp.id === companionId ? { ...comp, ...updates } : comp,
			);

			updateDerivedState(newCompanions, state.partyConfig);
			await saveAll();
			return true;
		},
		[getCompanion, state.companions, state.partyConfig, updateDerivedState, saveAll],
	);

	/**
	 * Delete companion
	 */
	const deleteCompanion = useCallback(
		async (companionId: string): Promise<boolean> => {
			// Remove from party first
			await removeFromParty(companionId);

			const newCompanions = state.companions.filter(comp => comp.id !== companionId);
			updateDerivedState(newCompanions, state.partyConfig);
			await saveAll();
			return true;
		},
		[removeFromParty, state.companions, state.partyConfig, updateDerivedState, saveAll],
	);

	/**
	 * Generate random companion
	 */
	const generateRandomCompanion = useCallback(async (): Promise<Companion> => {
		const template =
			COMPANION_TEMPLATES[Math.floor(Math.random() * COMPANION_TEMPLATES.length)];
		return await createCompanion(template);
	}, [createCompanion]);

	/**
	 * Load data on mount
	 */
	useEffect(() => {
		loadAll();
	}, [loadAll]);

	/**
	 * Auto-save when data changes
	 */
	useEffect(() => {
		if (!state.isLoading) {
			saveAll();
		}
	}, [state.companions, state.partyConfig, state.isLoading, saveAll]);

	return {
		...state,
		createCompanion,
		addToParty,
		removeFromParty,
		updateCompanion,
		deleteCompanion,
		getCompanion,
		canAddToParty,
		generateRandomCompanion,
		saveAll,
		loadAll,
	};
}
