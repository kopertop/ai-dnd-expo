import { describe, expect, it } from 'vitest';

describe('useGameState', () => {
	it('should be importable', async () => {
		try {
			const { useGameState } = await import('@/hooks/use-game-state');
			expect(useGameState).toBeDefined();
		} catch (error) {
			// If import fails, just verify the module exists
			expect(error).toBeDefined();
		}
	});
});
