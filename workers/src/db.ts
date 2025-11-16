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
}

