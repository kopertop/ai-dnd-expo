/**
 * Device Resource Manager for Local AI D&D Platform
 *
 * Real-time monitoring and management of device resources including
 * memory, CPU, thermal state, and battery for optimal AI model performance.
 *
 * Requirements: 3.1, 3.2, 3.3
 */

import { AppState, AppStateStatus, Platform } from 'react-native';

export interface MemoryStatus {
	used: number; // MB
	available: number; // MB
	total: number; // MB
	percentage: number; // 0-100
	pressure: 'low' | 'medium' | 'high' | 'critical';
}

export interface CPUStatus {
	usage: number; // 0-100 percentage
	temperature: number; // Celsius
	cores: number;
	frequency: number; // MHz
	throttled: boolean;
}

export interface ThermalStatus {
	state: 'nominal' | 'fair' | 'serious' | 'critical';
	temperature: number; // Celsius
	throttlingActive: boolean;
	recommendedAction: 'none' | 'reduce_performance' | 'pause_inference' | 'emergency_stop';
}

export interface BatteryStatus {
	level: number; // 0-100 percentage
	isCharging: boolean;
	chargingState: 'unknown' | 'unplugged' | 'charging' | 'full';
	estimatedTimeRemaining: number; // minutes, -1 if unknown
	powerSavingMode: boolean;
	lowPowerModeActive: boolean;
}

export interface ResourceUsage {
	memory: MemoryStatus;
	cpu: CPUStatus;
	thermal: ThermalStatus;
	battery: BatteryStatus;
	timestamp: number;
}

export interface ResourceThresholds {
	memory: {
		warning: number; // percentage
		critical: number; // percentage
	};
	cpu: {
		warning: number; // percentage
		critical: number; // percentage
		temperature: number; // Celsius
	};
	battery: {
		lowLevel: number; // percentage
		criticalLevel: number; // percentage
	};
	thermal: {
		warningTemp: number; // Celsius
		criticalTemp: number; // Celsius
	};
}

export interface ResourceMonitoringConfig {
	updateInterval: number; // milliseconds
	enableContinuousMonitoring: boolean;
	enableBackgroundMonitoring: boolean;
	thresholds: ResourceThresholds;
	enableAlerts: boolean;
	enableAutoOptimization: boolean;
}

export type ResourceEventType =
	| 'memory_warning'
	| 'memory_critical'
	| 'cpu_warning'
	| 'cpu_critical'
	| 'thermal_warning'
	| 'thermal_critical'
	| 'battery_low'
	| 'battery_critical'
	| 'power_saving_enabled'
	| 'background_mode'
	| 'foreground_mode';

export interface ResourceEvent {
	type: ResourceEventType;
	severity: 'info' | 'warning' | 'critical';
	message: string;
	data: unknown;
	timestamp: number;
	actionRequired: boolean;
}

export type ResourceEventCallback = (event: ResourceEvent) => void;

/**
 * Device Resource Manager
 * Monitors and manages device resources for optimal AI performance
 */
export class DeviceResourceManager {
	private config: ResourceMonitoringConfig;
	private isMonitoring = false;
	private monitoringInterval: ReturnType<typeof setInterval> | null = null;
	private currentUsage: ResourceUsage | null = null;
	private eventCallbacks: ResourceEventCallback[] = [];
	private appStateSubscription: { remove: () => void } | null = null;
	private isInBackground = false;

	// Default configuration
	private static readonly DEFAULT_CONFIG: ResourceMonitoringConfig = {
		updateInterval: 5000, // 5 seconds
		enableContinuousMonitoring: true,
		enableBackgroundMonitoring: false,
		thresholds: {
			memory: {
				warning: 80,
				critical: 90,
			},
			cpu: {
				warning: 70,
				critical: 85,
				temperature: 70, // Celsius
			},
			battery: {
				lowLevel: 20,
				criticalLevel: 10,
			},
			thermal: {
				warningTemp: 65,
				criticalTemp: 75,
			},
		},
		enableAlerts: true,
		enableAutoOptimization: true,
	};

	constructor(config?: Partial<ResourceMonitoringConfig>) {
		this.config = {
			...DeviceResourceManager.DEFAULT_CONFIG,
			...config,
		};

		this.setupAppStateListener();
	}

	/**
	* Initialize resource monitoring
	* Requirement 3.1: System resource monitoring
	*/
	async initialize(): Promise<void> {
		try {
			console.log('🔋 Initializing Device Resource Manager...');

			// Get initial resource readings
			this.currentUsage = await this.getCurrentResourceUsage();

			console.log('✅ Device Resource Manager initialized');
			console.log('📊 Initial resource usage:', this.currentUsage);

		} catch (error) {
			console.error('❌ Failed to initialize Device Resource Manager:', error);
			throw error;
		}
	}

	/**
	* Start continuous resource monitoring
	* Requirement 3.1: Continuous resource monitoring
	*/
	startMonitoring(): void {
		if (this.isMonitoring) {
			console.log('⚠️ Resource monitoring already active');
			return;
		}

		console.log('🔄 Starting resource monitoring...');
		this.isMonitoring = true;

		// Start monitoring loop
		this.monitoringInterval = setInterval(async () => {
			try {
				await this.updateResourceUsage();
			} catch (error) {
				console.error('❌ Error during resource monitoring:', error);
			}
		}, this.config.updateInterval);

		console.log('✅ Resource monitoring started');
	}

	/**
	* Stop resource monitoring
	*/
	stopMonitoring(): void {
		if (!this.isMonitoring) {
			return;
		}

		console.log('⏹️ Stopping resource monitoring...');

		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
			this.monitoringInterval = null;
		}

		this.isMonitoring = false;
		console.log('✅ Resource monitoring stopped');
	}

	/**
	* Get current resource usage
	* Requirement 3.1: Real-time resource monitoring
	*/
	async getCurrentResourceUsage(): Promise<ResourceUsage> {
		const [memory, cpu, thermal, battery] = await Promise.all([
			this.getMemoryStatus(),
			this.getCPUStatus(),
			this.getThermalStatus(),
			this.getBatteryStatus(),
		]);

		return {
			memory,
			cpu,
			thermal,
			battery,
			timestamp: Date.now(),
		};
	}

	/**
	* Get cached resource usage (last reading)
	*/
	getCachedResourceUsage(): ResourceUsage | null {
		return this.currentUsage;
	}

	/**
	* Check if device resources are healthy for AI inference
	* Requirement 3.1: Resource health assessment
	*/
	isResourcesHealthy(): boolean {
		if (!this.currentUsage) {
			return false;
		}

		const { memory, cpu, thermal, battery } = this.currentUsage;

		// Check memory pressure
		if (memory.pressure === 'critical' || memory.percentage > this.config.thresholds.memory.critical) {
			return false;
		}

		// Check CPU usage
		if (cpu.usage > this.config.thresholds.cpu.critical || cpu.throttled) {
			return false;
		}

		// Check thermal state
		if (thermal.state === 'critical' || thermal.throttlingActive) {
			return false;
		}

		// Check battery level
		if (battery.level < this.config.thresholds.battery.criticalLevel && !battery.isCharging) {
			return false;
		}

		return true;
	}

	/**
	* Get resource health score (0-100)
	*/
	getResourceHealthScore(): number {
		if (!this.currentUsage) {
			return 0;
		}

		const { memory, cpu, thermal, battery } = this.currentUsage;
		let score = 100;

		// Memory score (30% weight)
		const memoryScore = Math.max(0, 100 - memory.percentage);
		score -= (100 - memoryScore) * 0.3;

		// CPU score (25% weight)
		const cpuScore = Math.max(0, 100 - cpu.usage);
		score -= (100 - cpuScore) * 0.25;

		// Thermal score (25% weight)
		const thermalScore = thermal.state === 'nominal' ? 100 :
			thermal.state === 'fair' ? 75 :
				thermal.state === 'serious' ? 50 : 25;
		score -= (100 - thermalScore) * 0.25;

		// Battery score (20% weight)
		const batteryScore = battery.isCharging ? 100 : Math.max(0, battery.level);
		score -= (100 - batteryScore) * 0.2;

		return Math.max(0, Math.min(100, score));
	}

	/**
	* Add event callback for resource events
	*/
	addEventListener(callback: ResourceEventCallback): void {
		this.eventCallbacks.push(callback);
	}

	/**
	* Remove event callback
	*/
	removeEventListener(callback: ResourceEventCallback): void {
		const index = this.eventCallbacks.indexOf(callback);
		if (index > -1) {
			this.eventCallbacks.splice(index, 1);
		}
	}

	/**
	* Update monitoring configuration
	*/
	updateConfig(newConfig: Partial<ResourceMonitoringConfig>): void {
		this.config = {
			...this.config,
			...newConfig,
		};

		// Restart monitoring with new interval if changed
		if (this.isMonitoring && newConfig.updateInterval) {
			this.stopMonitoring();
			this.startMonitoring();
		}
	}

	/**
	* Get monitoring configuration
	*/
	getConfig(): ResourceMonitoringConfig {
		return { ...this.config };
	}

	/**
	* Force resource cleanup and optimization
	* Requirement 3.1: Resource optimization
	*/
	async optimizeResources(): Promise<void> {
		console.log('🧹 Optimizing device resources...');

		try {
			// Force garbage collection if available
			if (global.gc) {
				global.gc();
			}

			// Clear any cached data that's not essential
			await this.clearNonEssentialCaches();

			// Update resource readings
			await this.updateResourceUsage();

			console.log('✅ Resource optimization completed');

		} catch (error) {
			console.error('❌ Failed to optimize resources:', error);
		}
	}

	// Private methods

	/**
	* Update current resource usage and check thresholds
	*/
	private async updateResourceUsage(): Promise<void> {
		// Skip monitoring in background if disabled
		if (this.isInBackground && !this.config.enableBackgroundMonitoring) {
			return;
		}

		const previousUsage = this.currentUsage;
		this.currentUsage = await this.getCurrentResourceUsage();

		// Check for threshold violations and emit events
		if (this.config.enableAlerts) {
			this.checkThresholds(previousUsage, this.currentUsage);
		}

		// Auto-optimization if enabled
		if (this.config.enableAutoOptimization) {
			await this.autoOptimize();
		}
	}

	/**
	* Get memory status using iOS-specific APIs
	* Requirement 3.1: Memory usage monitoring with iOS-specific APIs
	*/
	private async getMemoryStatus(): Promise<MemoryStatus> {
		try {
			// In a real implementation, this would use native modules
			// For now, we'll simulate with reasonable estimates

			const totalMemory = Platform.OS === 'ios' ? 4096 : 3072; // MB
			const usedMemory = Math.floor(totalMemory * (0.3 + Math.random() * 0.4)); // 30-70%
			const availableMemory = totalMemory - usedMemory;
			const percentage = Math.floor((usedMemory / totalMemory) * 100);

			let pressure: 'low' | 'medium' | 'high' | 'critical';
			if (percentage < 60) {
				pressure = 'low';
			} else if (percentage < 80) {
				pressure = 'medium';
			} else if (percentage < 90) {
				pressure = 'high';
			} else {
				pressure = 'critical';
			}

			return {
				used: usedMemory,
				available: availableMemory,
				total: totalMemory,
				percentage,
				pressure,
			};

		} catch (error) {
			console.error('❌ Failed to get memory status:', error);

			// Fallback values
			return {
				used: 2048,
				available: 1024,
				total: 3072,
				percentage: 67,
				pressure: 'medium',
			};
		}
	}

	/**
	* Get CPU status with usage tracking and thermal monitoring
	* Requirement 3.1: CPU usage tracking and thermal state monitoring
	*/
	private async getCPUStatus(): Promise<CPUStatus> {
		try {
			// In a real implementation, this would use native CPU monitoring APIs
			// For now, we'll simulate realistic values

			const cores = Platform.OS === 'ios' ? 6 : 8;
			const usage = Math.floor(20 + Math.random() * 40); // 20-60% usage
			const temperature = 35 + Math.random() * 25; // 35-60°C
			const frequency = Platform.OS === 'ios' ? 3200 : 2800; // MHz
			const throttled = temperature > this.config.thresholds.cpu.temperature;

			return {
				usage,
				temperature,
				cores,
				frequency,
				throttled,
			};

		} catch (error) {
			console.error('❌ Failed to get CPU status:', error);

			// Fallback values
			return {
				usage: 30,
				temperature: 45,
				cores: 6,
				frequency: 2400,
				throttled: false,
			};
		}
	}

	/**
	* Get thermal status
	* Requirement 3.1: Thermal state monitoring
	*/
	private async getThermalStatus(): Promise<ThermalStatus> {
		try {
			// In a real implementation, this would use iOS ProcessInfo.thermalState
			// or Android thermal APIs

			const temperature = 35 + Math.random() * 20; // 35-55°C

			let state: 'nominal' | 'fair' | 'serious' | 'critical';
			let recommendedAction: 'none' | 'reduce_performance' | 'pause_inference' | 'emergency_stop';

			if (temperature < this.config.thresholds.thermal.warningTemp) {
				state = 'nominal';
				recommendedAction = 'none';
			} else if (temperature < this.config.thresholds.thermal.criticalTemp) {
				state = 'fair';
				recommendedAction = 'reduce_performance';
			} else if (temperature < this.config.thresholds.thermal.criticalTemp + 10) {
				state = 'serious';
				recommendedAction = 'pause_inference';
			} else {
				state = 'critical';
				recommendedAction = 'emergency_stop';
			}

			const throttlingActive = state === 'serious' || state === 'critical';

			return {
				state,
				temperature,
				throttlingActive,
				recommendedAction,
			};

		} catch (error) {
			console.error('❌ Failed to get thermal status:', error);

			// Fallback values
			return {
				state: 'nominal',
				temperature: 40,
				throttlingActive: false,
				recommendedAction: 'none',
			};
		}
	}

	/**
	* Get battery status with power state detection
	* Requirement 3.1: Battery level monitoring and power state detection
	*/
	private async getBatteryStatus(): Promise<BatteryStatus> {
		try {
			// In a real implementation, this would use react-native-battery
			// or native battery APIs

			const level = Math.floor(20 + Math.random() * 70); // 20-90%
			const isCharging = Math.random() > 0.7; // 30% chance of charging
			const chargingState = isCharging ? 'charging' : 'unplugged';
			const estimatedTimeRemaining = isCharging ? -1 : Math.floor(level * 8); // rough estimate
			const powerSavingMode = level < this.config.thresholds.battery.lowLevel;
			const lowPowerModeActive = level < this.config.thresholds.battery.criticalLevel;

			return {
				level,
				isCharging,
				chargingState,
				estimatedTimeRemaining,
				powerSavingMode,
				lowPowerModeActive,
			};

		} catch (error) {
			console.error('❌ Failed to get battery status:', error);

			// Fallback values
			return {
				level: 50,
				isCharging: false,
				chargingState: 'unknown',
				estimatedTimeRemaining: 400,
				powerSavingMode: false,
				lowPowerModeActive: false,
			};
		}
	}

	/**
	* Check resource thresholds and emit events
	*/
	private checkThresholds(previous: ResourceUsage | null, current: ResourceUsage): void {
		// Memory threshold checks
		if (current.memory.percentage > this.config.thresholds.memory.critical) {
			this.emitEvent({
				type: 'memory_critical',
				severity: 'critical',
				message: `Memory usage critical: ${current.memory.percentage}%`,
				data: current.memory,
				timestamp: Date.now(),
				actionRequired: true,
			});
		} else if (current.memory.percentage > this.config.thresholds.memory.warning) {
			this.emitEvent({
				type: 'memory_warning',
				severity: 'warning',
				message: `Memory usage high: ${current.memory.percentage}%`,
				data: current.memory,
				timestamp: Date.now(),
				actionRequired: false,
			});
		}

		// CPU threshold checks
		if (current.cpu.usage > this.config.thresholds.cpu.critical) {
			this.emitEvent({
				type: 'cpu_critical',
				severity: 'critical',
				message: `CPU usage critical: ${current.cpu.usage}%`,
				data: current.cpu,
				timestamp: Date.now(),
				actionRequired: true,
			});
		} else if (current.cpu.usage > this.config.thresholds.cpu.warning) {
			this.emitEvent({
				type: 'cpu_warning',
				severity: 'warning',
				message: `CPU usage high: ${current.cpu.usage}%`,
				data: current.cpu,
				timestamp: Date.now(),
				actionRequired: false,
			});
		}

		// Thermal threshold checks
		if (current.thermal.state === 'critical') {
			this.emitEvent({
				type: 'thermal_critical',
				severity: 'critical',
				message: `Device overheating: ${current.thermal.temperature}°C`,
				data: current.thermal,
				timestamp: Date.now(),
				actionRequired: true,
			});
		} else if (current.thermal.state === 'serious') {
			this.emitEvent({
				type: 'thermal_warning',
				severity: 'warning',
				message: `Device temperature high: ${current.thermal.temperature}°C`,
				data: current.thermal,
				timestamp: Date.now(),
				actionRequired: true,
			});
		}

		// Battery threshold checks
		if (current.battery.level < this.config.thresholds.battery.criticalLevel && !current.battery.isCharging) {
			this.emitEvent({
				type: 'battery_critical',
				severity: 'critical',
				message: `Battery critically low: ${current.battery.level}%`,
				data: current.battery,
				timestamp: Date.now(),
				actionRequired: true,
			});
		} else if (current.battery.level < this.config.thresholds.battery.lowLevel && !current.battery.isCharging) {
			this.emitEvent({
				type: 'battery_low',
				severity: 'warning',
				message: `Battery low: ${current.battery.level}%`,
				data: current.battery,
				timestamp: Date.now(),
				actionRequired: false,
			});
		}

		// Power saving mode detection
		if (current.battery.powerSavingMode && (!previous || !previous.battery.powerSavingMode)) {
			this.emitEvent({
				type: 'power_saving_enabled',
				severity: 'info',
				message: 'Power saving mode enabled',
				data: current.battery,
				timestamp: Date.now(),
				actionRequired: false,
			});
		}
	}

	/**
	* Emit resource event to all listeners
	*/
	private emitEvent(event: ResourceEvent): void {
		console.log(`📊 Resource Event [${event.severity.toUpperCase()}]: ${event.message}`);

		this.eventCallbacks.forEach(callback => {
			try {
				callback(event);
			} catch (error) {
				console.error('❌ Error in resource event callback:', error);
			}
		});
	}

	/**
	* Auto-optimization based on current resource state
	*/
	private async autoOptimize(): Promise<void> {
		if (!this.currentUsage) {
			return;
		}

		const { memory, cpu, thermal, battery } = this.currentUsage;

		// Auto-optimize if resources are under pressure
		if (memory.pressure === 'high' || memory.pressure === 'critical' ||
			cpu.usage > this.config.thresholds.cpu.warning ||
			thermal.state === 'serious' || thermal.state === 'critical' ||
			(battery.level < this.config.thresholds.battery.lowLevel && !battery.isCharging)) {

			await this.optimizeResources();
		}
	}

	/**
	* Clear non-essential caches to free memory
	*/
	private async clearNonEssentialCaches(): Promise<void> {
		// This would clear various caches in a real implementation
		// For now, we'll just log the action
		console.log('🧹 Clearing non-essential caches...');
	}

	/**
	* Setup app state listener for background/foreground detection
	*/
	private setupAppStateListener(): void {
		this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
			const wasInBackground = this.isInBackground;
			this.isInBackground = nextAppState === 'background' || nextAppState === 'inactive';

			if (wasInBackground !== this.isInBackground) {
				this.emitEvent({
					type: this.isInBackground ? 'background_mode' : 'foreground_mode',
					severity: 'info',
					message: `App entered ${this.isInBackground ? 'background' : 'foreground'} mode`,
					data: { appState: nextAppState },
					timestamp: Date.now(),
					actionRequired: false,
				});
			}
		});
	}

	/**
	* Cleanup resources and stop monitoring
	*/
	dispose(): void {
		this.stopMonitoring();

		if (this.appStateSubscription) {
			this.appStateSubscription.remove();
			this.appStateSubscription = null;
		}

		this.eventCallbacks = [];
		this.currentUsage = null;
	}
}

/**
 * Utility functions for resource management
 */
export const ResourceUtils = {
	/**
	* Format memory size in human-readable format
	*/
	formatMemorySize(sizeInMB: number): string {
		if (sizeInMB < 1024) {
			return `${sizeInMB.toFixed(0)} MB`;
		} else {
			return `${(sizeInMB / 1024).toFixed(1)} GB`;
		}
	},

	/**
	* Format temperature in human-readable format
	*/
	formatTemperature(celsius: number): string {
		return `${celsius.toFixed(1)}°C`;
	},

	/**
	* Format battery time remaining
	*/
	formatTimeRemaining(minutes: number): string {
		if (minutes < 0) {
			return 'Unknown';
		} else if (minutes < 60) {
			return `${minutes}m`;
		} else {
			const hours = Math.floor(minutes / 60);
			const mins = minutes % 60;
			return `${hours}h ${mins}m`;
		}
	},

	/**
	* Get resource status color for UI
	*/
	getResourceStatusColor(percentage: number, thresholds: { warning: number; critical: number }): string {
		if (percentage >= thresholds.critical) {
			return '#FF4444'; // Red
		} else if (percentage >= thresholds.warning) {
			return '#FF8800'; // Orange
		} else {
			return '#44AA44'; // Green
		}
	},

	/**
	* Get thermal state color for UI
	*/
	getThermalStateColor(state: 'nominal' | 'fair' | 'serious' | 'critical'): string {
		switch (state) {
		case 'nominal': return '#44AA44'; // Green
		case 'fair': return '#AAAA44'; // Yellow
		case 'serious': return '#FF8800'; // Orange
		case 'critical': return '#FF4444'; // Red
		}
	},

	/**
	* Calculate estimated inference time based on resource state
	*/
	estimateInferenceTime(baseTimeMs: number, resourceUsage: ResourceUsage): number {
		let multiplier = 1.0;

		// Memory pressure impact
		if (resourceUsage.memory.pressure === 'high') {
			multiplier *= 1.3;
		} else if (resourceUsage.memory.pressure === 'critical') {
			multiplier *= 1.8;
		}

		// CPU usage impact
		if (resourceUsage.cpu.usage > 80) {
			multiplier *= 1.4;
		} else if (resourceUsage.cpu.usage > 60) {
			multiplier *= 1.2;
		}

		// Thermal throttling impact
		if (resourceUsage.thermal.throttlingActive) {
			multiplier *= 1.5;
		}

		// Battery impact (if not charging and low)
		if (!resourceUsage.battery.isCharging && resourceUsage.battery.level < 20) {
			multiplier *= 1.2;
		}

		return Math.ceil(baseTimeMs * multiplier);
	},
};
