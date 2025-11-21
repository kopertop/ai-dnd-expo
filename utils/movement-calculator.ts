import { z } from 'zod';

import { MapState, TerrainCellSchema } from '@/types/multiplayer-map';

type TerrainCell = z.infer<typeof TerrainCellSchema>;

type Point = { x: number; y: number };

type ReachableTile = Point & { cost: number };

const TERRAIN_COSTS: Record<string, number> = {
        water: Infinity,
        mountain: Infinity,
        road: 0.5,
        grass: 1,
        forest: 2,
        stone: 1.5,
        sand: 1.5,
        desert: 1.5,
        mud: 2,
        swamp: 2.5,
        marsh: 2.5,
        path: 0.75,
};

const normalizeTerrainGrid = (map: MapState): TerrainCell[][] => {
        if (map.terrain && map.terrain.length === map.height) {
                return map.terrain as TerrainCell[][];
        }

        return Array.from({ length: map.height }, () =>
                Array.from({ length: map.width }, () => ({
                        terrain: map.defaultTerrain ?? 'stone',
                        fogged: false,
                } as TerrainCell)),
        );
};

const terrainCostForCell = (cell?: TerrainCell): number => {
        const normalized = cell?.terrain?.trim().toLowerCase() ?? 'grass';
        const baseCost = TERRAIN_COSTS[normalized] ?? 1;

        if (baseCost === Infinity) {
                return Infinity;
        }

        if (cell?.difficult) {
                return baseCost + 1;
        }

        return baseCost;
};

export const calculateReachableTiles = (
        map: MapState,
        start: Point,
        movementBudget: number,
): Map<string, ReachableTile> => {
        const grid = normalizeTerrainGrid(map);
        const visited = new Map<string, ReachableTile>();
        const frontier: Array<{ point: Point; cost: number }> = [{ point: start, cost: 0 }];

        const keyFor = (point: Point) => `${point.x},${point.y}`;
        visited.set(keyFor(start), { ...start, cost: 0 });
        const enqueue = (point: Point, cost: number) => {
                const key = keyFor(point);
                const current = visited.get(key);
                if (!current || cost < current.cost) {
                        visited.set(key, { ...point, cost });
                        frontier.push({ point, cost });
                }
        };

        while (frontier.length) {
                // Simple Dijkstra without a heap (maps are modestly sized)
                frontier.sort((a, b) => a.cost - b.cost);
                const next = frontier.shift();
                if (!next) {
                        continue;
                }

                const { point, cost } = next;
                const neighbors: Point[] = [
                        { x: point.x + 1, y: point.y },
                        { x: point.x - 1, y: point.y },
                        { x: point.x, y: point.y + 1 },
                        { x: point.x, y: point.y - 1 },
                ];

                neighbors.forEach(neighbor => {
                        if (neighbor.x < 0 || neighbor.y < 0 || neighbor.x >= map.width || neighbor.y >= map.height) {
                                return;
                        }

                        const stepCost = terrainCostForCell(grid[neighbor.y]?.[neighbor.x]);
                        if (stepCost === Infinity) {
                                return;
                        }

                        const total = cost + stepCost;
                        if (total <= movementBudget) {
                                enqueue(neighbor, total);
                        }
                });
        }

        return visited;
};

export const findPathWithCost = (
        map: MapState,
        start: Point,
        end: Point,
        movementBudget: number,
): { path: Point[]; cost: number } | null => {
        const grid = normalizeTerrainGrid(map);
        const keyFor = (point: Point) => `${point.x},${point.y}`;
        const frontier: Array<{ point: Point; cost: number }> = [{ point: start, cost: 0 }];
        const cameFrom = new Map<string, Point | null>([[keyFor(start), null]]);
        const costSoFar = new Map<string, number>([[keyFor(start), 0]]);

        while (frontier.length) {
                frontier.sort((a, b) => a.cost - b.cost);
                const current = frontier.shift();
                if (!current) {
                        continue;
                }

                if (keyFor(current.point) === keyFor(end)) {
                        const path: Point[] = [];
                        let cursor: Point | null | undefined = end;
                        while (cursor) {
                                path.unshift(cursor);
                                cursor = cameFrom.get(keyFor(cursor)) ?? null;
                        }

                        const totalCost = costSoFar.get(keyFor(end)) ?? Infinity;
                        if (totalCost <= movementBudget) {
                                return { path, cost: totalCost };
                        }
                        return null;
                }

                const neighbors: Point[] = [
                        { x: current.point.x + 1, y: current.point.y },
                        { x: current.point.x - 1, y: current.point.y },
                        { x: current.point.x, y: current.point.y + 1 },
                        { x: current.point.x, y: current.point.y - 1 },
                ];

                neighbors.forEach(neighbor => {
                        if (
                                neighbor.x < 0 ||
                                neighbor.y < 0 ||
                                neighbor.x >= map.width ||
                                neighbor.y >= map.height
                        ) {
                                return;
                        }

                        const stepCost = terrainCostForCell(grid[neighbor.y]?.[neighbor.x]);
                        if (stepCost === Infinity) {
                                return;
                        }

                        const newCost = (costSoFar.get(keyFor(current.point)) ?? Infinity) + stepCost;
                        if (newCost > movementBudget) {
                                return;
                        }

                        const neighborKey = keyFor(neighbor);
                        if (!costSoFar.has(neighborKey) || newCost < (costSoFar.get(neighborKey) ?? Infinity)) {
                                costSoFar.set(neighborKey, newCost);
                                cameFrom.set(neighborKey, current.point);
                                frontier.push({ point: neighbor, cost: newCost });
                        }
                });
        }

        return null;
};

export const terrainCosts = TERRAIN_COSTS;
