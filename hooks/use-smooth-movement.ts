// @ts-nocheck
/**
 * Smooth Movement Hook
 * Integrates pathfinding and animation for enhanced character movement
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { findPath, smoothPath, findClosestWalkablePosition } from '@/services/pathfinding';
import { movementAnimationManager, type MovementAnimationOptions } from '@/services/movement-animation';
import type { Position, MapTile } from '@/types/world-map';

export interface SmoothMovementState {
	isMoving: boolean;
	currentPosition: Position;
	targetPosition: Position | null;
	currentPath: Position[];
	animationProgress: number;
	facingDirection: number;
	movementQueue: Position[];
	isPathfinding: boolean;
	pathfindingError: string | null;
}

export interface SmoothMovementOptions {
	characterId: string;
	initialPosition: Position;
	getTile: (position: Position) => MapTile | null;
	onPositionUpdate?: (position: Position) => void;
	onMovementComplete?: (finalPosition: Position) => void;
	onPathfindingFailed?: (target: Position, error: string) => void;
	animationOptions?: Partial<MovementAnimationOptions>;
}

export interface SmoothMovementControls {
	// Movement commands
	moveTo: (target: Position) => Promise<boolean>;
	moveToImmediate: (target: Position) => void;
	queueMovement: (target: Position) => void;
	
	// Path preview
	previewPath: (target: Position) => Position[] | null;
	
	// Animation controls
	stopMovement: () => void;
	pauseMovement: () => void;
	resumeMovement: () => void;
	
	// Utility
	canMoveTo: (target: Position) => boolean;
	getMovementCost: (target: Position) => number;
	clearMovementQueue: () => void;
}

/**
 * Hook for smooth character movement with pathfinding
 */
export function useSmoothMovement(options: SmoothMovementOptions): [SmoothMovementState, SmoothMovementControls] {
	const {
		characterId,
		initialPosition,
		getTile,
		onPositionUpdate,
		onMovementComplete,
		onPathfindingFailed,
		animationOptions = {},
	} = options;

	// State
	const [state, setState] = useState<SmoothMovementState>({
		isMoving: false,
		currentPosition: initialPosition,
		targetPosition: null,
		currentPath: [],
		animationProgress: 0,
		facingDirection: 0,
		movementQueue: [],
		isPathfinding: false,
		pathfindingError: null,
	});

	// Refs for stable callbacks
	const animationFrameRef = useRef<number>();
	const isPausedRef = useRef(false);

	/**
	 * Update animation frame
	 */
	const updateAnimationFrame = useCallback(() => {
		const frame = movementAnimationManager.getAnimationFrame(characterId);
		
		if (frame) {
			setState(prev => ({
				...prev,
				currentPosition: frame.position,
				facingDirection: frame.facing,
				animationProgress: prev.currentPath.length > 0 ? 
					(prev.currentPath.length - 1) / Math.max(1, prev.currentPath.length - 1) : 0,
			}));
			
			onPositionUpdate?.(frame.position);
			
			if (frame.isMoving) {
				animationFrameRef.current = requestAnimationFrame(updateAnimationFrame);
			} else {
				// Animation complete
				setState(prev => {
					const finalPosition = prev.currentPath[prev.currentPath.length - 1] || prev.currentPosition;
					return {
						...prev,
						isMoving: false,
						currentPosition: finalPosition,
						targetPosition: null,
						currentPath: [],
						animationProgress: 1,
					};
				});
				
				onMovementComplete?.(frame.position);
				
				// Process next queued movement
				processMovementQueue();
			}
		}
	}, [characterId, onPositionUpdate, onMovementComplete]);

	/**
	 * Process movement queue
	 */
	const processMovementQueue = useCallback(() => {
		setState(prev => {
			if (prev.movementQueue.length > 0 && !prev.isMoving) {
				const nextTarget = prev.movementQueue[0];
				const remainingQueue = prev.movementQueue.slice(1);
				
				// Start movement to next target
				setTimeout(() => moveTo(nextTarget), 50);
				
				return {
					...prev,
					movementQueue: remainingQueue,
				};
			}
			return prev;
		});
	}, []);

	/**
	 * Move to target position with pathfinding
	 */
	const moveTo = useCallback(async (target: Position): Promise<boolean> => {
		if (isPausedRef.current) return false;
		
		setState(prev => ({
			...prev,
			isPathfinding: true,
			pathfindingError: null,
		}));

		try {
			// Find closest walkable position if target is not walkable
			let actualTarget = target;
			const targetTile = getTile(target);
			
			if (!targetTile || !targetTile.walkable) {
				const closestWalkable = findClosestWalkablePosition(target, getTile);
				if (!closestWalkable) {
					setState(prev => ({
						...prev,
						isPathfinding: false,
						pathfindingError: 'No walkable path to target',
					}));
					onPathfindingFailed?.(target, 'Target position is not walkable');
					return false;
				}
				actualTarget = closestWalkable;
			}

			// Find path using A* algorithm
			const pathResult = findPath(state.currentPosition, actualTarget, getTile, {
				allowDiagonal: true,
				maxDistance: 50,
			});

			if (!pathResult.found || pathResult.path.length <= 1) {
				setState(prev => ({
					...prev,
					isPathfinding: false,
					pathfindingError: 'No path found to target',
				}));
				onPathfindingFailed?.(target, 'No path found');
				return false;
			}

			// Smooth the path to remove unnecessary waypoints
			const smoothedPath = smoothPath(pathResult.path, getTile);

			// Update state
			setState(prev => ({
				...prev,
				isMoving: true,
				targetPosition: actualTarget,
				currentPath: smoothedPath,
				isPathfinding: false,
				pathfindingError: null,
			}));

			// Start animation
			movementAnimationManager.startAnimation(
				characterId,
				smoothedPath,
				{
					...animationOptions,
					onComplete: () => {
						// Animation will be handled in updateAnimationFrame
					},
				}
			);

			// Start animation frame updates
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
			animationFrameRef.current = requestAnimationFrame(updateAnimationFrame);

			return true;
		} catch (error) {
			setState(prev => ({
				...prev,
				isPathfinding: false,
				pathfindingError: error instanceof Error ? error.message : 'Unknown pathfinding error',
			}));
			onPathfindingFailed?.(target, error instanceof Error ? error.message : 'Unknown error');
			return false;
		}
	}, [state.currentPosition, getTile, characterId, animationOptions, onPathfindingFailed, updateAnimationFrame]);

	/**
	 * Move to position immediately without animation
	 */
	const moveToImmediate = useCallback((target: Position) => {
		// Stop any current animation
		stopMovement();
		
		setState(prev => ({
			...prev,
			currentPosition: target,
			targetPosition: null,
			currentPath: [],
			isMoving: false,
			animationProgress: 0,
		}));
		
		onPositionUpdate?.(target);
		onMovementComplete?.(target);
	}, [onPositionUpdate, onMovementComplete]);

	/**
	 * Add movement to queue
	 */
	const queueMovement = useCallback((target: Position) => {
		setState(prev => ({
			...prev,
			movementQueue: [...prev.movementQueue, target],
		}));
	}, []);

	/**
	 * Preview path to target without moving
	 */
	const previewPath = useCallback((target: Position): Position[] | null => {
		try {
			const pathResult = findPath(state.currentPosition, target, getTile, {
				allowDiagonal: true,
				maxDistance: 50,
			});
			
			if (pathResult.found) {
				return smoothPath(pathResult.path, getTile);
			}
		} catch (error) {
			console.warn('Path preview failed:', error);
		}
		
		return null;
	}, [state.currentPosition, getTile]);

	/**
	 * Stop current movement
	 */
	const stopMovement = useCallback(() => {
		movementAnimationManager.stopAnimation(characterId);
		
		if (animationFrameRef.current) {
			cancelAnimationFrame(animationFrameRef.current);
			animationFrameRef.current = undefined;
		}
		
		setState(prev => ({
			...prev,
			isMoving: false,
			targetPosition: null,
			currentPath: [],
			movementQueue: [],
		}));
	}, [characterId]);

	/**
	 * Pause movement
	 */
	const pauseMovement = useCallback(() => {
		isPausedRef.current = true;
		
		if (animationFrameRef.current) {
			cancelAnimationFrame(animationFrameRef.current);
			animationFrameRef.current = undefined;
		}
	}, []);

	/**
	 * Resume movement
	 */
	const resumeMovement = useCallback(() => {
		isPausedRef.current = false;
		
		if (state.isMoving && !animationFrameRef.current) {
			animationFrameRef.current = requestAnimationFrame(updateAnimationFrame);
		}
	}, [state.isMoving, updateAnimationFrame]);

	/**
	 * Check if can move to position
	 */
	const canMoveTo = useCallback((target: Position): boolean => {
		const tile = getTile(target);
		return tile ? tile.walkable : false;
	}, [getTile]);

	/**
	 * Get movement cost to target
	 */
	const getMovementCost = useCallback((target: Position): number => {
		try {
			const pathResult = findPath(state.currentPosition, target, getTile, {
				allowDiagonal: true,
				maxDistance: 50,
			});
			
			return pathResult.found ? pathResult.cost : Infinity;
		} catch (error) {
			return Infinity;
		}
	}, [state.currentPosition, getTile]);

	/**
	 * Clear movement queue
	 */
	const clearMovementQueue = useCallback(() => {
		setState(prev => ({
			...prev,
			movementQueue: [],
		}));
	}, []);

	/**
	 * Cleanup on unmount
	 */
	useEffect(() => {
		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
			movementAnimationManager.stopAnimation(characterId);
		};
	}, [characterId]);

	/**
	 * Update position when initialPosition changes
	 */
	useEffect(() => {
		setState(prev => ({
			...prev,
			currentPosition: initialPosition,
		}));
	}, [initialPosition]);

	const controls: SmoothMovementControls = {
		moveTo,
		moveToImmediate,
		queueMovement,
		previewPath,
		stopMovement,
		pauseMovement,
		resumeMovement,
		canMoveTo,
		getMovementCost,
		clearMovementQueue,
	};

	return [state, controls];
}