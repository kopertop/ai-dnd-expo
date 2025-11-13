/**
 * Battery Optimizer for Local AI D&D Platform
 *
 * Power-saving mode, background processing suspension, and battery level-based
 * performance scaling for optimal battery life during AI model inference.
 *
 * Requirements: 3.2, 3.4
 */

import { AppState, AppStateStatus } from 'react-native';

import { BatteryStatus, DeviceResourceManager, ResourceEvent } from './device-resource-manager';
import { PerformanceMode, PerformanceOptimizer } from './performance-optimizer';

export interface PowerSavingConfig {
	enablePowerSaving: boolean;
	enableBackgroundSuspension: boolean;
	enableBatteryScaling: boolean;
	enableIdleDetection: boolean;
	batteryThresholds: {
		enablePowerSaving: number; // percentage
		aggressivePowerSaving: number; // percentage
		emergencyMode: number; // percentage
	};
	idleTimeout: number; // ms
	backgroundSuspensionDelay: number; // ms
	chargingOptimizations: boolean;
}

export interface PowerSavingState {
	isActive: boolean;
	mode: 'normal' | 'power_saving' | 'aggressive' | 'emergency';
	reason: 'battery_level' | 'not_charging' | 'background' | 'idle' | 'user_request';
	activeSince: number;
	estimatedBatteryLife: number; // minutes
	powerReduction: number; // 0-100 percentage
}

export interface BatteryOptimization {
	type:
		| 'reduce_frequency'
		| 'suspend_background'
		| 'reduce_complexity'
		| 'disable_features'
		| 'emergency_suspend'
		| 'enable_charging_boost';
	description: string;
	batteryImpact: number; // estimated minutes saved
	performanceImpact: 'none' | 'low' | 'medium' | 'high';
	reversible: boolean;
}

export interface BatteryMetrics {
	currentLevel: number;
	isCharging: boolean;
	estimatedTimeRemaining: number; // minutes
	powerConsumptionRate: number; // mAh per hour
	optimizationsActive: BatteryOptimization[];
	powerSavingState: PowerSavingState;
	batteryHealth: 'excellent' | 'good' | 'fair' | 'poor';
	chargingEfficiency: number; // 0-100
}

export type BatteryEventCallback = (metrics: BatteryMetrics) => void;

/**
 * Battery Optimizer
 * Manages battery optimization and power-saving features
 */
export class BatteryOptimizer {
	private resourceManager: DeviceResourceManager;
	private performanceOptimizer: PerformanceOptimizer | null = null;
	private config: PowerSavingConfig;
	private powerSavingState: PowerSavingState;
	private metrics: BatteryMetrics;
	private eventCallbacks: BatteryEventCallback[] = [];

	// State tracking
	private appStateSubscription: { remove: () => void } | null = null;
	private idleTimer: ReturnType<typeof setTimeout> | null = null;
	private backgroundTimer: ReturnType<typeof setTimeout> | null = null;
	private lastActivityTime = Date.now();
	private isInBackground = false;
	private batteryHistory: BatteryStatus[] = [];
	private maxHistorySize = 20; // Keep last 20 readings

	// Default configuration
	private static readonly DEFAULT_CONFIG: PowerSavingConfig = {
		enablePowerSaving: true,
		enableBackgroundSuspension: true,
		enableBatteryScaling: true,
		enableIdleDetection: true,
		batteryThresholds: {
			enablePowerSaving: 30,
			aggressivePowerSaving: 15,
			emergencyMode: 5,
		},
		idleTimeout: 300000, // 5 minutes
		backgroundSuspensionDelay: 60000, // 1 minute
		chargingOptimizations: true,
	};

	constructor(resourceManager: DeviceResourceManager, config?: Partial<PowerSavingConfig>) {
		this.resourceManager = resourceManager;
		this.config = { ...BatteryOptimizer.DEFAULT_CONFIG, ...config };

		this.powerSavingState = {
			isActive: false,
			mode: 'normal',
			reason: 'battery_level',
			activeSince: Date.now(),
			estimatedBatteryLife: 0,
			powerReduction: 0,
		};

		this.metrics = {
			currentLevel: 100,
			isCharging: false,
			estimatedTimeRemaining: 0,
			powerConsumptionRate: 0,
			optimizationsActive: [],
			powerSavingState: this.powerSavingState,
			batteryHealth: 'good',
			chargingEfficiency: 100,
		};

		this.setupEventListeners();
	}

	/**
	 * Initialize battery optimizer
	 * Requirement 3.2: Battery optimization initialization
	 */
	async initialize(): Promise<void> {
		try {
			console.log('🔋 Initializing Battery Optimizer...');

			// Get initial battery status
			await this.updateBatteryMetrics();

			// Start monitoring
			this.startIdleDetection();

			console.log('✅ Battery Optimizer initialized');
			console.log('🔋 Initial battery level:', this.metrics.currentLevel + '%');
		} catch (error) {
			console.error('❌ Failed to initialize Battery Optimizer:', error);
			throw error;
		}
	}

	/**
	 * Set performance optimizer reference for coordination
	 */
	setPerformanceOptimizer(optimizer: PerformanceOptimizer): void {
		this.performanceOptimizer = optimizer;
	}

	/**
	 * Enable power-saving mode
	 * Requirement 3.2: Power-saving mode that reduces model complexity
	 */
	async enablePowerSavingMode(
		reason: PowerSavingState['reason'] = 'user_request',
	): Promise<void> {
		if (this.powerSavingState.isActive) {
			console.log('⚠️ Power saving mode already active');
			return;
		}

		console.log('🔋 Enabling power saving mode...');

		const batteryLevel = this.metrics.currentLevel;
		let mode: PowerSavingState['mode'] = 'power_saving';

		// Determine power saving intensity based on battery level
		if (batteryLevel <= this.config.batteryThresholds.emergencyMode) {
			mode = 'emergency';
		} else if (batteryLevel <= this.config.batteryThresholds.aggressivePowerSaving) {
			mode = 'aggressive';
		}

		this.powerSavingState = {
			isActive: true,
			mode,
			reason,
			activeSince: Date.now(),
			estimatedBatteryLife: this.calculateEstimatedBatteryLife(),
			powerReduction: this.calculatePowerReduction(mode),
		};

		// Apply power saving optimizations
		await this.applyPowerSavingOptimizations();

		console.log(`✅ Power saving mode enabled (${mode})`);
		this.notifyBatteryChange();
	}

	/**
	 * Disable power-saving mode
	 */
	async disablePowerSavingMode(): Promise<void> {
		if (!this.powerSavingState.isActive) {
			return;
		}

		console.log('🔋 Disabling power saving mode...');

		// Remove power saving optimizations
		await this.removePowerSavingOptimizations();

		this.powerSavingState = {
			isActive: false,
			mode: 'normal',
			reason: 'user_request',
			activeSince: Date.now(),
			estimatedBatteryLife: this.calculateEstimatedBatteryLife(),
			powerReduction: 0,
		};

		console.log('✅ Power saving mode disabled');
		this.notifyBatteryChange();
	}

	/**
	 * Suspend background processing when device is idle
	 * Requirement 3.2: Background processing suspension when device is idle
	 */
	suspendBackgroundProcessing(): void {
		if (!this.config.enableBackgroundSuspension) {
			return;
		}

		console.log('⏸️ Suspending background processing...');

		// This would pause AI inference and other background tasks
		// In a real implementation, this would coordinate with the AI service manager

		this.powerSavingState.mode = 'aggressive';
		this.powerSavingState.reason = 'background';
		this.powerSavingState.isActive = true;

		this.notifyBatteryChange();
	}

	/**
	 * Resume background processing
	 */
	resumeBackgroundProcessing(): void {
		if (this.powerSavingState.reason === 'background') {
			console.log('▶️ Resuming background processing...');

			// Determine if we should stay in power saving mode for other reasons
			const shouldStayInPowerSaving = this.shouldEnablePowerSaving();

			if (!shouldStayInPowerSaving) {
				this.disablePowerSavingMode();
			} else {
				this.powerSavingState.reason = 'battery_level';
				this.powerSavingState.mode = this.determinePowerSavingMode();
			}
		}
	}

	/**
	 * Scale performance based on battery level
	 * Requirement 3.2: Battery level-based performance scaling
	 */
	async scaleBatteryPerformance(): Promise<void> {
		if (!this.config.enableBatteryScaling) {
			return;
		}

		const batteryLevel = this.metrics.currentLevel;
		const isCharging = this.metrics.isCharging;

		console.log(`🔋 Scaling performance for battery level: ${batteryLevel}%`);

		// Don't scale if charging (unless configured otherwise)
		if (isCharging && !this.config.chargingOptimizations) {
			return;
		}

		// Determine target performance mode based on battery level
		let targetMode: PerformanceMode;

		if (batteryLevel <= this.config.batteryThresholds.emergencyMode) {
			targetMode = 'quality'; // Minimum performance
		} else if (batteryLevel <= this.config.batteryThresholds.aggressivePowerSaving) {
			targetMode = 'quality';
		} else if (batteryLevel <= this.config.batteryThresholds.enablePowerSaving) {
			targetMode = 'balanced';
		} else {
			targetMode = 'performance'; // Full performance when battery is good
		}

		// Apply performance scaling through performance optimizer
		if (this.performanceOptimizer) {
			await this.performanceOptimizer.switchPerformanceMode(targetMode);
		}

		console.log(`✅ Performance scaled to ${targetMode} mode`);
	}

	/**
	 * Get current battery metrics
	 */
	getMetrics(): BatteryMetrics {
		return { ...this.metrics };
	}

	/**
	 * Get power saving state
	 */
	getPowerSavingState(): PowerSavingState {
		return { ...this.powerSavingState };
	}

	/**
	 * Record user activity to reset idle timer
	 */
	recordActivity(): void {
		this.lastActivityTime = Date.now();

		if (this.idleTimer) {
			clearTimeout(this.idleTimer);
			this.startIdleDetection();
		}

		// Resume from idle if needed
		if (this.powerSavingState.reason === 'idle') {
			this.resumeFromIdle();
		}
	}

	/**
	 * Add battery event callback
	 */
	addEventListener(callback: BatteryEventCallback): void {
		this.eventCallbacks.push(callback);
	}

	/**
	 * Remove battery event callback
	 */
	removeEventListener(callback: BatteryEventCallback): void {
		const index = this.eventCallbacks.indexOf(callback);
		if (index > -1) {
			this.eventCallbacks.splice(index, 1);
		}
	}

	/**
	 * Update battery optimization configuration
	 */
	updateConfig(newConfig: Partial<PowerSavingConfig>): void {
		this.config = { ...this.config, ...newConfig };

		// Re-evaluate power saving state with new config
		this.evaluatePowerSavingNeed();
	}

	/**
	 * Get battery optimization configuration
	 */
	getConfig(): PowerSavingConfig {
		return { ...this.config };
	}

	// Private methods

	/**
	 * Setup event listeners
	 */
	private setupEventListeners(): void {
		// Listen to resource manager events
		this.resourceManager.addEventListener(this.handleResourceEvent.bind(this));

		// Listen to app state changes
		this.appStateSubscription = AppState.addEventListener(
			'change',
			this.handleAppStateChange.bind(this),
		);
	}

	/**
	 * Handle resource events from DeviceResourceManager
	 */
	private handleResourceEvent(event: ResourceEvent): void {
		if (event.type === 'battery_low' || event.type === 'battery_critical') {
			this.evaluatePowerSavingNeed();
		} else if (event.type === 'background_mode') {
			this.handleBackgroundMode();
		} else if (event.type === 'foreground_mode') {
			this.handleForegroundMode();
		}
	}

	/**
	 * Handle app state changes
	 */
	private handleAppStateChange(nextAppState: AppStateStatus): void {
		const wasInBackground = this.isInBackground;
		this.isInBackground = nextAppState === 'background' || nextAppState === 'inactive';

		if (!wasInBackground && this.isInBackground) {
			this.handleBackgroundMode();
		} else if (wasInBackground && !this.isInBackground) {
			this.handleForegroundMode();
		}
	}

	/**
	 * Handle app entering background
	 */
	private handleBackgroundMode(): void {
		if (!this.config.enableBackgroundSuspension) {
			return;
		}

		console.log('📱 App entered background mode');

		// Start background suspension timer
		this.backgroundTimer = setTimeout(() => {
			this.suspendBackgroundProcessing();
		}, this.config.backgroundSuspensionDelay);
	}

	/**
	 * Handle app entering foreground
	 */
	private handleForegroundMode(): void {
		console.log('📱 App entered foreground mode');

		// Cancel background suspension timer
		if (this.backgroundTimer) {
			clearTimeout(this.backgroundTimer);
			this.backgroundTimer = null;
		}

		// Resume background processing if it was suspended
		this.resumeBackgroundProcessing();

		// Record activity
		this.recordActivity();
	}

	/**
	 * Start idle detection
	 */
	private startIdleDetection(): void {
		if (!this.config.enableIdleDetection) {
			return;
		}

		this.idleTimer = setTimeout(() => {
			this.handleIdleTimeout();
		}, this.config.idleTimeout);
	}

	/**
	 * Handle idle timeout
	 */
	private handleIdleTimeout(): void {
		console.log('😴 Device idle timeout reached');

		if (!this.powerSavingState.isActive) {
			this.enablePowerSavingMode('idle');
		} else if (this.powerSavingState.mode !== 'emergency') {
			// Increase power saving if already active
			this.powerSavingState.mode = 'aggressive';
			this.powerSavingState.reason = 'idle';
		}
	}

	/**
	 * Resume from idle state
	 */
	private resumeFromIdle(): void {
		if (this.powerSavingState.reason === 'idle') {
			console.log('😊 Resuming from idle state');

			// Check if we should stay in power saving for other reasons
			const shouldStayInPowerSaving = this.shouldEnablePowerSaving();

			if (!shouldStayInPowerSaving) {
				this.disablePowerSavingMode();
			} else {
				this.powerSavingState.reason = 'battery_level';
				this.powerSavingState.mode = this.determinePowerSavingMode();
			}
		}
	}

	/**
	 * Update battery metrics
	 */
	private async updateBatteryMetrics(): Promise<void> {
		const resourceUsage = this.resourceManager.getCachedResourceUsage();
		if (!resourceUsage) {
			return;
		}

		const battery = resourceUsage.battery;

		// Add to history
		this.batteryHistory.push(battery);
		if (this.batteryHistory.length > this.maxHistorySize) {
			this.batteryHistory.shift();
		}

		// Update metrics
		this.metrics.currentLevel = battery.level;
		this.metrics.isCharging = battery.isCharging;
		this.metrics.estimatedTimeRemaining = battery.estimatedTimeRemaining;
		this.metrics.powerConsumptionRate = this.calculatePowerConsumptionRate();
		this.metrics.batteryHealth = this.assessBatteryHealth();
		this.metrics.chargingEfficiency = this.calculateChargingEfficiency();
		this.metrics.powerSavingState = { ...this.powerSavingState };

		// Evaluate power saving need
		this.evaluatePowerSavingNeed();
	}

	/**
	 * Evaluate if power saving should be enabled
	 */
	private evaluatePowerSavingNeed(): void {
		const shouldEnable = this.shouldEnablePowerSaving();

		if (shouldEnable && !this.powerSavingState.isActive) {
			this.enablePowerSavingMode('battery_level');
		} else if (
			!shouldEnable &&
			this.powerSavingState.isActive &&
			this.powerSavingState.reason === 'battery_level'
		) {
			this.disablePowerSavingMode();
		} else if (shouldEnable && this.powerSavingState.isActive) {
			// Update power saving mode intensity
			const newMode = this.determinePowerSavingMode();
			if (newMode !== this.powerSavingState.mode) {
				this.powerSavingState.mode = newMode;
				this.powerSavingState.powerReduction = this.calculatePowerReduction(newMode);
				this.applyPowerSavingOptimizations();
			}
		}
	}

	/**
	 * Check if power saving should be enabled
	 */
	private shouldEnablePowerSaving(): boolean {
		const batteryLevel = this.metrics.currentLevel;
		const isCharging = this.metrics.isCharging;

		// Don't enable power saving if charging (unless configured)
		if (isCharging && !this.config.chargingOptimizations) {
			return false;
		}

		return batteryLevel <= this.config.batteryThresholds.enablePowerSaving;
	}

	/**
	 * Determine appropriate power saving mode
	 */
	private determinePowerSavingMode(): PowerSavingState['mode'] {
		const batteryLevel = this.metrics.currentLevel;

		if (batteryLevel <= this.config.batteryThresholds.emergencyMode) {
			return 'emergency';
		} else if (batteryLevel <= this.config.batteryThresholds.aggressivePowerSaving) {
			return 'aggressive';
		} else {
			return 'power_saving';
		}
	}

	/**
	 * Apply power saving optimizations
	 */
	private async applyPowerSavingOptimizations(): Promise<void> {
		const optimizations: BatteryOptimization[] = [];

		switch (this.powerSavingState.mode) {
			case 'emergency':
				optimizations.push(
					{
						type: 'emergency_suspend',
						description: 'Emergency suspension of non-critical processes',
						batteryImpact: 60,
						performanceImpact: 'high',
						reversible: true,
					},
					{
						type: 'reduce_complexity',
						description: 'Minimize model complexity',
						batteryImpact: 30,
						performanceImpact: 'high',
						reversible: true,
					},
				);
				break;

			case 'aggressive':
				optimizations.push(
					{
						type: 'reduce_frequency',
						description: 'Reduce inference frequency',
						batteryImpact: 40,
						performanceImpact: 'medium',
						reversible: true,
					},
					{
						type: 'disable_features',
						description: 'Disable non-essential features',
						batteryImpact: 25,
						performanceImpact: 'medium',
						reversible: true,
					},
				);
				break;

			case 'power_saving':
				optimizations.push({
					type: 'reduce_frequency',
					description: 'Slightly reduce inference frequency',
					batteryImpact: 20,
					performanceImpact: 'low',
					reversible: true,
				});
				break;
		}

		// Add charging optimizations if applicable
		if (this.metrics.isCharging && this.config.chargingOptimizations) {
			optimizations.push({
				type: 'enable_charging_boost',
				description: 'Enable charging boost mode',
				batteryImpact: -10, // Negative means it uses more power but improves performance
				performanceImpact: 'none',
				reversible: true,
			});
		}

		this.metrics.optimizationsActive = optimizations;

		// Apply optimizations through performance optimizer if available
		if (this.performanceOptimizer) {
			await this.scaleBatteryPerformance();
		}

		console.log(`🔋 Applied ${optimizations.length} battery optimizations`);
	}

	/**
	 * Remove power saving optimizations
	 */
	private async removePowerSavingOptimizations(): Promise<void> {
		this.metrics.optimizationsActive = [];

		// Restore normal performance if performance optimizer is available
		if (this.performanceOptimizer) {
			await this.performanceOptimizer.switchPerformanceMode('balanced');
		}
	}

	/**
	 * Calculate power reduction percentage
	 */
	private calculatePowerReduction(mode: PowerSavingState['mode']): number {
		switch (mode) {
			case 'emergency':
				return 80;
			case 'aggressive':
				return 60;
			case 'power_saving':
				return 30;
			case 'normal':
				return 0;
		}
	}

	/**
	 * Calculate estimated battery life
	 */
	private calculateEstimatedBatteryLife(): number {
		const currentLevel = this.metrics.currentLevel;
		const consumptionRate = this.metrics.powerConsumptionRate;

		if (consumptionRate <= 0 || this.metrics.isCharging) {
			return -1; // Unknown or charging
		}

		// Rough calculation: (current level / 100) * (battery capacity / consumption rate)
		// Assuming average phone battery capacity of 3000mAh
		const batteryCapacityMah = 3000;
		const remainingCapacity = (currentLevel / 100) * batteryCapacityMah;

		return Math.floor(remainingCapacity / (consumptionRate / 60)); // Convert to minutes
	}

	/**
	 * Calculate power consumption rate
	 */
	private calculatePowerConsumptionRate(): number {
		if (this.batteryHistory.length < 2) {
			return 0;
		}

		// Calculate average consumption over recent history
		let totalConsumption = 0;
		let validSamples = 0;

		for (let i = 1; i < this.batteryHistory.length; i++) {
			const current = this.batteryHistory[i];
			const previous = this.batteryHistory[i - 1];

			// Only count if not charging and battery level decreased
			if (!current.isCharging && !previous.isCharging && current.level < previous.level) {
				const levelDrop = previous.level - current.level;
				totalConsumption += levelDrop;
				validSamples++;
			}
		}

		if (validSamples === 0) {
			return 0;
		}

		// Convert to mAh per hour (rough estimate)
		const averageLevelDropPerSample = totalConsumption / validSamples;
		const samplesPerHour = 3600000 / 5000; // Assuming 5-second intervals
		const levelDropPerHour = averageLevelDropPerSample * samplesPerHour;

		// Assuming 3000mAh battery capacity
		return (levelDropPerHour / 100) * 3000;
	}

	/**
	 * Assess battery health
	 */
	private assessBatteryHealth(): 'excellent' | 'good' | 'fair' | 'poor' {
		// This would use actual battery health APIs in a real implementation
		// For now, estimate based on charging patterns and consumption

		const chargingEfficiency = this.metrics.chargingEfficiency;

		if (chargingEfficiency >= 95) {
			return 'excellent';
		} else if (chargingEfficiency >= 85) {
			return 'good';
		} else if (chargingEfficiency >= 70) {
			return 'fair';
		} else {
			return 'poor';
		}
	}

	/**
	 * Calculate charging efficiency
	 */
	private calculateChargingEfficiency(): number {
		// This would use actual charging metrics in a real implementation
		// For now, return a reasonable estimate
		return 90 + Math.random() * 10; // 90-100%
	}

	/**
	 * Notify listeners of battery changes
	 */
	private notifyBatteryChange(): void {
		this.eventCallbacks.forEach(callback => {
			try {
				callback(this.getMetrics());
			} catch (error) {
				console.error('❌ Error in battery event callback:', error);
			}
		});
	}

	/**
	 * Cleanup resources
	 */
	dispose(): void {
		if (this.idleTimer) {
			clearTimeout(this.idleTimer);
			this.idleTimer = null;
		}

		if (this.backgroundTimer) {
			clearTimeout(this.backgroundTimer);
			this.backgroundTimer = null;
		}

		if (this.appStateSubscription) {
			this.appStateSubscription.remove();
			this.appStateSubscription = null;
		}

		this.eventCallbacks = [];
	}
}

/**
 * Utility functions for battery optimization
 */
export const BatteryUtils = {
	/**
	 * Format battery level with appropriate icon
	 */
	formatBatteryLevel(level: number, isCharging: boolean): string {
		const icon = isCharging
			? '🔌'
			: level > 80
				? '🔋'
				: level > 50
					? '🔋'
					: level > 20
						? '🪫'
						: '🪫';

		return `${icon} ${level}%`;
	},

	/**
	 * Get battery color for UI
	 */
	getBatteryColor(level: number, isCharging: boolean): string {
		if (isCharging) {
			return '#44AA44'; // Green when charging
		} else if (level > 50) {
			return '#44AA44'; // Green
		} else if (level > 20) {
			return '#FF8800'; // Orange
		} else {
			return '#FF4444'; // Red
		}
	},

	/**
	 * Format power saving mode for display
	 */
	formatPowerSavingMode(mode: PowerSavingState['mode']): string {
		switch (mode) {
			case 'normal':
				return 'Normal';
			case 'power_saving':
				return 'Power Saving';
			case 'aggressive':
				return 'Aggressive Saving';
			case 'emergency':
				return 'Emergency Mode';
		}
	},

	/**
	 * Calculate estimated usage time
	 */
	calculateUsageTime(batteryLevel: number, consumptionRate: number): string {
		if (consumptionRate <= 0) {
			return 'Unknown';
		}

		const minutes = (batteryLevel / 100) * (3000 / (consumptionRate / 60));

		if (minutes < 60) {
			return `${Math.floor(minutes)}m`;
		} else {
			const hours = Math.floor(minutes / 60);
			const mins = Math.floor(minutes % 60);
			return `${hours}h ${mins}m`;
		}
	},

	/**
	 * Get power saving recommendation
	 */
	getPowerSavingRecommendation(batteryLevel: number, isCharging: boolean): string {
		if (isCharging) {
			return 'Device is charging - full performance available';
		} else if (batteryLevel > 50) {
			return 'Battery level good - no power saving needed';
		} else if (batteryLevel > 20) {
			return 'Consider enabling power saving mode';
		} else if (batteryLevel > 10) {
			return 'Enable aggressive power saving';
		} else {
			return 'Critical battery level - emergency mode recommended';
		}
	},
};
