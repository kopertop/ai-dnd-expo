import { MapState } from '@/types/multiplayer-map';

export type Coordinate = { x: number; y: number };

export interface MovementPath {
        path: Coordinate[];
        cost: number;
}

export interface ReachableTile extends MovementPath {
        x: number;
        y: number;
}

export const TERRAIN_COSTS: Record<string, number> = {
	water: Number.POSITIVE_INFINITY,
	mountain: Number.POSITIVE_INFINITY,
	impassible: Number.POSITIVE_INFINITY,
	impassable: Number.POSITIVE_INFINITY,
	road: 0.5,
	path: 0.75,
	grass: 1,
	cobblestone: 0.8,
	stone: 1.25,
	sand: 1.5,
	forest: 2,
	swamp: 2.5,
	default: 2,
};

const normalizeTerrain = (terrain?: string) => terrain?.trim().toLowerCase() ?? 'default';

const isBlockedCell = (terrain?: string, difficult?: boolean) => {
	if (difficult) {
		return true;
	}

	const normalized = normalizeTerrain(terrain);
	return normalized === 'water' || normalized === 'mountain' || normalized === 'impassible' || normalized === 'impassable';
};

export const getTerrainCost = (cell?: { terrain?: string; difficult?: boolean }) => {
	if (!cell) {
		return TERRAIN_COSTS.default;
	}

	if (isBlockedCell(cell.terrain, cell.difficult)) {
		return Number.POSITIVE_INFINITY;
	}

	const normalized = normalizeTerrain(cell.terrain);
	return TERRAIN_COSTS[normalized] ?? TERRAIN_COSTS.default;
};

const tileKey = (x: number, y: number) => `${x}-${y}`;

const reconstructPath = (key: string, parents: Map<string, string | null>) => {
	const path: Coordinate[] = [];
	let current: string | null | undefined = key;

	while (current) {
		const [x, y] = current.split('-').map(Number);
		path.push({ x, y });
		current = parents.get(current) ?? null;
	}

	return path.reverse();
};

const getNeighbors = (map: MapState, x: number, y: number): Coordinate[] => {
	const neighbors: Coordinate[] = [];
	const deltas = [
		[1, 0],
		[-1, 0],
		[0, 1],
		[0, -1],
	];

	deltas.forEach(([dx, dy]) => {
		const nx = x + dx;
		const ny = y + dy;
		if (nx >= 0 && ny >= 0 && nx < map.width && ny < map.height) {
			neighbors.push({ x: nx, y: ny });
		}
	});

	return neighbors;
};

export const calculateMovementRange = (
	map: MapState,
	start: Coordinate,
	maxCost: number,
): ReachableTile[] => {
	const frontier: Array<{ x: number; y: number; cost: number }> = [{ ...start, cost: 0 }];
	const parents = new Map<string, string | null>();
	const costs = new Map<string, number>();

	parents.set(tileKey(start.x, start.y), null);
	costs.set(tileKey(start.x, start.y), 0);

	while (frontier.length > 0) {
		frontier.sort((a, b) => a.cost - b.cost);
		const current = frontier.shift();
		if (!current) {
			break;
		}

		for (const neighbor of getNeighbors(map, current.x, current.y)) {
			const cell = map.terrain?.[neighbor.y]?.[neighbor.x];
			const stepCost = getTerrainCost(cell);
			if (!Number.isFinite(stepCost)) {
				continue;
			}

			const newCost = (costs.get(tileKey(current.x, current.y)) ?? 0) + stepCost;
			const neighborKey = tileKey(neighbor.x, neighbor.y);
			if (newCost > maxCost || newCost >= (costs.get(neighborKey) ?? Number.POSITIVE_INFINITY)) {
				continue;
			}

			costs.set(neighborKey, newCost);
			parents.set(neighborKey, tileKey(current.x, current.y));
			frontier.push({ x: neighbor.x, y: neighbor.y, cost: newCost });
		}
	}

	return Array.from(costs.entries()).map(([key, cost]) => {
		const [x, y] = key.split('-').map(Number);
		return { x, y, cost, path: reconstructPath(key, parents) };
	});
};

export const findPathWithCosts = (
	map: MapState,
	start: Coordinate,
	end: Coordinate,
): MovementPath | null => {
	const frontier: Array<{ x: number; y: number; cost: number }> = [{ ...start, cost: 0 }];
	const parents = new Map<string, string | null>();
	const costs = new Map<string, number>();

	const targetKey = tileKey(end.x, end.y);
	parents.set(tileKey(start.x, start.y), null);
	costs.set(tileKey(start.x, start.y), 0);

	while (frontier.length > 0) {
		frontier.sort((a, b) => a.cost - b.cost);
		const current = frontier.shift();
		if (!current) {
			break;
		}

		const currentKey = tileKey(current.x, current.y);
		if (currentKey === targetKey) {
			const path = reconstructPath(currentKey, parents);
			return { path, cost: costs.get(currentKey) ?? Number.POSITIVE_INFINITY };
		}

		for (const neighbor of getNeighbors(map, current.x, current.y)) {
			const cell = map.terrain?.[neighbor.y]?.[neighbor.x];
			const stepCost = getTerrainCost(cell);
			if (!Number.isFinite(stepCost)) {
				continue;
			}

			const newCost = (costs.get(currentKey) ?? 0) + stepCost;
			const neighborKey = tileKey(neighbor.x, neighbor.y);
			if (newCost >= (costs.get(neighborKey) ?? Number.POSITIVE_INFINITY)) {
				continue;
			}

			parents.set(neighborKey, currentKey);
			costs.set(neighborKey, newCost);
			frontier.push({ x: neighbor.x, y: neighbor.y, cost: newCost });
		}
	}

	return null;
};

/**
 * Calculate Manhattan distance between two tiles
 */
export const calculateDistance = (a: Coordinate, b: Coordinate): number => {
	return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

/**
 * Check if target is in melee range (1 tile)
 */
export const isInMeleeRange = (from: Coordinate, to: Coordinate): boolean => {
	return calculateDistance(from, to) <= 1;
};

/**
 * Check if target is in ranged range (default 5 tiles, or custom range)
 */
export const isInRangedRange = (from: Coordinate, to: Coordinate, range: number = 5): boolean => {
	return calculateDistance(from, to) <= range;
};

/**
 * Check if target is in spell range (default 5 tiles, or custom range)
 */
export const isInSpellRange = (from: Coordinate, to: Coordinate, range: number = 5): boolean => {
	return calculateDistance(from, to) <= range;
};
