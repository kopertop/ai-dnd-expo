import { MapState } from '@/types/multiplayer-map';

export type TerrainCostTable = Record<string, number>;

export const DEFAULT_TERRAIN_COSTS: TerrainCostTable = {
        water: Infinity,
        mountain: Infinity,
        road: 0.5,
        grass: 1,
        sand: 1.5,
        desert: 1.5,
        stone: 1,
        dirt: 1,
        mud: 2,
        forest: 2,
        swamp: 2.5,
        default: 1.5,
};

const normalizeTerrain = (terrain?: string) => terrain?.trim().toLowerCase() || 'default';

const getTerrainAt = (map: MapState, x: number, y: number): string => {
        const row = map.terrain?.[y];
        const cell = row?.[x];
        return cell?.terrain ?? map.defaultTerrain ?? 'stone';
};

const terrainCost = (terrain: string, costs: TerrainCostTable) => {
        const normalized = normalizeTerrain(terrain);
        return typeof costs[normalized] === 'number' ? costs[normalized] : costs.default ?? 1;
};

const neighbors = (x: number, y: number, map: MapState) => {
        const coords = [
                [x + 1, y],
                [x - 1, y],
                [x, y + 1],
                [x, y - 1],
        ];

        return coords.filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < map.width && ny < map.height);
};

export interface MovementResult {
        reachable: Map<string, number>;
}

export const calculateMovementRange = (
        map: MapState,
        start: { x: number; y: number },
        maxCost: number,
        costs: TerrainCostTable = DEFAULT_TERRAIN_COSTS,
): MovementResult => {
        const frontier: Array<{ x: number; y: number; cost: number }> = [{ x: start.x, y: start.y, cost: 0 }];
        const visited = new Map<string, number>();

        while (frontier.length > 0) {
                const current = frontier.shift();
                if (!current) break;

                const key = `${current.x},${current.y}`;
                if (visited.has(key) && (visited.get(key) ?? Infinity) <= current.cost) {
                        continue;
                }

                visited.set(key, current.cost);

                for (const [nx, ny] of neighbors(current.x, current.y, map)) {
                        const terrain = getTerrainAt(map, nx, ny);
                        const stepCost = terrainCost(terrain, costs);
                        const nextCost = current.cost + stepCost;

                        if (nextCost > maxCost || !Number.isFinite(stepCost)) {
                                continue;
                        }

                        const neighborKey = `${nx},${ny}`;
                        const prevCost = visited.get(neighborKey) ?? Infinity;
                        if (nextCost < prevCost) {
                                frontier.push({ x: nx, y: ny, cost: nextCost });
                        }
                }

                frontier.sort((a, b) => a.cost - b.cost);
        }

        return { reachable: visited };
};

export interface PathResult {
        path: Array<{ x: number; y: number }>;
        cost: number;
}

export const findCheapestPath = (
        map: MapState,
        start: { x: number; y: number },
        goal: { x: number; y: number },
        costs: TerrainCostTable = DEFAULT_TERRAIN_COSTS,
): PathResult => {
        const frontier: Array<{ x: number; y: number; cost: number; path: Array<{ x: number; y: number }> }> = [
                { x: start.x, y: start.y, cost: 0, path: [start] },
        ];
        const bestCost = new Map<string, number>();

        while (frontier.length > 0) {
                frontier.sort((a, b) => a.cost - b.cost);
                const current = frontier.shift();
                if (!current) break;

                const key = `${current.x},${current.y}`;
                if ((bestCost.get(key) ?? Infinity) <= current.cost) {
                                continue;
                }

                bestCost.set(key, current.cost);

                if (current.x === goal.x && current.y === goal.y) {
                        return { path: current.path, cost: current.cost };
                }

                for (const [nx, ny] of neighbors(current.x, current.y, map)) {
                        const terrain = getTerrainAt(map, nx, ny);
                        const stepCost = terrainCost(terrain, costs);

                        if (!Number.isFinite(stepCost)) {
                                continue;
                        }

                        const nextCost = current.cost + stepCost;
                        frontier.push({
                                x: nx,
                                y: ny,
                                cost: nextCost,
                                path: [...current.path, { x: nx, y: ny }],
                        });
                }
        }

        return { path: [], cost: Infinity };
};
