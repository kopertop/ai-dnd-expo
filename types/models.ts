import { z } from 'zod';

// ============================================================================
// User Models
// ============================================================================

export const UserSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	name: z.string(),
	is_admin: z.boolean().optional(),
	role: z.string().optional(),
	picture: z.string().url().optional(),
	created_at: z.number(),
	updated_at: z.number(),
});

export type User = z.infer<typeof UserSchema>;

// ============================================================================
// Device Token Models
// ============================================================================

export const DeviceTokenSchema = z.object({
	device_token: z.string().length(64).regex(/^[0-9a-f]+$/i),
	user_id: z.string().uuid(),
	device_name: z.string().optional(),
	device_platform: z.enum(['ios', 'android', 'web']),
	user_agent: z.string().optional(),
	ip_address: z.string().optional(),
	last_used_at: z.number(),
	expires_at: z.number().optional(),
	created_at: z.number(),
	updated_at: z.number(),
});

export type DeviceToken = z.infer<typeof DeviceTokenSchema>;

// ============================================================================
// Game Models
// ============================================================================

export const GameStatusSchema = z.enum(['waiting', 'active', 'completed', 'cancelled']);

export const GameSchema = z.object({
	id: z.string(),
	invite_code: z.string().length(6),
	host_id: z.string(),
	host_email: z.string().email().nullable(),
	quest_id: z.string(),
	quest_data: z.string(), // JSON string
	world: z.string(),
	starting_area: z.string(),
	status: GameStatusSchema,
	current_map_id: z.string().nullable(),
	created_at: z.number(),
	updated_at: z.number(),
});

export type Game = z.infer<typeof GameSchema>;

// ============================================================================
// Character Models
// ============================================================================

export const DamageTypeSchema = z.enum([
	'fire',
	'radiant',
	'force',
	'cold',
	'lightning',
	'acid',
	'necrotic',
	'poison',
	'psychic',
	'thunder',
	'bludgeoning',
	'piercing',
	'slashing',
	'healing',
	'support',
]);

export const StatsSchema = z.object({
	strength: z.number().int().min(1).max(30).optional(),
	dexterity: z.number().int().min(1).max(30).optional(),
	constitution: z.number().int().min(1).max(30).optional(),
	intelligence: z.number().int().min(1).max(30).optional(),
	wisdom: z.number().int().min(1).max(30).optional(),
	charisma: z.number().int().min(1).max(30).optional(),
}).passthrough(); // Allow additional stats

export const ItemSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.string(),
	quantity: z.number().int().min(1).optional(),
	metadata: z.record(z.unknown()).optional(),
}).passthrough();

export const CharacterSchema = z.object({
	id: z.string(),
	player_id: z.string().optional(),
	player_email: z.string().email().optional().nullable(),
	name: z.string().min(1),
	level: z.number().int().min(1).max(20),
	race: z.string(),
	class: z.string(),
	description: z.string().optional().nullable(),
	stats: StatsSchema,
	skills: z.array(z.string()),
	inventory: z.array(ItemSchema),
	equipped: z.record(z.unknown()), // Object with slot -> item mappings
	health: z.number().int().min(0),
	max_health: z.number().int().min(1),
	action_points: z.number().int().min(0),
	max_action_points: z.number().int().min(0),
	status_effects: z.array(z.string()).default([]),
	prepared_spells: z.array(z.string()).default([]), // Array of spell IDs
	weaknesses: z.array(DamageTypeSchema).optional(),
	resistances: z.array(DamageTypeSchema).optional(),
	immunities: z.array(DamageTypeSchema).optional(),
	created_at: z.number().optional(),
	updated_at: z.number().optional(),
});


export type Character = z.infer<typeof CharacterSchema>;

// ============================================================================
// Map Models
// ============================================================================

export const MapSchema = z.object({
	id: z.string(),
	slug: z.string(),
	name: z.string(),
	description: z.string().optional().nullable(),
	width: z.number().int().min(1),
	height: z.number().int().min(1),
	default_terrain: z.string(), // JSON string
	fog_of_war: z.string(), // JSON string
	terrain_layers: z.string(), // JSON string
	metadata: z.string().default('{}'), // JSON string
	generator_preset: z.string().default('static'),
	seed: z.string().default('static'),
	theme: z.string().default('neutral'),
	biome: z.string().default('temperate'),
	world: z.string().nullable().optional(), // World ID (null = world-agnostic)
	is_generated: z.number().int().default(0),
	created_at: z.number(),
	updated_at: z.number(),
});

export type Map = z.infer<typeof MapSchema>;

export const MapTileSchema = z.object({
	id: z.string(),
	map_id: z.string(),
	x: z.number().int(),
	y: z.number().int(),
	terrain_type: z.string(),
	elevation: z.number().int().default(0),
	movement_cost: z.number().default(1.0),
	is_blocked: z.number().int().default(0),
	is_difficult: z.number().int().default(0),
	has_fog: z.number().int().default(0),
	feature_type: z.string().nullable(),
	provides_cover: z.number().int().default(0),
	cover_type: z.string().nullable(),
	metadata: z.string().default('{}'), // JSON string
});

export type MapTile = z.infer<typeof MapTileSchema>;

// ============================================================================
// NPC Models
// ============================================================================

export const NpcSchema = z.object({
	id: z.string(),
	slug: z.string(),
	name: z.string(),
	role: z.string(),
	alignment: z.string(),
	disposition: z.string(),
	description: z.string().optional().nullable(),
	base_health: z.number().int().min(1),
	base_armor_class: z.number().int().min(0),
	challenge_rating: z.number().min(0),
	archetype: z.string(),
	default_actions: z.string(), // JSON string array
	stats: z.string(), // JSON string
	abilities: z.string(), // JSON string array
	loot_table: z.string(), // JSON string array
	metadata: z.string().default('{}'), // JSON string
	created_at: z.number(),
	updated_at: z.number(),
});

export type Npc = z.infer<typeof NpcSchema>;

export const NpcInstanceSchema = z.object({
	id: z.string(),
	game_id: z.string(),
	npc_id: z.string(),
	token_id: z.string(),
	name: z.string(),
	disposition: z.string(),
	current_health: z.number().int().min(0),
	max_health: z.number().int().min(1),
	status_effects: z.string().default('[]'), // JSON string array
	is_friendly: z.number().int().default(0),
	metadata: z.string().default('{}'), // JSON string
	created_at: z.number(),
	updated_at: z.number(),
});

export type NpcInstance = z.infer<typeof NpcInstanceSchema>;

// ============================================================================
// Game Player Models
// ============================================================================

export const GamePlayerSchema = z.object({
	id: z.string(),
	game_id: z.string(),
	player_id: z.string().optional().nullable(),
	player_email: z.string().email().optional().nullable(),
	character_id: z.string(),
	character_name: z.string(),
	joined_at: z.number(),
});

export type GamePlayer = z.infer<typeof GamePlayerSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse a JSON string field and validate it against a schema
 */
export function parseJsonField<T>(jsonString: string, schema: z.ZodSchema<T>): T {
	try {
		const parsed = JSON.parse(jsonString);
		return schema.parse(parsed);
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new Error(`Invalid JSON field: ${error.message}`);
		}
		throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

/**
 * Validate and parse a User from database row
 */
export function parseUserFromDb(row: unknown): User {
	return UserSchema.parse(row);
}

/**
 * Validate and parse a DeviceToken from database row
 */
export function parseDeviceTokenFromDb(row: unknown): DeviceToken {
	return DeviceTokenSchema.parse(row);
}

/**
 * Validate and parse a Game from database row
 */
export function parseGameFromDb(row: unknown): Game {
	return GameSchema.parse(row);
}

/**
 * Validate and parse a Character from database row
 * Note: Database stores JSON as strings, so we need to parse them
 */
export function parseCharacterFromDb(row: any): Character {
	// Parse JSON string fields from database
	const parsed = {
		...row,
		stats: typeof row.stats === 'string' ? JSON.parse(row.stats) : row.stats,
		skills: typeof row.skills === 'string' ? JSON.parse(row.skills) : row.skills,
		inventory: typeof row.inventory === 'string' ? JSON.parse(row.inventory) : row.inventory,
		equipped: typeof row.equipped === 'string' ? JSON.parse(row.equipped) : row.equipped,
		weaknesses: typeof row.weaknesses === 'string' ? JSON.parse(row.weaknesses) : row.weaknesses,
		resistances: typeof row.resistances === 'string' ? JSON.parse(row.resistances) : row.resistances,
		immunities: typeof row.immunities === 'string' ? JSON.parse(row.immunities) : row.immunities,
	};
	return CharacterSchema.parse(parsed);
}

