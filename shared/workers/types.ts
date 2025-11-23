// Shared types for Cloudflare Worker
// These mirror the frontend types but are kept separate for the worker

export interface GameSession {
	id: string;
	inviteCode: string;
	hostId: string;
	questId: string;
	quest: Quest;
	players: PlayerInfo[];
	gameState: MultiplayerGameState | null;
	status: 'waiting' | 'active' | 'completed' | 'cancelled';
	createdAt: number;
	lastUpdated: number;
}

export interface PlayerInfo {
	characterId: string;
	playerId: string;
	name: string;
	joinedAt: number;
	race?: string;
	class?: string;
	level?: number;
	avatarColor?: string;
}

export interface Quest {
	id: string;
	name: string;
	description: string;
	objectives: QuestObjective[];
	startingArea: string;
	world: string;
	maxPlayers?: number;
	estimatedDuration?: number;
	createdAt: number;
	createdBy?: string;
}

export interface QuestObjective {
	id: string;
	description: string;
	completed: boolean;
	completedAt?: number;
}

export interface MultiplayerGameState {
	sessionId: string;
	inviteCode: string;
	hostId: string;
	quest: Quest;
	players: PlayerInfo[];
	characters: Character[];
	playerCharacterId: string; // For backward compatibility, but we track all players
	gameWorld: string;
	startingArea: string;
	worldState?: any;
	status: 'waiting' | 'active' | 'completed' | 'cancelled';
	createdAt: number;
	lastUpdated: number;
	messages: GameMessage[];
	activeTurn?: {
		type: 'player' | 'npc' | 'dm';
		entityId: string;
		turnNumber: number;
		startedAt: number;
		movementUsed?: number;
		majorActionUsed?: boolean;
		minorActionUsed?: boolean;
		speed?: number;
	} | null;
	initiativeOrder?: Array<{
		entityId: string;
		initiative: number;
		type: 'player' | 'npc';
		roll?: number;
		dexMod?: number;
	}>;
	pausedTurn?: {
		type: 'player' | 'npc' | 'dm';
		entityId: string;
		turnNumber: number;
		startedAt: number;
	};
	activityLog?: Array<{
		type: string;
		timestamp: number;
		description: string;
		data?: Record<string, unknown>;
	}>;
}

export interface Character {
	id: string;
	level: number;
	race: string;
	name: string;
	class: string;
	trait?: string;
	image?: string;
	description?: string;
	stats: StatBlock;
	skills: string[];
	inventory: any[];
	equipped: Record<string, string | null>;
	health: number;
	maxHealth: number;
	actionPoints: number;
	maxActionPoints: number;
}

export interface StatBlock {
	STR: number;
	DEX: number;
	CON: number;
	INT: number;
	WIS: number;
	CHA: number;
}

export interface GameMessage {
	id: string;
	content: string;
	timestamp: number;
	type: 'narration' | 'dialogue' | 'action_result' | 'system';
	speaker?: string;
	role?: 'user' | 'assistant' | 'system';
	characterId?: string;
}

export interface WebSocketConnection {
	playerId: string;
	characterId: string;
	ws: WebSocket;
}


