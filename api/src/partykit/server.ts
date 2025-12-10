import type { Connection, ConnectionContext } from 'partyserver';
import { Server } from 'partyserver';

import type { CloudflareBindings } from '@/api/src/env';
import { GameStateService } from '@/api/src/services/game-state';
import { createId } from '@/api/src/utils/games-utils';
import { createDatabase } from '@/api/src/utils/repository';
import type { CharacterRow, GamePlayerRow, GameRow, MapTokenRow } from '@/shared/workers/db';
import { Database } from '@/shared/workers/db';

export type PartyMessage =
	| {
		type: 'join';
		characterId: string;
		characterName?: string;
		playerEmail?: string | null;
	}
	| {
		type: 'ping';
		message?: string;
	}
	| {
		type: 'move-token';
		tokenId: string;
		x: number;
		y: number;
	};

function parseInviteCode(roomId: string): string {
	const segments = roomId.split('/');
	const raw = segments[segments.length - 1];
	const colonSplit = raw.split(':');
	return colonSplit[colonSplit.length - 1];
}

function requireAuth(request: Request) {
	const url = new URL(request.url);
	const tokenParam = url.searchParams.get('token') ?? '';
	const authHeader = request.headers.get('authorization') ?? '';
	const rawToken = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '').trim() : tokenParam.trim();
	if (!rawToken) {
		throw new Error('Unauthorized');
	}
	const [playerId, email] = rawToken.split(':');
	if (!playerId) {
		throw new Error('Unauthorized');
	}
	return { playerId, email: email || null };
}

export class GameRoom extends Server<CloudflareBindings> {
	private readonly db: Database;
	private readonly stateService: GameStateService;

	constructor(ctx: unknown, env: CloudflareBindings, database?: Database, stateService?: GameStateService) {
		super(ctx as any, env);
		this.db = database ?? createDatabase(env);
		this.stateService = stateService ?? new GameStateService(this.db);
	}

	async onConnect(connection: Connection, ctx: ConnectionContext) {
		const game = await this.safeResolveGame(connection);
		if (!game) return;

		const user = this.safeRequireAuth(connection, ctx.request);
		if (!user) return;

		connection.setState({ playerId: user.playerId, email: user.email });
		await this.ensureMembership(game, user.playerId, user.email);
		const state = await this.stateService.getState(game);
		connection.send(JSON.stringify({ type: 'state', state }));
		this.broadcast(
			JSON.stringify({
				type: 'presence',
				playerId: user.playerId,
				connectedAt: Date.now(),
			}),
			[connection.id],
		);
	}

	async onMessage(connection: Connection, message: string | ArrayBuffer) {
		const game = await this.safeResolveGame(connection);
		if (!game) return;

		const user = this.resolveConnectionUser(connection);
		if (!user) {
			connection.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
			return;
		}
		let payload: PartyMessage;
		try {
			const raw = typeof message === 'string'
				? message
				: new TextDecoder().decode(message);
			payload = JSON.parse(raw) as PartyMessage;
		} catch (error) {
			console.error('Invalid message payload', error);
			connection.send(JSON.stringify({ type: 'error', message: 'Invalid payload' }));
			return;
		}

		if (payload.type === 'join') {
			await this.ensureMembership(game, user.playerId, user.email, payload);
			await this.broadcastState(game);
			return;
		}

		if (payload.type === 'move-token') {
			await this.handleMoveToken(game, payload, user);
			await this.broadcastState(game);
			return;
		}

		if (payload.type === 'ping') {
			await this.broadcastState(game);
			return;
		}

		connection.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
	}

	async onRequest(request: Request) {
		// Allow internal POST to trigger broadcast to all connected clients (e.g., after DM dice roll)
		if (request.method === 'POST') {
			const secretHeader = request.headers.get('x-party-secret') || request.headers.get('authorization')?.replace('Bearer ', '').trim();
			if (this.env.PARTYKIT_SECRET && secretHeader !== this.env.PARTYKIT_SECRET) {
				return new Response('Forbidden', { status: 403 });
			}
			try {
				const game = await this.resolveGameByRoomName();
				await this.broadcastState(game);
				return new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				});
			} catch (error) {
				console.error('PartyServer broadcastState failed', error);
				return new Response(JSON.stringify({ ok: false }), { status: 500 });
			}
		}

		return new Response('Not found', { status: 404 });
	}

	private async safeResolveGame(connection: Connection): Promise<GameRow | null> {
		const inviteCode = parseInviteCode(this.name);
		try {
			const game = await this.resolveGame(inviteCode);
			return game;
		} catch (error) {
			connection.send(JSON.stringify({ type: 'error', message: 'Game not found', inviteCode }));
			connection.close?.(4404, 'Game not found');
			console.error('PartyServer resolveGame failed', error);
			return null;
		}
	}

	private async resolveGame(inviteCode: string): Promise<GameRow> {
		const game = await this.db.getGameByInviteCode(inviteCode);
		if (!game) {
			throw new Error(`Game not found for invite code ${inviteCode}`);
		}
		return game;
	}

	private safeRequireAuth(connection: Connection, request: Request): { playerId: string; email: string | null } | null {
		try {
			return requireAuth(request);
		} catch {
			connection.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
			connection.close?.(4401, 'Unauthorized');
			return null;
		}
	}

	private async ensureMembership(
		game: GameRow,
		playerId: string,
		playerEmail: string | null,
		payload?: Extract<PartyMessage, { type: 'join' }>,
	) {
		const members = await this.db.getGamePlayers(game.id);
		const alreadyInGame = members.some(member => member.player_id === playerId || member.player_email === playerEmail);
		if (alreadyInGame) return;

		const now = Date.now();
		let character: CharacterRow | null = null;
		if (payload?.characterId) {
			character = await this.db.getCharacterById(payload.characterId);
		}

		const characterId = payload?.characterId || character?.id || createId('char');
		const characterName = payload?.characterName || character?.name || 'Unknown adventurer';

		if (!character) {
			// If no payload is provided (e.g. initial connection) and character not found,
			// do not create a default character to avoid "Unknown Adventurer" issues.
			if (!payload) {
				return;
			}

			const defaultCharacter: CharacterRow = {
				id: characterId,
				player_id: playerId,
				player_email: playerEmail,
				name: characterName,
				icon: null,
				level: 1,
				race: 'human',
				class: 'fighter',
				description: null,
				trait: null,
				stats: JSON.stringify({ strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 }),
				skills: JSON.stringify([]),
				inventory: JSON.stringify([]),
				equipped: JSON.stringify({}),
				health: 10,
				max_health: 10,
				action_points: 3,
				max_action_points: 3,
				status_effects: JSON.stringify([]),
				prepared_spells: null,
				created_at: now,
				updated_at: now,
			};
			await this.db.createCharacter(defaultCharacter);
			character = defaultCharacter;
		}

		const membership: Omit<GamePlayerRow, 'id'> = {
			game_id: game.id,
			player_id: playerId,
			player_email: playerEmail,
			character_id: character.id,
			character_name: character.name,
			joined_at: now,
		};
		await this.db.addPlayerToGame(membership);
	}

	private async handleMoveToken(
		game: GameRow,
		payload: Extract<PartyMessage, { type: 'move-token' }>,
		user: { playerId: string },
	) {
		const token = await this.db.getMapTokenById(payload.tokenId);
		if (!token) {
			throw new Error('Token not found');
		}

		const updated: Partial<MapTokenRow> = {
			x: payload.x,
			y: payload.y,
			updated_at: Date.now(),
			metadata: token.metadata,
		};

		await this.db.updateMapToken(payload.tokenId, updated);
		await this.db.saveActivityLog({
			id: createId('log'),
			game_id: game.id,
			invite_code: game.invite_code,
			type: 'token:moved',
			timestamp: Date.now(),
			description: `Token ${payload.tokenId} moved to (${payload.x}, ${payload.y})`,
			actor_id: user.playerId,
			actor_name: user.playerId,
			data: JSON.stringify({ tokenId: payload.tokenId, x: payload.x, y: payload.y }),
		});
	}

	private async broadcastState(game: GameRow) {
		const state = await this.stateService.getState(game);
		this.broadcast(JSON.stringify({ type: 'state', state }));
	}

	private async resolveGameByRoomName(): Promise<GameRow> {
		const inviteCode = parseInviteCode(this.name);
		return this.resolveGame(inviteCode);
	}

	private resolveConnectionUser(connection: Connection): { playerId: string; email: string | null } | null {
		const state = connection.state as unknown as { playerId?: string; email?: string | null } | null;
		if (state?.playerId) {
			return { playerId: state.playerId, email: state.email ?? null };
		}
		return null;
	}
}

export default GameRoom;
