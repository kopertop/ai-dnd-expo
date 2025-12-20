import type { Context } from 'hono';
import { Hono } from 'hono';

import type { HonoContext } from '../env';

const me = new Hono<HonoContext>();

// Get current user info
me.get('/', async (c: Context<HonoContext>) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	try {
		// Get full user record from database
		const result = await c.env.DATABASE.prepare(`
			SELECT * FROM users WHERE id = ?
		`).bind(user.id).first();

		if (!result) {
			return c.json({ error: 'User not found' }, 404);
		}

		return c.json({
			id: result.id,
			email: result.email,
			name: result.name,
			picture: result.picture || undefined,
			created_at: result.created_at,
			updated_at: result.updated_at,
			is_admin: result.is_admin === 1,
		});
	} catch (error) {
		console.error('Error fetching user:', error);
		return c.json({ error: 'Failed to fetch user' }, 500);
	}
});

// Update current user profile
me.patch('/', async (c: Context<HonoContext>) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	try {
		const body = await c.req.json() as { picture?: string; name?: string };
		const updates: Record<string, string> = {};
		const now = Date.now();

		if (body.picture !== undefined) {
			updates.picture = body.picture || '';
		}
		if (body.name !== undefined) {
			updates.name = body.name;
		}

		if (Object.keys(updates).length === 0) {
			return c.json({ error: 'No fields to update' }, 400);
		}

		// Build update query with safe field names (only allow known fields)
		const allowedFields = ['picture', 'name'];
		const updateFields: string[] = [];
		const updateValues: (string | number)[] = [];

		if (updates.picture !== undefined && allowedFields.includes('picture')) {
			updateFields.push('picture = ?');
			updateValues.push(updates.picture);
		}
		if (updates.name !== undefined && allowedFields.includes('name')) {
			updateFields.push('name = ?');
			updateValues.push(updates.name);
		}

		if (updateFields.length === 0) {
			return c.json({ error: 'No valid fields to update' }, 400);
		}

		updateFields.push('updated_at = ?');
		updateValues.push(now, user.id);

		await c.env.DATABASE.prepare(`
			UPDATE users
			SET ${updateFields.join(', ')}
			WHERE id = ?
		`).bind(...updateValues).run();

		// Fetch updated user
		const result = await c.env.DATABASE.prepare(`
			SELECT * FROM users WHERE id = ?
		`).bind(user.id).first();

		if (!result) {
			return c.json({ error: 'User not found' }, 404);
		}

		return c.json({
			id: result.id,
			email: result.email,
			name: result.name,
			picture: result.picture || undefined,
			created_at: result.created_at,
			updated_at: result.updated_at,
			is_admin: result.is_admin === 1,
		});
	} catch (error) {
		console.error('Error updating user:', error);
		return c.json({ error: 'Failed to update user' }, 500);
	}
});

export default me;

