/**
 * Database Row Types
 *
 * This file contains all the interface definitions for the D1 database tables.
 */

/**
 * Represents a game session in the database.
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
	world_id?: string | null;
	created_at: number;
	updated_at: number;
}

/**
 * Represents a player character.
 */
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

/**
 * Represents a player's membership in a game.
 */
export interface GamePlayerRow {
	id: string;
	game_id: string;
	player_id: string;
	player_email: string | null;
	character_id: string;
	character_name: string;
	joined_at: number;
}

/**
 * Represents the current mutable state of a game.
 */
export interface GameStateRow {
	game_id: string;
	state_data: string; // JSON
	map_state: string; // JSON
	log_entries: string; // JSON
	state_version: number;
	updated_at: number;
}

/**
 * Represents a map definition (metadata, terrain, etc.).
 */
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
	world_id?: string | null; // FK to worlds table
	background_image_url?: string | null;
	cover_image_url?: string | null;
	grid_columns?: number;
	grid_size?: number;
	grid_offset_x?: number;
	grid_offset_y?: number;
	is_generated: number;
	created_at: number;
	updated_at: number;
}

/**
 * Represents a single tile on a map.
 */
export interface MapTileRow {
	id: string;
	map_id: string;
	x: number;
	y: number;
	terrain_type: string;
	elevation: number;
	movement_cost?: number | null;
	is_blocked?: number;
	is_difficult?: number;
	has_fog?: number;
	provides_cover?: number;
	cover_type?: string | null;
	feature_type?: string | null;
	metadata?: string;
}

/**
 * Represents an image uploaded by a user.
 */
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

/**
 * Represents an NPC definition (template).
 */
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

/**
 * Represents a token (object, NPC, or player) placed on a map.
 */
export interface MapTokenRow {
	id: string;
	game_id: string | null;
	map_id: string;
	character_id: string | null;
	npc_id: string | null;
	token_type: string;
	label: string | null;
	image_url?: string | null;
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

/**
 * Represents a log entry in the game's activity log.
 */
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

/**
 * Represents a world setting (e.g., "Faerun").
 */
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
