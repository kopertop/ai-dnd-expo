import gameRoutes from '@/api/src/routes/games';
import { describe, it, expect } from 'vitest';

describe('Game Routes Import', () => {
    it('should import', () => {
        expect(gameRoutes).toBeDefined();
    });
});
