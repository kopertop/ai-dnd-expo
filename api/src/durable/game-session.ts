import type {
        ActivityLogEntry,
        Character,
        MapState,
        MapToken,
        MultiplayerGameState,
        NpcDefinition,
        NpcState,
        PlayerInfo,
        Quest,
} from '../../../shared/workers/types';

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
        mapState: MapState;
        npcDefinitions: NpcDefinition[];
        npcStates: NpcState[];
        activityLog: ActivityLogEntry[];
};

type InitializePayload = {
        inviteCode: string;
        hostId: string;
        quest: Quest;
        world: string;
        startingArea: string;
        mapState?: MapState;
        npcDefinitions?: NpcDefinition[];
};

type JoinPayload = {
        character: Character;
        playerId: string;
};

type StartPayload = {
        hostId: string;
        gameState: MultiplayerGameState;
};

type TokenMutationPayload = {
        action: 'create' | 'update' | 'delete';
        token?: Partial<MapToken> & { id?: string };
        tokenId?: string;
};

type CharacterAdjustmentPayload = {
        amount?: number;
        patch?: Partial<Character>;
};

type MapUpdatePayload = Partial<Omit<MapState, 'id'>> & { id: string };

type NpcPlacementPayload = {
        npcId: string;
        position: { x: number; y: number };
        label?: string;
};

const SESSION_KEY = 'session';

const json = (data: unknown, status = 200): Response =>
        new Response(JSON.stringify(data), {
                status,
                headers: { 'Content-Type': 'application/json' },
        });

const randomColor = () => `#${Math.floor(Math.random() * 0xffffff)
        .toString(16)
        .padStart(6, '0')}`;

const makeGrid = (width: number, height: number, terrain = 'stone') =>
        Array.from({ length: height }, () => Array.from({ length: width }, () => ({ terrain })));

const defaultMap = (): MapState => ({
        id: 'default-map',
        name: 'Town Square',
        width: 20,
        height: 15,
        terrain: makeGrid(20, 15, 'stone'),
        fog: Array.from({ length: 15 }, () => Array.from({ length: 20 }, () => false)),
        tokens: [],
        updatedAt: Date.now(),
});

const defaultNpcs = (): NpcDefinition[] => [
        {
                id: 'npc-guard',
                name: 'City Guard',
                alignment: 'friendly',
                description: 'Veteran soldier who keeps watch over the plaza.',
                maxHealth: 16,
                armorClass: 16,
                attack: 'Spear +4 (1d8+2)',
                stats: { STR: 14, DEX: 12 },
                color: '#2E86AB',
        },
        {
                id: 'npc-merchant',
                name: 'Traveling Merchant',
                alignment: 'vendor',
                description: 'Chatty trader with curios from afar.',
                maxHealth: 12,
                armorClass: 12,
                attack: 'Dagger +2 (1d4+1)',
                stats: { CHA: 14 },
                color: '#C47F00',
        },
        {
                id: 'npc-goblin',
                name: 'Goblin Scout',
                alignment: 'hostile',
                description: 'Sneaky troublemaker scouting the town.',
                maxHealth: 7,
                armorClass: 13,
                attack: 'Scimitar +4 (1d6+2)',
                stats: { DEX: 14 },
                color: '#3A9D23',
        },
];

export class GameSession {
        private readonly storage: DurableObjectStorage;

        constructor(private readonly state: DurableObjectState) {
                this.storage = state.storage;
        }

        async fetch(request: Request): Promise<Response> {
                const url = new URL(request.url);
                const pathname = url.pathname.replace(/\/+$/, '');
                const normalized = pathname === '' ? '/' : pathname;
                const segments = normalized.split('/').filter(Boolean);

                try {
                    if (normalized.endsWith('/ws')) {
                            return new Response('WebSocket support is not yet implemented.', { status: 501 });
                    }

                    if (normalized === '/initialize') return this.handleInitialize(request);
                    if (normalized === '/join') return this.handleJoin(request);
                    if (normalized === '/state') return this.handleState();
                    if (normalized === '/start') return this.handleStart(request);
                    if (normalized === '/action') return this.handlePlayerAction(request);
                    if (normalized === '/dm-action') return this.handleDMAction(request);

                    if (segments[0] === 'map') {
                            if (segments.length === 1) {
                                    return request.method === 'GET'
                                            ? this.handleMapState()
                                            : this.handleMapUpdate(request);
                            }

                            if (segments[1] === 'tokens') {
                                    return this.handleTokenMutation(request);
                            }
                    }

                    if (segments[0] === 'npcs') {
                            return request.method === 'GET'
                                    ? this.handleNpcList()
                                    : this.handleNpcPlacement(request);
                    }

                    if (segments[0] === 'characters' && segments.length >= 3) {
                            return this.handleCharacterAdjustment(segments[1], segments[2], request);
                    }

                    return new Response('Not found', { status: 404 });
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
                        mapState: payload.mapState ?? defaultMap(),
                        npcDefinitions: payload.npcDefinitions?.length ? payload.npcDefinitions : defaultNpcs(),
                        npcStates: [],
                        activityLog: [],
                };

                await this.persist(session);
                return json({ ok: true, sessionId: session.sessionId });
        }

        private async handleJoin(request: Request): Promise<Response> {
                const payload = (await request.json()) as JoinPayload;
                const session = await this.requireSession();

                const player: PlayerInfo = {
                        characterId: payload.character.id,
                        playerId: payload.playerId,
                        name: payload.character.name,
                        joinedAt: Date.now(),
                };

                const filtered = session.players.filter(p => p.characterId !== player.characterId);
                session.players = [...filtered, player];
                session.lastUpdated = Date.now();

                if (session.gameState) {
                        const characters = session.gameState.characters.filter(c => c.id !== payload.character.id);
                        session.gameState = {
                                ...session.gameState,
                                characters: [...characters, payload.character],
                        };
                }

                this.ensureMapState(session);
                this.ensurePlayerToken(session, payload.character);

                const updated = await this.persist(session);
                return json(this.toResponse(updated));
        }

        private async handleState(): Promise<Response> {
                const session = await this.requireSession();
                return json(this.toResponse(session));
        }

        private async handleStart(request: Request): Promise<Response> {
                const payload = (await request.json()) as StartPayload;
                const session = await this.requireSession();

                if (payload.hostId !== session.hostId) {
                        return json({ error: 'Only the host may start the game' }, 403);
                }

                const mergedMap = payload.gameState.mapState ?? session.mapState ?? defaultMap();
                const npcStates = payload.gameState.npcStates ?? session.npcStates;

                const updated: StoredSession = {
                        ...session,
                        status: payload.gameState?.status ?? 'active',
                        players: payload.gameState?.players ?? session.players,
                        lastUpdated: Date.now(),
                        mapState: { ...mergedMap, updatedAt: Date.now() },
                        npcStates,
                        activityLog: session.activityLog,
                        gameState: {
                                ...payload.gameState,
                                mapState: mergedMap,
                                npcStates,
                                activityLog: session.activityLog,
                        },
                };

                const persisted = await this.persist(updated);
                return json(this.toResponse(persisted));
        }

        private async handlePlayerAction(request: Request): Promise<Response> {
                const session = await this.requireSession();
                const body = (await request.json()) as { action: string; characterId: string; playerId?: string };
                const character = session.gameState?.characters.find(c => c.id === body.characterId);
                const message = character ? `${character.name}: ${body.action}` : body.action;

                this.appendLog(session, {
                        id: `log_${Date.now()}`,
                        type: 'log',
                        message,
                        actor: character?.name ?? body.playerId,
                        timestamp: Date.now(),
                });

                if (session.gameState) {
                        session.gameState.messages = [
                                ...session.gameState.messages,
                                {
                                        id: `msg_${Date.now()}`,
                                        content: body.action,
                                        timestamp: Date.now(),
                                        type: 'dialogue',
                                        speaker: character?.name,
                                        characterId: body.characterId,
                                },
                        ];
                }

                session.lastUpdated = Date.now();
                const persisted = await this.persist(session);
                return json(this.toResponse(persisted));
        }

        private async handleDMAction(request: Request): Promise<Response> {
                const session = await this.requireSession();
                const body = (await request.json()) as { type: string; data: Record<string, unknown>; hostId: string };

                if (body.hostId !== session.hostId) {
                        return json({ error: 'Only the host may perform DM actions' }, 403);
                }

                if (body.type === 'roll_dice') {
                        const result = body.data?.result ?? 'Roll performed';
                        this.appendLog(session, {
                                id: `dice_${Date.now()}`,
                                type: 'dice',
                                message: String(result),
                                timestamp: Date.now(),
                                actor: 'DM',
                                details: body.data,
                        });
                } else if (body.type === 'narrate') {
                        this.appendLog(session, {
                                id: `nar_${Date.now()}`,
                                type: 'log',
                                message: String(body.data?.message ?? ''),
                                timestamp: Date.now(),
                                actor: 'DM',
                        });
                }

                session.lastUpdated = Date.now();
                const persisted = await this.persist(session);
                return json(this.toResponse(persisted));
        }

        private async handleMapState(): Promise<Response> {
                const session = await this.requireSession();
                this.ensureMapState(session);
                return json({ map: session.mapState });
        }

        private async handleMapUpdate(request: Request): Promise<Response> {
                const payload = (await request.json()) as MapUpdatePayload;
                const session = await this.requireSession();

                if (!payload?.id || payload.id !== session.mapState.id) {
                        return json({ error: 'Mismatched map id' }, 400);
                }

                session.mapState = {
                        ...session.mapState,
                        ...payload,
                        updatedAt: Date.now(),
                } as MapState;

                session.lastUpdated = Date.now();
                const persisted = await this.persist(session);
                return json({ map: persisted.mapState });
        }

        private async handleTokenMutation(request: Request): Promise<Response> {
                const session = await this.requireSession();
                this.ensureMapState(session);

                if (request.method === 'GET') {
                        return json({ tokens: session.mapState.tokens });
                }

                const payload = (await request.json()) as TokenMutationPayload;
                const tokens = session.mapState.tokens ?? [];

                if (payload.action === 'delete') {
                        const targetId = payload.tokenId ?? payload.token?.id;
                        if (!targetId) {
                                return json({ error: 'tokenId is required for delete' }, 400);
                        }
                        session.mapState.tokens = tokens.filter(token => token.id !== targetId);
                } else if (payload.action === 'create' && payload.token) {
                        const newToken: MapToken = {
                                id: payload.token.id ?? `token_${Date.now()}`,
                                type: payload.token.type ?? 'object',
                                entityId: payload.token.entityId,
                                label: payload.token.label ?? 'Token',
                                x: payload.token.x ?? 0,
                                y: payload.token.y ?? 0,
                                zIndex: payload.token.zIndex ?? tokens.length,
                                color: payload.token.color ?? randomColor(),
                                icon: payload.token.icon,
                                metadata: payload.token.metadata,
                        };
                        session.mapState.tokens = [...tokens.filter(token => token.id !== newToken.id), newToken];
                } else if (payload.action === 'update' && payload.token) {
                        const id = payload.token.id;
                        if (!id) {
                                return json({ error: 'Token id is required for update' }, 400);
                        }
                        session.mapState.tokens = tokens.map(token =>
                                token.id === id
                                        ? {
                                                  ...token,
                                                  ...payload.token,
                                          }
                                        : token,
                        );
                }

                session.mapState.updatedAt = Date.now();
                session.lastUpdated = Date.now();

                const persisted = await this.persist(session);
                return json({ tokens: persisted.mapState.tokens });
        }

        private async handleNpcList(): Promise<Response> {
                const session = await this.requireSession();
                return json({ npcs: session.npcDefinitions, placed: session.npcStates });
        }

        private async handleNpcPlacement(request: Request): Promise<Response> {
                const session = await this.requireSession();
                const payload = (await request.json()) as NpcPlacementPayload;
                const npc = session.npcDefinitions.find(def => def.id === payload.npcId);
                if (!npc) {
                        return json({ error: 'NPC not found' }, 404);
                }

                const placed: NpcState = {
                        ...npc,
                        currentHealth: npc.maxHealth,
                        statusEffects: [],
                        tokenId: `npc_${npc.id}_${Date.now()}`,
                };

                session.npcStates = [...session.npcStates.filter(state => state.id !== npc.id), placed];
                this.ensureMapState(session);
                session.mapState.tokens = [
                        ...session.mapState.tokens,
                        {
                                id: placed.tokenId!,
                                type: 'npc',
                                entityId: placed.id,
                                label: payload.label ?? placed.name,
                                x: payload.position.x,
                                y: payload.position.y,
                                color: npc.color ?? randomColor(),
                                metadata: { alignment: npc.alignment },
                        },
                ];

                session.mapState.updatedAt = Date.now();
                session.lastUpdated = Date.now();

                const persisted = await this.persist(session);
                return json({ npcs: persisted.npcStates, tokens: persisted.mapState.tokens });
        }

        private async handleCharacterAdjustment(
                characterId: string,
                action: string,
                request: Request,
        ): Promise<Response> {
                const session = await this.requireSession();
                const payload = (await request.json()) as CharacterAdjustmentPayload;
                const characters = session.gameState?.characters ?? [];
                const target = characters.find(c => c.id === characterId);

                if (!target) {
                        return json({ error: 'Character not found' }, 404);
                }

                if (action === 'damage') {
                        const amount = Math.max(0, payload.amount ?? 0);
                        target.health = Math.max(0, target.health - amount);
                        this.appendLog(session, {
                                id: `dmg_${Date.now()}`,
                                type: 'log',
                                message: `${target.name} takes ${amount} damage`,
                                timestamp: Date.now(),
                                actor: 'DM',
                        });
                } else if (action === 'heal') {
                        const amount = Math.max(0, payload.amount ?? 0);
                        target.health = Math.min(target.maxHealth, target.health + amount);
                        this.appendLog(session, {
                                id: `heal_${Date.now()}`,
                                type: 'log',
                                message: `${target.name} heals ${amount} HP`,
                                timestamp: Date.now(),
                                actor: 'DM',
                        });
                } else if (action === 'update' && payload.patch) {
                        Object.assign(target, payload.patch);
                }

                session.lastUpdated = Date.now();
                const persisted = await this.persist(session);
                return json(this.toResponse(persisted));
        }

        private ensurePlayerToken(session: StoredSession, character: Character) {
                const tokens = session.mapState.tokens ?? [];
                const existing = tokens.find(token => token.entityId === character.id && token.type === 'player');
                if (existing) return;

                const x = tokens.length % session.mapState.width;
                const y = Math.floor(tokens.length / session.mapState.width) % session.mapState.height;
                session.mapState.tokens = [
                        ...tokens,
                        {
                                id: `player_${character.id}`,
                                type: 'player',
                                entityId: character.id,
                                label: character.name,
                                x,
                                y,
                                color: randomColor(),
                        },
                ];
                session.mapState.updatedAt = Date.now();
        }

        private ensureMapState(session: StoredSession) {
                if (!session.mapState) {
                        session.mapState = defaultMap();
                }
        }

        private appendLog(session: StoredSession, entry: ActivityLogEntry) {
                session.activityLog = [...session.activityLog, entry].slice(-200);
        }

        private async requireSession(): Promise<StoredSession> {
                const session = await this.storage.get<StoredSession>(SESSION_KEY);
                if (!session) {
                        throw new Error('Session not initialized');
                }
                return session;
        }

        private async persist(session: StoredSession): Promise<StoredSession> {
                const synced = this.syncGameState(session);
                await this.storage.put(SESSION_KEY, synced);
                return synced;
        }

        private syncGameState(session: StoredSession): StoredSession {
                const base: MultiplayerGameState =
                        session.gameState ?? {
                                sessionId: session.sessionId,
                                inviteCode: session.inviteCode,
                                hostId: session.hostId,
                                quest: session.quest,
                                players: session.players,
                                characters: [],
                                playerCharacterId: session.players[0]?.characterId ?? '',
                                gameWorld: session.world,
                                startingArea: session.startingArea,
                                status: session.status,
                                createdAt: session.createdAt,
                                lastUpdated: session.lastUpdated,
                                messages: [],
                        };

                const merged: MultiplayerGameState = {
                        ...base,
                        players: session.players,
                        status: session.status,
                        lastUpdated: session.lastUpdated,
                        mapState: session.mapState,
                        npcStates: session.npcStates,
                        activityLog: session.activityLog,
                };

                return { ...session, gameState: merged };
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
