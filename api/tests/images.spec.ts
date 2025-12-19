import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';

import { resetStore } from './mock-db-store';

import imageRoutes from '@/api/src/routes/images';
import type { CloudflareBindings } from '@/api/src/env';

describe('Images API', () => {
	let testUser: { id: string; email: string; name?: string | null };
	let testApp: Hono<{ Bindings: CloudflareBindings; Variables: { user: typeof testUser | null } }>;

	beforeEach(() => {
		resetStore();
		testUser = { id: 'user-1', email: 'user1@example.com', name: 'Test User' };
		testApp = new Hono<{ Bindings: CloudflareBindings; Variables: { user: typeof testUser | null } }>();

		// Mock auth middleware
		testApp.use('*', async (c, next) => {
			c.set('user', testUser);
			await next();
		});

		testApp.route('/api/images', imageRoutes);
	});

	const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
		return testApp.fetch(new Request(url, options), env as unknown as CloudflareBindings);
	};

	it('should only list images belonging to the current user', async () => {
		const db = (env as unknown as CloudflareBindings).DATABASE;

		// 1. Insert image for other user
		const otherUserId = 'user-2';
		await db.prepare(`
            INSERT INTO uploaded_images (id, user_id, filename, r2_key, public_url, title, description, image_type, is_public, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
			'img-other', otherUserId, 'secret.png', 'key-other', 'http://url', 'Secret Plan', 'Top Secret', 'npc', 1, 1000, 1000,
		).run();

		// 2. Insert image for current user
		await db.prepare(`
            INSERT INTO uploaded_images (id, user_id, filename, r2_key, public_url, title, description, image_type, is_public, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
			'img-mine', testUser.id, 'my.png', 'key-mine', 'http://url2', 'My Image', 'Mine', 'npc', 1, 2000, 2000,
		).run();

		// 3. Fetch images as testUser
		const response = await fetchWithAuth('http://localhost/api/images');
		expect(response.status).toBe(200);

		const data = await response.json() as { images: any[] };

		// 4. Assert only my image is present
		expect(data.images).toHaveLength(1);
		expect(data.images[0].id).toBe('img-mine');
		expect(data.images.find((img: any) => img.id === 'img-other')).toBeUndefined();
	});
});
