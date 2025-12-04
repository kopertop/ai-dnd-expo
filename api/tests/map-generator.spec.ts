import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { generateProceduralMap } from '../../shared/workers/map-generator';

describe('map generator', () => {
	let dateSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		dateSpy = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
	});

	afterEach(() => {
		dateSpy.mockRestore();
		vi.restoreAllMocks();
	});

	it('generates deterministic maps for identical seeds', () => {
		const first = generateProceduralMap({
			preset: 'forest',
			seed: 'deterministic-seed',
			width: 20,
			height: 20,
		});
		const second = generateProceduralMap({
			preset: 'forest',
			seed: 'deterministic-seed',
			width: 20,
			height: 20,
		});

		expect(first.map).toEqual(second.map);
		expect(first.tiles).toEqual(second.tiles);
	});

	it('respects dimension overrides when generating roads', () => {
		const generated = generateProceduralMap({
			preset: 'road',
			width: 18,
			height: 12,
			seed: 'road-seed',
		});

		expect(generated.map.width).toBe(18);
		expect(generated.map.height).toBe(12);
		expect(generated.tiles.length).toBeGreaterThan(0);
	});
});

