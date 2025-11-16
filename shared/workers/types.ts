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
        mapState?: MapState | null;
        npcStates?: NpcState[];
        activityLog?: ActivityLogEntry[];
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

export interface MapState {
        id: string;
        name: string;
        width: number;
        height: number;
        terrain?: TerrainCell[][];
        fog?: boolean[][];
        tokens: MapToken[];
        updatedAt: number;
}

export interface TerrainCell {
        terrain: string;
        fogged?: boolean;
        elevation?: number;
        difficult?: boolean;
}

export type MapTokenType = 'player' | 'npc' | 'object';

export interface MapToken {
        id: string;
        type: MapTokenType;
        entityId?: string;
        label: string;
        x: number;
        y: number;
        zIndex?: number;
        color?: string;
        icon?: string;
        metadata?: Record<string, unknown>;
}

export type NpcAlignment = 'hostile' | 'friendly' | 'vendor';

export interface NpcDefinition {
        id: string;
        name: string;
        alignment: NpcAlignment;
        description?: string;
        maxHealth: number;
        armorClass?: number;
        attack?: string;
        stats?: Record<string, unknown>;
        icon?: string;
        color?: string;
        metadata?: Record<string, unknown>;
}

export interface NpcState extends NpcDefinition {
        currentHealth: number;
        statusEffects?: string[];
        tokenId?: string;
}

export interface ActivityLogEntry {
        id: string;
        type: 'log' | 'dice' | 'system';
        message: string;
        timestamp: number;
        actor?: string;
        details?: Record<string, unknown>;
}


