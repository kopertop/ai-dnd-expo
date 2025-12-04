export type MapGeneratorPreset = 'forest' | 'road' | 'dungeon' | 'town';

export interface MapGeneratorOptions {
	width?: number;
	height?: number;
	seed?: string;
	preset?: MapGeneratorPreset;
	name?: string;
	slug?: string;
}

export interface GeneratedMapPayload {
	map: {
		id: string;
		slug: string;
		name: string;
		description: string | null;
		width: number;
		height: number;
		default_terrain: string;
		fog_of_war: string;
		terrain_layers: string;
		metadata: string;
		generator_preset: string;
		seed: string;
		theme: string;
		biome: string;
		is_generated: number;
	};
	tiles: Array<{
		x: number;
		y: number;
		terrain_type: string;
		elevation?: number;
		is_blocked?: number;
		has_fog?: number;
		feature_type?: string | null;
		metadata?: string;
	}>;
}

type Rng = () => number;

const DEFAULT_DIMENSION = 28;

const clampSize = (value?: number) => {
	if (!value || Number.isNaN(value)) {
		return DEFAULT_DIMENSION;
	}

	return Math.max(12, Math.min(64, Math.floor(value)));
};

const normalizeSeed = (seed?: string) => {
	if (seed && seed.trim().length >= 3) {
		return seed.trim();
	}

	if (typeof globalThis.crypto?.randomUUID === 'function') {
		return globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 16);
	}

	return Math.random().toString(36).slice(2, 10);
};

const xmur3 = (str: string) => {
	let h = 1779033703 ^ str.length;
	for (let i = 0; i < str.length; i++) {
		h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
		h = (h << 13) | (h >>> 19);
	}
	return () => {
		h = Math.imul(h ^ (h >>> 16), 2246822507);
		h = Math.imul(h ^ (h >>> 13), 3266489909);
		h ^= h >>> 16;
		return h >>> 0;
	};
};

const mulberry32 = (a: number): Rng => {
	return () => {
		let t = (a += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

const buildRng = (seed: string): Rng => {
	const seedValue = xmur3(seed)();
	return mulberry32(seedValue);
};

const pushTile = (
	tiles: GeneratedMapPayload['tiles'],
	x: number,
	y: number,
	terrain: string,
	options: {
		elevation?: number;
		isBlocked?: boolean;
		hasFog?: boolean;
		featureType?: string | null;
		metadata?: Record<string, unknown>;
	} = {},
) => {
	tiles.push({
		x,
		y,
		terrain_type: terrain,
		elevation: options.elevation ?? 0,
		is_blocked: options.isBlocked ? 1 : 0,
		has_fog: options.hasFog ? 1 : 0,
		feature_type: options.featureType ?? null,
		metadata: JSON.stringify(options.metadata ?? {}),
	});
};

const buildForestTiles = (opts: { width: number; height: number; rng: Rng }) => {
	const tiles: GeneratedMapPayload['tiles'] = [];
	const treeCount = Math.floor((opts.width * opts.height) * 0.12);

	for (let i = 0; i < treeCount; i++) {
		const x = Math.floor(opts.rng() * opts.width);
		const y = Math.floor(opts.rng() * opts.height);
		pushTile(tiles, x, y, 'tree', {
			featureType: 'tree',
			isBlocked: true,
			metadata: { type: 'pine' },
		});
	}

	// Carve a winding path
	let pathX = Math.floor(opts.width / 2);
	for (let y = 0; y < opts.height; y++) {
		pushTile(tiles, pathX, y, 'road', { featureType: 'road', metadata: { variant: 'dirt' } });
		if (opts.rng() > 0.5 && pathX < opts.width - 2) {
			pathX += 1;
		} else if (opts.rng() < 0.3 && pathX > 1) {
			pathX -= 1;
		}
	}

	// Add clearing
	const clearingRadius = 3;
	const clearingX = Math.floor(opts.width * 0.7);
	const clearingY = Math.floor(opts.height * 0.3);
	for (let x = -clearingRadius; x <= clearingRadius; x++) {
		for (let y = -clearingRadius; y <= clearingRadius; y++) {
			const cx = clearingX + x;
			const cy = clearingY + y;
			if (cx >= 0 && cx < opts.width && cy >= 0 && cy < opts.height) {
				pushTile(tiles, cx, cy, 'grass', { featureType: 'clearing', metadata: { variant: 'camp' } });
			}
		}
	}

	return tiles;
};

const buildRoadTiles = (opts: { width: number; height: number }) => {
	const tiles: GeneratedMapPayload['tiles'] = [];
	const midY = Math.floor(opts.height / 2);
	for (let x = 0; x < opts.width; x++) {
		pushTile(tiles, x, midY, 'road', { featureType: 'road', metadata: { variant: 'stone' } });
		if (midY + 1 < opts.height) {
			pushTile(tiles, x, midY + 1, 'road', { featureType: 'road', metadata: { variant: 'stone' } });
		}
	}

	const midX = Math.floor(opts.width / 2);
	for (let y = 0; y < opts.height; y++) {
		pushTile(tiles, midX, y, 'road', { featureType: 'road', metadata: { variant: 'stone' } });
		if (midX + 1 < opts.width) {
			pushTile(tiles, midX + 1, y, 'road', { featureType: 'road', metadata: { variant: 'stone' } });
		}
	}

	return tiles;
};

const buildDungeonTiles = (opts: { width: number; height: number; rng: Rng }) => {
	const tiles: GeneratedMapPayload['tiles'] = [];

	// Border walls
	for (let x = 0; x < opts.width; x++) {
		pushTile(tiles, x, 0, 'wall', { isBlocked: true, featureType: 'wall' });
		pushTile(tiles, x, opts.height - 1, 'wall', { isBlocked: true, featureType: 'wall' });
	}
	for (let y = 0; y < opts.height; y++) {
		pushTile(tiles, 0, y, 'wall', { isBlocked: true, featureType: 'wall' });
		pushTile(tiles, opts.width - 1, y, 'wall', { isBlocked: true, featureType: 'wall' });
	}

	// Pillars
	for (let x = 2; x < opts.width - 2; x += 4) {
		for (let y = 2; y < opts.height - 2; y += 4) {
			pushTile(tiles, x, y, 'pillar', { isBlocked: true, featureType: 'pillar' });
		}
	}

	// Add rubble traps
	const traps = Math.floor((opts.width * opts.height) * 0.05);
	for (let i = 0; i < traps; i++) {
		const x = 1 + Math.floor(opts.rng() * (opts.width - 2));
		const y = 1 + Math.floor(opts.rng() * (opts.height - 2));
		pushTile(tiles, x, y, 'rubble', { featureType: 'trap', metadata: { type: 'spike' } });
	}

	return tiles;
};

const presetConfig: Record<MapGeneratorPreset, {
	name: string;
	defaultTerrain: Record<string, unknown>;
	fogOfWar: Record<string, unknown>;
	theme: string;
	biome: string;
	description: string;
	buildTiles: (opts: { width: number; height: number; rng: Rng }) => GeneratedMapPayload['tiles'];
}> = {
	forest: {
		name: 'Emerald Thicket',
		defaultTerrain: { type: 'grass', elevation: 0 },
		fogOfWar: { enabled: false },
		theme: 'verdant',
		biome: 'forest',
		description: 'Dense forest with winding trails and a ranger camp.',
		buildTiles: buildForestTiles,
	},
	road: {
		name: 'Crossroads',
		defaultTerrain: { type: 'grass', elevation: 0 },
		fogOfWar: { enabled: false },
		theme: 'trade',
		biome: 'plains',
		description: 'Intersecting trade roads dotted with carts and signposts.',
		buildTiles: opts => buildRoadTiles(opts),
	},
	dungeon: {
		name: 'Forgotten Vault',
		defaultTerrain: { type: 'stone', elevation: 0 },
		fogOfWar: { enabled: true },
		theme: 'dungeon',
		biome: 'underground',
		description: 'Ancient stoneworks with walls, pillars, and hidden traps.',
		buildTiles: buildDungeonTiles,
	},
	town: {
		name: 'Market Ward',
		defaultTerrain: { type: 'cobblestone', elevation: 0 },
		fogOfWar: { enabled: false },
		theme: 'urban',
		biome: 'city',
		description: 'Town sector with roads, plazas, and staging areas.',
		buildTiles: opts => {
			const tiles: GeneratedMapPayload['tiles'] = [];
			const plazaRadius = 3;
			const centerX = Math.floor(opts.width / 2);
			const centerY = Math.floor(opts.height / 2);
			for (let x = -plazaRadius; x <= plazaRadius; x++) {
				for (let y = -plazaRadius; y <= plazaRadius; y++) {
					pushTile(tiles, centerX + x, centerY + y, 'plaza', {
						featureType: 'plaza',
						metadata: { decoration: (Math.abs(x) + Math.abs(y)) % 2 === 0 ? 'banner' : 'tile' },
					});
				}
			}
			buildRoadTiles(opts).forEach(tile => tiles.push(tile));
			return tiles;
		},
	},
};

export const generateProceduralMap = (options: MapGeneratorOptions = {}): GeneratedMapPayload => {
	const preset = options.preset ?? 'forest';
	const config = presetConfig[preset];
	const seed = normalizeSeed(options.seed);
	const width = clampSize(options.width);
	const height = clampSize(options.height);
	const rng = buildRng(seed);

	const mapId = `map_${preset}_${seed}`;
	const slug = options.slug ?? `${preset}_${seed}`.toLowerCase();
	const name = options.name ?? config.name;

	const tiles = config.buildTiles({ width, height, rng });
	const metadata = {
		description: config.description,
		generatedWith: preset,
		createdAt: Date.now(),
	};

	return {
		map: {
			id: mapId,
			slug,
			name,
			description: config.description,
			width,
			height,
			default_terrain: JSON.stringify(config.defaultTerrain),
			fog_of_war: JSON.stringify(config.fogOfWar),
			terrain_layers: JSON.stringify([{ type: 'generated', preset }]),
			metadata: JSON.stringify(metadata),
			generator_preset: preset,
			seed,
			theme: config.theme,
			biome: config.biome,
			is_generated: 1,
		},
		tiles,
	};
};

