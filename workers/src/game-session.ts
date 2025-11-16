import type { Env } from './env';
import {
	GameMessage,
	GameSession as GameSessionType,
	MultiplayerGameState,
	PlayerInfo,
	WebSocketConnection,
} from './types';

export class GameSession implements DurableObject {
	private state: GameSessionType | null = null;
	private websockets: Map<string, WebSocketConnection> = new Map();
	private storage: DurableObjectStorage;
	private id: DurableObjectId;
	private env: Env;

	constructor(ctx: DurableObjectState, env: Env) {
		this.storage = ctx.storage;
		this.id = ctx.id;
		this.env = env;
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		// WebSocket upgrade
		if (request.headers.get('Upgrade') === 'websocket') {
			return this.handleWebSocket(request);
		}

		// REST API endpoints
		if (path.endsWith('/initialize') && request.method === 'POST') {
			return this.initialize(request);
		}

		if (path.endsWith('/state')) {
			return this.getState();
		}

		if (path.endsWith('/join') && request.method === 'POST') {
			return this.joinGame(request);
		}

		if (path.endsWith('/action') && request.method === 'POST') {
			return this.handlePlayerAction(request);
		}

		if (path.endsWith('/dm-action') && request.method === 'POST') {
			return this.handleDMAction(request);
		}

		if (path.endsWith('/start') && request.method === 'POST') {
			return this.startGame(request);
		}

		return new Response('Not Found', { status: 404 });
	}

	async initialize(request: Request): Promise<Response> {
		const body = await request.json();
		const { inviteCode, hostId, quest, world, startingArea } = body;

		const sessionId = this.id.toString();
		const now = Date.now();

		this.state = {
			id: sessionId,
			inviteCode,
			hostId,
			questId: quest.id,
			quest,
			players: [],
			gameState: null,
			status: 'waiting',
			createdAt: now,
			lastUpdated: now,
		};

		await this.persistState();

		return new Response(
			JSON.stringify({
				success: true,
				sessionId,
				inviteCode,
			}),
			{
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}

	async getState(): Promise<Response> {
		await this.loadState();
		if (!this.state) {
			return new Response(JSON.stringify({ error: 'Session not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const response: any = {
			sessionId: this.state.id,
			inviteCode: this.state.inviteCode,
			status: this.state.status,
			hostId: this.state.hostId,
			quest: this.state.quest,
			players: this.state.players,
			createdAt: this.state.createdAt,
		};

		if (this.state.gameState) {
			response.gameState = this.state.gameState;
		}

		return new Response(JSON.stringify(response), {
			headers: { 'Content-Type': 'application/json' },
		});
	}

	async joinGame(request: Request): Promise<Response> {
		await this.loadState();
		if (!this.state) {
			return new Response(JSON.stringify({ error: 'Session not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (this.state.status !== 'waiting') {
			return new Response(
				JSON.stringify({ error: 'Game has already started' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		const body = await request.json();
		const { character, playerId } = body;

		// Check if player already joined
		if (this.state.players.some(p => p.playerId === playerId)) {
			return new Response(JSON.stringify({ error: 'Player already joined' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Add player
		const playerInfo: PlayerInfo = {
			characterId: character.id,
			playerId,
			name: character.name,
			joinedAt: Date.now(),
		};

		this.state.players.push(playerInfo);
		this.state.lastUpdated = Date.now();

		// Initialize game state if this is the first player (after host)
		if (this.state.players.length === 1 && !this.state.gameState) {
			// Host's character should already be in the game state
			// We'll initialize it when the game starts
		}

		await this.persistState();

		// Broadcast player joined
		this.broadcast({
			type: 'player_joined',
			timestamp: Date.now(),
			data: {
				playerId,
				characterId: character.id,
				character,
			},
		});

		return new Response(
			JSON.stringify({
				success: true,
				playerInfo,
				session: {
					sessionId: this.state.id,
					inviteCode: this.state.inviteCode,
					status: this.state.status,
					players: this.state.players,
				},
			}),
			{
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}

	async startGame(request: Request): Promise<Response> {
		await this.loadState();
		if (!this.state) {
			return new Response(JSON.stringify({ error: 'Session not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const body = await request.json();
		const { hostId, gameState } = body;

		if (hostId !== this.state.hostId) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (this.state.status !== 'waiting') {
			return new Response(JSON.stringify({ error: 'Game already started' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Initialize multiplayer game state
		const multiplayerState: MultiplayerGameState = {
			...gameState,
			sessionId: this.state.id,
			inviteCode: this.state.inviteCode,
			hostId: this.state.hostId,
			quest: this.state.quest,
			players: this.state.players,
			status: 'active',
			createdAt: this.state.createdAt,
			lastUpdated: Date.now(),
			messages: [],
		};

		this.state.gameState = multiplayerState;
		this.state.status = 'active';
		this.state.lastUpdated = Date.now();

		await this.persistState();

		// Broadcast game started
		this.broadcast({
			type: 'game_state_update',
			timestamp: Date.now(),
			data: { gameState: multiplayerState },
		});

		return new Response(
			JSON.stringify({
				success: true,
				gameState: multiplayerState,
			}),
			{
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}

	async handlePlayerAction(request: Request): Promise<Response> {
		await this.loadState();
		if (!this.state || !this.state.gameState) {
			return new Response(JSON.stringify({ error: 'Game not active' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const body = await request.json();
		const { action, characterId, playerId } = body;

		// Verify player is in the game
		const player = this.state.players.find(p => p.playerId === playerId);
		if (!player || player.characterId !== characterId) {
			return new Response(JSON.stringify({ error: 'Invalid player' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Broadcast action
		this.broadcast({
			type: 'player_action',
			timestamp: Date.now(),
			data: {
				playerId,
				characterId,
				action,
			},
		});

		return new Response(
			JSON.stringify({
				success: true,
			}),
			{
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}

	async handleDMAction(request: Request): Promise<Response> {
		await this.loadState();
		if (!this.state || !this.state.gameState) {
			return new Response(JSON.stringify({ error: 'Game not active' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const body = await request.json();
		const { hostId, type, data } = body;

		if (hostId !== this.state.hostId) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Update game state based on DM action
		if (type === 'narrate') {
			const message: GameMessage = {
				id: `msg_${Date.now()}`,
				content: data.content,
				timestamp: Date.now(),
				type: 'narration',
				speaker: 'Dungeon Master',
			};
			this.state.gameState.messages.push(message);
		} else if (type === 'update_character') {
			const character = this.state.gameState.characters.find(
				c => c.id === data.characterId,
			);
			if (character) {
				Object.assign(character, data.updates);
			}
		} else if (type === 'advance_story') {
			// Handle story advancement
			if (data.message) {
				const message: GameMessage = {
					id: `msg_${Date.now()}`,
					content: data.message,
					timestamp: Date.now(),
					type: 'narration',
					speaker: 'Dungeon Master',
				};
				this.state.gameState.messages.push(message);
			}
		}

		this.state.gameState.lastUpdated = Date.now();
		this.state.lastUpdated = Date.now();

		await this.persistState();

		// Broadcast updated state
		this.broadcast({
			type: 'game_state_update',
			timestamp: Date.now(),
			data: { gameState: this.state.gameState },
		});

		return new Response(
			JSON.stringify({
				success: true,
				gameState: this.state.gameState,
			}),
			{
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}

	async handleWebSocket(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const playerId = url.searchParams.get('playerId');
		const characterId = url.searchParams.get('characterId');

		if (!playerId || !characterId) {
			return new Response('Missing playerId or characterId', { status: 400 });
		}

		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair);

		// Accept the WebSocket connection
		server.accept();

		// Store connection
		const connection: WebSocketConnection = {
			playerId,
			characterId,
			ws: server,
		};
		this.websockets.set(playerId, connection);

		// Handle messages
		server.addEventListener('message', async event => {
			try {
				const message = JSON.parse(event.data as string);
				if (message.type === 'ping') {
					server.send(
						JSON.stringify({
							type: 'pong',
							timestamp: Date.now(),
						}),
					);
				}
			} catch (error) {
				console.error('WebSocket message error:', error);
			}
		});

		// Handle close
		server.addEventListener('close', () => {
			this.websockets.delete(playerId);
			this.broadcast({
				type: 'player_left',
				timestamp: Date.now(),
				data: { playerId, characterId },
			});
		});

		// Send current state
		await this.loadState();
		if (this.state?.gameState) {
			server.send(
				JSON.stringify({
					type: 'game_state_update',
					timestamp: Date.now(),
					data: { gameState: this.state.gameState },
				}),
			);
		}

		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}

	private broadcast(message: any): void {
		const messageStr = JSON.stringify(message);
		for (const [playerId, connection] of this.websockets.entries()) {
			try {
				connection.ws.send(messageStr);
			} catch (error) {
				console.error(`Error broadcasting to ${playerId}:`, error);
				this.websockets.delete(playerId);
			}
		}
	}

	private async loadState(): Promise<void> {
		if (this.state) return;
		const stored = await this.storage.get<GameSessionType>('state');
		if (stored) {
			this.state = stored;
		}
	}

	private async persistState(): Promise<void> {
		if (this.state) {
			await this.storage.put('state', this.state);
		}
	}
}

