import { DurableObjectState, DurableObjectStorage } from '@cloudflare/workers-types';

import type { Character, MultiplayerGameState, PlayerInfo, Quest } from '../../../shared/workers/types';

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

		const updated: StoredSession = {
			...session,
			status: payload.gameState?.status ?? 'active',
			gameState: updatedGameState,
			players: updatedGameState?.players ?? session.players,
			characters: mergedCharacters,
			lastUpdated: Date.now(),
		};

		await this.storage.put(SESSION_KEY, updated);
		return json(this.toResponse(updated));
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
		};
	}
}
