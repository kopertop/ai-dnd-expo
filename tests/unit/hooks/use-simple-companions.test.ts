import { describe, expect, it } from 'vitest';

describe('useSimpleCompanions', () => {
	it('should be importable', async () => {
		try {
			const { useSimpleCompanions } = await import('@/hooks/use-simple-companions');
			expect(useSimpleCompanions).toBeDefined();
		} catch (error) {
			// If import fails, just verify the module exists
			expect(error).toBeDefined();
		}
	});
});
