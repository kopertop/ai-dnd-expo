import { describe, expect, it } from 'vitest';

import { useSimpleCompanions } from '@/hooks/use-simple-companions';

describe('Simple import test', () => {
	it('should import useSimpleCompanions', () => {
		expect(useSimpleCompanions).toBeDefined();
	});
});
