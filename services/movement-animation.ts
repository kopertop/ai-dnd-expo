/**
 * Movement Animation Service
 * Handles smooth character movement animations along paths
 */

import type { Position } from '@/types/world-map';

export interface MovementAnimation {
	id: string;
	characterId: string;
	path: Position[];
	currentSegment: number;
	progress: number; // 0-1 progress through current segment
	speed: number; // tiles per second
	startTime: number;
	duration: number; // total animation duration in ms
	isComplete: boolean;
	onComplete?: () => void;
	onSegmentComplete?: (segment: number) => void;
}

export interface AnimationFrame {
	position: Position;
	facing: number; // 0-7 (8 directions)
	isMoving: boolean;
}

export interface MovementAnimationOptions {
	speed: number; // tiles per second
	easing: 'linear' | 'ease-out' | 'ease-in-out';
	pauseBetweenSegments: number; // ms pause between path segments
	onComplete?: () => void;
	onSegmentComplete?: (segment: number) => void;
}

/**
 * Default movement animation options
 */
const DEFAULT_OPTIONS: MovementAnimationOptions = {
	speed: 3.0, // 3 tiles per second
	easing: 'ease-out',
	pauseBetweenSegments: 100,
};

/**
 * Calculate facing direction between two positions
 * Returns 0-7 representing 8 directions (0=North, 1=NE, 2=East, etc.)
 */
function calculateFacing(from: Position, to: Position): number {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	
	if (dx === 0 && dy === 0) return 0; // No movement
	
	// Calculate angle in degrees
	const angle = Math.atan2(dy, dx) * (180 / Math.PI);
	
	// Convert to 8-direction facing (0-7)
	// 0=North, 1=Northeast, 2=East, 3=Southeast, 4=South, 5=Southwest, 6=West, 7=Northwest
	const normalized = ((angle + 90 + 360) % 360) / 45;
	return Math.round(normalized) % 8;
}

/**
 * Apply easing function to progress value
 */
function applyEasing(progress: number, easing: MovementAnimationOptions['easing']): number {
	switch (easing) {
	case 'ease-out':
		return 1 - Math.pow(1 - progress, 3);
	case 'ease-in-out':
		return progress < 0.5 
			? 2 * progress * progress 
			: 1 - Math.pow(-2 * progress + 2, 3) / 2;
	case 'linear':
	default:
		return progress;
	}
}

/**
 * Interpolate between two positions
 */
function interpolatePosition(from: Position, to: Position, progress: number): Position {
	return {
		x: from.x + (to.x - from.x) * progress,
		y: from.y + (to.y - from.y) * progress,
	};
}

/**
 * Calculate total path distance
 */
function calculatePathDistance(path: Position[]): number {
	if (path.length <= 1) return 0;
	
	let distance = 0;
	for (let i = 1; i < path.length; i++) {
		const dx = path[i].x - path[i - 1].x;
		const dy = path[i].y - path[i - 1].y;
		distance += Math.sqrt(dx * dx + dy * dy);
	}
	
	return distance;
}

/**
 * Movement Animation Manager
 */
export class MovementAnimationManager {
	private animations = new Map<string, MovementAnimation>();
	private animationFrame: number | null = null;
	private isRunning = false;

	/**
	 * Start a new movement animation
	 */
	startAnimation(
		characterId: string,
		path: Position[],
		options: Partial<MovementAnimationOptions> = {},
	): string {
		const opts = { ...DEFAULT_OPTIONS, ...options };
		
		// Generate unique animation ID
		const id = `anim_${characterId}_${Date.now()}`;
		
		// Stop any existing animation for this character
		this.stopAnimation(characterId);
		
		// Calculate animation duration
		const distance = calculatePathDistance(path);
		const duration = (distance / opts.speed) * 1000; // Convert to milliseconds
		
		// Create animation
		const animation: MovementAnimation = {
			id,
			characterId,
			path: [...path],
			currentSegment: 0,
			progress: 0,
			speed: opts.speed,
			startTime: Date.now(),
			duration,
			isComplete: false,
			onComplete: opts.onComplete,
			onSegmentComplete: opts.onSegmentComplete,
		};
		
		this.animations.set(characterId, animation);
		
		// Start animation loop if not already running
		if (!this.isRunning) {
			this.startAnimationLoop();
		}
		
		return id;
	}

	/**
	 * Stop animation for a character
	 */
	stopAnimation(characterId: string): void {
		const animation = this.animations.get(characterId);
		if (animation) {
			this.animations.delete(characterId);
			
			// Stop animation loop if no more animations
			if (this.animations.size === 0) {
				this.stopAnimationLoop();
			}
		}
	}

	/**
	 * Get current animation frame for a character
	 */
	getAnimationFrame(characterId: string): AnimationFrame | null {
		const animation = this.animations.get(characterId);
		if (!animation || animation.isComplete) {
			return null;
		}
		
		const { path, currentSegment, progress } = animation;
		
		if (currentSegment >= path.length - 1) {
			// Animation complete
			return {
				position: path[path.length - 1],
				facing: 0,
				isMoving: false,
			};
		}
		
		const from = path[currentSegment];
		const to = path[currentSegment + 1];
		
		// Calculate current position
		const easedProgress = applyEasing(progress, 'ease-out');
		const position = interpolatePosition(from, to, easedProgress);
		
		// Calculate facing direction
		const facing = calculateFacing(from, to);
		
		return {
			position,
			facing,
			isMoving: true,
		};
	}

	/**
	 * Check if character is currently animating
	 */
	isAnimating(characterId: string): boolean {
		const animation = this.animations.get(characterId);
		return animation ? !animation.isComplete : false;
	}

	/**
	 * Get all active animations
	 */
	getActiveAnimations(): MovementAnimation[] {
		return Array.from(this.animations.values()).filter(anim => !anim.isComplete);
	}

	/**
	 * Start animation loop
	 */
	private startAnimationLoop(): void {
		if (this.isRunning) return;
		
		this.isRunning = true;
		this.animationFrame = requestAnimationFrame(this.updateAnimations.bind(this));
	}

	/**
	 * Stop animation loop
	 */
	private stopAnimationLoop(): void {
		this.isRunning = false;
		
		if (this.animationFrame !== null) {
			cancelAnimationFrame(this.animationFrame);
			this.animationFrame = null;
		}
	}

	/**
	 * Update all animations
	 */
	private updateAnimations(): void {
		if (!this.isRunning) return;
		
		const currentTime = Date.now();
		const completedAnimations: string[] = [];
		
		for (const [characterId, animation] of this.animations) {
			if (animation.isComplete) {
				completedAnimations.push(characterId);
				continue;
			}
			
			this.updateAnimation(animation, currentTime);
			
			if (animation.isComplete) {
				completedAnimations.push(characterId);
				animation.onComplete?.();
			}
		}
		
		// Clean up completed animations
		for (const characterId of completedAnimations) {
			this.animations.delete(characterId);
		}
		
		// Continue animation loop if there are active animations
		if (this.animations.size > 0) {
			this.animationFrame = requestAnimationFrame(this.updateAnimations.bind(this));
		} else {
			this.stopAnimationLoop();
		}
	}

	/**
	 * Update a single animation
	 */
	private updateAnimation(animation: MovementAnimation, currentTime: number): void {
		const { path, startTime, speed } = animation;
		
		if (path.length <= 1) {
			animation.isComplete = true;
			return;
		}
		
		const elapsed = currentTime - startTime;
		const totalDistance = calculatePathDistance(path);
		const targetProgress = (elapsed / 1000) * speed / totalDistance;
		
		// Find which segment we're on
		let accumulatedDistance = 0;
		let currentSegment = 0;
		
		for (let i = 1; i < path.length; i++) {
			const segmentStart = path[i - 1];
			const segmentEnd = path[i];
			const dx = segmentEnd.x - segmentStart.x;
			const dy = segmentEnd.y - segmentStart.y;
			const segmentDistance = Math.sqrt(dx * dx + dy * dy);
			
			const segmentStartProgress = accumulatedDistance / totalDistance;
			const segmentEndProgress = (accumulatedDistance + segmentDistance) / totalDistance;
			
			if (targetProgress >= segmentStartProgress && targetProgress <= segmentEndProgress) {
				// We're in this segment
				currentSegment = i - 1;
				const segmentProgress = (targetProgress - segmentStartProgress) / (segmentEndProgress - segmentStartProgress);
				animation.progress = Math.max(0, Math.min(1, segmentProgress));
				break;
			}
			
			accumulatedDistance += segmentDistance;
		}
		
		// Check if we moved to a new segment
		if (currentSegment !== animation.currentSegment) {
			animation.onSegmentComplete?.(animation.currentSegment);
			animation.currentSegment = currentSegment;
		}
		
		// Check if animation is complete
		if (targetProgress >= 1) {
			animation.currentSegment = path.length - 1;
			animation.progress = 1;
			animation.isComplete = true;
		} else {
			animation.currentSegment = currentSegment;
		}
	}

	/**
	 * Clean up all animations
	 */
	dispose(): void {
		this.stopAnimationLoop();
		this.animations.clear();
	}
}

/**
 * Create a singleton instance
 */
export const movementAnimationManager = new MovementAnimationManager();