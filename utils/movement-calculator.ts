import { MapState } from '@/types/multiplayer-map';

export const TERRAIN_COSTS: Record<string, number> = {
        water: Infinity,
        ocean: Infinity,
        sea: Infinity,
        river: Infinity,
        lake: Infinity,
        swamp: 2,
        marsh: 2,
        road: 0.5,
        path: 0.75,
        grass: 1,
        plain: 1,
        plains: 1,
        desert: 2,
        sand: 2,
        forest: 2,
        tree: 2,
        hill: 2,
        mountain: Infinity,
        cliff: Infinity,
        impassable: Infinity,
        impassible: Infinity,
        stone: 1.5,
};

export interface MovementSearchNode {
        x: number;
        y: number;
        cost: number;
        previous?: string;
}

export interface MovementSearchResult {
        startKey: string;
        nodes: Record<string, MovementSearchNode>;
}

const keyFor = (x: number, y: number) => `${x},${y}`;

const normalizeTerrain = (terrain?: string) => terrain?.trim().toLowerCase() ?? '';

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const terrainCostForCell = (
        map: MapState,
        x: number,
        y: number,
        terrainCosts: Record<string, number>,
        difficultMultiplier: number,
) => {
        const baseTerrain = normalizeTerrain(map.terrain?.[y]?.[x]?.terrain ?? map.defaultTerrain ?? 'stone');
        const difficult = Boolean(map.terrain?.[y]?.[x]?.difficult);
        const cost = terrainCosts[baseTerrain] ?? 2;

        if (!Number.isFinite(cost)) {
                return cost;
        }

        return difficult ? cost * difficultMultiplier : cost;
};

export const calculateMovementRange = (
        map: MapState,
        start: { x: number; y: number },
        maxCost: number,
        options?: {
                allowDiagonal?: boolean;
                terrainCosts?: Record<string, number>;
                difficultMultiplier?: number;
        },
): MovementSearchResult => {
        const terrainCosts = { ...TERRAIN_COSTS, ...(options?.terrainCosts ?? {}) };
        const difficultMultiplier = options?.difficultMultiplier ?? 2;
        const nodes: Record<string, MovementSearchNode> = {};
        const queue: Array<MovementSearchNode> = [];
        const startKey = keyFor(start.x, start.y);

        const maxX = map.width - 1;
        const maxY = map.height - 1;

        const pushNode = (node: MovementSearchNode) => {
                const existing = nodes[keyFor(node.x, node.y)];
                if (!existing || node.cost < existing.cost) {
                        nodes[keyFor(node.x, node.y)] = node;
                        queue.push(node);
                }
        };

        pushNode({ ...start, cost: 0 });

        while (queue.length) {
                // simple priority by sorting queue by cost to keep implementation light-weight
                queue.sort((a, b) => a.cost - b.cost);
                const current = queue.shift();

                if (!current || current.cost > maxCost) {
                        continue;
                }

                const neighbors = options?.allowDiagonal
                        ? [
                                        [current.x - 1, current.y],
                                        [current.x + 1, current.y],
                                        [current.x, current.y - 1],
                                        [current.x, current.y + 1],
                                        [current.x - 1, current.y - 1],
                                        [current.x - 1, current.y + 1],
                                        [current.x + 1, current.y - 1],
                                        [current.x + 1, current.y + 1],
                              ]
                        : [
                                        [current.x - 1, current.y],
                                        [current.x + 1, current.y],
                                        [current.x, current.y - 1],
                                        [current.x, current.y + 1],
                              ];

                neighbors.forEach(([nx, ny]) => {
                        if (nx < 0 || ny < 0 || nx > maxX || ny > maxY) {
                                return;
                        }

                        const stepCost = terrainCostForCell(map, nx, ny, terrainCosts, difficultMultiplier);
                        if (!Number.isFinite(stepCost)) {
                                return;
                        }

                        const totalCost = current.cost + stepCost;
                        if (totalCost > maxCost + 1e-3) {
                                return;
                        }

                        pushNode({ x: nx, y: ny, cost: totalCost, previous: keyFor(current.x, current.y) });
                });
        }

        // Clamp stored costs to avoid floating point noise
        Object.values(nodes).forEach(node => {
                node.cost = clampNumber(node.cost, 0, maxCost);
        });

        return { startKey, nodes };
};

export const reconstructPath = (result: MovementSearchResult, destinationKey: string) => {
        const path: Array<{ x: number; y: number }> = [];
        let currentKey: string | undefined = destinationKey;

        while (currentKey) {
                const node = result.nodes[currentKey];
                if (!node) {
                        break;
                }

                path.unshift({ x: node.x, y: node.y });
                if (!node.previous || node.previous === currentKey) {
                        break;
                }
                currentKey = node.previous;
        }

        return path;
};

export const isTileReachable = (result: MovementSearchResult | null, x: number, y: number) => {
        if (!result) return false;
        return Boolean(result.nodes[keyFor(x, y)]);
};
