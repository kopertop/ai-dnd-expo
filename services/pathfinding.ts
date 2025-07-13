// @ts-nocheck
/**
 * Pathfinding Service
 * Implements A* pathfinding algorithm for smooth character movement
 */

import type { Position, MapTile } from '@/types/world-map';

export interface PathfindingNode {
	position: Position;
	gCost: number; // Distance from start
	hCost: number; // Distance to target (heuristic)
	fCost: number; // gCost + hCost
	parent: PathfindingNode | null;
	walkable: boolean;
}

export interface PathfindingResult {
	path: Position[];
	found: boolean;
	distance: number;
	cost: number;
}

export interface PathfindingOptions {
	allowDiagonal: boolean;
	maxDistance: number;
	movementCost: (from: Position, to: Position, tile: MapTile | null) => number;
	heuristicWeight: number;
}

/**
 * Default pathfinding options
 */
const DEFAULT_OPTIONS: PathfindingOptions = {
	allowDiagonal: true,
	maxDistance: 50,
	movementCost: (from, to, tile) => {
		// Basic movement cost - can be extended for terrain types
		const dx = Math.abs(to.x - from.x);
		const dy = Math.abs(to.y - from.y);
		const isDiagonal = dx === 1 && dy === 1;
		
		// Diagonal movement costs more
		let baseCost = isDiagonal ? 1.414 : 1;
		
		// Add terrain-specific costs
		if (tile) {
			switch (tile.type) {
				case 'forest': baseCost *= 1.5; break;
				case 'mountain': baseCost *= 2.0; break;
				case 'water': baseCost *= 3.0; break;
				case 'swamp': baseCost *= 2.5; break;
				default: break;
			}
		}
		
		return baseCost;
	},
	heuristicWeight: 1.0,
};

/**
 * Calculate Manhattan distance between two positions
 */
function manhattanDistance(a: Position, b: Position): number {
	return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Calculate Euclidean distance between two positions
 */
function euclideanDistance(a: Position, b: Position): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get neighboring positions
 */
function getNeighbors(position: Position, allowDiagonal: boolean): Position[] {
	const neighbors: Position[] = [];
	
	// Cardinal directions
	neighbors.push(
		{ x: position.x - 1, y: position.y },     // Left
		{ x: position.x + 1, y: position.y },     // Right
		{ x: position.x, y: position.y - 1 },     // Up
		{ x: position.x, y: position.y + 1 }      // Down
	);
	
	// Diagonal directions
	if (allowDiagonal) {
		neighbors.push(
			{ x: position.x - 1, y: position.y - 1 }, // Top-left
			{ x: position.x + 1, y: position.y - 1 }, // Top-right
			{ x: position.x - 1, y: position.y + 1 }, // Bottom-left
			{ x: position.x + 1, y: position.y + 1 }  // Bottom-right
		);
	}
	
	return neighbors;
}

/**
 * Create a pathfinding node
 */
function createNode(
	position: Position,
	gCost: number,
	hCost: number,
	parent: PathfindingNode | null,
	walkable: boolean
): PathfindingNode {
	return {
		position,
		gCost,
		hCost,
		fCost: gCost + hCost,
		parent,
		walkable,
	};
}

/**
 * Reconstruct path from goal node back to start
 */
function reconstructPath(goalNode: PathfindingNode): Position[] {
	const path: Position[] = [];
	let currentNode: PathfindingNode | null = goalNode;
	
	while (currentNode !== null) {
		path.unshift(currentNode.position);
		currentNode = currentNode.parent;
	}
	
	return path;
}

/**
 * Check if two positions are equal
 */
function positionsEqual(a: Position, b: Position): boolean {
	return a.x === b.x && a.y === b.y;
}

/**
 * Convert position to string key for maps
 */
function positionToKey(position: Position): string {
	return `${position.x},${position.y}`;
}

/**
 * A* Pathfinding Algorithm
 * Finds the optimal path between start and goal positions
 */
export function findPath(
	start: Position,
	goal: Position,
	getTile: (position: Position) => MapTile | null,
	options: Partial<PathfindingOptions> = {}
): PathfindingResult {
	const opts = { ...DEFAULT_OPTIONS, ...options };
	
	// Early exit if start equals goal
	if (positionsEqual(start, goal)) {
		return {
			path: [start],
			found: true,
			distance: 0,
			cost: 0,
		};
	}
	
	// Early exit if goal is too far
	const maxDistance = manhattanDistance(start, goal);
	if (maxDistance > opts.maxDistance) {
		return {
			path: [],
			found: false,
			distance: maxDistance,
			cost: Infinity,
		};
	}
	
	// Check if goal is walkable
	const goalTile = getTile(goal);
	if (!goalTile || !goalTile.walkable) {
		return {
			path: [],
			found: false,
			distance: maxDistance,
			cost: Infinity,
		};
	}
	
	// Initialize data structures
	const openSet: PathfindingNode[] = [];
	const closedSet = new Set<string>();
	const allNodes = new Map<string, PathfindingNode>();
	
	// Create start node
	const startNode = createNode(
		start,
		0,
		euclideanDistance(start, goal) * opts.heuristicWeight,
		null,
		true
	);
	
	openSet.push(startNode);
	allNodes.set(positionToKey(start), startNode);
	
	// Main pathfinding loop
	while (openSet.length > 0) {
		// Find node with lowest fCost
		let currentIndex = 0;
		for (let i = 1; i < openSet.length; i++) {
			if (openSet[i].fCost < openSet[currentIndex].fCost ||
				(openSet[i].fCost === openSet[currentIndex].fCost && 
				 openSet[i].hCost < openSet[currentIndex].hCost)) {
				currentIndex = i;
			}
		}
		
		const current = openSet.splice(currentIndex, 1)[0];
		closedSet.add(positionToKey(current.position));
		
		// Check if we reached the goal
		if (positionsEqual(current.position, goal)) {
			const path = reconstructPath(current);
			return {
				path,
				found: true,
				distance: path.length - 1,
				cost: current.gCost,
			};
		}
		
		// Explore neighbors
		const neighbors = getNeighbors(current.position, opts.allowDiagonal);
		
		for (const neighborPos of neighbors) {
			const neighborKey = positionToKey(neighborPos);
			
			// Skip if already processed
			if (closedSet.has(neighborKey)) {
				continue;
			}
			
			// Get tile data
			const neighborTile = getTile(neighborPos);
			if (!neighborTile || !neighborTile.walkable) {
				continue;
			}
			
			// Calculate movement cost
			const movementCost = opts.movementCost(current.position, neighborPos, neighborTile);
			const tentativeGCost = current.gCost + movementCost;
			
			// Check if this path to neighbor is better
			let neighbor = allNodes.get(neighborKey);
			
			if (!neighbor) {
				// Create new neighbor node
				neighbor = createNode(
					neighborPos,
					tentativeGCost,
					euclideanDistance(neighborPos, goal) * opts.heuristicWeight,
					current,
					true
				);
				allNodes.set(neighborKey, neighbor);
				openSet.push(neighbor);
			} else if (tentativeGCost < neighbor.gCost) {
				// Update existing neighbor with better path
				neighbor.gCost = tentativeGCost;
				neighbor.fCost = neighbor.gCost + neighbor.hCost;
				neighbor.parent = current;
				
				// Add to open set if not already there
				if (!openSet.includes(neighbor)) {
					openSet.push(neighbor);
				}
			}
		}
	}
	
	// No path found
	return {
		path: [],
		found: false,
		distance: maxDistance,
		cost: Infinity,
	};
}

/**
 * Smooth a path by removing unnecessary waypoints
 * Uses line-of-sight optimization
 */
export function smoothPath(
	path: Position[],
	getTile: (position: Position) => MapTile | null
): Position[] {
	if (path.length <= 2) {
		return path;
	}
	
	const smoothedPath: Position[] = [path[0]];
	let currentIndex = 0;
	
	while (currentIndex < path.length - 1) {
		let farthestIndex = currentIndex + 1;
		
		// Find the farthest point we can reach in a straight line
		for (let i = currentIndex + 2; i < path.length; i++) {
			if (hasLineOfSight(path[currentIndex], path[i], getTile)) {
				farthestIndex = i;
			} else {
				break;
			}
		}
		
		smoothedPath.push(path[farthestIndex]);
		currentIndex = farthestIndex;
	}
	
	return smoothedPath;
}

/**
 * Check if there's a clear line of sight between two positions
 */
function hasLineOfSight(
	start: Position,
	end: Position,
	getTile: (position: Position) => MapTile | null
): boolean {
	const dx = Math.abs(end.x - start.x);
	const dy = Math.abs(end.y - start.y);
	const steps = Math.max(dx, dy);
	
	if (steps === 0) return true;
	
	const stepX = (end.x - start.x) / steps;
	const stepY = (end.y - start.y) / steps;
	
	for (let i = 1; i < steps; i++) {
		const x = Math.round(start.x + stepX * i);
		const y = Math.round(start.y + stepY * i);
		const tile = getTile({ x, y });
		
		if (!tile || !tile.walkable) {
			return false;
		}
	}
	
	return true;
}

/**
 * Calculate path cost for a given path
 */
export function calculatePathCost(
	path: Position[],
	getTile: (position: Position) => MapTile | null,
	movementCost: PathfindingOptions['movementCost'] = DEFAULT_OPTIONS.movementCost
): number {
	if (path.length <= 1) return 0;
	
	let totalCost = 0;
	
	for (let i = 1; i < path.length; i++) {
		const from = path[i - 1];
		const to = path[i];
		const tile = getTile(to);
		totalCost += movementCost(from, to, tile);
	}
	
	return totalCost;
}

/**
 * Find the closest walkable position to a target
 */
export function findClosestWalkablePosition(
	target: Position,
	getTile: (position: Position) => MapTile | null,
	maxRadius: number = 5
): Position | null {
	// Check if target itself is walkable
	const targetTile = getTile(target);
	if (targetTile && targetTile.walkable) {
		return target;
	}
	
	// Search in expanding circles
	for (let radius = 1; radius <= maxRadius; radius++) {
		for (let dx = -radius; dx <= radius; dx++) {
			for (let dy = -radius; dy <= radius; dy++) {
				// Only check positions on the edge of the current radius
				if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
					continue;
				}
				
				const position = { x: target.x + dx, y: target.y + dy };
				const tile = getTile(position);
				
				if (tile && tile.walkable) {
					return position;
				}
			}
		}
	}
	
	return null;
}