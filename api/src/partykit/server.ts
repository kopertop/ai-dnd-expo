import type { Connection, Party } from 'partykit/server';

import { GameStateService } from '../services/game-state';
import { createDatabase } from '../utils/repository';
import { createId } from '../utils/games-utils';
import type { CloudflareBindings } from '../env';

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

function requireAuth(connection: Connection) {
        const authHeader = connection.request?.headers.get('authorization') ?? '';
        if (!authHeader.startsWith('Bearer ')) {
                throw new Error('Unauthorized');
        }
        const token = authHeader.replace('Bearer ', '').trim();
        const [playerId, email] = token.split(':');
        if (!playerId) {
                throw new Error('Unauthorized');
        }
        return { playerId, email: email || null };
}

export class GameRoom implements Party.Server {
        private readonly db: Database;
        private readonly stateService: GameStateService;

        constructor(
                readonly party: Party<CloudflareBindings>,
                database?: Database,
                stateService?: GameStateService,
        ) {
                this.db = database ?? createDatabase(party.env);
                this.stateService = stateService ?? new GameStateService(this.db);
        }

        async onConnect(connection: Connection) {
                const game = await this.resolveGame();
                const user = requireAuth(connection);
                await this.ensureMembership(game, user.playerId, user.email);
                const state = await this.stateService.getState(game);
                connection.send(JSON.stringify({ type: 'state', state }));
                this.party.broadcast(
                        JSON.stringify({
                                type: 'presence',
                                playerId: user.playerId,
                                connectedAt: Date.now(),
                        }),
                        connection.id,
                );
        }

        async onMessage(message: string | ArrayBuffer, connection: Connection) {
                const game = await this.resolveGame();
                const user = requireAuth(connection);
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

                connection.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
        }

        async onRequest(request: Request) {
                if (request.method === 'GET' && request.headers.get('upgrade') === 'websocket') {
                        return await this.party.subscribe(request);
                }
                return new Response('Not found', { status: 404 });
        }

        private async resolveGame(): Promise<GameRow> {
                const inviteCode = parseInviteCode(this.party.id);
                const game = await this.db.getGameByInviteCode(inviteCode);
                if (!game) {
                        throw new Error(`Game not found for invite code ${inviteCode}`);
                }
                return game;
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

                let character: CharacterRow | null = null;
                if (payload?.characterId) {
                        character = await this.db.getCharacterById(payload.characterId);
                }

                const membership: Omit<GamePlayerRow, 'id'> = {
                        game_id: game.id,
                        player_id: playerId,
                        player_email: playerEmail,
                        character_id: payload?.characterId || character?.id || createId('char'),
                        character_name: payload?.characterName || character?.name || 'Unknown adventurer',
                        joined_at: Date.now(),
                };
                await this.db.addPlayerToGame(membership);

                if (payload?.characterId && character) {
                        return;
                }

                const defaultCharacter: CharacterRow = {
                        id: membership.character_id,
                        player_id: playerId,
                        player_email: playerEmail,
                        name: membership.character_name,
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
                        created_at: Date.now(),
                        updated_at: Date.now(),
                };
                await this.db.createCharacter(defaultCharacter);
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
                this.party.broadcast(JSON.stringify({ type: 'state', state }));
        }
}

export default GameRoom;
