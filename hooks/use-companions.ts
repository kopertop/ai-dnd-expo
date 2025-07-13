/**
 * Companion Management Hook
 * Handles party composition, companion NPCs, and their interactions
 */

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CompanionNPC, AnyCharacter } from '@/types/characters';
import { createCompanionNPC, generateRandomCompanion, validateCharacter } from '@/services/character-factory';

const COMPANIONS_STORAGE_KEY = 'ai-dnd-companions';
const PARTY_STORAGE_KEY = 'ai-dnd-party';

export interface CompanionManagerState {
	// All available companions (recruited and unrecruited)
	allCompanions: CompanionNPC[];
	
	// Currently active party members
	activeParty: CompanionNPC[];
	
	// Available but not in party
	availableCompanions: CompanionNPC[];
	
	// Loading and error states
	isLoading: boolean;
	error: string | null;
	
	// Party composition limits
	maxPartySize: number;
	currentPartySize: number;
}

export interface CompanionManager extends CompanionManagerState {
	// Companion management
	addCompanion: (companion: CompanionNPC) => Promise<void>;
	removeCompanion: (companionId: string) => Promise<void>;
	updateCompanion: (companionId: string, updates: Partial<CompanionNPC>) => Promise<void>;
	
	// Party management
	addToParty: (companionId: string) => Promise<void>;
	removeFromParty: (companionId: string) => Promise<void>;
	reorderParty: (companionIds: string[]) => Promise<void>;
	
	// Companion interactions
	adjustLoyalty: (companionId: string, amount: number) => Promise<void>;
	setCompanionBehavior: (companionId: string, behavior: Partial<CompanionNPC['behavior']>) => Promise<void>;
	
	// Utility functions
	getCompanion: (companionId: string) => CompanionNPC | undefined;
	generateRandomCompanion: (preferredClass?: CompanionNPC['characterClass']) => Promise<CompanionNPC>;
	canAddToParty: (companionId: string) => { canAdd: boolean; reason?: string };
	
	// Persistence
	saveCompanions: () => Promise<void>;
	loadCompanions: () => Promise<void>;
	resetCompanions: () => Promise<void>;
}

/**
 * Custom hook for managing companions and party composition
 */
export function useCompanions(): CompanionManager {
	const [state, setState] = useState<CompanionManagerState>({
		allCompanions: [],
		activeParty: [],
		availableCompanions: [],
		isLoading: true,
		error: null,
		maxPartySize: 4, // Player + 3 companions
		currentPartySize: 0,
	});

	/**
	 * Update state with new companion data
	 */
	const updateState = useCallback((companions: CompanionNPC[]) => {
		const activeParty = companions.filter(c => c.isActive);
		const availableCompanions = companions.filter(c => !c.isActive);
		
		setState(prev => ({
			...prev,
			allCompanions: companions,
			activeParty,
			availableCompanions,
			currentPartySize: activeParty.length,
			isLoading: false,
		}));
	}, []);

	/**
	 * Save companions to storage
	 */
	const saveCompanions = useCallback(async () => {
		try {
			await AsyncStorage.setItem(COMPANIONS_STORAGE_KEY, JSON.stringify(state.allCompanions));
			await AsyncStorage.setItem(PARTY_STORAGE_KEY, JSON.stringify(state.activeParty.map(c => c.id)));
		} catch (error) {
			console.error('Failed to save companions:', error);
			setState(prev => ({ ...prev, error: 'Failed to save companions' }));
		}
	}, [state.allCompanions, state.activeParty]);

	/**
	 * Load companions from storage
	 */
	const loadCompanions = useCallback(async () => {
		try {
			setState(prev => ({ ...prev, isLoading: true, error: null }));
			
			const companionsData = await AsyncStorage.getItem(COMPANIONS_STORAGE_KEY);
			const partyData = await AsyncStorage.getItem(PARTY_STORAGE_KEY);
			
			if (companionsData) {
				const companions: CompanionNPC[] = JSON.parse(companionsData);
				const partyIds: string[] = partyData ? JSON.parse(partyData) : [];
				
				// Update isActive status based on saved party
				const updatedCompanions = companions.map(companion => ({
					...companion,
					isActive: partyIds.includes(companion.id),
				}));
				
				updateState(updatedCompanions);
			} else {
				// First time - create some starter companions
				const starterCompanions = [
					generateRandomCompanion('cleric', 1),
					generateRandomCompanion('fighter', 1),
					generateRandomCompanion('wizard', 1),
				];
				
				updateState(starterCompanions);
			}
		} catch (error) {
			console.error('Failed to load companions:', error);
			setState(prev => ({ ...prev, error: 'Failed to load companions', isLoading: false }));
		}
	}, [updateState]);

	/**
	 * Add a new companion
	 */
	const addCompanion = useCallback(async (companion: CompanionNPC) => {
		const validation = validateCharacter(companion);
		if (!validation.isValid) {
			setState(prev => ({ ...prev, error: `Invalid companion: ${validation.errors.join(', ')}` }));
			return;
		}

		const updatedCompanions = [...state.allCompanions, companion];
		updateState(updatedCompanions);
		await saveCompanions();
	}, [state.allCompanions, updateState, saveCompanions]);

	/**
	 * Remove a companion completely
	 */
	const removeCompanion = useCallback(async (companionId: string) => {
		const updatedCompanions = state.allCompanions.filter(c => c.id !== companionId);
		updateState(updatedCompanions);
		await saveCompanions();
	}, [state.allCompanions, updateState, saveCompanions]);

	/**
	 * Update companion data
	 */
	const updateCompanion = useCallback(async (companionId: string, updates: Partial<CompanionNPC>) => {
		const updatedCompanions = state.allCompanions.map(companion => 
			companion.id === companionId 
				? { ...companion, ...updates, updatedAt: Date.now() }
				: companion
		);
		
		updateState(updatedCompanions);
		await saveCompanions();
	}, [state.allCompanions, updateState, saveCompanions]);

	/**
	 * Check if companion can be added to party
	 */
	const canAddToParty = useCallback((companionId: string): { canAdd: boolean; reason?: string } => {
		const companion = state.allCompanions.find(c => c.id === companionId);
		
		if (!companion) {
			return { canAdd: false, reason: 'Companion not found' };
		}
		
		if (companion.isActive) {
			return { canAdd: false, reason: 'Companion is already in party' };
		}
		
		if (state.currentPartySize >= state.maxPartySize - 1) { // -1 for player character
			return { canAdd: false, reason: 'Party is full' };
		}
		
		if (companion.loyalty < 25) {
			return { canAdd: false, reason: 'Companion loyalty too low' };
		}
		
		return { canAdd: true };
	}, [state.allCompanions, state.currentPartySize, state.maxPartySize]);

	/**
	 * Add companion to active party
	 */
	const addToParty = useCallback(async (companionId: string) => {
		const { canAdd, reason } = canAddToParty(companionId);
		
		if (!canAdd) {
			setState(prev => ({ ...prev, error: reason || 'Cannot add to party' }));
			return;
		}
		
		await updateCompanion(companionId, { isActive: true });
	}, [canAddToParty, updateCompanion]);

	/**
	 * Remove companion from active party
	 */
	const removeFromParty = useCallback(async (companionId: string) => {
		await updateCompanion(companionId, { isActive: false });
	}, [updateCompanion]);

	/**
	 * Reorder party members
	 */
	const reorderParty = useCallback(async (companionIds: string[]) => {
		// This would typically update some sort order field
		// For now, we'll just ensure the companions exist and are active
		const validIds = companionIds.filter(id => 
			state.activeParty.some(c => c.id === id)
		);
		
		if (validIds.length !== companionIds.length) {
			setState(prev => ({ ...prev, error: 'Some companions in reorder list are not in party' }));
			return;
		}
		
		// In a more complex system, you'd update a sortOrder field here
		console.log('Party reordered:', validIds);
	}, [state.activeParty]);

	/**
	 * Adjust companion loyalty
	 */
	const adjustLoyalty = useCallback(async (companionId: string, amount: number) => {
		const companion = state.allCompanions.find(c => c.id === companionId);
		if (!companion) return;
		
		const newLoyalty = Math.max(0, Math.min(100, companion.loyalty + amount));
		await updateCompanion(companionId, { loyalty: newLoyalty });
		
		// If loyalty drops too low, remove from party
		if (newLoyalty < 25 && companion.isActive) {
			await removeFromParty(companionId);
		}
	}, [state.allCompanions, updateCompanion, removeFromParty]);

	/**
	 * Set companion behavior preferences
	 */
	const setCompanionBehavior = useCallback(async (
		companionId: string, 
		behavior: Partial<CompanionNPC['behavior']>
	) => {
		const companion = state.allCompanions.find(c => c.id === companionId);
		if (!companion) return;
		
		const updatedBehavior = { ...companion.behavior, ...behavior };
		await updateCompanion(companionId, { behavior: updatedBehavior });
	}, [state.allCompanions, updateCompanion]);

	/**
	 * Get companion by ID
	 */
	const getCompanion = useCallback((companionId: string): CompanionNPC | undefined => {
		return state.allCompanions.find(c => c.id === companionId);
	}, [state.allCompanions]);

	/**
	 * Generate a new random companion
	 */
	const generateRandomCompanionHook = useCallback(async (
		preferredClass?: CompanionNPC['characterClass']
	): Promise<CompanionNPC> => {
		const companion = generateRandomCompanion(preferredClass, 1);
		await addCompanion(companion);
		return companion;
	}, [addCompanion]);

	/**
	 * Reset all companions (for testing/debugging)
	 */
	const resetCompanions = useCallback(async () => {
		try {
			await AsyncStorage.removeItem(COMPANIONS_STORAGE_KEY);
			await AsyncStorage.removeItem(PARTY_STORAGE_KEY);
			updateState([]);
		} catch (error) {
			console.error('Failed to reset companions:', error);
		}
	}, [updateState]);

	/**
	 * Load companions on mount
	 */
	useEffect(() => {
		loadCompanions();
	}, [loadCompanions]);

	/**
	 * Auto-save when companions change
	 */
	useEffect(() => {
		if (!state.isLoading && state.allCompanions.length > 0) {
			saveCompanions();
		}
	}, [state.allCompanions, state.isLoading, saveCompanions]);

	return {
		...state,
		addCompanion,
		removeCompanion,
		updateCompanion,
		addToParty,
		removeFromParty,
		reorderParty,
		adjustLoyalty,
		setCompanionBehavior,
		getCompanion,
		generateRandomCompanion: generateRandomCompanionHook,
		canAddToParty,
		saveCompanions,
		loadCompanions,
		resetCompanions,
	};
}