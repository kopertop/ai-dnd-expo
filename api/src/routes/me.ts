import type { Context } from 'hono';
import { Hono } from 'hono';

import type { CloudflareBindings } from '../env';

type Variables = {
	user: { id: string; email: string; name?: string | null } | null;
};

type MeContext = { Bindings: CloudflareBindings; Variables: Variables };

const me = new Hono<MeContext>();

// Get current user info
me.get('/', async (c: Context<MeContext>) => {
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

export default me;

