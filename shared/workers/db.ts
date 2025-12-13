/**
 * Database helper functions for D1 database
 */

export interface GameRow {
	id: string;
	invite_code: string;
	host_id: string;
	host_email: string | null;
	quest_id: string;
	quest_data: string; // JSON
	world: string;
	starting_area: string;
	status: 'waiting' | 'active' | 'completed' | 'cancelled';
	current_map_id: string | null;
	created_at: number;
	updated_at: number;
}

export interface CharacterRow {
	id: string;
	player_id: string;
	player_email: string | null;
	name: string;
	level: number;
	race: string;
	class: string;
	description: string | null;
	trait: string | null;
	icon: string | null;
	stats: string; // JSON
	skills: string; // JSON array
	inventory: string; // JSON array
	equipped: string; // JSON object
	health: number;
	max_health: number;
	action_points: number;
	max_action_points: number;
	status_effects: string; // JSON array
	prepared_spells: string | null; // JSON array of spell IDs
	created_at: number;
	updated_at: number;
}

export interface GamePlayerRow {
	id: string;
	game_id: string;
	player_id: string;
	player_email: string | null;
	character_id: string;
	character_name: string;
	joined_at: number;
}

export interface GameStateRow {
	game_id: string;
	state_data: string; // JSON
	map_state: string; // JSON
	log_entries: string; // JSON
	state_version: number;
	updated_at: number;
}

export interface MapRow {
	id: string;
	slug: string;
	name: string;
	description: string | null;
	width: number;
	height: number;
	default_terrain: string; // JSON
	fog_of_war: string; // JSON
	terrain_layers: string; // JSON
	metadata: string; // JSON
	generator_preset: string;
	seed: string;
	theme: string;
	biome: string;
	world: string | null; // Deprecated: Old string based world
	world_id: string | null; // FK to worlds table
	background_image_url: string | null;
	cover_image_url: string | null;
	grid_columns: number;
	grid_size: number;
	grid_offset_x: number;
	grid_offset_y: number;
	is_generated: number;
	created_at: number;
	updated_at: number;
}

export interface MapTileRow {
	id: string;
	map_id: string;
	x: number;
	y: number;
	terrain_type: string;
	elevation: number;
	movement_cost: number | null;
	is_blocked: number;
	is_difficult: number;
	has_fog: number;
	provides_cover: number;
	cover_type: string | null;
	feature_type: string | null;
	metadata: string;
}

export interface UploadedImageRow {
	id: string;
	user_id: string;
	filename: string;
	r2_key: string;
	public_url: string;
	title: string | null;
	description: string | null;
	image_type: 'npc' | 'character' | 'both';
	is_public: number;
	created_at: number;
	updated_at: number;
}

export interface NpcRow {
	id: string;
	slug: string;
	name: string;
	role: string;
	alignment: string;
	disposition: string;
	description: string | null;
	icon: string | null;
	base_health: number;
	base_armor_class: number;
	challenge_rating: number;
	archetype: string;
	default_actions: string;
	stats: string;
	abilities: string;
	loot_table: string;
	metadata: string;
	created_at: number;
	updated_at: number;
}

export interface MapTokenRow {
	id: string;
	game_id: string | null;
	map_id: string;
	character_id: string | null;
	npc_id: string | null;
	token_type: string;
	label: string | null;
	image_url: string | null;
	x: number;
	y: number;
	facing: number;
	color: string | null;
	status: string;
	is_visible: number;
	hit_points: number | null;
	max_hit_points: number | null;
	status_effects: string | null;
	metadata: string;
	created_at: number;
	updated_at: number;
}


export interface ActivityLogRow {
	id: string;
	game_id: string;
	invite_code: string;
	type: string;
	timestamp: number;
	description: string;
	actor_id: string | null;
	actor_name: string | null;
	data: string | null; // JSON
	created_at: number;
}

export interface WorldRow {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	image_url: string | null;
	is_public: number;
	created_at: number;
	updated_at: number;
}

export class Database {
	constructor(private db: D1Database) { }

	// Game operations
	async createGame(game: Omit<GameRow, 'created_at' | 'updated_at'>): Promise<void> {
		const now = Date.now();
		await this.db.prepare(
			`INSERT INTO games (id, invite_code, host_id, host_email, quest_id, quest_data, world, starting_area, status, current_map_id, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		).bind(
			game.id,
			game.invite_code,
			game.host_id,
			game.host_email || null,
			game.quest_id,
			game.quest_data,
			game.world,
			game.starting_area,
			game.status,
			game.current_map_id || null,
			now,
			now,
		).run();
	}

	async getGameByInviteCode(inviteCode: string): Promise<GameRow | null> {
		// Try exact match first
		const result = await this.db.prepare(
			'SELECT * FROM games WHERE invite_code = ?',
		).bind(inviteCode).first<GameRow>();
		if (result) {
			return result;
		}

		// Fallback: case-insensitive search
		const allResults = await this.db.prepare(
			'SELECT * FROM games WHERE UPPER(invite_code) = UPPER(?)',
		).bind(inviteCode).first<GameRow>();
		return allResults || null;
	}

	async getGameById(gameId: string): Promise<GameRow | null> {
		const result = await this.db.prepare(
			'SELECT * FROM games WHERE id = ?',
		).bind(gameId).first<GameRow>();
		return result || null;
	}

	async getGamesHostedByUser(hostId?: string, hostEmail?: string | null): Promise<GameRow[]> {
		const clauses: string[] = [];
		const values: (string)[] = [];

		if (hostId) {
			clauses.push('host_id = ?');
			values.push(hostId);
		}

		if (hostEmail) {
			clauses.push('host_email = ?');
			values.push(hostEmail);
		}

		if (clauses.length === 0) {
			return [];
		}

		const query = `SELECT * FROM games WHERE ${clauses.map(clause => `(${clause})`).join(' OR ')} ORDER BY updated_at DESC`;
		const result = await this.db.prepare(query).bind(...values).all<GameRow>();
		return result.results || [];
	}

	async updateGameStatus(gameId: string, status: GameRow['status']): Promise<void> {
		await this.db.prepare(
			'UPDATE games SET status = ?, updated_at = ? WHERE id = ?',
		).bind(status, Date.now(), gameId).run();
	}

	async updateGameMap(gameId: string, mapId: string | null): Promise<void> {
		await this.db.prepare(
			'UPDATE games SET current_map_id = ?, updated_at = ? WHERE id = ?',
		).bind(mapId, Date.now(), gameId).run();
	}

	// Character operations
	async createCharacter(character: Omit<CharacterRow, 'created_at' | 'updated_at'>): Promise<void> {
		const now = Date.now();
		await this.db.prepare(
			`INSERT INTO characters (id, player_id, player_email, name, level, race, class, description, trait, icon, stats, skills, inventory, equipped, health, max_health, action_points, max_action_points, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		).bind(
			character.id,
			character.player_id,
			character.player_email || null,
			character.name,
			character.level,
			character.race,
			character.class,
			character.description || null,
			character.trait || '', // Database requires NOT NULL, default to empty string
			character.icon || null,
			character.stats,
			character.skills,
			character.inventory,
			character.equipped,
			character.health,
			character.max_health,
			character.action_points,
			character.max_action_points,
			now,
			now,
		).run();
	}

	async getCharacterById(characterId: string): Promise<CharacterRow | null> {
		const result = await this.db.prepare(
			'SELECT * FROM characters WHERE id = ?',
		).bind(characterId).first<CharacterRow>();
		return result || null;
	}

	async getCharactersByPlayerId(playerId: string): Promise<CharacterRow[]> {
		const result = await this.db.prepare(
			'SELECT * FROM characters WHERE player_id = ? ORDER BY updated_at DESC',
		).bind(playerId).all<CharacterRow>();
		return result.results || [];
	}

	async getCharactersByEmail(email: string): Promise<CharacterRow[]> {
		const result = await this.db.prepare(
			'SELECT * FROM characters WHERE player_email = ? ORDER BY updated_at DESC',
		).bind(email).all<CharacterRow>();
		return result.results || [];
	}

	async getCharactersByPlayerIdentity(playerId?: string, playerEmail?: string | null): Promise<CharacterRow[]> {
		const clauses: string[] = [];
		const values: (string)[] = [];

		if (playerId) {
			clauses.push('player_id = ?');
			values.push(playerId);
		}

		if (playerEmail) {
			clauses.push('player_email = ?');
			values.push(playerEmail);
		}

		if (clauses.length === 0) {
			return [];
		}

		const query = `SELECT * FROM characters WHERE ${clauses.map(clause => `(${clause})`).join(' OR ')} ORDER BY updated_at DESC`;
		const result = await this.db.prepare(query).bind(...values).all<CharacterRow>();
		return result.results || [];
	}

	async updateCharacter(characterId: string, updates: Partial<CharacterRow>): Promise<void> {
		const fields: string[] = [];
		const values: any[] = [];

		Object.entries(updates).forEach(([key, value]) => {
			if (key !== 'id' && value !== undefined) {
				fields.push(`${key} = ?`);
				values.push(value);
			}
		});

		if (fields.length === 0) return;

		fields.push('updated_at = ?');
		values.push(Date.now());
		values.push(characterId);

		await this.db.prepare(
			`UPDATE characters SET ${fields.join(', ')} WHERE id = ?`,
		).bind(...values).run();
	}

	async deleteCharacter(characterId: string): Promise<void> {
		await this.db.prepare('DELETE FROM characters WHERE id = ?').bind(characterId).run();
	}

	async getAllCharacters(): Promise<CharacterRow[]> {
		const result = await this.db.prepare(
			'SELECT * FROM characters ORDER BY updated_at DESC',
		).all<CharacterRow>();
		return result.results || [];
	}

	// Game player operations
	async addPlayerToGame(player: Omit<GamePlayerRow, 'id'>): Promise<string> {
		const id = `gp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
		await this.db.prepare(
			`INSERT INTO game_players (
				id, game_id, player_id, player_email, character_id, character_name, joined_at
			)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
		).bind(
			id,
			player.game_id,
			player.player_id,
			player.player_email || null,
			player.character_id,
			player.character_name,
			player.joined_at,
		).run();
		return id;
	}

	async getGamePlayers(gameId: string): Promise<GamePlayerRow[]> {
		const result = await this.db.prepare(
			'SELECT * FROM game_players WHERE game_id = ? ORDER BY joined_at ASC',
		).bind(gameId).all<GamePlayerRow>();
		return result.results || [];
	}

	async removePlayerFromGame(gameId: string, playerId: string): Promise<void> {
		await this.db.prepare(
			'DELETE FROM game_players WHERE game_id = ? AND player_id = ?',
		).bind(gameId, playerId).run();
	}

	async getGameMembershipsForPlayer(playerId?: string, playerEmail?: string | null): Promise<GamePlayerRow[]> {
		const clauses: string[] = [];
		const values: (string)[] = [];

		if (playerId) {
			clauses.push('player_id = ?');
			values.push(playerId);
		}

		if (playerEmail) {
			clauses.push('player_email = ?');
			values.push(playerEmail);
		}

		if (clauses.length === 0) {
			return [];
		}

		const query = `SELECT * FROM game_players WHERE ${clauses.map(clause => `(${clause})`).join(' OR ')} ORDER BY joined_at DESC`;
		const result = await this.db.prepare(query).bind(...values).all<GamePlayerRow>();
		return result.results || [];
	}

	// Game state operations
	async saveGameState(gameId: string, stateData: string): Promise<void> {
		await this.db.prepare(
			`INSERT INTO game_states (game_id, state_data, updated_at)
			 VALUES (?, ?, ?)
			 ON CONFLICT(game_id) DO UPDATE SET state_data = ?, updated_at = ?`,
		).bind(gameId, stateData, Date.now(), stateData, Date.now()).run();
	}

	async getGameState(gameId: string): Promise<GameStateRow | null> {
		const result = await this.db.prepare(
			'SELECT * FROM game_states WHERE game_id = ?',
		).bind(gameId).first<GameStateRow>();
		return result || null;
	}

	/**
	 * Update game state with partial data (merges with existing state)
	 */
	async updateGameState(gameId: string, updates: Partial<{ state_data: string; map_state: string; log_entries: string }>): Promise<void> {
		const existing = await this.getGameState(gameId);
		const now = Date.now();

		if (!existing) {
			// Create new state if it doesn't exist
			const stateData = updates.state_data || '{}';
			const mapState = updates.map_state || '{}';
			const logEntries = updates.log_entries || '[]';
			await this.db.prepare(
				`INSERT INTO game_states (game_id, state_data, map_state, log_entries, state_version, updated_at)
				 VALUES (?, ?, ?, ?, 1, ?)`,
			).bind(gameId, stateData, mapState, logEntries, now).run();
			return;
		}

		// Merge with existing state
		const stateData = updates.state_data !== undefined ? updates.state_data : existing.state_data;
		const mapState = updates.map_state !== undefined ? updates.map_state : existing.map_state;
		const logEntries = updates.log_entries !== undefined ? updates.log_entries : existing.log_entries;
		const newVersion = existing.state_version + 1;

		await this.db.prepare(
			`UPDATE game_states
			 SET state_data = ?, map_state = ?, log_entries = ?, state_version = ?, updated_at = ?
			 WHERE game_id = ?`,
		).bind(stateData, mapState, logEntries, newVersion, now, gameId).run();
	}

	// Map operations
	async listMaps(): Promise<MapRow[]> {
		const result = await this.db.prepare(
			'SELECT * FROM maps ORDER BY name ASC',
		).all<MapRow>();
		return result.results || [];
	}

	async getMapById(mapId: string): Promise<MapRow | null> {
		const result = await this.db.prepare(
			'SELECT * FROM maps WHERE id = ?',
		).bind(mapId).first<MapRow>();
		return result || null;
	}

	async getMapBySlug(slug: string): Promise<MapRow | null> {
		const result = await this.db.prepare(
			'SELECT * FROM maps WHERE slug = ?',
		).bind(slug).first<MapRow>();
		return result || null;
	}

	async getMapTiles(mapId: string): Promise<MapTileRow[]> {
		const result = await this.db.prepare(
			'SELECT * FROM map_tiles WHERE map_id = ? ORDER BY y ASC, x ASC',
		).bind(mapId).all<MapTileRow>();
		return result.results || [];
	}

	async saveMap(map: Omit<MapRow, 'created_at' | 'updated_at'> & Partial<Pick<MapRow, 'created_at' | 'updated_at'>>): Promise<void> {
		const now = Date.now();
		await this.db.prepare(
			`INSERT INTO maps (
				id, slug, name, description, width, height, default_terrain, fog_of_war,
				terrain_layers, metadata, generator_preset, seed, theme, biome, world, world_id, background_image_url, cover_image_url,
				grid_columns, grid_size, grid_offset_x, grid_offset_y, is_generated,
				created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(id) DO UPDATE SET
				slug = excluded.slug,
				name = excluded.name,
				description = excluded.description,
				width = excluded.width,
				height = excluded.height,
				default_terrain = excluded.default_terrain,
				fog_of_war = excluded.fog_of_war,
				terrain_layers = excluded.terrain_layers,
				metadata = excluded.metadata,
				generator_preset = excluded.generator_preset,
				seed = excluded.seed,
				theme = excluded.theme,
				biome = excluded.biome,
				world = excluded.world,
				world_id = excluded.world_id,
				background_image_url = excluded.background_image_url,
				cover_image_url = excluded.cover_image_url,
				grid_columns = excluded.grid_columns,
				grid_size = excluded.grid_size,
				grid_offset_x = excluded.grid_offset_x,
				grid_offset_y = excluded.grid_offset_y,
				is_generated = excluded.is_generated,
				updated_at = excluded.updated_at`,
		).bind(
			map.id,
			map.slug,
			map.name,
			map.description,
			map.width,
			map.height,
			map.default_terrain,
			map.fog_of_war,
			map.terrain_layers,
			map.metadata,
			map.generator_preset,
			map.seed,
			map.theme,
			map.biome,
			map.world ?? null,
			map.world_id ?? null,
			map.background_image_url ?? null,
			map.cover_image_url ?? null,
			map.grid_columns ?? 0,
			map.grid_size ?? 64,
			map.grid_offset_x ?? 0,
			map.grid_offset_y ?? 0,
			map.is_generated,
			map.created_at ?? now,
			map.updated_at ?? now,
		).run();
	}

	async replaceMapTiles(
		mapId: string,
		tiles: Array<{
			x: number;
			y: number;
			terrain_type: string;
			elevation?: number;
			movement_cost?: number;
			is_blocked?: number;
			is_difficult?: number;
			has_fog?: number;
			provides_cover?: number;
			cover_type?: string | null;
			feature_type?: string | null;
			metadata?: string;
		}>,
	) {
		const deleteStatement = this.db.prepare('DELETE FROM map_tiles WHERE map_id = ?').bind(mapId);

		const insertStatements = tiles.map(tile =>
			this.db.prepare(
				`INSERT INTO map_tiles (
					id, map_id, x, y, terrain_type, elevation, movement_cost, is_blocked, is_difficult, has_fog, provides_cover, cover_type, feature_type, metadata
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(id) DO UPDATE SET
					terrain_type = excluded.terrain_type,
					elevation = excluded.elevation,
					movement_cost = excluded.movement_cost,
					is_blocked = excluded.is_blocked,
					is_difficult = excluded.is_difficult,
					has_fog = excluded.has_fog,
					provides_cover = excluded.provides_cover,
					cover_type = excluded.cover_type,
					feature_type = excluded.feature_type,
					metadata = excluded.metadata`,
			).bind(
				`tile_${mapId}_${tile.x}_${tile.y}`,
				mapId,
				tile.x,
				tile.y,
				tile.terrain_type,
				tile.elevation ?? 0,
				tile.movement_cost ?? 1.0,
				tile.is_blocked ?? 0,
				tile.is_difficult ?? 0,
				tile.has_fog ?? 0,
				tile.provides_cover ?? 0,
				tile.cover_type ?? null,
				tile.feature_type ?? null,
				tile.metadata ?? '{}',
			),
		);

		await this.db.batch([deleteStatement, ...insertStatements]);
	}

	async cloneMap(sourceMapId: string, newName: string, newSlug: string): Promise<MapRow> {
		const sourceMap = await this.getMapById(sourceMapId);
		if (!sourceMap) {
			throw new Error(`Map not found: ${sourceMapId}`);
		}

		const sourceTiles = await this.getMapTiles(sourceMapId);

		const now = Date.now();
		const newMapId = `map_${newSlug}_${now}`;

		const clonedMap: Omit<MapRow, 'created_at' | 'updated_at'> & { created_at: number; updated_at: number } = {
			id: newMapId,
			slug: newSlug,
			name: newName,
			description: sourceMap.description ? `${sourceMap.description} (Copy)` : null,
			width: sourceMap.width,
			height: sourceMap.height,
			default_terrain: sourceMap.default_terrain,
			fog_of_war: sourceMap.fog_of_war,
			terrain_layers: sourceMap.terrain_layers,
			metadata: sourceMap.metadata,
			generator_preset: sourceMap.generator_preset,
			seed: `${sourceMap.seed}_clone_${now}`,
			theme: sourceMap.theme,
			biome: sourceMap.biome,
			world: sourceMap.world, // Preserve world when cloning
			world_id: sourceMap.world_id,
			background_image_url: sourceMap.background_image_url,
			cover_image_url: sourceMap.cover_image_url,
			grid_columns: sourceMap.grid_columns,
			grid_size: sourceMap.grid_size,
			grid_offset_x: sourceMap.grid_offset_x,
			grid_offset_y: sourceMap.grid_offset_y,
			is_generated: sourceMap.is_generated,
			created_at: now,
			updated_at: now,
		};

		await this.saveMap(clonedMap);

		// Copy all tiles
		if (sourceTiles.length > 0) {
			await this.replaceMapTiles(
				newMapId,
				sourceTiles.map(tile => ({
					x: tile.x,
					y: tile.y,
					terrain_type: tile.terrain_type,
					elevation: tile.elevation,
					movement_cost: tile.movement_cost ?? undefined,
					is_blocked: tile.is_blocked,
					is_difficult: tile.is_difficult,
					has_fog: tile.has_fog,
					provides_cover: tile.provides_cover,
					cover_type: tile.cover_type,
					feature_type: tile.feature_type,
					metadata: tile.metadata,
				})),
			);
		}

		const result = await this.getMapById(newMapId);
		if (!result) {
			throw new Error('Failed to retrieve cloned map');
		}

		return result;
	}

	async upsertMapTiles(
		mapId: string,
		tiles: Array<{
			x: number;
			y: number;
			terrain_type: string;
			elevation?: number;
			movement_cost?: number;
			is_blocked?: number;
			is_difficult?: number;
			has_fog?: number;
			provides_cover?: number;
			cover_type?: string | null;
			feature_type?: string | null;
			metadata?: string;
		}>,
	) {
		const statements = tiles.map(tile =>
			this.db.prepare(
				`INSERT INTO map_tiles (
					id, map_id, x, y, terrain_type, elevation, movement_cost, is_blocked, is_difficult, has_fog, provides_cover, cover_type, feature_type, metadata
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(id) DO UPDATE SET
					terrain_type = excluded.terrain_type,
					elevation = excluded.elevation,
					movement_cost = excluded.movement_cost,
					is_blocked = excluded.is_blocked,
					is_difficult = excluded.is_difficult,
					has_fog = excluded.has_fog,
					provides_cover = excluded.provides_cover,
					cover_type = excluded.cover_type,
					feature_type = excluded.feature_type,
					metadata = excluded.metadata`,
			).bind(
				`tile_${mapId}_${tile.x}_${tile.y}`,
				mapId,
				tile.x,
				tile.y,
				tile.terrain_type,
				tile.elevation ?? 0,
				tile.movement_cost ?? 1.0,
				tile.is_blocked ?? 0,
				tile.is_difficult ?? 0,
				tile.has_fog ?? 0,
				tile.provides_cover ?? 0,
				tile.cover_type ?? null,
				tile.feature_type ?? null,
				tile.metadata ?? '{}',
			),
		);

		await this.db.batch(statements);
	}

	// NPC operations
	async listNpcDefinitions(): Promise<NpcRow[]> {
		const result = await this.db.prepare(
			'SELECT * FROM npcs ORDER BY name ASC',
		).all<NpcRow>();
		return result.results || [];
	}

	async getNpcBySlug(slug: string): Promise<NpcRow | null> {
		const result = await this.db.prepare(
			'SELECT * FROM npcs WHERE slug = ?',
		).bind(slug).first<NpcRow>();
		return result || null;
	}

	async getNpcById(id: string): Promise<NpcRow | null> {
		const result = await this.db.prepare(
			'SELECT * FROM npcs WHERE id = ?',
		).bind(id).first<NpcRow>();
		return result || null;
	}

	async saveNpcDefinition(
		npc: Omit<NpcRow, 'created_at' | 'updated_at'> & Partial<Pick<NpcRow, 'created_at' | 'updated_at'>>,
	): Promise<void> {
		const now = Date.now();
		await this.db.prepare(
			`INSERT INTO npcs (
				id, slug, name, role, alignment, disposition, description, icon, base_health, base_armor_class,
				challenge_rating, archetype, default_actions, stats, abilities, loot_table, metadata,
				created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(id) DO UPDATE SET
				slug = excluded.slug,
				name = excluded.name,
				role = excluded.role,
				alignment = excluded.alignment,
				disposition = excluded.disposition,
				description = excluded.description,
				icon = excluded.icon,
				base_health = excluded.base_health,
				base_armor_class = excluded.base_armor_class,
				challenge_rating = excluded.challenge_rating,
				archetype = excluded.archetype,
				default_actions = excluded.default_actions,
				stats = excluded.stats,
				abilities = excluded.abilities,
				loot_table = excluded.loot_table,
				metadata = excluded.metadata,
				updated_at = excluded.updated_at`,
		).bind(
			npc.id,
			npc.slug,
			npc.name,
			npc.role,
			npc.alignment,
			npc.disposition,
			npc.description,
			npc.icon || null,
			npc.base_health,
			npc.base_armor_class,
			npc.challenge_rating,
			npc.archetype,
			npc.default_actions,
			npc.stats,
			npc.abilities,
			npc.loot_table,
			npc.metadata,
			npc.created_at ?? now,
			npc.updated_at ?? now,
		).run();
	}

	// Token operations
	async listMapTokensForGame(gameId: string): Promise<MapTokenRow[]> {
		const result = await this.db.prepare(
			'SELECT * FROM map_tokens WHERE game_id = ? ORDER BY updated_at DESC',
		).bind(gameId).all<MapTokenRow>();
		return result.results || [];
	}

	async listMapTokensForMap(mapId: string): Promise<MapTokenRow[]> {
		const result = await this.db.prepare(
			'SELECT * FROM map_tokens WHERE map_id = ? ORDER BY updated_at DESC',
		).bind(mapId).all<MapTokenRow>();
		return result.results || [];
	}

	async listPropTokensForMap(mapId: string): Promise<MapTokenRow[]> {
		const result = await this.db.prepare(
			'SELECT * FROM map_tokens WHERE map_id = ? AND game_id IS NULL ORDER BY updated_at DESC',
		).bind(mapId).all<MapTokenRow>();
		return result.results || [];
	}

	async getMapTokenById(tokenId: string): Promise<MapTokenRow | null> {
		const result = await this.db.prepare(
			'SELECT * FROM map_tokens WHERE id = ?',
		).bind(tokenId).first<MapTokenRow>();
		return result || null;
	}

	async saveMapToken(token: Omit<MapTokenRow, 'created_at' | 'updated_at'>): Promise<void> {
		const now = Date.now();
		await this.db.prepare(
			`INSERT INTO map_tokens (
				id, game_id, map_id, character_id, npc_id, token_type, label, image_url, x, y, facing, color,
				status, is_visible, hit_points, max_hit_points, status_effects, metadata, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(id) DO UPDATE SET
					game_id = excluded.game_id,
					map_id = excluded.map_id,
					character_id = excluded.character_id,
					npc_id = excluded.npc_id,
					token_type = excluded.token_type,
					label = excluded.label,
					image_url = excluded.image_url,
					x = excluded.x,
					y = excluded.y,
					facing = excluded.facing,
					color = excluded.color,
					status = excluded.status,
					is_visible = excluded.is_visible,
					hit_points = excluded.hit_points,
					max_hit_points = excluded.max_hit_points,
					status_effects = excluded.status_effects,
					metadata = excluded.metadata,
					updated_at = ?`,
		).bind(
			token.id,
			token.game_id,
			token.map_id,
			token.character_id,
			token.npc_id,
			token.token_type,
			token.label,
			token.image_url ?? null,
			token.x,
			token.y,
			token.facing,
			token.color,
			token.status,
			token.is_visible ?? null,
			token.hit_points,
			token.max_hit_points,
			token.status_effects ?? null,
			token.metadata,
			now, // created_at
			now, // updated_at for INSERT
			now, // updated_at for UPDATE SET
		).run();
	}

	async deletePropTokensForMap(mapId: string): Promise<void> {
		await this.db.prepare(
			'DELETE FROM map_tokens WHERE map_id = ? AND token_type = ? AND game_id IS NULL',
		).bind(mapId, 'prop').run();
	}

	async updateMapToken(tokenId: string, updates: Partial<MapTokenRow>): Promise<void> {
		const fields: string[] = [];
		const values: any[] = [];

		Object.entries(updates).forEach(([key, value]) => {
			if (key !== 'id' && value !== undefined) {
				fields.push(`${key} = ?`);
				values.push(value);
			}
		});

		if (fields.length === 0) return;

		fields.push('updated_at = ?');
		values.push(Date.now());
		values.push(tokenId);

		await this.db.prepare(
			`UPDATE map_tokens SET ${fields.join(', ')} WHERE id = ?`,
		).bind(...values).run();
	}

	async deleteMapToken(tokenId: string): Promise<void> {
		await this.db.prepare('DELETE FROM map_tokens WHERE id = ?').bind(tokenId).run();
	}

	async clearTokensForGame(gameId: string): Promise<void> {
		await this.db.prepare('DELETE FROM map_tokens WHERE game_id = ?').bind(gameId).run();
	}


	async deleteGame(gameId: string): Promise<void> {
		// Delete related data first (foreign key constraints will handle game_players via CASCADE)
		// Delete activity logs
		await this.db.prepare('DELETE FROM activity_logs WHERE game_id = ?').bind(gameId).run();
		// Delete map tokens
		await this.db.prepare('DELETE FROM map_tokens WHERE game_id = ?').bind(gameId).run();
		// Delete game states
		await this.db.prepare('DELETE FROM game_states WHERE game_id = ?').bind(gameId).run();
		// Delete the game itself (this will CASCADE delete game_players)
		await this.db.prepare('DELETE FROM games WHERE id = ?').bind(gameId).run();
	}

	// Activity log operations
	async saveActivityLog(log: Omit<ActivityLogRow, 'created_at'>): Promise<void> {
		const now = Date.now();
		await this.db.prepare(
			`INSERT INTO activity_logs (
				id, game_id, invite_code, type, timestamp, description, actor_id, actor_name, data, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		).bind(
			log.id,
			log.game_id,
			log.invite_code,
			log.type,
			log.timestamp,
			log.description,
			log.actor_id || null,
			log.actor_name || null,
			log.data || null,
			now,
		).run();
	}

	async getActivityLogs(inviteCode: string, limit: number = 100, offset: number = 0): Promise<ActivityLogRow[]> {
		const result = await this.db.prepare(
			'SELECT * FROM activity_logs WHERE invite_code = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?',
		).bind(inviteCode, limit, offset).all<ActivityLogRow>();
		return result.results || [];
	}

	async getActivityLogsByGameId(gameId: string, limit: number = 100, offset: number = 0): Promise<ActivityLogRow[]> {
		const result = await this.db.prepare(
			'SELECT * FROM activity_logs WHERE game_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?',
		).bind(gameId, limit, offset).all<ActivityLogRow>();
		return result.results || [];
	}

	async deleteActivityLogs(gameId: string): Promise<void> {
		await this.db.prepare('DELETE FROM activity_logs WHERE game_id = ?').bind(gameId).run();
	}

	// Uploaded Image operations
	async saveUploadedImage(image: UploadedImageRow): Promise<void> {
		await this.db.prepare(
			`INSERT INTO uploaded_images (
				id, user_id, filename, r2_key, public_url, title, description,
				image_type, is_public, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(id) DO UPDATE SET
				title = excluded.title,
				description = excluded.description,
				image_type = excluded.image_type,
				is_public = excluded.is_public,
				updated_at = excluded.updated_at`,
		).bind(
			image.id,
			image.user_id,
			image.filename,
			image.r2_key,
			image.public_url,
			image.title,
			image.description,
			image.image_type,
			image.is_public,
			image.created_at,
			image.updated_at,
		).run();
	}

	async getUploadedImageById(id: string): Promise<UploadedImageRow | null> {
		return await this.db.prepare('SELECT * FROM uploaded_images WHERE id = ?').bind(id).first<UploadedImageRow>();
	}

	async listUploadedImages(
		userId?: string,
		imageType?: 'npc' | 'character' | 'both',
		limit: number = 50,
		offset: number = 0,
	): Promise<UploadedImageRow[]> {
		let query = 'SELECT * FROM uploaded_images WHERE 1=1';
		const params: any[] = [];

		if (userId) {
			query += ' AND user_id = ?';
			params.push(userId);
		}

		if (imageType) {
			if (imageType === 'both') {
				// No filter needed for 'both' as it means all types
			} else {
				query += ' AND (image_type = ? OR image_type = "both")';
				params.push(imageType);
			}
		}

		query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
		params.push(limit, offset);

		const result = await this.db.prepare(query).bind(...params).all<UploadedImageRow>();
		return result.results || [];
	}

	async deleteUploadedImage(id: string): Promise<void> {
		await this.db.prepare('DELETE FROM uploaded_images WHERE id = ?').bind(id).run();
	}

	// World operations
	async listWorlds(): Promise<WorldRow[]> {
		const result = await this.db.prepare(
			'SELECT * FROM worlds ORDER BY name ASC',
		).all<WorldRow>();
		return result.results || [];
	}

	async getWorldById(id: string): Promise<WorldRow | null> {
		const result = await this.db.prepare(
			'SELECT * FROM worlds WHERE id = ?',
		).bind(id).first<WorldRow>();
		return result || null;
	}

	async saveWorld(world: Omit<WorldRow, 'created_at' | 'updated_at'> & Partial<Pick<WorldRow, 'created_at' | 'updated_at'>>): Promise<void> {
		const now = Date.now();
		await this.db.prepare(
			`INSERT INTO worlds (
				id, name, slug, description, image_url, is_public, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(id) DO UPDATE SET
				name = excluded.name,
				slug = excluded.slug,
				description = excluded.description,
				image_url = excluded.image_url,
				is_public = excluded.is_public,
				updated_at = excluded.updated_at`,
		).bind(
			world.id,
			world.name,
			world.slug,
			world.description ?? null,
			world.image_url ?? null,
			world.is_public,
			world.created_at ?? now,
			world.updated_at ?? now,
		).run();
	}

	async deleteWorld(id: string): Promise<void> {
		await this.db.prepare('DELETE FROM worlds WHERE id = ?').bind(id).run();
	}
}
