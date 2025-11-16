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
	stats: string; // JSON
	skills: string; // JSON array
	inventory: string; // JSON array
	equipped: string; // JSON object
	health: number;
	max_health: number;
	action_points: number;
	max_action_points: number;
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
        is_blocked: number;
        has_fog: number;
        metadata: string;
}

export interface NpcRow {
        id: string;
        slug: string;
        name: string;
        role: string;
        alignment: string;
        disposition: string;
        description: string | null;
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
        x: number;
        y: number;
        facing: number;
        color: string | null;
        status: string;
        is_visible: number;
        hit_points: number | null;
        max_hit_points: number | null;
        metadata: string;
        created_at: number;
        updated_at: number;
}

export class Database {
	constructor(private db: D1Database) {}

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
		const result = await this.db.prepare(
			'SELECT * FROM games WHERE invite_code = ?',
		).bind(inviteCode).first<GameRow>();
		return result || null;
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
			`INSERT INTO characters (id, player_id, player_email, name, level, race, class, description, stats, skills, inventory, equipped, health, max_health, action_points, max_action_points, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		).bind(
			character.id,
			character.player_id,
			character.player_email || null,
			character.name,
			character.level,
			character.race,
			character.class,
			character.description || null,
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

	// Game player operations
	async addPlayerToGame(player: Omit<GamePlayerRow, 'id'>): Promise<string> {
		const id = `gp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
		await this.db.prepare(
			`INSERT INTO game_players (id, game_id, player_id, player_email, character_id, character_name, joined_at)
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

        async getMapTiles(mapId: string): Promise<MapTileRow[]> {
                const result = await this.db.prepare(
                        'SELECT * FROM map_tiles WHERE map_id = ? ORDER BY y ASC, x ASC',
                ).bind(mapId).all<MapTileRow>();
                return result.results || [];
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

        async saveMapToken(token: Omit<MapTokenRow, 'created_at' | 'updated_at'>): Promise<void> {
                const now = Date.now();
                await this.db.prepare(
                        `INSERT INTO map_tokens (
                                id, game_id, map_id, character_id, npc_id, token_type, label, x, y, facing, color,
                                status, is_visible, hit_points, max_hit_points, metadata, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(id) DO UPDATE SET
                                game_id = excluded.game_id,
                                map_id = excluded.map_id,
                                character_id = excluded.character_id,
                                npc_id = excluded.npc_id,
                                token_type = excluded.token_type,
                                label = excluded.label,
                                x = excluded.x,
                                y = excluded.y,
                                facing = excluded.facing,
                                color = excluded.color,
                                status = excluded.status,
                                is_visible = excluded.is_visible,
                                hit_points = excluded.hit_points,
                                max_hit_points = excluded.max_hit_points,
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
                        token.x,
                        token.y,
                        token.facing,
                        token.color,
                        token.status,
                        token.is_visible,
                        token.hit_points,
                        token.max_hit_points,
                        token.metadata,
                        now,
                        now,
                ).run();
        }

        async deleteMapToken(tokenId: string): Promise<void> {
                await this.db.prepare('DELETE FROM map_tokens WHERE id = ?').bind(tokenId).run();
        }

        async clearTokensForGame(gameId: string): Promise<void> {
                await this.db.prepare('DELETE FROM map_tokens WHERE game_id = ?').bind(gameId).run();
        }
}


