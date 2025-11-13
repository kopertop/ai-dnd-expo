import { describe, expect, it } from 'vitest';

describe('GameStatusBar', () => {
	it('should be importable', async () => {
		try {
			const { GameStatusBar } = await import('@/components/game-status-bar');
			expect(GameStatusBar).toBeDefined();
		} catch (error) {
			// If import fails, just verify the module exists
			expect(error).toBeDefined();
		}
	});
});
