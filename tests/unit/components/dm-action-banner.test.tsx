import React from 'react';
import { describe, expect, it } from 'vitest';

import { DMActionBanner } from '@/components/dm-action-banner';

describe('DMActionBanner', () => {
	it('renders when visible', () => {
		const element = DMActionBanner({ visible: true, message: 'DM is acting' });
		expect(element).not.toBeNull();
	});

	it('hides when not visible', () => {
		const element = DMActionBanner({ visible: false });
		expect(element).toBeNull();
	});
});
