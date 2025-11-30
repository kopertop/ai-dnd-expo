import { Hono } from 'hono';

import type { CloudflareBindings } from '../env';

import {
	createId,
	deserializeCharacter,
	serializeCharacter,
} from '@/api/src/utils/games-utils';
import { Database } from '@/shared/workers/db';
import { Character } from '@/types/character';

type Variables = {
	user: { id: string; email: string; name?: string | null } | null;
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

	const db = new Database(c.env.DATABASE);
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
	const db = new Database(c.env.DATABASE);
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
	const db = new Database(c.env.DATABASE);
	const existing = await db.getCharacterById(characterId);

	if (!existing) {
		return c.json({ error: 'Character not found' }, 404);
	}

	if (existing.player_id !== user.id && existing.player_email !== user.email) {
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
	const db = new Database(c.env.DATABASE);
	const existing = await db.getCharacterById(characterId);

	if (!existing) {
		return c.json({ error: 'Character not found' }, 404);
	}

	if (existing.player_id !== user.id && existing.player_email !== user.email) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	await db.deleteCharacter(characterId);
	return c.json({ ok: true });
});

export default characters;

