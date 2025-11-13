import { describe, expect, it } from 'vitest';
import { z } from 'zod';

describe('Zod test', () => {
	it('should use Zod', () => {
		const schema = z.object({
			name: z.string(),
			age: z.number(),
		});

		const data = { name: 'Test', age: 30 };
		const result = schema.parse(data);

		expect(result).toEqual(data);
	});
});
