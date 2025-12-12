import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from './apply-migrations';

import type { CloudflareBindings } from '@/api/src/env';
import worldsRoutes from '@/api/src/routes/worlds';
import { User } from '@/types/models';

describe('Worlds API', () => {
	let adminUser: User;
	let regularUser: User;
	let testApp: Hono<{ Bindings: CloudflareBindings; Variables: { user: User | null } }>;

	beforeEach(async () => {
		adminUser = {
			id: 'admin-1',
			email: 'admin@example.com',
			name: 'Admin User',
			is_admin: true,
			created_at: Date.now(),
			updated_at: Date.now(),
		};

		regularUser = {
			id: 'user-1',
			email: 'user@example.com',
			name: 'Regular User',
			is_admin: false,
			created_at: Date.now(),
			updated_at: Date.now(),
		};

		testApp = new Hono<{ Bindings: CloudflareBindings; Variables: { user: User | null } }>();
		testApp.use('*', async (c, next) => {
			const authHeader = c.req.header('X-Test-User');
			if (authHeader === 'admin') {
				c.set('user', adminUser);
			} else if (authHeader === 'user') {
				c.set('user', regularUser);
			} else {
				c.set('user', null);
			}
			await next();
		});
		testApp.route('/api/worlds', worldsRoutes);

		const db = (env as CloudflareBindings).DATABASE;
		await applyMigrations(db);
	});

	const fetchWithAuth = async (url: string, options: RequestInit = {}, userRole: 'admin' | 'user' | 'none' = 'none') => {
		const headers = new Headers(options.headers);
		if (userRole !== 'none') {
			headers.set('X-Test-User', userRole);
		}
		return testApp.fetch(new Request(url, { ...options, headers }), env as CloudflareBindings);
	};

	describe('POST /api/worlds', () => {
		it('allows admin to create a world', async () => {
			const response = await fetchWithAuth(
				'http://localhost/api/worlds',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'New World',
						slug: 'new-world',
						description: 'A test world',
						is_public: true,
					}),
				},
				'admin',
			);

			expect(response.status).toBe(200);
			const data = (await response.json()) as { success: boolean; id: string };
			expect(data.success).toBe(true);
			expect(data.id).toBeDefined();
		});

		it('forbids regular user from creating a world', async () => {
			const response = await fetchWithAuth(
				'http://localhost/api/worlds',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Hacked World',
						slug: 'hacked-world',
					}),
				},
				'user',
			);

			expect(response.status).toBe(403);
			const data = (await response.json()) as { error: string };
			expect(data.error).toContain('Forbidden');
		});

		it('requires authentication', async () => {
			const response = await fetchWithAuth(
				'http://localhost/api/worlds',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Anon World',
						slug: 'anon-world',
					}),
				},
				'none',
			);

			expect(response.status).toBe(401);
		});
	});

	describe('DELETE /api/worlds/:id', () => {
		it('allows admin to delete a world', async () => {
			// First create a world as admin
			const createResponse = await fetchWithAuth(
				'http://localhost/api/worlds',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Delete Me',
						slug: 'delete-me',
					}),
				},
				'admin',
			);
			const createData = (await createResponse.json()) as { id: string };
			const worldId = createData.id;

			// Delete it
			const deleteResponse = await fetchWithAuth(
				`http://localhost/api/worlds/${worldId}`,
				{
					method: 'DELETE',
				},
				'admin',
			);

			expect(deleteResponse.status).toBe(200);
			const data = (await deleteResponse.json()) as { success: boolean };
			expect(data.success).toBe(true);
		});

		it('forbids regular user from deleting a world', async () => {
			// First create a world as admin
			const createResponse = await fetchWithAuth(
				'http://localhost/api/worlds',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Protected World',
						slug: 'protected-world',
					}),
				},
				'admin',
			);
			const createData = (await createResponse.json()) as { id: string };
			const worldId = createData.id;

			// Try delete as regular user
			const deleteResponse = await fetchWithAuth(
				`http://localhost/api/worlds/${worldId}`,
				{
					method: 'DELETE',
				},
				'user',
			);

			expect(deleteResponse.status).toBe(403);
		});
	});

	afterEach(async () => {
		const db = (env as CloudflareBindings).DATABASE;
		const tables = await db.prepare('SELECT name FROM sqlite_master WHERE type = "table" AND name NOT LIKE "sqlite_%" AND name NOT LIKE "_%"').all<{ name: string }>();
		for (const table of tables.results) {
			await db.exec(`DELETE FROM "${table.name}"`);
		}
	});
});
