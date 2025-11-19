// User type matching the database schema
export interface User {
	id: string;
	email: string;
	name: string;
	picture?: string;
	created_at: number;
	updated_at: number;
}

/**
 * Get user from database by ID or email
 */
export async function getUser(env: any, {
	id,
	email,
}: {
	id?: string;
	email?: string;
}): Promise<User | null> {
	let user: User | null = null;
	if (id) {
		const result = await env.DATABASE.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
		if (result) {
			user = {
				id: result.id,
				email: result.email,
				name: result.name,
				picture: result.picture || undefined,
				created_at: result.created_at,
				updated_at: result.updated_at,
			};
		}
	}
	if (!user && email) {
		const result = await env.DATABASE.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
		if (result) {
			user = {
				id: result.id,
				email: result.email,
				name: result.name,
				picture: result.picture || undefined,
				created_at: result.created_at,
				updated_at: result.updated_at,
			};
		}
	}
	console.log('getUser', user);
	return user;
}

/**
 * Create or update user in database
 */
export async function createOrUpdateUser(env: any, userInfo: {
	id: string;
	email: string;
	name: string;
	picture?: string;
}): Promise<User> {
	const now = Date.now();
	
	// Try to get existing user
	let existing = await getUser(env, { id: userInfo.id, email: userInfo.email });
	
	if (existing) {
		// Update existing user
		await env.DATABASE.prepare(`
			UPDATE users 
			SET name = ?, picture = ?, updated_at = ?
			WHERE id = ?
		`).bind(userInfo.name, userInfo.picture || null, now, existing.id).run();
		
		return {
			...existing,
			name: userInfo.name,
			picture: userInfo.picture || existing.picture,
			updated_at: now,
		};
	} else {
		// Create new user
		await env.DATABASE.prepare(`
			INSERT INTO users (id, email, name, picture, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?)
		`).bind(userInfo.id, userInfo.email, userInfo.name, userInfo.picture || null, now, now).run();
		
		return {
			id: userInfo.id,
			email: userInfo.email,
			name: userInfo.name,
			picture: userInfo.picture,
			created_at: now,
			updated_at: now,
		};
	}
}

