import { expect, test } from '@playwright/test';

import { setupMockGameState } from './utils/mock-game-state';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:8081';

// Preload auth storage for this origin so AuthGuard sees a session immediately
test.use({
	storageState: {
		origins: [
			{
				origin: baseURL,
				localStorage: [
					{
						name: '__E2E_BYPASS_AUTH',
						value: 'true',
					},
					{
						name: 'userSession',
						value: JSON.stringify({
							id: 'session-1',
							name: 'Test User',
							email: 'test@example.com',
							accessToken: 'fake-token',
							provider: 'google',
						}),
					},
					{
						name: 'currentUser',
						value: JSON.stringify({
							id: 'user-1',
							email: 'test@example.com',
							name: 'Test User',
						}),
					},
				],
			},
		],
	},
});

test.describe('Spell casting with mocked backend', () => {
	test('DM can open action menu and cast a spell on an adjacent NPC', async ({ page }) => {
		const getSpellCalls = await setupMockGameState(page);

		// Auto-dismiss alerts produced by React Native's Alert on web
		page.on('dialog', dialog => dialog.accept());

		// Visit login once to ensure the app scripts initialize, then inject session and reload
		await page.goto('/login');
		await page.evaluate(() => {
			(window as any).__E2E_BYPASS_AUTH = true;
			localStorage.setItem(
				'userSession',
				JSON.stringify({
					id: 'session-1',
					name: 'Test User',
					email: 'test@example.com',
					accessToken: 'fake-token',
					provider: 'google',
				}),
			);
			localStorage.setItem(
				'currentUser',
				JSON.stringify({
					id: 'user-1',
					email: 'test@example.com',
					name: 'Test User',
				}),
			);
		});
		await page.reload();

		await page.goto('/multiplayer-game?inviteCode=TEST01&hostId=host-1&playerId=player-1&token=dev-token');

		await expect(page.getByText('Shared Map')).toBeVisible();
		await expect(page.getByText('Goblin')).toBeVisible();

		// Click the NPC to open the action menu (player is adjacent, so cast spell should be available)
		await page.getByText('Goblin').click();
		await page.getByRole('button', { name: 'Cast Spell' }).click();

		// Select a spell from the selector
		await page.getByText('Magic Missile').click();

		// Verify our mock endpoint was called
		expect(getSpellCalls()).toBeGreaterThan(0);
	});
});
