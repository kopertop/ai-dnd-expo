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
        updated_at: number;
}

export interface MapRow {
        id: string;
        name: string;
        description: string | null;
        width: number;
        height: number;
        terrain: string;
        fog: string;
        metadata: string | null;
        created_at: number;
        updated_at: number;
}

export interface NpcRow {
        id: string;
        name: string;
        alignment: string;
        description: string | null;
        stats: string;
        abilities: string;
        icon: string | null;
        color: string | null;
        metadata: string | null;
        created_at: number;
        updated_at: number;
}

export interface MapTokenRow {
        id: string;
        map_id: string;
        type: string;
        entity_id: string | null;
        label: string;
        icon: string | null;
        color: string | null;
        x: number;
        y: number;
        z_index: number;
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

        // Map helpers
        async getMaps(): Promise<MapRow[]> {
                const result = await this.db.prepare('SELECT * FROM maps ORDER BY name ASC').all<MapRow>();
                return result.results || [];
        }

        async getMapById(mapId: string): Promise<MapRow | null> {
                const result = await this.db.prepare('SELECT * FROM maps WHERE id = ?').bind(mapId).first<MapRow>();
                return result || null;
        }

        async getNpcDefinitions(): Promise<NpcRow[]> {
                const result = await this.db.prepare('SELECT * FROM npcs ORDER BY name ASC').all<NpcRow>();
                return result.results || [];
        }

        async getMapTokens(mapId: string): Promise<MapTokenRow[]> {
                const result = await this.db.prepare(
                        'SELECT * FROM map_tokens WHERE map_id = ? ORDER BY z_index ASC, created_at ASC',
                ).bind(mapId).all<MapTokenRow>();
                return result.results || [];
        }

        async saveMapToken(token: Omit<MapTokenRow, 'created_at' | 'updated_at'> & { id?: string }): Promise<string> {
                const now = Date.now();
                const tokenId = token.id ?? `token_${now}_${Math.random().toString(36).slice(2, 8)}`;

                await this.db.prepare(
                        `INSERT INTO map_tokens (id, map_id, type, entity_id, label, icon, color, x, y, z_index, metadata, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                         ON CONFLICT(id) DO UPDATE SET
                                map_id = excluded.map_id,
                                type = excluded.type,
                                entity_id = excluded.entity_id,
                                label = excluded.label,
                                icon = excluded.icon,
                                color = excluded.color,
                                x = excluded.x,
                                y = excluded.y,
                                z_index = excluded.z_index,
                                metadata = excluded.metadata,
                                updated_at = excluded.updated_at`,
                ).bind(
                        tokenId,
                        token.map_id,
                        token.type,
                        token.entity_id || null,
                        token.label,
                        token.icon || null,
                        token.color || null,
                        token.x,
                        token.y,
                        token.z_index,
                        token.metadata || null,
                        now,
                        now,
                ).run();

                return tokenId;
        }

        async deleteMapToken(tokenId: string): Promise<void> {
                await this.db.prepare('DELETE FROM map_tokens WHERE id = ?').bind(tokenId).run();
        }
}


