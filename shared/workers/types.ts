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

export type MapTokenType = 'player' | 'npc' | 'object';

export interface MapTileState {
        x: number;
        y: number;
        terrain: string;
        elevation?: number;
        isBlocked?: boolean;
        hasFog?: boolean;
}

export interface MapTokenState {
        id: string;
        label: string;
        type: MapTokenType;
        referenceId?: string;
        characterId?: string;
        icon?: string;
        color?: string;
        x: number;
        y: number;
        elevation?: number;
        hitPoints?: number;
        maxHitPoints?: number;
        status?: string[];
        metadata?: Record<string, unknown>;
}

export interface MapState {
        id: string;
        mapId?: string;
        name: string;
        width: number;
        height: number;
        gridSize?: number;
        terrain?: string;
        fogOfWar?: string;
        tiles?: MapTileState[];
        tokens: MapTokenState[];
        updatedAt: number;
}

export interface NpcDefinition {
        id: string;
        slug: string;
        name: string;
        role: 'hostile' | 'friendly' | 'vendor';
        alignment?: string;
        description?: string;
        stats: StatBlock;
        maxHealth: number;
        abilities?: string[];
        metadata?: Record<string, unknown>;
}

export interface SessionLogEntry {
        id: string;
        type: 'narration' | 'action' | 'dice' | 'system';
        content: string;
        timestamp: number;
        actor?: string;
        characterId?: string;
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
        mapState?: MapState;
        log?: SessionLogEntry[];
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


