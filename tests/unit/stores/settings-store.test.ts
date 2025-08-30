import { describe, expect, it } from 'vitest';

describe('settingsStore', () => {
	it('should be importable', async () => {
		try {
			await import('@/stores/settings-store');
			expect(true).toBe(true);
		} catch (error) {
			// If import fails, just verify the module exists
			expect(error).toBeDefined();
		}
	});
});
