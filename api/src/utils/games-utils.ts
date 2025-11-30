import type { Context } from 'hono';

import type { GamesContext } from '../routes/games/types';

import { CharacterRow, Database, GameRow, MapRow, MapTokenRow } from '@/shared/workers/db';
import { Character } from '@/types/character';
import { Quest } from '@/types/quest';
import { mapStateFromDb } from '@/utils/schema-adapters';


/**
 * Create a JSON response with a specific status code
 * @param _ - Context (unused but required for type compatibility)
 * @param payload - Response payload to serialize
 * @param status - HTTP status code
 * @returns Response object with JSON body
 */
export const jsonWithStatus = <T>(_: Context<GamesContext>, payload: T, status: number) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

/**
 * Generate a unique ID with a prefix
 * Uses crypto.randomUUID if available, otherwise falls back to Math.random
 * @param prefix - Prefix for the ID (e.g., 'game', 'char', 'token')
 * @returns Unique ID string
 */
export const createId = (prefix: string) => {
	if (globalThis.crypto?.randomUUID) {
		return `${prefix}_${globalThis.crypto.randomUUID()}`;
	}

	return `${prefix}_${Math.random().toString(36).slice(2)}`;
};

/**
 * Check if a user is the host of a game
 * @param game - Game row from database
 * @param user - User from context variables
 * @returns True if user is the host (matches host_id or host_email)
 */
export const isHostUser = (game: GameRow, user: { id: string; email: string; name?: string | null } | null) => {
	if (!user) {
		return false;
	}

	if (game.host_id && game.host_id === user.id) {
		return true;
	}

	if (game.host_email && user.email && game.host_email === user.email) {
		return true;
	}

	return false;
};

/**
 * Resolve the current map for a game, falling back to first available map if needed
 * @param db - Database instance
 * @param game - Game row from database
 * @returns Map row, throws error if no maps available
 */
export const resolveMapRow = async (db: Database, game: GameRow): Promise<MapRow> => {
	if (game.current_map_id) {
		const existing = await db.getMapById(game.current_map_id);
		if (existing) {
			return existing;
		}
	}

	const maps = await db.listMaps();
	if (!maps.length) {
		throw new Error('No maps available');
	}

	const fallback = maps[0];
	await db.updateGameMap(game.id, fallback.id);
	return fallback;
};

/**
 * Get default icon for a token based on its type and properties
 * @param token - Token row from database
 * @param npc - Optional NPC definition
 * @param character - Optional character data
 * @returns Default icon string or undefined
 */
const getDefaultTokenIcon = (
	token: MapTokenRow,
	npc?: { role?: string; name?: string; icon?: string } | null,
	character?: { class?: string; icon?: string; image?: string } | null,
): string | undefined => {
	// If token already has icon in metadata, use it
	const metadata = JSON.parse(token.metadata || '{}');
	if (metadata.icon) {
		return metadata.icon;
	}
	if (metadata.image) {
		return metadata.image;
	}

	// For NPCs: try NPC definition icon, then role-based defaults
	if (token.token_type === 'npc') {
		if (npc?.icon) {
			return npc.icon;
		}
		const role = (npc?.role || token.label || '').toLowerCase();
		if (role.includes('guard') || role.includes('sentinel') || role.includes('captain')) {
			return 'MaterialIcons:security';
		}
		if (role.includes('vendor') || role.includes('merchant') || role.includes('shop')) {
			return 'MaterialIcons:store';
		}
		if (role.includes('scout') || role.includes('ranger') || role.includes('raider')) {
			return 'MaterialIcons:explore';
		}
		if (role.includes('healer') || role.includes('cleric')) {
			return 'MaterialIcons:healing';
		}
		if (role.includes('melee') || role.includes('hostile') || role.includes('monster')) {
			return 'MaterialCommunityIcons:sword';
		}
		if (role.includes('ranged') || role.includes('ranger') || role.includes('archer')) {
			return 'MaterialCommunityIcons:bow-arrow';
		}
		// Default NPC icon
		return 'MaterialIcons:person';
	}

	// For players: try character icon/image, then class-based defaults
	if (token.token_type === 'player') {
		if (character?.icon) {
			return character.icon;
		}
		if (character?.image) {
			return character.image;
		}
		const charClass = (character?.class || '').toLowerCase();
		if (charClass.includes('fighter') || charClass.includes('warrior') || charClass.includes('paladin')) {
			return 'MaterialIcons:security';
		}
		if (charClass.includes('wizard') || charClass.includes('mage') || charClass.includes('sorcerer')) {
			return 'MaterialIcons:auto-fix-high';
		}
		if (charClass.includes('rogue') || charClass.includes('thief') || charClass.includes('assassin')) {
			return 'FontAwesome5:mask';
		}
		if (charClass.includes('cleric') || charClass.includes('priest')) {
			return 'MaterialIcons:healing';
		}
		// Default player icon
		return 'MaterialIcons:person';
	}

	// For objects: default object icon
	if (token.token_type === 'object') {
		return 'MaterialIcons:category';
	}

	return undefined;
};

/**
 * Build complete map state including tiles and tokens
 * @param db - Database instance
 * @param game - Game row from database
 * @returns Map state object with tiles and tokens
 */
export const buildMapState = async (db: Database, game: GameRow) => {
	const mapRow = await resolveMapRow(db, game);
	const [tiles, tokens] = await Promise.all([
		db.getMapTiles(mapRow.id),
		db.listMapTokensForGame(game.id),
	]);

	// Normalize token icons by fetching NPC definitions and characters
	const normalizedTokens = await Promise.all(
		tokens.map(async (token) => {
			// Check if token already has icon
			const metadata = JSON.parse(token.metadata || '{}');
			if (metadata.icon || metadata.image) {
				return token; // Already has icon, no need to normalize
			}

			// Fetch NPC definition if this is an NPC token
			let npc: { role?: string; name?: string; icon?: string } | null = null;
			if (token.token_type === 'npc' && token.npc_id) {
				const npcRow = await db.getNpcById(token.npc_id);
				if (npcRow) {
					const npcMetadata = JSON.parse(npcRow.metadata || '{}');
					npc = {
						role: npcRow.role,
						name: npcRow.name,
						icon: npcMetadata.icon,
					};
				}
			}

			// Fetch character if this is a player token
			let character: { class?: string; icon?: string; image?: string } | null = null;
			if (token.token_type === 'player' && token.character_id) {
				const charRow = await db.getCharacterById(token.character_id);
				if (charRow) {
					const char = deserializeCharacter(charRow);
					character = {
						class: char.class,
						icon: char.icon,
						image: char.image,
					};
				}
			}

			// Get default icon
			const defaultIcon = getDefaultTokenIcon(token, npc, character);
			if (defaultIcon) {
				// Update token metadata with default icon
				const updatedMetadata = {
					...metadata,
					icon: defaultIcon,
				};
				return {
					...token,
					metadata: JSON.stringify(updatedMetadata),
				};
			}

			return token;
		}),
	);

	return mapStateFromDb(mapRow, { tiles, tokens: normalizedTokens });
};

/**
 * Convert a name string to a URL-friendly slug
 * @param value - Name string to slugify
 * @returns Slugified string, defaults to 'npc' if empty
 */
export const slugifyName = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'npc';

/**
 * Convert an NPC token row to API response format
 * @param token - Map token row for NPC
 * @returns Formatted NPC token response object
 */
export const npcTokenToResponse = (token: MapTokenRow) => ({
	id: token.id,
	tokenId: token.id,
	npcId: token.npc_id,
	name: token.label || 'Unknown',
	disposition: token.status,
	currentHealth: token.hit_points ?? token.max_hit_points ?? 0,
	maxHealth: token.max_hit_points ?? 0,
	statusEffects: token.status_effects ? JSON.parse(token.status_effects) : [],
	isFriendly: token.status !== 'hostile',
	metadata: JSON.parse(token.metadata || '{}'),
	updatedAt: token.updated_at,
});

/**
 * Create a custom NPC definition in the database
 * @param db - Database instance
 * @param hostId - ID of the host creating the NPC
 * @param custom - Custom NPC configuration
 * @returns Created NPC definition row
 */
export const createCustomNpcDefinition = async (
	db: Database,
	hostId: string,
	custom: {
		name: string;
		role: string;
		alignment: string;
		disposition: string;
		description?: string;
		maxHealth?: number;
		armorClass?: number;
		challengeRating?: number;
		color?: string;
	},
) => {
	const slug = `${slugifyName(custom.name)}_${hostId.slice(0, 6)}`;
	const npcId = `npc_${slug}_${Date.now()}`;
	const now = Date.now();
	await db.saveNpcDefinition({
		id: npcId,
		slug,
		name: custom.name,
		role: custom.role || 'custom',
		alignment: custom.alignment || 'neutral',
		disposition: custom.disposition || 'neutral',
		description: custom.description ?? null,
		base_health: custom.maxHealth ?? 10,
		base_armor_class: custom.armorClass ?? 12,
		challenge_rating: custom.challengeRating ?? 1,
		archetype: 'custom',
		default_actions: JSON.stringify(['attack']),
		stats: JSON.stringify({}),
		abilities: JSON.stringify([]),
		loot_table: JSON.stringify([]),
		metadata: JSON.stringify({ color: custom.color ?? '', createdBy: hostId }),
		created_at: now,
		updated_at: now,
	});

	const created = await db.getNpcBySlug(slug);
	if (!created) {
		throw new Error('Failed to create NPC definition');
	}
	return created;
};

/**
 * Serialize a Character object to database row format
 * @param character - Character object to serialize
 * @param playerId - Player ID owning the character
 * @param playerEmail - Player email (optional)
 * @returns Serialized character row data
 */
export const serializeCharacter = (
	character: Character,
	playerId: string,
	playerEmail?: string | null,
) => ({
	id: character.id,
	player_id: playerId,
	player_email: playerEmail || null,
	name: character.name,
	level: character.level,
	race: character.race,
	class: character.class,
	description: character.description || null,
	trait: character.trait || '', // Database requires NOT NULL, default to empty string
	stats: JSON.stringify(character.stats),
	skills: JSON.stringify(character.skills || []),
	inventory: JSON.stringify(character.inventory || []),
	equipped: JSON.stringify(character.equipped || {}),
	health: character.health,
	max_health: character.maxHealth,
	action_points: character.actionPoints,
	max_action_points: character.maxActionPoints,
	status_effects: JSON.stringify(character.statusEffects || []),
});

/**
 * Deserialize a database character row to Character object
 * @param row - Character row from database
 * @returns Deserialized Character object
 */
export const deserializeCharacter = (row: CharacterRow): Character => ({
	id: row.id,
	level: row.level,
	race: row.race,
	name: row.name,
	class: row.class,
	description: row.description || undefined,
	trait: row.trait || undefined,
	stats: JSON.parse(row.stats),
	skills: JSON.parse(row.skills || '[]'),
	inventory: JSON.parse(row.inventory || '[]'),
	equipped: JSON.parse(row.equipped || '{}'),
	health: row.health,
	maxHealth: row.max_health,
	actionPoints: row.action_points,
	maxActionPoints: row.max_action_points,
	statusEffects: JSON.parse(row.status_effects || '[]'),
});

/**
 * Parse quest data from JSON string with defaults
 * @param questJson - JSON string containing quest data
 * @returns Parsed Quest object
 * @throws Error if JSON parsing fails
 */
export const parseQuestData = (questJson: string): Quest => {
	try {
		const parsed = JSON.parse(questJson);
		return {
			...parsed,
			objectives: parsed.objectives ?? [],
			createdAt: parsed.createdAt ?? Date.now(),
		} as Quest;
	} catch (error) {
		console.error('Failed to parse quest data:', error);
		throw error;
	}
};

/**
 * Convert a game row to a game summary object
 * @param game - Game row from database
 * @returns Game summary object
 */
export const toGameSummary = (game: GameRow) => ({
	id: game.id,
	inviteCode: game.invite_code,
	status: game.status,
	hostId: game.host_id,
	hostEmail: game.host_email,
	world: game.world,
	startingArea: game.starting_area,
	quest: parseQuestData(game.quest_data),
	currentMapId: game.current_map_id,
	createdAt: game.created_at,
	updatedAt: game.updated_at,
});


