import { User } from 'expo-auth-template/backend';
import { Hono } from 'hono';

import type { CloudflareBindings } from '../env';

import {
	createId,
	deserializeCharacter,
	serializeCharacter,
} from '@/api/src/utils/games-utils';
import { createDatabase } from '@/api/src/utils/repository';
import { Character } from '@/types/character';
import {
	addStartingEquipmentToCharacter,
	needsStartingEquipment,
} from '@/utils/starting-equipment';

type Variables = {
	user: User | null;
};

type CharactersContext = { Bindings: CloudflareBindings; Variables: Variables };

const characters = new Hono<CharactersContext>();

/**
 * List user's characters
 * GET /api/characters
 *
 * Returns all characters owned by the authenticated user.
 *
 * @returns Object with characters array
 */
characters.get('/', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const db = createDatabase(c.env);
	const characterRows = await db.getCharactersByPlayerIdentity(user.id, user.email);

	// Use map to de-duplicate characters that match both ID and email
	const deduped = new Map<string, Character>();
	for (const row of characterRows) {
		deduped.set(row.id, deserializeCharacter(row));
	}

	return c.json({ characters: Array.from(deduped.values()) });
});

/**
 * Create a new character
 * POST /api/characters
 *
 * Creates a new character for the authenticated user.
 *
 * @returns Object with created character
 */
characters.post('/', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const payload = (await c.req.json()) as Character;
	const characterId = payload.id || createId('char');
	const db = createDatabase(c.env);
	const serialized = serializeCharacter(
		{ ...payload, id: characterId },
		user.id,
		user.email,
	);
	await db.createCharacter(serialized);
	const saved = await db.getCharacterById(characterId);
	return c.json({ character: saved ? deserializeCharacter(saved) : payload });
});

/**
 * Get a single character
 * GET /api/characters/:id
 *
 * Returns the requested character if the authenticated user owns it.
 */
characters.get('/:id', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const characterId = c.req.param('id');
	const db = createDatabase(c.env);
	const existing = await db.getCharacterById(characterId);

	if (!existing) {
		return c.json({ error: 'Character not found' }, 404);
	}

	if (
		existing.player_id !== user.id &&
		existing.player_email !== user.email &&
		!user.isAdmin
	) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	return c.json({ character: deserializeCharacter(existing) });
});

/**
 * Update a character
 * PUT /api/characters/:id
 *
 * Updates an existing character. User must own the character.
 *
 * @returns Object with updated character
 */
characters.put('/:id', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const characterId = c.req.param('id');
	const updates = (await c.req.json()) as Partial<Character>;
	const db = createDatabase(c.env);
	const existing = await db.getCharacterById(characterId);

	if (!existing) {
		return c.json({ error: 'Character not found' }, 404);
	}

	if (
		existing.player_id !== user.id
		&& existing.player_email !== user.email
		&& !user.isAdmin
	) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const updatedCharacter = { ...deserializeCharacter(existing), ...updates, id: characterId };
	const serializedUpdate = serializeCharacter(
		updatedCharacter,
		existing.player_id || user.id,
		existing.player_email || user.email,
	);
	await db.updateCharacter(characterId, serializedUpdate);
	const updated = await db.getCharacterById(characterId);
	return c.json({ character: updated ? deserializeCharacter(updated) : updatedCharacter });
});

/**
 * Delete a character
 * DELETE /api/characters/:id
 *
 * Deletes a character. User must own the character.
 *
 * @returns Success response
 */
characters.delete('/:id', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const characterId = c.req.param('id');
	const db = createDatabase(c.env);
	const existing = await db.getCharacterById(characterId);

	if (!existing) {
		return c.json({ error: 'Character not found' }, 404);
	}

	if (
		existing.player_id !== user.id
		&& existing.player_email !== user.email
		&& !user.isAdmin
	) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	await db.deleteCharacter(characterId);
	return c.json({ ok: true });
});

/**
 * Add starting equipment to a character
 * POST /api/characters/:id/add-starting-equipment
 *
 * Adds starting equipment to a level 1 character that has no equipment.
 * User must own the character.
 *
 * @returns Object with updated character
 */
characters.post('/:id/add-starting-equipment', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const characterId = c.req.param('id');
	const db = createDatabase(c.env);
	const existing = await db.getCharacterById(characterId);

	if (!existing) {
		return c.json({ error: 'Character not found' }, 404);
	}

	if (
		existing.player_id !== user.id
		&& existing.player_email !== user.email
		&& !user.isAdmin
	) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const character = deserializeCharacter(existing);

	// Check if character needs starting equipment
	if (!needsStartingEquipment(character)) {
		return c.json(
			{
				error: 'Character does not need starting equipment. Only level 1 characters with no equipment can receive starting equipment.',
			},
			400,
		);
	}

	// Add starting equipment
	const updatedCharacter = addStartingEquipmentToCharacter(
		character,
		character.class.toLowerCase(),
		character.race.toLowerCase(),
	);

	const serializedUpdate = serializeCharacter(
		updatedCharacter,
		existing.player_id || user.id,
		existing.player_email || user.email,
	);
	await db.updateCharacter(characterId, serializedUpdate);
	const updated = await db.getCharacterById(characterId);
	return c.json({ character: updated ? deserializeCharacter(updated) : updatedCharacter });
});

export default characters;
