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
	strength: number;
	dexterity: number;
	constitution: number;
	intelligence: number;
	wisdom: number;
	charisma: number;
}

export interface GameMessage {
	id: string;
	content: string;
	timestamp: number;
	type: 'narration' | 'dialogue' | 'action_result' | 'system';
	speaker: string;
	characterId?: string;
}

export interface WebSocketConnection {
	playerId: string;
	characterId: string;
	ws: WebSocket;
}

