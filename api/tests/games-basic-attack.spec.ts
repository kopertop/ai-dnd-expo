import { describe, it, expect } from 'vitest';

import gameRoutes from '@/api/src/routes/games';

describe('Game Routes Import', () => {
	it('should import', () => {
		expect(gameRoutes).toBeDefined();
	});
});
