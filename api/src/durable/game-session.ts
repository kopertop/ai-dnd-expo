import { DurableObjectState, DurableObjectStorage } from '@cloudflare/workers-types';

import type { Character, MultiplayerGameState, PlayerInfo, Quest } from '../../../shared/workers/types';

import { DEFAULT_RACE_SPEED } from '@/constants/race-speed';
import { getCharacterSpeed } from '@/utils/character-utils';

type SessionStatus = 'waiting' | 'active' | 'completed' | 'cancelled';

type StoredSession = {
	sessionId: string;
	inviteCode: string;
	hostId: string;
	quest: Quest;
	world: string;
	startingArea: string;
	players: PlayerInfo[];
	characters: Character[];
	status: SessionStatus;
	createdAt: number;
	lastUpdated: number;
	gameState: MultiplayerGameState | null;
};

type InitializePayload = {
	inviteCode: string;
	hostId: string;
	quest: Quest;
	world: string;
	startingArea: string;
};

type JoinPayload = {
	character: Character;
	playerId: string;
};

type StartPayload = {
	hostId: string;
	gameState: MultiplayerGameState;
};

const SESSION_KEY = 'session';

const json = (data: unknown, status = 200): Response =>
	new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json',
		},
	});

export class GameSession {
	private readonly storage: DurableObjectStorage;

	constructor(private readonly state: DurableObjectState) {
		this.storage = state.storage;
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const pathname = url.pathname.replace(/\/$/, '') || '/';

		try {
			if (pathname.endsWith('/ws')) {
				return new Response('WebSocket support is not yet implemented.', { status: 501 });
			}

			switch (pathname) {
				case '/initialize':
					return this.handleInitialize(request);
				case '/join':
					return this.handleJoin(request);
				case '/state':
					return this.handleState();
				case '/start':
					return this.handleStart(request);
				case '/initiative/roll':
					return this.handleRollInitiative(request);
				case '/turn/interrupt':
					return this.handleInterruptTurn(request);
				case '/turn/resume':
					return this.handleResumeTurn(request);
				case '/turn/update':
					return this.handleUpdateTurnState(request);
				case '/turn/end':
					return this.handleEndTurn(request);
				case '/turn/start':
					return this.handleStartTurn(request);
				case '/turn/next':
					return this.handleNextTurn(request);
				case '/dice/roll':
					return this.handleDiceRoll(request);
				case '/action':
				case '/dm-action':
					return json({ ok: true });
				default:
					return new Response('Not found', { status: 404 });
			}
		} catch (error) {
			console.error('GameSession Durable Object error:', error);
			return json({ error: 'Durable Object failure' }, 500);
		}
	}

	private getEntitySpeed(
		entityId: string,
		type: 'player' | 'npc' | 'dm',
		characters: Character[],
	): number {
		if (type === 'player') {
			const character = characters.find(c => c.id === entityId);
			if (character) {
				return getCharacterSpeed(character);
			}
		}

		// For NPCs and DM (or if character not found), fall back to default movement
		return DEFAULT_RACE_SPEED;
	}

	private buildActiveTurn(
		entity: { entityId: string; type: 'player' | 'npc' | 'dm' },
		currentTurnNumber: number,
		characters: Character[],
	): NonNullable<MultiplayerGameState['activeTurn']> {
		return {
			type: entity.type,
			entityId: entity.entityId,
			turnNumber: currentTurnNumber + 1,
			startedAt: Date.now(),
			movementUsed: 0,
			majorActionUsed: false,
			minorActionUsed: false,
			speed: this.getEntitySpeed(entity.entityId, entity.type, characters),
		};
	}

	private resetTurnUsage(
		turn: MultiplayerGameState['activeTurn'],
		characters: Character[],
	): MultiplayerGameState['activeTurn'] {
		if (!turn) {
			return turn;
		}

		return {
			...turn,
			movementUsed: 0,
			majorActionUsed: false,
			minorActionUsed: false,
			speed: turn.speed ?? this.getEntitySpeed(turn.entityId, turn.type, characters),
		};
	}

	private resetActionPointsForEntity(characters: Character[], entityId: string): Character[] {
		return characters.map(char =>
			char.id === entityId
				? {
					...char,
					actionPoints: char.maxActionPoints ?? 3,
				}
				: char,
		);
	}

	private async handleInitialize(request: Request): Promise<Response> {
		const payload = (await request.json()) as InitializePayload;

		if (!payload?.inviteCode || !payload?.hostId || !payload?.quest) {
			return json({ error: 'Invalid payload' }, 400);
		}

		const now = Date.now();
		const session: StoredSession = {
			sessionId: this.state.id.toString(),
			inviteCode: payload.inviteCode,
			hostId: payload.hostId,
			quest: payload.quest,
			world: payload.world,
			startingArea: payload.startingArea,
			players: [],
			characters: [],
			status: 'waiting',
			createdAt: now,
			lastUpdated: now,
			gameState: null,
		};

		await this.storage.put(SESSION_KEY, session);
		return json({ ok: true, sessionId: session.sessionId });
	}

	private async handleJoin(request: Request): Promise<Response> {
		const payload = (await request.json()) as JoinPayload;
		const session = await this.getSession();

		if (!session) {
			return json({ error: 'Session not initialized' }, 404);
		}

		const player: PlayerInfo = {
			characterId: payload.character.id,
			playerId: payload.playerId,
			name: payload.character.name,
			joinedAt: Date.now(),
			race: payload.character.race,
			class: payload.character.class,
			level: payload.character.level,
			avatarColor: payload.character.trait ?? undefined,
		};

		const filteredPlayers = session.players.filter(p => p.characterId !== player.characterId);
		const filteredCharacters = (session.characters ?? []).filter(c => c.id !== payload.character.id);
		const updatedPlayers = [...filteredPlayers, player];
		const updatedCharacters = [...filteredCharacters, payload.character];

		const updatedGameState = session.gameState
			? {
				...session.gameState,
				players: updatedPlayers,
				characters: [
					...(session.gameState.characters || []).filter(c => c.id !== payload.character.id),
					payload.character,
				],
				lastUpdated: Date.now(),
			}
			: session.gameState;

		const updatedSession: StoredSession = {
			...session,
			players: updatedPlayers,
			characters: updatedCharacters,
			gameState: updatedGameState,
			lastUpdated: Date.now(),
		};

		await this.storage.put(SESSION_KEY, updatedSession);
		return json(this.toResponse(updatedSession));
	}

	private async handleState(): Promise<Response> {
		const session = await this.getSession();
		if (!session) {
			return json({ error: 'Session not found' }, 404);
		}
		return json(this.toResponse(session));
	}

	private async handleStart(request: Request): Promise<Response> {
		const payload = (await request.json()) as StartPayload;
		const session = await this.getSession();

		if (!session) {
			return json({ error: 'Session not initialized' }, 404);
		}

		// Prefer characters from payload, then session.characters, ensuring we have full character data
		const canonicalCharacters =
			payload.gameState?.characters?.length
				? payload.gameState.characters
				: session.characters && session.characters.length > 0
					? session.characters
					: [];

		// Merge characters: ensure all players have corresponding characters with full data
		const mergedCharacters = [...canonicalCharacters];
		for (const player of session.players) {
			const existing = mergedCharacters.find(c => c.id === player.characterId);
			if (!existing) {
				// Create character from player data if missing
				mergedCharacters.push({
					id: player.characterId,
					name: player.name || 'Unknown',
					race: player.race || 'Unknown',
					class: player.class || 'Unknown',
					level: player.level || 1,
					stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
					skills: [],
					inventory: [],
					equipped: {},
					health: 10,
					maxHealth: 10,
					actionPoints: 3,
					maxActionPoints: 3,
				});
			}
		}

		const updatedGameState = payload.gameState
			? {
				...payload.gameState,
				characters: mergedCharacters,
				players: payload.gameState.players ?? session.players,
			}
			: null;

		const normalizedGameState = updatedGameState?.activeTurn
			? {
				...updatedGameState,
				activeTurn: this.resetTurnUsage(updatedGameState.activeTurn, mergedCharacters),
			}
			: updatedGameState;

		const updated: StoredSession = {
			...session,
			status: payload.gameState?.status ?? 'active',
			gameState: normalizedGameState,
			players: normalizedGameState?.players ?? session.players,
			characters: mergedCharacters,
			lastUpdated: Date.now(),
		};

		await this.storage.put(SESSION_KEY, updated);
		return json(this.toResponse(updated));
	}

	private rollD20(): number {
		return Math.floor(Math.random() * 20) + 1;
	}

	private getDexModifier(dex: number): number {
		return Math.floor((dex - 10) / 2);
	}

	private async handleRollInitiative(request: Request): Promise<Response> {
		const session = await this.getSession();
		if (!session || !session.gameState) {
			return json({ error: 'Game not started' }, 400);
		}

		// Get all characters and NPCs from the request payload
		const payload = (await request.json()) as {
			characters: Array<{ id: string; stats: { DEX: number } }>;
			npcs: Array<{ id: string; stats?: { DEX: number }; entityId: string }>;
		};

		const initiativeEntries: Array<{ entityId: string; initiative: number; type: 'player' | 'npc'; dex: number; roll: number; dexMod: number }> = [];

		// Roll for characters
		for (const char of payload.characters || []) {
			const dex = char.stats?.DEX ?? 10;
			const dexMod = this.getDexModifier(dex);
			const roll = this.rollD20();
			const initiative = roll + dexMod;
			initiativeEntries.push({
				entityId: char.id,
				initiative,
				type: 'player',
				dex,
				roll,
				dexMod,
			});
		}

		// Roll for NPCs
		for (const npc of payload.npcs || []) {
			const dex = npc.stats?.DEX ?? 10;
			const dexMod = this.getDexModifier(dex);
			const roll = this.rollD20();
			const initiative = roll + dexMod;
			initiativeEntries.push({
				entityId: npc.entityId || npc.id,
				initiative,
				type: 'npc',
				dex,
				roll,
				dexMod,
			});
		}

		// Sort by initiative (descending), then by DEX (descending) for ties
		initiativeEntries.sort((a, b) => {
			if (b.initiative !== a.initiative) {
				return b.initiative - a.initiative;
			}
			return b.dex - a.dex;
		});

		const initiativeOrder = initiativeEntries.map(({ entityId, initiative, type, roll, dexMod }) => ({
			entityId,
			initiative,
			type,
			roll,
			dexMod,
		}));

		// Set first entity as active turn
		const firstEntity = initiativeOrder[0];
		const characters = session.gameState.characters ?? [];
		const activeTurn = firstEntity
			? this.resetTurnUsage(
				this.buildActiveTurn(firstEntity, session.gameState.activeTurn?.turnNumber ?? 0, characters),
				characters,
			)
			: null;

		// Update game state
		const updatedGameState: MultiplayerGameState = {
			...session.gameState,
			initiativeOrder,
			activeTurn,
			characters: activeTurn ? this.resetActionPointsForEntity(characters, activeTurn.entityId) : characters,
			lastUpdated: Date.now(),
		};

		const updated: StoredSession = {
			...session,
			gameState: updatedGameState,
			lastUpdated: Date.now(),
		};

		await this.storage.put(SESSION_KEY, updated);
		return json(updatedGameState);
	}

	private async handleInterruptTurn(request: Request): Promise<Response> {
		const session = await this.getSession();
		if (!session || !session.gameState) {
			return json({ error: 'Game not started' }, 400);
		}

		// Store current turn as paused (only if it exists and has all required fields)
		const currentActiveTurn = session.gameState.activeTurn;
		const pausedTurn: MultiplayerGameState['pausedTurn'] = currentActiveTurn
			? {
				type: currentActiveTurn.type,
				entityId: currentActiveTurn.entityId,
				turnNumber: currentActiveTurn.turnNumber,
				startedAt: currentActiveTurn.startedAt,
			}
			: undefined;

		// Build new DM turn with proper initialization of usage fields and speed
		const characters = session.gameState.characters ?? [];
		const currentTurnNumber = session.gameState.activeTurn?.turnNumber ?? 0;
		const activeTurn = this.buildActiveTurn(
			{ entityId: session.hostId, type: 'dm' },
			currentTurnNumber,
			characters,
		);

		const updatedGameState: MultiplayerGameState = {
			...session.gameState,
			pausedTurn,
			activeTurn,
			lastUpdated: Date.now(),
		};

		const updated: StoredSession = {
			...session,
			gameState: updatedGameState,
			lastUpdated: Date.now(),
		};

		await this.storage.put(SESSION_KEY, updated);
		return json({ activeTurn, pausedTurn });
	}

	private async handleResumeTurn(request: Request): Promise<Response> {
		const session = await this.getSession();
		if (!session || !session.gameState) {
			return json({ error: 'Game not started' }, 400);
		}

		// Restore paused turn
		const pausedTurn = session.gameState.pausedTurn;
		if (!pausedTurn || !pausedTurn.entityId || !pausedTurn.type) {
			return json({ error: 'No paused turn to resume' }, 400);
		}

		// Get characters to properly initialize turn usage fields
		const characters = session.gameState.characters ?? [];

		// Restore the paused turn with proper turn usage initialization
		// Ensure all required fields are present before passing to resetTurnUsage
		const activeTurn = this.resetTurnUsage(
			{
				type: pausedTurn.type,
				entityId: pausedTurn.entityId,
				turnNumber: pausedTurn.turnNumber,
				startedAt: Date.now(),
			},
			characters,
		);

		const updatedGameState: MultiplayerGameState = {
			...session.gameState,
			activeTurn,
			pausedTurn: undefined,
			lastUpdated: Date.now(),
		};

		const updated: StoredSession = {
			...session,
			gameState: updatedGameState,
			lastUpdated: Date.now(),
		};

		await this.storage.put(SESSION_KEY, updated);
		return json({ activeTurn });
	}

	private async handleEndTurn(request: Request): Promise<Response> {
		const session = await this.getSession();
		if (!session || !session.gameState) {
			return json({ error: 'Game not started' }, 400);
		}

		if (!session.gameState.initiativeOrder || session.gameState.initiativeOrder.length === 0) {
			return json({ error: 'No initiative order set' }, 400);
		}

		const currentTurn = session.gameState.activeTurn;
		if (!currentTurn) {
			return json({ error: 'No active turn' }, 400);
		}

		// Find current entity in initiative order
		const currentIndex = session.gameState.initiativeOrder.findIndex(
			entry => entry.entityId === currentTurn.entityId,
		);

		if (currentIndex === -1) {
			return json({ error: 'Current turn entity not found in initiative order' }, 400);
		}

		// Move to next entity (wrap around if at end)
		const nextIndex = (currentIndex + 1) % session.gameState.initiativeOrder.length;
		const nextEntity = session.gameState.initiativeOrder[nextIndex];

		const characters = session.gameState.characters ?? [];
		const activeTurn = this.buildActiveTurn(
			{ entityId: nextEntity.entityId, type: nextEntity.type },
			currentTurn.turnNumber ?? 0,
			characters,
		);

		// Reset action points for the new turn's character
		const updatedCharacters = this.resetActionPointsForEntity(characters, nextEntity.entityId);

		const updatedGameState: MultiplayerGameState = {
			...session.gameState,
			characters: updatedCharacters,
			activeTurn: this.resetTurnUsage(activeTurn, updatedCharacters),
			lastUpdated: Date.now(),
		};

		const updated: StoredSession = {
			...session,
			gameState: updatedGameState,
			lastUpdated: Date.now(),
		};

		await this.storage.put(SESSION_KEY, updated);
		return json(updatedGameState);
	}

	private async handleStartTurn(request: Request): Promise<Response> {
		const session = await this.getSession();
		if (!session || !session.gameState) {
			return json({ error: 'Game not started' }, 400);
		}

		const payload = (await request.json()) as {
			turnType: 'player' | 'npc' | 'dm';
			entityId: string;
		};

		if (!payload.turnType || !payload.entityId) {
			return json({ error: 'Invalid payload: turnType and entityId required' }, 400);
		}

		const currentTurnNumber = session.gameState.activeTurn?.turnNumber ?? 0;
		const characters = session.gameState.characters ?? [];

		const activeTurn = this.buildActiveTurn(
			{ entityId: payload.entityId, type: payload.turnType },
			currentTurnNumber,
			characters,
		);

		// Reset action points for the character starting their turn
		const updatedCharacters = this.resetActionPointsForEntity(characters, payload.entityId);

		const updatedGameState: MultiplayerGameState = {
			...session.gameState,
			characters: updatedCharacters,
			activeTurn: this.resetTurnUsage(activeTurn, updatedCharacters),
			lastUpdated: Date.now(),
		};

		const updated: StoredSession = {
			...session,
			gameState: updatedGameState,
			lastUpdated: Date.now(),
		};

		await this.storage.put(SESSION_KEY, updated);
		return json(updatedGameState);
	}

	private async handleUpdateTurnState(request: Request): Promise<Response> {
		const session = await this.getSession();
		if (!session || !session.gameState) {
			return json({ error: 'Game not started' }, 400);
		}

		if (!session.gameState.activeTurn) {
			return json({ error: 'No active turn' }, 400);
		}

		const payload = (await request.json().catch(() => ({}))) as {
			movementUsed?: number;
			majorActionUsed?: boolean;
			minorActionUsed?: boolean;
			actorEntityId?: string;
		};

		const currentTurn = session.gameState.activeTurn;

		if (payload.actorEntityId && payload.actorEntityId !== currentTurn.entityId) {
			return json({ error: 'Forbidden: Invalid actor' }, 403);
		}

		const speed = currentTurn.speed ?? DEFAULT_RACE_SPEED;

		let movementUsed = currentTurn.movementUsed ?? 0;
		if (typeof payload.movementUsed === 'number' && Number.isFinite(payload.movementUsed)) {
			movementUsed = Math.min(speed, Math.max(0, payload.movementUsed));
		}

		const majorActionUsed =
			typeof payload.majorActionUsed === 'boolean'
				? payload.majorActionUsed
				: currentTurn.majorActionUsed ?? false;
		const minorActionUsed =
			typeof payload.minorActionUsed === 'boolean'
				? payload.minorActionUsed
				: currentTurn.minorActionUsed ?? false;

		const updatedGameState: MultiplayerGameState = {
			...session.gameState,
			activeTurn: {
				...currentTurn,
				movementUsed,
				majorActionUsed,
				minorActionUsed,
			},
			lastUpdated: Date.now(),
		};

		const updated: StoredSession = {
			...session,
			gameState: updatedGameState,
			lastUpdated: Date.now(),
		};

		await this.storage.put(SESSION_KEY, updated);
		return json(updatedGameState);
	}

	private async handleNextTurn(request: Request): Promise<Response> {
		// Skip to next turn (same as end turn, but DM-only)
		return this.handleEndTurn(request);
	}

	private async handleDiceRoll(request: Request): Promise<Response> {
		const session = await this.getSession();
		if (!session || !session.gameState) {
			return json({ error: 'Game not started' }, 400);
		}

		const payload = (await request.json()) as {
			notation: string;
			advantage?: boolean;
			disadvantage?: boolean;
			purpose?: string;
		};

		if (!payload.notation) {
			return json({ error: 'Dice notation required' }, 400);
		}

		// Parse dice notation: XdY+Z or XdY-Z
		const notationMatch = payload.notation.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
		if (!notationMatch) {
			return json({ error: 'Invalid dice notation. Use format: XdY+Z (e.g., 1d20+3)' }, 400);
		}

		const numDice = parseInt(notationMatch[1], 10);
		const dieSize = parseInt(notationMatch[2], 10);
		const modifier = notationMatch[3] ? parseInt(notationMatch[3], 10) : 0;

		if (numDice < 1 || numDice > 100) {
			return json({ error: 'Number of dice must be between 1 and 100' }, 400);
		}

		if (dieSize < 2 || dieSize > 100) {
			return json({ error: 'Die size must be between 2 and 100' }, 400);
		}

		// Handle advantage/disadvantage (only for d20)
		let rolls: number[];
		if (dieSize === 20 && numDice === 1 && (payload.advantage || payload.disadvantage)) {
			const roll1 = Math.floor(Math.random() * dieSize) + 1;
			const roll2 = Math.floor(Math.random() * dieSize) + 1;
			if (payload.advantage) {
				rolls = [Math.max(roll1, roll2)];
			} else {
				rolls = [Math.min(roll1, roll2)];
			}
		} else {
			rolls = Array.from({ length: numDice }, () => Math.floor(Math.random() * dieSize) + 1);
		}

		const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;
		const breakdown = `${rolls.join(' + ')}${modifier !== 0 ? (modifier > 0 ? ' + ' : ' - ') + Math.abs(modifier) : ''} = ${total}`;

		// Log to activity log
		const activityEntry = {
			type: 'dice_roll' as const,
			timestamp: Date.now(),
			description: payload.purpose
				? `${payload.purpose}: ${payload.notation} = ${total}`
				: `Rolled ${payload.notation} = ${total}`,
			data: {
				notation: payload.notation,
				total,
				rolls,
				modifier,
				breakdown,
				purpose: payload.purpose,
			},
		};

		const updatedGameState: MultiplayerGameState = {
			...session.gameState,
			activityLog: [...(session.gameState.activityLog || []), activityEntry],
			lastUpdated: Date.now(),
		};

		const updated: StoredSession = {
			...session,
			gameState: updatedGameState,
			lastUpdated: Date.now(),
		};

		await this.storage.put(SESSION_KEY, updated);

		return json({
			total,
			rolls,
			modifier,
			breakdown,
			purpose: payload.purpose,
		});
	}

	private async getSession(): Promise<StoredSession | null> {
		const stored = (await this.storage.get<StoredSession>(SESSION_KEY)) ?? null;
		if (!stored) {
			return null;
		}

		return {
			...stored,
			characters: stored.characters ?? [],
		};
	}

	private toResponse(session: StoredSession) {
		return {
			sessionId: session.sessionId,
			inviteCode: session.inviteCode,
			status: session.status,
			hostId: session.hostId,
			quest: session.quest,
			players: session.players,
			characters: session.characters,
			createdAt: session.createdAt,
			gameState: session.gameState,
			world: session.world,
			startingArea: session.startingArea,
		};
	}
}
