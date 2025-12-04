export interface ResourceUsage {
	memory: { used: number; available: number; total: number; percentage: number; pressure: string };
	cpu: { usage: number; temperature: number; cores: number; frequency: number; throttled: boolean };
	thermal: { state: string; temperature: number; throttlingActive: boolean; recommendedAction: string };
	battery: {
		level: number;
		isCharging: boolean;
		chargingState: string;
		estimatedTimeRemaining: number;
		powerSavingMode: boolean;
		lowPowerModeActive: boolean;
	};
	timestamp: number;
}

export interface BatteryStatus {
	level: number;
	isCharging: boolean;
	chargingState: string;
	estimatedTimeRemaining: number;
	powerSavingMode: boolean;
	lowPowerModeActive: boolean;
}

export interface ResourceEvent {
	type: string;
	severity: string;
	message?: string;
	actionRequired?: boolean;
	data?: ResourceUsage;
}

export interface ResourceManagerConfig {
	updateInterval: number;
	memoryPressureThreshold: number;
	thermalThreshold: number;
}

export const DefaultResourceManagerConfig: ResourceManagerConfig = {
	updateInterval: 1000,
	memoryPressureThreshold: 90,
	thermalThreshold: 85,
};

export const ResourceUtils = {
	formatMemorySize: (bytes: number) => `${Math.round(bytes / (1024 * 1024))}MB`,
	formatTemperature: (celsius: number) => `${celsius}°C`,
	formatTimeRemaining: (minutes: number) => `${Math.round(minutes)}m`,
	getStatusColor: (status: string) => (status === 'critical' ? 'red' : status === 'warning' ? 'yellow' : 'green'),
	getThermalColor: (state: string) => (state === 'critical' ? 'red' : state === 'serious' ? 'orange' : 'green'),
	estimateInferenceTime: (_state: any) => 1000,
};

export class DeviceResourceManager {
	private config: ResourceManagerConfig = { ...DefaultResourceManagerConfig };
	private currentUsage: ResourceUsage | null = null;
	private intervalId: ReturnType<typeof setInterval> | null = null;
	private listeners: Array<(event: any) => void> = [];
	public isMonitoring = false;

	async initialize(): Promise<void> {
		this.currentUsage = this.generateUsage();
	}

	getConfig() {
		return this.config;
	}

	updateConfig(partial: Partial<ResourceManagerConfig>) {
		this.config = { ...this.config, ...partial };
	}

	startMonitoring() {
		this.isMonitoring = true;
		this.intervalId = setInterval(() => {
			this.currentUsage = this.generateUsage();
			this.checkThresholds(null, this.currentUsage);
		}, this.config.updateInterval);
	}

	stopMonitoring() {
		if (this.intervalId) {
			clearInterval(this.intervalId);
		}
		this.isMonitoring = false;
	}

	async getCurrentResourceUsage(): Promise<ResourceUsage> {
		this.currentUsage = this.currentUsage ?? this.generateUsage();
		return this.currentUsage;
	}

	isResourcesHealthy(): boolean {
		const usage = this.currentUsage ?? this.generateUsage();
		const healthyMemory = usage.memory.pressure !== 'critical' && usage.memory.percentage < 90;
		const healthyCpu = usage.cpu.usage < 90 && !usage.cpu.throttled;
		const healthyThermal = usage.thermal.state !== 'critical';
		const healthyBattery = usage.battery.level > 10 || usage.battery.isCharging;
		return healthyMemory && healthyCpu && healthyThermal && healthyBattery;
	}

	getResourceHealthScore(): number {
		const usage = this.currentUsage ?? this.generateUsage();
		const memoryScore = Math.max(0, 100 - usage.memory.percentage);
		const cpuScore = Math.max(0, 100 - usage.cpu.usage);
		const thermalScore = usage.thermal.state === 'nominal' ? 100 : usage.thermal.state === 'serious' ? 50 : 20;
		const batteryScore = usage.battery.level;
		return Math.round((memoryScore + cpuScore + thermalScore + batteryScore) / 4);
	}

	async optimizeResources(): Promise<void> {
		if (typeof global.gc === 'function') {
			global.gc();
		}
		this.clearNonEssentialCaches();
	}

	updateMonitoringConfig(config: Partial<ResourceManagerConfig>) {
		this.config = { ...this.config, ...config };
	}

	checkThresholds(_prev: ResourceUsage | null, next: ResourceUsage) {
		if (next.memory.percentage >= this.config.memoryPressureThreshold) {
			this.emitEvent({ type: 'memory_critical', severity: 'critical', data: next });
		}
		if (next.thermal.temperature >= this.config.thermalThreshold) {
			this.emitEvent({ type: 'thermal_warning', severity: 'warning', data: next });
		}
	}

	private emitEvent(event: any) {
		this.listeners.forEach(listener => listener(event));
	}

	addEventListener(listener: (event: any) => void) {
		this.listeners.push(listener);
	}

	removeEventListener(listener: (event: any) => void) {
		this.listeners = this.listeners.filter(l => l !== listener);
	}

	private clearNonEssentialCaches() {
		// no-op stub
	}

	private generateUsage(): ResourceUsage {
		return {
			memory: { used: 1024, available: 3072, total: 4096, percentage: 25, pressure: 'low' },
			cpu: { usage: 30, temperature: 45, cores: 6, frequency: 2400, throttled: false },
			thermal: { state: 'nominal', temperature: 45, throttlingActive: false, recommendedAction: 'none' },
			battery: {
				level: 80,
				isCharging: true,
				chargingState: 'charging',
				estimatedTimeRemaining: 120,
				powerSavingMode: false,
				lowPowerModeActive: false,
			},
			timestamp: Date.now(),
		};
	}

	getCachedResourceUsage(): ResourceUsage | null {
		return this.currentUsage;
	}
}
