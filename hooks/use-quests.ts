/**
 * Quest Management Hook
 * Handles quest tracking, objectives, and progress for characters
 */

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { 
	Quest, 
	QuestObjective, 
	QuestReward,
	QuestStatus,
	QuestType 
} from '@/types/quests';

const QUESTS_STORAGE_KEY = 'ai-dnd-quests';
const QUEST_PROGRESS_STORAGE_KEY = 'ai-dnd-quest-progress';

export interface QuestManagerState {
	quests: Map<string, Quest>; // questId -> quest
	activeQuests: Quest[];
	completedQuests: Quest[];
	availableQuests: Quest[];
	questProgress: Map<string, Map<string, number>>; // questId -> objectiveId -> progress
	isLoading: boolean;
	error: string | null;
}

export interface QuestManager extends QuestManagerState {
	// Quest operations
	startQuest: (questId: string) => Promise<boolean>;
	completeQuest: (questId: string) => Promise<boolean>;
	abandonQuest: (questId: string) => Promise<boolean>;
	
	// Objective operations
	updateObjectiveProgress: (questId: string, objectiveId: string, progress: number) => Promise<boolean>;
	completeObjective: (questId: string, objectiveId: string) => Promise<boolean>;
	
	// Quest creation and management
	createQuest: (quest: Omit<Quest, 'id' | 'dateCreated' | 'dateStarted'>) => Promise<Quest>;
	updateQuest: (questId: string, updates: Partial<Quest>) => Promise<boolean>;
	deleteQuest: (questId: string) => Promise<boolean>;
	
	// Quest discovery
	getQuestsByType: (type: QuestType) => Quest[];
	getQuestsByStatus: (status: QuestStatus) => Quest[];
	getQuestProgress: (questId: string) => number; // 0-100 percentage
	
	// Utility
	getQuest: (questId: string) => Quest | undefined;
	isQuestCompleted: (questId: string) => boolean;
	canStartQuest: (questId: string) => { canStart: boolean; reason?: string };
	saveAll: () => Promise<void>;
	loadAll: () => Promise<void>;
}

/**
 * Generate a random quest ID
 */
const generateQuestId = (): string => {
	return `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate a random objective ID
 */
const generateObjectiveId = (): string => {
	return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Calculate quest completion percentage
 */
const calculateQuestProgress = (quest: Quest, progress: Map<string, number>): number => {
	if (quest.objectives.length === 0) return 0;
	
	const totalObjectives = quest.objectives.length;
	let completedObjectives = 0;
	
	for (const objective of quest.objectives) {
		const objectiveProgress = progress.get(objective.id) || 0;
		if (objectiveProgress >= objective.progress.target) {
			completedObjectives++;
		}
	}
	
	return Math.round((completedObjectives / totalObjectives) * 100);
};

/**
 * Check if quest is complete
 */
const isQuestComplete = (quest: Quest, progress: Map<string, number>): boolean => {
	return quest.objectives.every(objective => {
		const objectiveProgress = progress.get(objective.id) || 0;
		return objectiveProgress >= objective.progress.target;
	});
};

/**
 * Custom hook for managing quests
 */
export function useQuests(): QuestManager {
	const [state, setState] = useState<QuestManagerState>({
		quests: new Map(),
		activeQuests: [],
		completedQuests: [],
		availableQuests: [],
		questProgress: new Map(),
		isLoading: true,
		error: null,
	});

	/**
	 * Update derived state when quests or progress changes
	 */
	const updateDerivedState = useCallback((quests: Map<string, Quest>, questProgress: Map<string, Map<string, number>>) => {
		const activeQuests: Quest[] = [];
		const completedQuests: Quest[] = [];
		const availableQuests: Quest[] = [];

		for (const quest of quests.values()) {
			const progress = questProgress.get(quest.id) || new Map();
			
			switch (quest.status) {
				case 'active':
					activeQuests.push(quest);
					break;
				case 'completed':
					completedQuests.push(quest);
					break;
				case 'available':
					availableQuests.push(quest);
					break;
			}
		}

		setState(prev => ({
			...prev,
			quests,
			questProgress,
			activeQuests: activeQuests.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0)),
			completedQuests: completedQuests.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)),
			availableQuests: availableQuests.sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt),
		}));
	}, []);

	/**
	 * Save all quest data to storage
	 */
	const saveAll = useCallback(async () => {
		try {
			const questsData = Array.from(state.quests.entries());
			const progressData = Array.from(state.questProgress.entries()).map(([questId, progress]) => [
				questId,
				Array.from(progress.entries())
			]);
			
			await AsyncStorage.setItem(QUESTS_STORAGE_KEY, JSON.stringify(questsData));
			await AsyncStorage.setItem(QUEST_PROGRESS_STORAGE_KEY, JSON.stringify(progressData));
		} catch (error) {
			console.error('Failed to save quest data:', error);
			setState(prev => ({ ...prev, error: 'Failed to save quest data' }));
		}
	}, [state.quests, state.questProgress]);

	/**
	 * Load all quest data from storage
	 */
	const loadAll = useCallback(async () => {
		try {
			setState(prev => ({ ...prev, isLoading: true, error: null }));
			
			const questsData = await AsyncStorage.getItem(QUESTS_STORAGE_KEY);
			const progressData = await AsyncStorage.getItem(QUEST_PROGRESS_STORAGE_KEY);
			
			const quests = new Map();
			const questProgress = new Map();
			
			if (questsData) {
				const parsedQuests = JSON.parse(questsData);
				for (const [questId, quest] of parsedQuests) {
					quests.set(questId, quest);
				}
			}
			
			if (progressData) {
				const parsedProgress = JSON.parse(progressData);
				for (const [questId, progress] of parsedProgress) {
					questProgress.set(questId, new Map(progress));
				}
			}
			
			updateDerivedState(quests, questProgress);
			
			setState(prev => ({
				...prev,
				isLoading: false,
			}));
		} catch (error) {
			console.error('Failed to load quest data:', error);
			setState(prev => ({ 
				...prev, 
				error: 'Failed to load quest data', 
				isLoading: false 
			}));
		}
	}, [updateDerivedState]);

	/**
	 * Get quest by ID
	 */
	const getQuest = useCallback((questId: string): Quest | undefined => {
		return state.quests.get(questId);
	}, [state.quests]);

	/**
	 * Check if quest can be started
	 */
	const canStartQuest = useCallback((questId: string): { canStart: boolean; reason?: string } => {
		const quest = getQuest(questId);
		if (!quest) {
			return { canStart: false, reason: 'Quest not found' };
		}
		
		if (quest.status !== 'available') {
			return { canStart: false, reason: 'Quest is not available' };
		}
		
		// Check prerequisites
		if (quest.prerequisites?.completedQuests) {
			const unmetPrereqs = quest.prerequisites.completedQuests.filter(prereqId => {
				const prereq = getQuest(prereqId);
				return !prereq || prereq.status !== 'completed';
			});
			
			if (unmetPrereqs.length > 0) {
				return { canStart: false, reason: 'Prerequisites not met' };
			}
		}
		
		// Check level requirement
		if (quest.prerequisites?.level && quest.prerequisites.level > 1) {
			// This would need to check character level in a real implementation
			// For now, assume level requirement is met
		}
		
		return { canStart: true };
	}, [getQuest]);

	/**
	 * Start a quest
	 */
	const startQuest = useCallback(async (questId: string): Promise<boolean> => {
		const { canStart, reason } = canStartQuest(questId);
		if (!canStart) {
			setState(prev => ({ ...prev, error: reason || 'Cannot start quest' }));
			return false;
		}

		const quest = getQuest(questId);
		if (!quest) return false;

		const updatedQuest: Quest = {
			...quest,
			status: 'active',
			startedAt: Date.now(),
			lastUpdatedAt: Date.now(),
		};

		const newQuests = new Map(state.quests);
		newQuests.set(questId, updatedQuest);

		// Initialize progress for all objectives
		const newProgress = new Map(state.questProgress);
		const questObjectiveProgress = new Map();
		for (const objective of quest.objectives) {
			questObjectiveProgress.set(objective.id, 0);
		}
		newProgress.set(questId, questObjectiveProgress);

		updateDerivedState(newQuests, newProgress);
		await saveAll();
		return true;
	}, [canStartQuest, getQuest, state.quests, state.questProgress, updateDerivedState, saveAll]);

	/**
	 * Complete a quest
	 */
	const completeQuest = useCallback(async (questId: string): Promise<boolean> => {
		const quest = getQuest(questId);
		if (!quest || quest.status !== 'active') {
			return false;
		}

		const progress = state.questProgress.get(questId) || new Map();
		if (!isQuestComplete(quest, progress)) {
			setState(prev => ({ ...prev, error: 'Quest objectives not complete' }));
			return false;
		}

		const updatedQuest: Quest = {
			...quest,
			status: 'completed',
			completedAt: Date.now(),
			lastUpdatedAt: Date.now(),
		};

		const newQuests = new Map(state.quests);
		newQuests.set(questId, updatedQuest);

		updateDerivedState(newQuests, state.questProgress);
		await saveAll();
		return true;
	}, [getQuest, state.quests, state.questProgress, updateDerivedState, saveAll]);

	/**
	 * Abandon a quest
	 */
	const abandonQuest = useCallback(async (questId: string): Promise<boolean> => {
		const quest = getQuest(questId);
		if (!quest || quest.status !== 'active') {
			return false;
		}

		const updatedQuest: Quest = {
			...quest,
			status: 'available',
			startedAt: undefined,
			lastUpdatedAt: Date.now(),
		};

		const newQuests = new Map(state.quests);
		newQuests.set(questId, updatedQuest);

		// Reset progress
		const newProgress = new Map(state.questProgress);
		newProgress.delete(questId);

		updateDerivedState(newQuests, newProgress);
		await saveAll();
		return true;
	}, [getQuest, state.quests, state.questProgress, updateDerivedState, saveAll]);

	/**
	 * Update objective progress
	 */
	const updateObjectiveProgress = useCallback(async (
		questId: string, 
		objectiveId: string, 
		progress: number
	): Promise<boolean> => {
		const quest = getQuest(questId);
		if (!quest || quest.status !== 'active') {
			return false;
		}

		const objective = quest.objectives.find(obj => obj.id === objectiveId);
		if (!objective) {
			return false;
		}

		const newProgress = new Map(state.questProgress);
		const questProgress = newProgress.get(questId) || new Map();
		questProgress.set(objectiveId, Math.max(0, progress));
		newProgress.set(questId, questProgress);

		// Check if quest is now complete
		if (isQuestComplete(quest, questProgress)) {
			await completeQuest(questId);
		} else {
			updateDerivedState(state.quests, newProgress);
		}

		await saveAll();
		return true;
	}, [getQuest, state.quests, state.questProgress, updateDerivedState, saveAll, completeQuest]);

	/**
	 * Complete an objective
	 */
	const completeObjective = useCallback(async (
		questId: string, 
		objectiveId: string
	): Promise<boolean> => {
		const quest = getQuest(questId);
		const objective = quest?.objectives.find(obj => obj.id === objectiveId);
		
		if (!objective) return false;
		
		return await updateObjectiveProgress(questId, objectiveId, objective.progress.target);
	}, [getQuest, updateObjectiveProgress]);

	/**
	 * Create a new quest
	 */
	const createQuest = useCallback(async (
		questData: Omit<Quest, 'id' | 'lastUpdatedAt' | 'startedAt'>
	): Promise<Quest> => {
		const quest: Quest = {
			...questData,
			id: generateQuestId(),
			lastUpdatedAt: Date.now(),
			// Generate IDs for objectives if not provided
			objectives: questData.objectives.map(obj => ({
				...obj,
				id: obj.id || generateObjectiveId(),
			})),
		};

		const newQuests = new Map(state.quests);
		newQuests.set(quest.id, quest);

		updateDerivedState(newQuests, state.questProgress);
		await saveAll();
		return quest;
	}, [state.quests, state.questProgress, updateDerivedState, saveAll]);

	/**
	 * Update quest
	 */
	const updateQuest = useCallback(async (
		questId: string, 
		updates: Partial<Quest>
	): Promise<boolean> => {
		const quest = getQuest(questId);
		if (!quest) return false;

		const updatedQuest = { ...quest, ...updates };
		const newQuests = new Map(state.quests);
		newQuests.set(questId, updatedQuest);

		updateDerivedState(newQuests, state.questProgress);
		await saveAll();
		return true;
	}, [getQuest, state.quests, state.questProgress, updateDerivedState, saveAll]);

	/**
	 * Delete quest
	 */
	const deleteQuest = useCallback(async (questId: string): Promise<boolean> => {
		const newQuests = new Map(state.quests);
		const newProgress = new Map(state.questProgress);
		
		newQuests.delete(questId);
		newProgress.delete(questId);

		updateDerivedState(newQuests, newProgress);
		await saveAll();
		return true;
	}, [state.quests, state.questProgress, updateDerivedState, saveAll]);

	/**
	 * Get quests by type
	 */
	const getQuestsByType = useCallback((type: QuestType): Quest[] => {
		return Array.from(state.quests.values()).filter(quest => quest.type === type);
	}, [state.quests]);

	/**
	 * Get quests by status
	 */
	const getQuestsByStatus = useCallback((status: QuestStatus): Quest[] => {
		return Array.from(state.quests.values()).filter(quest => quest.status === status);
	}, [state.quests]);

	/**
	 * Get quest completion percentage
	 */
	const getQuestProgress = useCallback((questId: string): number => {
		const quest = getQuest(questId);
		const progress = state.questProgress.get(questId);
		
		if (!quest || !progress) return 0;
		
		return calculateQuestProgress(quest, progress);
	}, [getQuest, state.questProgress]);

	/**
	 * Check if quest is completed
	 */
	const isQuestCompleted = useCallback((questId: string): boolean => {
		const quest = getQuest(questId);
		return quest?.status === 'completed' || false;
	}, [getQuest]);

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
	}, [state.quests, state.questProgress, state.isLoading, saveAll]);

	return {
		...state,
		startQuest,
		completeQuest,
		abandonQuest,
		updateObjectiveProgress,
		completeObjective,
		createQuest,
		updateQuest,
		deleteQuest,
		getQuestsByType,
		getQuestsByStatus,
		getQuestProgress,
		getQuest,
		isQuestCompleted,
		canStartQuest,
		saveAll,
		loadAll,
	};
}