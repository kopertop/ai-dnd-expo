import { expect, test } from '@playwright/test';

import { setupMockGameState } from './utils/mock-game-state';

test.describe('Spell casting with mocked backend', () => {
	test('DM can open action menu and cast a spell on an adjacent NPC', async ({ page }) => {
		const getSpellCalls = await setupMockGameState(page);

		// Auto-dismiss alerts produced by React Native's Alert on web
		page.on('dialog', dialog => dialog.accept());

		await page.goto('/multiplayer-game?inviteCode=TEST01&hostId=host-1&playerId=player-1');

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
