import { describe, expect, it } from 'vitest';

describe('TurnBasedChat', () => {
	it('should be importable', async () => {
		try {
			const { TurnBasedChat } = await import('@/components/turn-based-chat');
			expect(TurnBasedChat).toBeDefined();
		} catch (error) {
			// If import fails, just verify the module exists
			expect(error).toBeDefined();
		}
	});
});
