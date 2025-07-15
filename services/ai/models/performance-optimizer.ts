/**
 * Performance Optimizer for Local AI D&D Platform
 *
 * Dynamic performance mode switching, thermal throttling, and memory pressure handling
 * for optimal AI model performance based on device resource state.
 *
 * Requirements: 3.1, 3.3, 3.4
 */

import { DeviceResourceManager, ResourceEvent, ResourceUsage } from './device-resource-manager';

export type PerformanceMode = 'performance' | 'balanced' | 'quality';

export interface PerformanceProfile {
	mode: PerformanceMode;
	maxTokens: number;
	temperature: number;
	topP: number;
	batchSize: number;
	numThreads: number;
	enableGPU: boolean;
	cacheSize: number; // MB
	maxMemoryUsage: number; // MB
	inferenceTimeout: number; // ms
	description: string;
}

export interface ThrottlingState {
	isActive: boolean;
	level: 'none' | 'light' | 'moderate' | 'aggressive';
	reason: 'thermal' | 'memory' | 'cpu' | 'battery' | 'multiple';
	appliedOptimizations: string[];
	performanceReduction: number; // 0-100 percentage
}

export interface OptimizationAction {
	type: 'reduce_threads' | 'reduce_batch_size' | 'reduce_cache' | 'disable_gpu' |
	'reduce_tokens' | 'increase_timeout' | 'pause_inference' | 'emergency_stop';
	priority: number; // 1-10, higher = more important
	description: string;
	impact: 'low' | 'medium' | 'high';
	reversible: boolean;
}

export interface PerformanceMetrics {
	currentMode: PerformanceMode;
	throttlingState: ThrottlingState;
	averageInferenceTime: number; // ms
	tokensPerSecond: number;
	memoryEfficiency: number; // 0-100
	thermalEfficiency: number; // 0-100
	batteryEfficiency: number; // 0-100
	overallScore: number; // 0-100
	uptime: number; // ms since last optimization
}

export interface OptimizationConfig {
	enableAutoOptimization: boolean;
	enableThermalThrottling: boolean;
	enableMemoryOptimization: boolean;
	enableBatteryOptimization: boolean;
	aggressiveOptimization: boolean;
	optimizationInterval: number; // ms
	thermalThresholds: {
		lightThrottling: number; // °C
		moderateThrottling: number; // °C
		aggressiveThrottling: number; // °C
	};
	memoryThresholds: {
		lightOptimization: number; // percentage
		moderateOptimization: number; // percentage
		aggressiveOptimization: number; // percentage
	};
	batteryThresholds: {
		enableOptimization: number; // percentage
		aggressiveOptimization: number; // percentage
	};
}

export type OptimizationEventCallback = (metrics: PerformanceMetrics) => void;

/**
 * Performance Optimizer
 * Manages dynamic performance optimization and throttling
 */
export class PerformanceOptimizer {
	private resourceManager: DeviceResourceManager;
	private config: OptimizationConfig;
	private currentProfile: PerformanceProfile;
	private throttlingState: ThrottlingState;
	private metrics: PerformanceMetrics;
	private optimizationInterval: ReturnType<typeof setInterval> | null = null;
	private eventCallbacks: OptimizationEventCallback[] = [];
	private isOptimizing = false;
	private startTime = Date.now();

	// Performance profiles
	private static readonly PERFORMANCE_PROFILES: Record<PerformanceMode, PerformanceProfile> = {
		performance: {
			mode: 'performance',
			maxTokens: 2048,
			temperature: 0.7,
			topP: 0.9,
			batchSize: 4,
			numThreads: 6,
			enableGPU: true,
			cacheSize: 512,
			maxMemoryUsage: 3072,
			inferenceTimeout: 15000,
			description: 'Maximum performance with higher resource usage',
		},
		balanced: {
			mode: 'balanced',
			maxTokens: 1024,
			temperature: 0.7,
			topP: 0.9,
			batchSize: 2,
			numThreads: 4,
			enableGPU: true,
			cacheSize: 256,
			maxMemoryUsage: 2048,
			inferenceTimeout: 12000,
			description: 'Balanced performance and resource usage',
		},
		quality: {
			mode: 'quality',
			maxTokens: 512,
			temperature: 0.8,
			topP: 0.95,
			batchSize: 1,
			numThreads: 2,
			enableGPU: false,
			cacheSize: 128,
			maxMemoryUsage: 1024,
			inferenceTimeout: 10000,
			description: 'Lower resource usage with acceptable quality',
		},
	};

	// Default configuration
	private static readonly DEFAULT_CONFIG: OptimizationConfig = {
		enableAutoOptimization: true,
		enableThermalThrottling: true,
		enableMemoryOptimization: true,
		enableBatteryOptimization: true,
		aggressiveOptimization: false,
		optimizationInterval: 10000, // 10 seconds
		thermalThresholds: {
			lightThrottling: 60,
			moderateThrottling: 70,
			aggressiveThrottling: 80,
		},
		memoryThresholds: {
			lightOptimization: 70,
			moderateOptimization: 80,
			aggressiveOptimization: 90,
		},
		batteryThresholds: {
			enableOptimization: 30,
			aggressiveOptimization: 15,
		},
	};

	constructor(
		resourceManager: DeviceResourceManager,
		initialMode: PerformanceMode = 'balanced',
		config?: Partial<OptimizationConfig>,
	) {
		this.resourceManager = resourceManager;
		this.config = { ...PerformanceOptimizer.DEFAULT_CONFIG, ...config };
		this.currentProfile = { ...PerformanceOptimizer.PERFORMANCE_PROFILES[initialMode] };

		this.throttlingState = {
			isActive: false,
			level: 'none',
			reason: 'thermal',
			appliedOptimizations: [],
			performanceReduction: 0,
		};

		this.metrics = {
			currentMode: initialMode,
			throttlingState: this.throttlingState,
			averageInferenceTime: 0,
			tokensPerSecond: 0,
			memoryEfficiency: 100,
			thermalEfficiency: 100,
			batteryEfficiency: 100,
			overallScore: 100,
			uptime: 0,
		};

		// Listen to resource events
		this.resourceManager.addEventListener(this.handleResourceEvent.bind(this));
	}

	/**
	* Initialize performance optimizer
	* Requirement 3.1: Performance optimization initialization
	*/
	async initialize(): Promise<void> {
		try {
			console.log('⚡ Initializing Performance Optimizer...');

			// Start optimization monitoring
			if (this.config.enableAutoOptimization) {
				this.startOptimization();
			}

			console.log('✅ Performance Optimizer initialized');
			console.log('📊 Initial performance profile:', this.currentProfile.mode);

		} catch (error) {
			console.error('❌ Failed to initialize Performance Optimizer:', error);
			throw error;
		}
	}

	/**
	* Switch performance mode
	* Requirement 3.1: Dynamic performance mode switching
	*/
	async switchPerformanceMode(mode: PerformanceMode): Promise<void> {
		console.log(`🔄 Switching to ${mode} performance mode...`);

		const newProfile = { ...PerformanceOptimizer.PERFORMANCE_PROFILES[mode] };

		// Apply current throttling adjustments to new profile
		if (this.throttlingState.isActive) {
			this.applyThrottlingToProfile(newProfile);
		}

		this.currentProfile = newProfile;
		this.metrics.currentMode = mode;

		console.log(`✅ Switched to ${mode} mode`);
		this.notifyOptimizationChange();
	}

	/**
	* Get current performance profile
	*/
	getCurrentProfile(): PerformanceProfile {
		return { ...this.currentProfile };
	}

	/**
	* Get current performance metrics
	*/
	getMetrics(): PerformanceMetrics {
		this.updateMetrics();
		return { ...this.metrics };
	}

	/**
	* Get throttling state
	*/
	getThrottlingState(): ThrottlingState {
		return { ...this.throttlingState };
	}

	/**
	* Force optimization based on current resource state
	* Requirement 3.1: Manual performance optimization
	*/
	async optimizePerformance(): Promise<void> {
		if (this.isOptimizing) {
			console.log('⚠️ Optimization already in progress');
			return;
		}

		this.isOptimizing = true;

		try {
			console.log('🔧 Optimizing performance...');

			const resourceUsage = this.resourceManager.getCachedResourceUsage();
			if (!resourceUsage) {
				console.log('⚠️ No resource data available for optimization');
				return;
			}

			const actions = this.analyzeOptimizationNeeds(resourceUsage);

			if (actions.length > 0) {
				await this.applyOptimizations(actions);
				console.log(`✅ Applied ${actions.length} optimizations`);
			} else {
				console.log('✅ No optimizations needed');
			}

		} finally {
			this.isOptimizing = false;
		}
	}

	/**
	* Add optimization event callback
	*/
	addEventListener(callback: OptimizationEventCallback): void {
		this.eventCallbacks.push(callback);
	}

	/**
	* Remove optimization event callback
	*/
	removeEventListener(callback: OptimizationEventCallback): void {
		const index = this.eventCallbacks.indexOf(callback);
		if (index > -1) {
			this.eventCallbacks.splice(index, 1);
		}
	}

	/**
	* Update optimization configuration
	*/
	updateConfig(newConfig: Partial<OptimizationConfig>): void {
		this.config = { ...this.config, ...newConfig };

		// Restart optimization with new interval if changed
		if (newConfig.optimizationInterval && this.optimizationInterval) {
			this.stopOptimization();
			this.startOptimization();
		}
	}

	/**
	* Get optimization configuration
	*/
	getConfig(): OptimizationConfig {
		return { ...this.config };
	}

	/**
	* Record inference performance metrics
	*/
	recordInferenceMetrics(inferenceTime: number, tokenCount: number): void {
		// Update running averages
		const alpha = 0.1; // Smoothing factor

		if (this.metrics.averageInferenceTime === 0) {
			this.metrics.averageInferenceTime = inferenceTime;
		} else {
			this.metrics.averageInferenceTime =
				(1 - alpha) * this.metrics.averageInferenceTime + alpha * inferenceTime;
		}

		const tokensPerSecond = tokenCount / (inferenceTime / 1000);
		if (this.metrics.tokensPerSecond === 0) {
			this.metrics.tokensPerSecond = tokensPerSecond;
		} else {
			this.metrics.tokensPerSecond =
				(1 - alpha) * this.metrics.tokensPerSecond + alpha * tokensPerSecond;
		}

		this.updateMetrics();
	}

	// Private methods

	/**
	* Start automatic optimization monitoring
	*/
	private startOptimization(): void {
		if (this.optimizationInterval) {
			return;
		}

		console.log('🔄 Starting automatic performance optimization...');

		this.optimizationInterval = setInterval(async () => {
			try {
				await this.optimizePerformance();
			} catch (error) {
				console.error('❌ Error during automatic optimization:', error);
			}
		}, this.config.optimizationInterval);
	}

	/**
	* Stop automatic optimization monitoring
	*/
	private stopOptimization(): void {
		if (this.optimizationInterval) {
			clearInterval(this.optimizationInterval);
			this.optimizationInterval = null;
			console.log('⏹️ Stopped automatic performance optimization');
		}
	}

	/**
	* Handle resource events from DeviceResourceManager
	*/
	private handleResourceEvent(event: ResourceEvent): void {
		if (!this.config.enableAutoOptimization) {
			return;
		}

		// Immediate optimization for critical events
		if (event.severity === 'critical' && event.actionRequired) {
			console.log(`🚨 Critical resource event: ${event.message}`);
			this.optimizePerformance().catch(error => {
				console.error('❌ Failed to handle critical resource event:', error);
			});
		}
	}

	/**
	* Analyze optimization needs based on resource usage
	* Requirement 3.3: Memory pressure handling and thermal throttling
	*/
	private analyzeOptimizationNeeds(resourceUsage: ResourceUsage): OptimizationAction[] {
		const actions: OptimizationAction[] = [];

		// Thermal throttling analysis
		if (this.config.enableThermalThrottling) {
			const thermalActions = this.analyzeThermalOptimization(resourceUsage);
			actions.push(...thermalActions);
		}

		// Memory optimization analysis
		if (this.config.enableMemoryOptimization) {
			const memoryActions = this.analyzeMemoryOptimization(resourceUsage);
			actions.push(...memoryActions);
		}

		// Battery optimization analysis
		if (this.config.enableBatteryOptimization) {
			const batteryActions = this.analyzeBatteryOptimization(resourceUsage);
			actions.push(...batteryActions);
		}

		// CPU optimization analysis
		const cpuActions = this.analyzeCPUOptimization(resourceUsage);
		actions.push(...cpuActions);

		// Sort by priority (highest first)
		actions.sort((a, b) => b.priority - a.priority);

		return actions;
	}

	/**
	* Analyze thermal optimization needs
	* Requirement 3.1: Thermal throttling with automatic performance reduction
	*/
	private analyzeThermalOptimization(resourceUsage: ResourceUsage): OptimizationAction[] {
		const actions: OptimizationAction[] = [];
		const { thermal } = resourceUsage;

		if (thermal.temperature >= this.config.thermalThresholds.aggressiveThrottling) {
			actions.push({
				type: 'emergency_stop',
				priority: 10,
				description: 'Emergency stop due to critical temperature',
				impact: 'high',
				reversible: true,
			});
		} else if (thermal.temperature >= this.config.thermalThresholds.moderateThrottling) {
			actions.push(
				{
					type: 'reduce_threads',
					priority: 8,
					description: 'Reduce thread count for thermal management',
					impact: 'medium',
					reversible: true,
				},
				{
					type: 'disable_gpu',
					priority: 7,
					description: 'Disable GPU acceleration to reduce heat',
					impact: 'medium',
					reversible: true,
				},
			);
		} else if (thermal.temperature >= this.config.thermalThresholds.lightThrottling) {
			actions.push({
				type: 'reduce_batch_size',
				priority: 6,
				description: 'Reduce batch size for thermal management',
				impact: 'low',
				reversible: true,
			});
		}

		return actions;
	}

	/**
	* Analyze memory optimization needs
	* Requirement 3.3: Memory pressure handling with model optimization
	*/
	private analyzeMemoryOptimization(resourceUsage: ResourceUsage): OptimizationAction[] {
		const actions: OptimizationAction[] = [];
		const { memory } = resourceUsage;

		if (memory.percentage >= this.config.memoryThresholds.aggressiveOptimization) {
			actions.push(
				{
					type: 'reduce_cache',
					priority: 9,
					description: 'Aggressively reduce cache size',
					impact: 'high',
					reversible: true,
				},
				{
					type: 'reduce_tokens',
					priority: 8,
					description: 'Reduce max token count',
					impact: 'medium',
					reversible: true,
				},
			);
		} else if (memory.percentage >= this.config.memoryThresholds.moderateOptimization) {
			actions.push(
				{
					type: 'reduce_cache',
					priority: 7,
					description: 'Reduce cache size',
					impact: 'medium',
					reversible: true,
				},
				{
					type: 'reduce_batch_size',
					priority: 6,
					description: 'Reduce batch size for memory optimization',
					impact: 'low',
					reversible: true,
				},
			);
		} else if (memory.percentage >= this.config.memoryThresholds.lightOptimization) {
			actions.push({
				type: 'reduce_cache',
				priority: 5,
				description: 'Lightly reduce cache size',
				impact: 'low',
				reversible: true,
			});
		}

		return actions;
	}

	/**
	* Analyze battery optimization needs
	*/
	private analyzeBatteryOptimization(resourceUsage: ResourceUsage): OptimizationAction[] {
		const actions: OptimizationAction[] = [];
		const { battery } = resourceUsage;

		if (!battery.isCharging) {
			if (battery.level <= this.config.batteryThresholds.aggressiveOptimization) {
				actions.push(
					{
						type: 'disable_gpu',
						priority: 8,
						description: 'Disable GPU to save battery',
						impact: 'medium',
						reversible: true,
					},
					{
						type: 'reduce_threads',
						priority: 7,
						description: 'Reduce threads to save battery',
						impact: 'medium',
						reversible: true,
					},
				);
			} else if (battery.level <= this.config.batteryThresholds.enableOptimization) {
				actions.push({
					type: 'reduce_batch_size',
					priority: 5,
					description: 'Reduce batch size to save battery',
					impact: 'low',
					reversible: true,
				});
			}
		}

		return actions;
	}

	/**
	* Analyze CPU optimization needs
	*/
	private analyzeCPUOptimization(resourceUsage: ResourceUsage): OptimizationAction[] {
		const actions: OptimizationAction[] = [];
		const { cpu } = resourceUsage;

		if (cpu.usage >= 90) {
			actions.push({
				type: 'reduce_threads',
				priority: 8,
				description: 'Reduce threads due to high CPU usage',
				impact: 'medium',
				reversible: true,
			});
		} else if (cpu.usage >= 80) {
			actions.push({
				type: 'increase_timeout',
				priority: 4,
				description: 'Increase timeout to reduce CPU pressure',
				impact: 'low',
				reversible: true,
			});
		}

		return actions;
	}

	/**
	* Apply optimization actions
	*/
	private async applyOptimizations(actions: OptimizationAction[]): Promise<void> {
		const appliedOptimizations: string[] = [];
		let performanceReduction = 0;

		for (const action of actions) {
			try {
				await this.applyOptimizationAction(action);
				appliedOptimizations.push(action.description);

				// Calculate performance impact
				const impact = action.impact === 'high' ? 30 : action.impact === 'medium' ? 15 : 5;
				performanceReduction += impact;

				console.log(`✅ Applied optimization: ${action.description}`);
			} catch (error) {
				console.error(`❌ Failed to apply optimization: ${action.description}`, error);
			}
		}

		// Update throttling state
		if (appliedOptimizations.length > 0) {
			this.throttlingState = {
				isActive: true,
				level: performanceReduction > 50 ? 'aggressive' :
					performanceReduction > 25 ? 'moderate' : 'light',
				reason: this.determineThrottlingReason(actions),
				appliedOptimizations,
				performanceReduction: Math.min(100, performanceReduction),
			};
		}

		this.updateMetrics();
		this.notifyOptimizationChange();
	}

	/**
	* Apply individual optimization action
	*/
	private async applyOptimizationAction(action: OptimizationAction): Promise<void> {
		switch (action.type) {
		case 'reduce_threads':
			this.currentProfile.numThreads = Math.max(1, Math.floor(this.currentProfile.numThreads * 0.7));
			break;

		case 'reduce_batch_size':
			this.currentProfile.batchSize = Math.max(1, Math.floor(this.currentProfile.batchSize * 0.7));
			break;

		case 'reduce_cache':
			this.currentProfile.cacheSize = Math.max(64, Math.floor(this.currentProfile.cacheSize * 0.6));
			break;

		case 'disable_gpu':
			this.currentProfile.enableGPU = false;
			break;

		case 'reduce_tokens':
			this.currentProfile.maxTokens = Math.max(256, Math.floor(this.currentProfile.maxTokens * 0.7));
			break;

		case 'increase_timeout':
			this.currentProfile.inferenceTimeout = Math.min(30000, this.currentProfile.inferenceTimeout * 1.5);
			break;

		case 'pause_inference':
			// This would be handled by the calling code
			console.log('⏸️ Inference pausing recommended');
			break;

		case 'emergency_stop':
			// This would be handled by the calling code

			break;
		}
	}

	/**
	* Apply throttling adjustments to profile
	*/
	private applyThrottlingToProfile(profile: PerformanceProfile): void {
		if (!this.throttlingState.isActive) {
			return;
		}

		const reductionFactor = 1 - (this.throttlingState.performanceReduction / 100);

		profile.numThreads = Math.max(1, Math.floor(profile.numThreads * reductionFactor));
		profile.batchSize = Math.max(1, Math.floor(profile.batchSize * reductionFactor));
		profile.cacheSize = Math.max(64, Math.floor(profile.cacheSize * reductionFactor));
		profile.maxTokens = Math.max(256, Math.floor(profile.maxTokens * reductionFactor));
	}

	/**
	* Determine primary throttling reason
	*/
	private determineThrottlingReason(actions: OptimizationAction[]): 'thermal' | 'memory' | 'cpu' | 'battery' | 'multiple' {
		const reasons = new Set<string>();

		for (const action of actions) {
			if (action.description.includes('thermal') || action.description.includes('temperature')) {
				reasons.add('thermal');
			} else if (action.description.includes('memory')) {
				reasons.add('memory');
			} else if (action.description.includes('CPU')) {
				reasons.add('cpu');
			} else if (action.description.includes('battery')) {
				reasons.add('battery');
			}
		}

		if (reasons.size > 1) {
			return 'multiple';
		} else if (reasons.has('thermal')) {
			return 'thermal';
		} else if (reasons.has('memory')) {
			return 'memory';
		} else if (reasons.has('cpu')) {
			return 'cpu';
		} else if (reasons.has('battery')) {
			return 'battery';
		} else {
			return 'thermal'; // Default
		}
	}

	/**
	* Update performance metrics
	*/
	private updateMetrics(): void {
		const resourceUsage = this.resourceManager.getCachedResourceUsage();

		if (resourceUsage) {
			// Calculate efficiency scores
			this.metrics.memoryEfficiency = Math.max(0, 100 - resourceUsage.memory.percentage);

			this.metrics.thermalEfficiency =
				resourceUsage.thermal.state === 'nominal' ? 100 :
					resourceUsage.thermal.state === 'fair' ? 80 :
						resourceUsage.thermal.state === 'serious' ? 60 : 40;

			this.metrics.batteryEfficiency = resourceUsage.battery.isCharging ? 100 :
				Math.max(0, resourceUsage.battery.level);
		}

		// Calculate overall score
		this.metrics.overallScore = Math.floor(
			(this.metrics.memoryEfficiency * 0.3 +
				this.metrics.thermalEfficiency * 0.3 +
				this.metrics.batteryEfficiency * 0.2 +
				(this.throttlingState.isActive ? 50 : 100) * 0.2),
		);

		this.metrics.uptime = Date.now() - this.startTime;
		this.metrics.throttlingState = { ...this.throttlingState };
	}

	/**
	* Notify listeners of optimization changes
	*/
	private notifyOptimizationChange(): void {
		this.eventCallbacks.forEach(callback => {
			try {
				callback(this.getMetrics());
			} catch (error) {
				console.error('❌ Error in optimization event callback:', error);
			}
		});
	}

	/**
	* Cleanup resources
	*/
	dispose(): void {
		this.stopOptimization();
		this.eventCallbacks = [];
	}
}

/**
 * Utility functions for performance optimization
 */
export const PerformanceUtils = {
	/**
	* Get performance mode recommendation based on device capabilities
	*/
	recommendPerformanceMode(resourceUsage: ResourceUsage): PerformanceMode {
		const { memory, thermal, battery, cpu } = resourceUsage;

		// Critical conditions - use quality mode
		if (memory.percentage > 85 || thermal.state === 'critical' ||
			(battery.level < 15 && !battery.isCharging) || cpu.usage > 85) {
			return 'quality';
		}

		// Warning conditions - use balanced mode
		if (memory.percentage > 70 || thermal.state === 'serious' ||
			(battery.level < 30 && !battery.isCharging) || cpu.usage > 70) {
			return 'balanced';
		}

		// Good conditions - can use performance mode
		return 'performance';
	},

	/**
	* Calculate performance score for current settings
	*/
	calculatePerformanceScore(profile: PerformanceProfile, resourceUsage: ResourceUsage): number {
		let score = 100;

		// Memory impact
		const memoryUsageRatio = profile.maxMemoryUsage / resourceUsage.memory.available;
		if (memoryUsageRatio > 0.8) {
			score -= 20;
		} else if (memoryUsageRatio > 0.6) {
			score -= 10;
		}

		// Thermal impact
		if (resourceUsage.thermal.state !== 'nominal') {
			score -= 15;
		}

		// Battery impact
		if (!resourceUsage.battery.isCharging && resourceUsage.battery.level < 30) {
			score -= 10;
		}

		// CPU impact
		if (resourceUsage.cpu.usage > 70) {
			score -= 10;
		}

		return Math.max(0, score);
	},

	/**
	* Format throttling level for display
	*/
	formatThrottlingLevel(level: 'none' | 'light' | 'moderate' | 'aggressive'): string {
		switch (level) {
		case 'none': return 'No Throttling';
		case 'light': return 'Light Optimization';
		case 'moderate': return 'Moderate Throttling';
		case 'aggressive': return 'Aggressive Throttling';
		}
	},

	/**
	* Get throttling color for UI
	*/
	getThrottlingColor(level: 'none' | 'light' | 'moderate' | 'aggressive'): string {
		switch (level) {
		case 'none': return '#44AA44'; // Green
		case 'light': return '#AAAA44'; // Yellow
		case 'moderate': return '#FF8800'; // Orange
		case 'aggressive': return '#FF4444'; // Red
		}
	},
};
