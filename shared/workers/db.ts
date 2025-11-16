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
        active_map_id?: string | null;
        map_state?: string | null;
        updated_at: number;
}

export interface MapRow {
        id: string;
        slug: string;
        name: string;
        description: string | null;
        width: number;
        height: number;
        grid_size: number;
        terrain: string;
        fog: string;
        metadata: string | null;
        created_at: number;
        updated_at: number;
}

export interface MapTileRow {
        id: number;
        map_id: string;
        x: number;
        y: number;
        terrain: string;
        elevation: number | null;
        is_blocked: number;
        has_fog: number;
}

export interface NpcRow {
        id: string;
        slug: string;
        name: string;
        role: string;
        alignment: string | null;
        description: string | null;
        stats: string;
        abilities: string | null;
        max_health: number;
        metadata: string | null;
        created_at: number;
        updated_at: number;
}

export interface MapTokenRow {
        id: string;
        game_id: string;
        map_id: string | null;
        token_type: string;
        reference_id: string | null;
        label: string;
        x: number;
        y: number;
        elevation: number | null;
        color: string | null;
        icon: string | null;
        metadata: string | null;
        created_at: number;
        updated_at: number;
}

export class Database {
	constructor(private db: D1Database) {}

	// Game operations
	async createGame(game: Omit<GameRow, 'created_at' | 'updated_at'>): Promise<void> {
		const now = Date.now();
		await this.db.prepare(
			`INSERT INTO games (id, invite_code, host_id, host_email, quest_id, quest_data, world, starting_area, status, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

        async deleteCharacter(characterId: string): Promise<void> {
                await this.db.prepare('DELETE FROM characters WHERE id = ?').bind(characterId).run();
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
        async listMaps(): Promise<MapRow[]> {
                const result = await this.db.prepare('SELECT * FROM maps ORDER BY name ASC').all<MapRow>();
                return result.results || [];
        }

        async getMapById(mapId: string): Promise<MapRow | null> {
                const result = await this.db.prepare('SELECT * FROM maps WHERE id = ?').bind(mapId).first<MapRow>();
                return result || null;
        }

        async getMapTiles(mapId: string): Promise<MapTileRow[]> {
                const result = await this.db.prepare('SELECT * FROM map_tiles WHERE map_id = ? ORDER BY y ASC, x ASC')
                        .bind(mapId)
                        .all<MapTileRow>();
                return result.results || [];
        }

        async listNpcDefinitions(): Promise<NpcRow[]> {
                const result = await this.db.prepare('SELECT * FROM npcs ORDER BY name ASC').all<NpcRow>();
                return result.results || [];
        }

        async getMapTokensForGame(gameId: string): Promise<MapTokenRow[]> {
                const result = await this.db.prepare('SELECT * FROM map_tokens WHERE game_id = ? ORDER BY updated_at ASC')
                        .bind(gameId)
                        .all<MapTokenRow>();
                return result.results || [];
        }

        async getMapToken(tokenId: string): Promise<MapTokenRow | null> {
                const result = await this.db.prepare('SELECT * FROM map_tokens WHERE id = ?').bind(tokenId).first<MapTokenRow>();
                return result || null;
        }

        async createMapToken(token: Omit<MapTokenRow, 'created_at' | 'updated_at'>): Promise<void> {
                const now = Date.now();
                await this.db.prepare(
                        `INSERT INTO map_tokens (id, game_id, map_id, token_type, reference_id, label, x, y, elevation, color, icon, metadata, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                )
                        .bind(
                                token.id,
                                token.game_id,
                                token.map_id || null,
                                token.token_type,
                                token.reference_id || null,
                                token.label,
                                token.x,
                                token.y,
                                token.elevation ?? null,
                                token.color ?? null,
                                token.icon ?? null,
                                token.metadata ?? null,
                                now,
                                now,
                        )
                        .run();
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

                await this.db.prepare(`UPDATE map_tokens SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
        }

        async deleteMapToken(tokenId: string): Promise<void> {
                await this.db.prepare('DELETE FROM map_tokens WHERE id = ?').bind(tokenId).run();
        }

        async saveGameState(
                gameId: string,
                stateData: string,
                options?: { activeMapId?: string | null; mapState?: string | null },
        ): Promise<void> {
                const now = Date.now();
                const activeMapId = options?.activeMapId ?? null;
                const mapState = options?.mapState ?? null;
                await this.db.prepare(
                        `INSERT INTO game_states (game_id, state_data, active_map_id, map_state, updated_at)
                         VALUES (?, ?, ?, ?, ?)
                         ON CONFLICT(game_id) DO UPDATE SET state_data = ?, active_map_id = ?, map_state = ?, updated_at = ?`,
                )
                        .bind(
                                gameId,
                                stateData,
                                activeMapId,
                                mapState,
                                now,
                                stateData,
                                activeMapId,
                                mapState,
                                now,
                        )
                        .run();
        }

        async getGameState(gameId: string): Promise<GameStateRow | null> {
                const result = await this.db.prepare(
                        'SELECT * FROM game_states WHERE game_id = ?',
                ).bind(gameId).first<GameStateRow>();
                return result || null;
        }
}


