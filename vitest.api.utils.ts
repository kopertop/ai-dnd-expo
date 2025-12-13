import { afterEach, beforeEach, vi } from 'vitest';

import { getStore, resetStore } from './api/tests/mock-db-store';

import * as realDb from '@/shared/workers/db';

if (!globalThis.fetch) {
	const { fetch, Headers, Request, Response, FormData } = require('undici');
	Object.assign(globalThis, { fetch, Headers, Request, Response, FormData });
}

vi.mock('fs/promises', () => ({
	readdir: async () => [],
	readFile: async () => '',
}));

class InMemoryDatabase {
	db?: unknown;

	private get store() {
		return getStore();
	}

	async createGame(game: Omit<realDb.GameRow, 'created_at' | 'updated_at'>): Promise<void> {
		const now = Date.now();
		this.store.games.push({ ...game, created_at: now, updated_at: now });
	}

	async getGameByInviteCode(inviteCode: string): Promise<realDb.GameRow | null> {
		return this.store.games.find(g => g.invite_code === inviteCode) ?? null;
	}

	async getGameById(gameId: string): Promise<realDb.GameRow | null> {
		return this.store.games.find(g => g.id === gameId) ?? null;
	}

	async getGamesHostedByUser(hostId?: string, hostEmail?: string | null): Promise<realDb.GameRow[]> {
		return this.store.games.filter(
			g => (hostId && g.host_id === hostId) || (hostEmail && g.host_email === hostEmail),
		);
	}

	async listGamesByHostOrEmail(hostId?: string, hostEmail?: string | null): Promise<realDb.GameRow[]> {
		return this.store.games.filter(g => g.host_id === hostId || (!!hostEmail && g.host_email === hostEmail));
	}

	async updateGameStatus(gameId: string, status: realDb.GameRow['status']): Promise<void> {
		const game = this.store.games.find(g => g.id === gameId);
		if (game) {
			game.status = status;
			game.updated_at = Date.now();
		}
	}

	async updateGameMap(gameId: string, mapId: string | null): Promise<void> {
		const game = this.store.games.find(g => g.id === gameId);
		if (game) {
			game.current_map_id = mapId;
			game.updated_at = Date.now();
		}
	}

	async addPlayerToGame(player: Omit<realDb.GamePlayerRow, 'id'> & { id?: string }): Promise<string> {
		const id = player.id ?? `gp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
		this.store.gamePlayers.push({ ...player, id });
		return id;
	}

	async getGamePlayers(gameId: string): Promise<realDb.GamePlayerRow[]> {
		return this.store.gamePlayers.filter(p => p.game_id === gameId);
	}

	async listGamesHostedByUser(hostId: string): Promise<realDb.GameRow[]> {
		return this.store.games.filter(g => g.host_id === hostId);
	}

	async listGamesJoinedByUser(playerId: string): Promise<realDb.GameRow[]> {
		return this.store.games.filter(g => this.store.gamePlayers.some(p => p.game_id === g.id && p.player_id === playerId));
	}

	async getGameMembershipsForPlayer(playerId?: string, playerEmail?: string | null): Promise<realDb.GamePlayerRow[]> {
		return this.store.gamePlayers.filter(
			m => (playerId && m.player_id === playerId) || (playerEmail && m.player_email === playerEmail),
		);
	}

	async removePlayerFromGame(gameId: string, playerId: string): Promise<void> {
		this.store.gamePlayers = this.store.gamePlayers.filter(p => !(p.game_id === gameId && p.player_id === playerId));
	}

	async createCharacter(character: Omit<realDb.CharacterRow, 'created_at' | 'updated_at'>): Promise<void> {
		const now = Date.now();
		this.store.characters.push({ ...character, created_at: now, updated_at: now });
	}

	async updateCharacter(characterId: string, updates: Partial<realDb.CharacterRow>): Promise<void> {
		const char = this.store.characters.find(c => c.id === characterId);
		if (char) {
			Object.assign(char, updates, { updated_at: Date.now() });
		}
	}

	async deleteCharacter(characterId: string): Promise<void> {
		this.store.characters = this.store.characters.filter(c => c.id !== characterId);
	}

	async getCharacterById(characterId: string): Promise<realDb.CharacterRow | null> {
		return this.store.characters.find(c => c.id === characterId) ?? null;
	}

	async getCharactersByPlayerId(playerId: string): Promise<realDb.CharacterRow[]> {
		return this.store.characters.filter(c => c.player_id === playerId);
	}

	async getCharactersByEmail(email: string): Promise<realDb.CharacterRow[]> {
		return this.store.characters.filter(c => c.player_email === email);
	}

	async getCharactersByPlayerIdentity(playerId?: string, playerEmail?: string | null): Promise<realDb.CharacterRow[]> {
		return this.store.characters.filter(
			c => (playerId && c.player_id === playerId) || (playerEmail && c.player_email === playerEmail),
		);
	}

	async listCharactersByPlayer(playerId: string): Promise<realDb.CharacterRow[]> {
		return this.store.characters.filter(c => c.player_id === playerId);
	}

	async saveGameState(gameId: string, stateData: string): Promise<void> {
		const existing = this.store.gameStates.find(s => s.game_id === gameId);
		if (!existing) {
			this.store.gameStates.push({
				game_id: gameId,
				state_data: stateData,
				map_state: '{}',
				log_entries: '[]',
				state_version: 1,
				updated_at: Date.now(),
			});
			return;
		}
		existing.state_data = stateData;
		existing.updated_at = Date.now();
	}

	async getGameState(gameId: string): Promise<realDb.GameStateRow | null> {
		return this.store.gameStates.find(s => s.game_id === gameId) ?? null;
	}

	async updateGameState(gameId: string, updates: Partial<{ state_data: string; map_state: string; log_entries: string }>): Promise<void> {
		const existing = this.store.gameStates.find(s => s.game_id === gameId);
		const now = Date.now();
		if (!existing) {
			this.store.gameStates.push({
				game_id: gameId,
				state_data: updates.state_data ?? '{}',
				map_state: updates.map_state ?? '{}',
				log_entries: updates.log_entries ?? '[]',
				state_version: 1,
				updated_at: now,
			});
			return;
		}
		existing.state_data = updates.state_data ?? existing.state_data;
		existing.map_state = updates.map_state ?? existing.map_state;
		existing.log_entries = updates.log_entries ?? existing.log_entries;
		existing.state_version += 1;
		existing.updated_at = now;
	}

	async listMaps(): Promise<realDb.MapRow[]> {
		return this.store.maps;
	}

	async getMapById(mapId: string): Promise<realDb.MapRow | null> {
		return this.store.maps.find(m => m.id === mapId) ?? null;
	}

	async getMapTiles(mapId: string): Promise<realDb.MapTileRow[]> {
		return this.store.mapTiles.filter(t => t.map_id === mapId);
	}

	async saveMap(map: Omit<realDb.MapRow, 'created_at' | 'updated_at'> & Partial<Pick<realDb.MapRow, 'created_at' | 'updated_at'>>): Promise<void> {
		const now = Date.now();
		const idx = this.store.maps.findIndex(m => m.id === map.id);
		const record = {
			...map,
			created_at: map.created_at ?? now,
			updated_at: map.updated_at ?? now,
		};
		if (idx === -1) {
			this.store.maps.push(record as realDb.MapRow);
		} else {
			this.store.maps[idx] = record as realDb.MapRow;
		}
	}

	async replaceMapTiles(
		mapId: string,
		tiles: Array<{
			x: number;
			y: number;
			terrain_type: string;
			elevation?: number;
			is_blocked?: number;
			has_fog?: number;
			feature_type?: string | null;
			metadata?: string;
		}>,
	) {
		const map = this.store.maps.find(m => m.id === mapId);
		const width = map?.width ?? 0;
		const height = map?.height ?? 0;
		const defaultTerrain = (() => {
			try {
				return JSON.parse(map?.default_terrain ?? '{}').type ?? 'stone';
			} catch {
				return 'stone';
			}
		})();

		const overrides = new Map<string, realDb.MapTileRow>();
		tiles.forEach(tile => {
			const id = `tile_${mapId}_${tile.x}_${tile.y}`;
			overrides.set(id, {
				id,
				map_id: mapId,
				x: tile.x,
				y: tile.y,
				terrain_type: tile.terrain_type,
				elevation: tile.elevation ?? 0,
				is_blocked: tile.is_blocked ?? 0,
				has_fog: tile.has_fog ?? 0,
				feature_type: tile.feature_type ?? null,
				metadata: tile.metadata ?? '{}',
			});
		});

		if (!width || !height) {
			this.store.mapTiles = Array.from(overrides.values());
			return;
		}

		const filledTiles: realDb.MapTileRow[] = [];
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const id = `tile_${mapId}_${x}_${y}`;
				const override = overrides.get(id);
				if (override) {
					filledTiles.push(override);
				} else {
					filledTiles.push({
						id,
						map_id: mapId,
						x,
						y,
						terrain_type: defaultTerrain,
						elevation: 0,
						is_blocked: 0,
						has_fog: 0,
						feature_type: null,
						metadata: '{}',
					});
				}
			}
		}

		this.store.mapTiles = filledTiles;
	}

	async upsertMapTiles(
		mapId: string,
		tiles: Array<{
			x: number;
			y: number;
			terrain_type: string;
			elevation?: number;
			is_blocked?: number;
			has_fog?: number;
			feature_type?: string | null;
			metadata?: string;
		}>,
	) {
		for (const tile of tiles) {
			const id = `tile_${mapId}_${tile.x}_${tile.y}`;
			const idx = this.store.mapTiles.findIndex(t => t.id === id);
			const next = {
				id,
				map_id: mapId,
				x: tile.x,
				y: tile.y,
				terrain_type: tile.terrain_type,
				elevation: tile.elevation ?? 0,
				is_blocked: tile.is_blocked ?? 0,
				has_fog: tile.has_fog ?? 0,
				feature_type: tile.feature_type ?? null,
				metadata: tile.metadata ?? '{}',
			};
			if (idx === -1) {
				this.store.mapTiles.push(next);
			} else {
				this.store.mapTiles[idx] = next;
			}
		}
	}

	async listMapTokensForGame(gameId: string): Promise<realDb.MapTokenRow[]> {
		return this.store.mapTokens.filter(t => t.game_id === gameId);
	}

	async listMapTokensForMap(mapId: string): Promise<realDb.MapTokenRow[]> {
		return this.store.mapTokens.filter(t => t.map_id === mapId);
	}

	async getMapTokenById(tokenId: string): Promise<realDb.MapTokenRow | null> {
		return this.store.mapTokens.find(t => t.id === tokenId) ?? null;
	}

	async saveMapToken(token: realDb.MapTokenRow): Promise<void> {
		const idx = this.store.mapTokens.findIndex(t => t.id === token.id);
		const record = {
			...token,
			created_at: token.created_at ?? Date.now(),
			updated_at: Date.now(),
		};
		if (idx === -1) {
			this.store.mapTokens.push(record);
		} else {
			this.store.mapTokens[idx] = record;
		}
	}

	async updateMapToken(tokenId: string, updates: Partial<realDb.MapTokenRow>): Promise<void> {
		const idx = this.store.mapTokens.findIndex(t => t.id === tokenId);
		if (idx === -1) return;
		this.store.mapTokens[idx] = { ...this.store.mapTokens[idx], ...updates, updated_at: Date.now() };
	}

	async deleteMapToken(tokenId: string): Promise<void> {
		this.store.mapTokens = this.store.mapTokens.filter(t => t.id !== tokenId);
	}

	async clearTokensForGame(gameId: string): Promise<void> {
		this.store.mapTokens = this.store.mapTokens.filter(t => t.game_id !== gameId);
	}

	async listNpcDefinitions(): Promise<realDb.NpcRow[]> {
		return this.store.npcs;
	}

	async getNpcBySlug(slug: string): Promise<realDb.NpcRow | null> {
		return this.store.npcs.find(n => n.slug === slug) ?? null;
	}

	async getNpcById(id: string): Promise<realDb.NpcRow | null> {
		return this.store.npcs.find(n => n.id === id) ?? null;
	}

	async saveNpcDefinition(
		npc: Omit<realDb.NpcRow, 'created_at' | 'updated_at'> & Partial<Pick<realDb.NpcRow, 'created_at' | 'updated_at'>>,
	): Promise<void> {
		const now = Date.now();
		const idx = this.store.npcs.findIndex(n => n.id === npc.id);
		const record = {
			...npc,
			created_at: npc.created_at ?? now,
			updated_at: npc.updated_at ?? now,
		} as realDb.NpcRow;
		if (idx === -1) {
			this.store.npcs.push(record);
		} else {
			this.store.npcs[idx] = record;
		}
	}

	async deleteGame(gameId: string): Promise<void> {
		this.store.activityLogs = this.store.activityLogs.filter(log => log.game_id !== gameId);
		this.store.mapTokens = this.store.mapTokens.filter(token => token.game_id !== gameId);
		this.store.gameStates = this.store.gameStates.filter(state => state.game_id !== gameId);
		this.store.gamePlayers = this.store.gamePlayers.filter(player => player.game_id !== gameId);
		this.store.games = this.store.games.filter(game => game.id !== gameId);
	}

	async cloneMap(sourceMapId: string, newName: string, newSlug: string): Promise<realDb.MapRow> {
		const source = this.store.maps.find(m => m.id === sourceMapId);
		if (!source) {
			throw new Error('Map not found');
		}
		const now = Date.now();
		const clonedMap: realDb.MapRow = {
			...source,
			id: `map_${newSlug}_${now}`,
			name: newName,
			slug: newSlug,
			created_at: now,
			updated_at: now,
		};
		this.store.maps.push(clonedMap);

		const sourceTiles = this.store.mapTiles.filter(tile => tile.map_id === sourceMapId);
		await this.replaceMapTiles(
			clonedMap.id,
			sourceTiles.map(tile => ({
				x: tile.x,
				y: tile.y,
				terrain_type: tile.terrain_type,
				elevation: tile.elevation,
				is_blocked: tile.is_blocked,
				has_fog: tile.has_fog,
				feature_type: tile.feature_type,
				metadata: tile.metadata,
			})),
		);

		return clonedMap;
	}

	async saveActivityLog(log: Omit<realDb.ActivityLogRow, 'created_at'>): Promise<void> {
		this.store.activityLogs.push({ ...log, created_at: Date.now() });
	}

	async listActivityLogs(inviteCode: string): Promise<realDb.ActivityLogRow[]> {
		return this.store.activityLogs.filter(l => l.invite_code === inviteCode);
	}

	async getActivityLogs(inviteCode: string, limit: number = 100, offset: number = 0): Promise<realDb.ActivityLogRow[]> {
		return this.store.activityLogs
			.filter(l => l.invite_code === inviteCode)
			.slice(offset, offset + limit);
	}

	async getActivityLogsByGameId(gameId: string, limit: number = 100, offset: number = 0): Promise<realDb.ActivityLogRow[]> {
		return this.store.activityLogs
			.filter(l => l.game_id === gameId)
			.slice(offset, offset + limit);
	}

	async deleteActivityLogs(gameId: string): Promise<void> {
		this.store.activityLogs = this.store.activityLogs.filter(l => l.game_id !== gameId);
	}

	async saveUploadedImage(image: realDb.UploadedImageRow): Promise<void> {
		const idx = this.store.uploadedImages.findIndex(img => img.id === image.id);
		if (idx === -1) {
			this.store.uploadedImages.push(image);
		} else {
			this.store.uploadedImages[idx] = image;
		}
	}

	async listUploadedImages(
		userId?: string,
		imageType?: 'npc' | 'character' | 'both',
		limit: number = 50,
		offset: number = 0,
	): Promise<realDb.UploadedImageRow[]> {
		let results = this.store.uploadedImages;

		if (userId) {
			results = results.filter(img => img.user_id === userId);
		}

		if (imageType && imageType !== 'both') {
			results = results.filter(img => img.image_type === imageType || img.image_type === 'both');
		}

		results.sort((a, b) => b.created_at - a.created_at);
		return results.slice(offset, offset + limit);
	}

	async getUploadedImageById(id: string): Promise<realDb.UploadedImageRow | null> {
		return this.store.uploadedImages.find(img => img.id === id) ?? null;
	}

	async deleteUploadedImage(id: string): Promise<void> {
		this.store.uploadedImages = this.store.uploadedImages.filter(img => img.id !== id);
	}
}

vi.mock('@/shared/workers/db', async () => {
	const actual = await vi.importActual<typeof realDb>('@/shared/workers/db');
	return {
		...actual,
		Database: InMemoryDatabase,
	};
});

beforeEach(() => {
	resetStore();
	vi.useRealTimers();
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.resetModules();
	resetStore();
});
