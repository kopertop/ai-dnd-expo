import type { MultiplayerGameState, PlayerInfo, Quest, Character } from '../../../shared/workers/types';

type SessionStatus = 'waiting' | 'active' | 'completed' | 'cancelled';

type StoredSession = {
	sessionId: string;
	inviteCode: string;
	hostId: string;
	quest: Quest;
	world: string;
	startingArea: string;
	players: PlayerInfo[];
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
		};

		const filtered = session.players.filter(p => p.characterId !== player.characterId);
		const updatedSession: StoredSession = {
			...session,
			players: [...filtered, player],
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

		const updated: StoredSession = {
			...session,
			status: payload.gameState?.status ?? 'active',
			gameState: payload.gameState,
			players: payload.gameState?.players ?? session.players,
			lastUpdated: Date.now(),
		};

		await this.storage.put(SESSION_KEY, updated);
		return json(this.toResponse(updated));
	}

	private async getSession(): Promise<StoredSession | null> {
		return (await this.storage.get<StoredSession>(SESSION_KEY)) ?? null;
	}

	private toResponse(session: StoredSession) {
		return {
			sessionId: session.sessionId,
			inviteCode: session.inviteCode,
			status: session.status,
			hostId: session.hostId,
			quest: session.quest,
			players: session.players,
			createdAt: session.createdAt,
			gameState: session.gameState,
		};
	}
}
