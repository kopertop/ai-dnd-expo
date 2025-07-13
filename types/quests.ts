/**
 * Quest System Types - Objectives, Progress, and Exploration
 * Framework for tracking player progress and story advancement
 */

export type QuestType = 'main' | 'side' | 'companion' | 'exploration' | 'daily' | 'random';

export type QuestStatus = 'available' | 'active' | 'completed' | 'failed' | 'abandoned';

export type ObjectiveType = 
	| 'kill' 
	| 'collect' 
	| 'deliver' 
	| 'talk-to' 
	| 'reach-location' 
	| 'use-item' 
	| 'survive' 
	| 'escort' 
	| 'discover' 
	| 'craft'
	| 'rest'
	| 'custom';

export type QuestPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Individual quest objective
 */
export interface QuestObjective {
	id: string;
	type: ObjectiveType;
	title: string;
	description: string;
	
	// Progress tracking
	isCompleted: boolean;
	progress: {
		current: number;
		target: number;
		unit?: string; // e.g., "enemies", "items", "meters"
	};
	
	// Optional conditions
	conditions?: {
		location?: string;
		characterLevel?: number;
		timeLimit?: number; // in milliseconds
		companions?: string[]; // companion IDs required
		items?: string[]; // item IDs required
	};
	
	// Tracking data
	targetData?: {
		entityId?: string; // NPC ID, location ID, etc.
		itemId?: string;
		count?: number;
		position?: { x: number; y: number };
	};
	
	// UI presentation
	isHidden?: boolean; // Hidden until conditions met
	isOptional?: boolean;
	order: number; // Display order
}

/**
 * Quest reward structure
 */
export interface QuestReward {
	type: 'experience' | 'gold' | 'item' | 'reputation' | 'unlock' | 'companion';
	amount?: number;
	itemId?: string;
	description: string;
	isHidden?: boolean; // Don't show until quest completed
}

/**
 * Quest giver information
 */
export interface QuestGiver {
	type: 'npc' | 'item' | 'location' | 'dm' | 'automatic';
	id?: string; // NPC/item/location ID
	name: string;
	description?: string;
	dialogueText?: {
		offer: string;
		accept: string;
		decline: string;
		inProgress: string;
		completed: string;
	};
}

/**
 * Main quest data structure
 */
export interface Quest {
	id: string;
	title: string;
	description: string;
	type: QuestType;
	status: QuestStatus;
	priority: QuestPriority;
	
	// Quest content
	objectives: QuestObjective[];
	rewards: QuestReward[];
	questGiver?: QuestGiver;
	
	// Prerequisites and relationships
	prerequisites?: {
		level?: number;
		completedQuests?: string[];
		companionIds?: string[];
		items?: string[];
		reputation?: Record<string, number>;
	};
	
	// Quest flow
	followUpQuests?: string[]; // Quests unlocked by completion
	failureConsequences?: {
		description: string;
		questsBlocked?: string[];
		reputationLoss?: Record<string, number>;
	};
	
	// Timing and limits
	timeLimit?: {
		duration: number; // milliseconds
		warningThreshold?: number; // warn when X ms remaining
	};
	
	// Tracking metadata
	startedAt?: number;
	completedAt?: number;
	lastUpdatedAt: number;
	
	// Story and presentation
	category?: string; // "Combat", "Exploration", "Social", etc.
	tags?: string[];
	journalEntry?: string; // Rich text for quest journal
	
	// Integration with game systems
	dmContext?: {
		summary: string; // For DM agent context
		keyEvents: string[];
		importantNPCs: string[];
	};
}

/**
 * Quest journal for organizing player's active quests
 */
export interface QuestJournal {
	activeQuests: Quest[];
	completedQuests: Quest[];
	failedQuests: Quest[];
	
	// Organization
	pinnedQuestIds: string[];
	categories: Record<string, string[]>; // category -> quest IDs
	
	// Progress tracking
	totalExperienceGained: number;
	totalQuestsCompleted: number;
	totalQuestsFailed: number;
	
	// Statistics
	stats: {
		byType: Record<QuestType, number>;
		byCategory: Record<string, number>;
		averageCompletionTime: number;
		currentStreak: number; // consecutive quests completed
	};
}

/**
 * Quest progress event data
 */
export interface QuestProgressEvent {
	questId: string;
	objectiveId: string;
	previousProgress: number;
	newProgress: number;
	context?: {
		location?: string;
		characterLevel?: number;
		companionIds?: string[];
		triggerData?: any;
	};
}

/**
 * Quest template for easy quest creation
 */
export interface QuestTemplate {
	id: string;
	name: string;
	description: string;
	type: QuestType;
	category: string;
	
	// Template structure
	objectiveTemplates: {
		type: ObjectiveType;
		titleTemplate: string;
		descriptionTemplate: string;
		progressTarget?: number;
		isOptional?: boolean;
		variables?: string[]; // Variables to substitute
	}[];
	
	rewardTemplates: {
		type: QuestReward['type'];
		amountFormula?: string; // e.g., "level * 100" for scaling rewards
		itemPool?: string[]; // Random item selection
	}[];
	
	// Generation parameters
	levelRange?: { min: number; max: number };
	locationTypes?: string[];
	companionRequirements?: string[];
	
	// Variation settings
	randomization?: {
		objectiveCount?: { min: number; max: number };
		targetVariation?: number; // +/- percentage for progress targets
		rewardVariation?: number;
	};
}

/**
 * Quest generation context
 */
export interface QuestGenerationContext {
	playerLevel: number;
	currentLocation: string;
	availableCompanions: string[];
	completedQuests: string[];
	playerPreferences?: {
		favoriteTypes: QuestType[];
		difficultyPreference: 'easy' | 'medium' | 'hard';
		lengthPreference: 'short' | 'medium' | 'long';
	};
	worldState?: {
		factions: Record<string, number>; // reputation levels
		events: string[]; // active world events
		discoveries: string[]; // discovered locations/secrets
	};
}

/**
 * Quest system events
 */
export interface QuestEvents {
	'quest:offered': { quest: Quest; giver?: QuestGiver };
	'quest:accepted': { quest: Quest };
	'quest:declined': { quest: Quest };
	'quest:abandoned': { quest: Quest; reason?: string };
	'quest:completed': { quest: Quest; rewards: QuestReward[] };
	'quest:failed': { quest: Quest; reason: string };
	'objective:progress': QuestProgressEvent;
	'objective:completed': { quest: Quest; objective: QuestObjective };
	'reward:granted': { quest: Quest; reward: QuestReward };
	'journal:updated': { journal: QuestJournal };
}

/**
 * Quest discovery and availability
 */
export interface QuestDiscovery {
	questId: string;
	discoveryMethod: 'npc-dialogue' | 'item-examination' | 'location-exploration' | 'dm-trigger' | 'automatic';
	requirements: {
		level?: number;
		location?: string;
		time?: { after?: number; before?: number };
		conditions?: string[];
	};
	availabilityWindow?: {
		start: number;
		end: number;
	};
}

/**
 * Integration with game world
 */
export interface WorldQuestState {
	availableQuests: Map<string, QuestDiscovery>;
	activeQuestEffects: {
		questId: string;
		worldChanges: {
			npcDialogue?: Record<string, string>;
			locationAccess?: Record<string, boolean>;
			itemAvailability?: Record<string, boolean>;
		};
	}[];
	questMarkers: {
		questId: string;
		objectiveId: string;
		position: { x: number; y: number };
		type: 'start' | 'progress' | 'complete' | 'turn-in';
		isVisible: boolean;
	}[];
}

/**
 * Utility types for quest operations
 */
export type QuestFilter = {
	type?: QuestType[];
	status?: QuestStatus[];
	priority?: QuestPriority[];
	category?: string[];
	hasTimeLimit?: boolean;
	isOptional?: boolean;
};

export type QuestSort = 'priority' | 'type' | 'progress' | 'time-remaining' | 'alphabetical';

export type QuestValidator = (quest: Quest, context: QuestGenerationContext) => boolean;
export type QuestGenerator = (template: QuestTemplate, context: QuestGenerationContext) => Quest;
export type ProgressTracker = (event: QuestProgressEvent) => QuestObjective[];
export type RewardCalculator = (quest: Quest, performance?: 'poor' | 'good' | 'excellent') => QuestReward[];