import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('react-native', () => ({
	Platform: { OS: 'ios', select: (obj: any) => obj.ios || obj.default },
	AppState: { addEventListener: vi.fn(() => ({ remove: vi.fn() })) },
}));
vi.mock('expo-modules-core', () => ({
	NativeModule: class {},
	requireOptionalNativeModule: () => undefined,
	Platform: { OS: 'web' },
}));

import { DeviceResourceManager, ResourceUtils } from '@/services/ai/models/device-resource-manager';

describe('DeviceResourceManager', () => {
	let resourceManager: DeviceResourceManager;

	beforeEach(() => {
		// Mock AppState using vi.spyOn
		const ReactNative = require('react-native');
		vi.spyOn(ReactNative.AppState, 'addEventListener').mockImplementation(
			(event: any, callback: any) => {
				return {
					remove: vi.fn(),
				};
			},
		);
	});

	beforeEach(() => {
		vi.clearAllMocks();
		resourceManager = new DeviceResourceManager();
	});

	// Task 3.1: Implement DeviceResourceManager for monitoring system resources
	describe('Resource Monitoring (Task 3.1)', () => {
		it('should initialize successfully', async () => {
			await expect(resourceManager.initialize()).resolves.not.toThrow();
		});

		it('should get current resource usage', async () => {
			const usage = await resourceManager.getCurrentResourceUsage();

			expect(usage).toEqual(
				expect.objectContaining({
					memory: expect.objectContaining({
						used: expect.any(Number),
						available: expect.any(Number),
						total: expect.any(Number),
						percentage: expect.any(Number),
						pressure: expect.any(String),
					}),
					cpu: expect.objectContaining({
						usage: expect.any(Number),
						temperature: expect.any(Number),
						cores: expect.any(Number),
						frequency: expect.any(Number),
						throttled: expect.any(Boolean),
					}),
					thermal: expect.objectContaining({
						state: expect.any(String),
						temperature: expect.any(Number),
						throttlingActive: expect.any(Boolean),
						recommendedAction: expect.any(String),
					}),
					battery: expect.objectContaining({
						level: expect.any(Number),
						isCharging: expect.any(Boolean),
						chargingState: expect.any(String),
						estimatedTimeRemaining: expect.any(Number),
						powerSavingMode: expect.any(Boolean),
						lowPowerModeActive: expect.any(Boolean),
					}),
					timestamp: expect.any(Number),
				}),
			);
		});

		it('should start and stop monitoring', () => {
			const setIntervalSpy = vi.spyOn(global, 'setInterval');
			const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

			resourceManager.startMonitoring();
			expect(setIntervalSpy).toHaveBeenCalled();
			expect(resourceManager['isMonitoring']).toBe(true);

			resourceManager.stopMonitoring();
			expect(clearIntervalSpy).toHaveBeenCalled();
			expect(resourceManager['isMonitoring']).toBe(false);
		});

		it('should check if resources are healthy', async () => {
			await resourceManager.initialize();

			// Mock a healthy state
			vi.spyOn(resourceManager as any, 'currentUsage', 'get').mockReturnValue({
				memory: { pressure: 'low', percentage: 30 },
				cpu: { usage: 20, throttled: false },
				thermal: { state: 'nominal', throttlingActive: false },
				battery: { level: 80, isCharging: true },
			});

			expect(resourceManager.isResourcesHealthy()).toBe(true);

			// Mock an unhealthy state
			vi.spyOn(resourceManager as any, 'currentUsage', 'get').mockReturnValue({
				memory: { pressure: 'critical', percentage: 95 },
				cpu: { usage: 90, throttled: true },
				thermal: { state: 'critical', throttlingActive: true },
				battery: { level: 5, isCharging: false },
			});

			expect(resourceManager.isResourcesHealthy()).toBe(false);
		});

		it('should calculate resource health score', async () => {
			await resourceManager.initialize();

			// Mock a good state
			vi.spyOn(resourceManager as any, 'currentUsage', 'get').mockReturnValue({
				memory: { percentage: 20 },
				cpu: { usage: 30 },
				thermal: { state: 'nominal' },
				battery: { level: 90, isCharging: true },
			});

			const goodScore = resourceManager.getResourceHealthScore();
			expect(goodScore).toBeGreaterThan(80);

			// Mock a poor state
			vi.spyOn(resourceManager as any, 'currentUsage', 'get').mockReturnValue({
				memory: { percentage: 90 },
				cpu: { usage: 80 },
				thermal: { state: 'serious' },
				battery: { level: 10, isCharging: false },
			});

			const poorScore = resourceManager.getResourceHealthScore();
			expect(poorScore).toBeLessThan(50);
		});
	});

	// Task 3.2: Add performance optimization and throttling mechanisms
	describe('Performance Optimization (Task 3.2)', () => {
		it('should optimize resources', async () => {
			const gcSpy = vi.spyOn(global, 'gc' as any, 'get').mockReturnValue(vi.fn());
			const clearCachesSpy = vi.spyOn(resourceManager as any, 'clearNonEssentialCaches');

			await resourceManager.optimizeResources();

			// If gc is available, it should be called
			if (global.gc) {
				expect(gcSpy).toHaveBeenCalled();
			}

			expect(clearCachesSpy).toHaveBeenCalled();
		});

		it('should update monitoring configuration', () => {
			const originalInterval = resourceManager.getConfig().updateInterval;
			const newInterval = originalInterval * 2;

			resourceManager.updateConfig({ updateInterval: newInterval });

			expect(resourceManager.getConfig().updateInterval).toBe(newInterval);
		});

		it('should check thresholds and emit events', async () => {
			const emitEventSpy = vi.spyOn(resourceManager as any, 'emitEvent');

			// Mock critical memory usage
			const criticalMemory = {
				memory: { percentage: 95, pressure: 'critical' },
				cpu: { usage: 50, temperature: 60 },
				thermal: { state: 'nominal', temperature: 50 },
				battery: { level: 50, isCharging: true },
				timestamp: Date.now(),
			};

			await resourceManager.initialize();
			(resourceManager as any).checkThresholds(null, criticalMemory);

			expect(emitEventSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'memory_critical',
					severity: 'critical',
				}),
			);
		});
	});

	// Task 3.3: Implement battery optimization features
	describe('Battery Optimization (Task 3.3)', () => {
		it('should detect battery status', async () => {
			const batteryStatus = await (resourceManager as any).getBatteryStatus();

			expect(batteryStatus).toEqual(
				expect.objectContaining({
					level: expect.any(Number),
					isCharging: expect.any(Boolean),
					chargingState: expect.any(String),
					estimatedTimeRemaining: expect.any(Number),
					powerSavingMode: expect.any(Boolean),
					lowPowerModeActive: expect.any(Boolean),
				}),
			);
		});

		it('should emit battery events when thresholds are crossed', async () => {
			const emitEventSpy = vi.spyOn(resourceManager as any, 'emitEvent');

			// Mock critical battery level
			const criticalBattery = {
				memory: { percentage: 50, pressure: 'medium' },
				cpu: { usage: 50, temperature: 60 },
				thermal: { state: 'nominal', temperature: 50 },
				battery: { level: 5, isCharging: false },
				timestamp: Date.now(),
			};

			await resourceManager.initialize();
			(resourceManager as any).checkThresholds(null, criticalBattery);

			expect(emitEventSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'battery_critical',
					severity: 'critical',
				}),
			);
		});

		it('should detect power saving mode changes', async () => {
			const emitEventSpy = vi.spyOn(resourceManager as any, 'emitEvent');

			// Mock power saving mode activation
			const previousState = {
				memory: { percentage: 50 },
				cpu: { usage: 50 },
				thermal: { state: 'nominal' },
				battery: { powerSavingMode: false },
				timestamp: Date.now() - 1000,
			};

			const newState = {
				memory: { percentage: 50 },
				cpu: { usage: 50 },
				thermal: { state: 'nominal' },
				battery: { powerSavingMode: true },
				timestamp: Date.now(),
			};

			await resourceManager.initialize();
			(resourceManager as any).checkThresholds(previousState, newState);

			expect(emitEventSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'power_saving_enabled',
					severity: 'info',
				}),
			);
		});

		it('should handle app state changes for background/foreground detection', () => {
			const appStateCallback = vi.mocked(require('react-native').AppState.addEventListener)
				.mock.calls[0][1];
			const emitEventSpy = vi.spyOn(resourceManager as any, 'emitEvent');

			// Simulate app going to background
			appStateCallback('background');

			expect(resourceManager['isInBackground']).toBe(true);
			expect(emitEventSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'background_mode',
				}),
			);

			// Simulate app coming to foreground
			appStateCallback('active');

			expect(resourceManager['isInBackground']).toBe(false);
			expect(emitEventSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'foreground_mode',
				}),
			);
		});
	});

	// Test ResourceUtils
	describe('ResourceUtils', () => {
		it('should format memory size correctly', () => {
			expect(ResourceUtils.formatMemorySize(512)).toBe('512 MB');
			expect(ResourceUtils.formatMemorySize(2048)).toBe('2.0 GB');
		});

		it('should format temperature correctly', () => {
			expect(ResourceUtils.formatTemperature(37.5)).toBe('37.5°C');
		});

		it('should format time remaining correctly', () => {
			expect(ResourceUtils.formatTimeRemaining(-1)).toBe('Unknown');
			expect(ResourceUtils.formatTimeRemaining(30)).toBe('30m');
			expect(ResourceUtils.formatTimeRemaining(90)).toBe('1h 30m');
		});

		it('should get appropriate status colors', () => {
			const thresholds = { warning: 70, critical: 90 };

			expect(ResourceUtils.getResourceStatusColor(50, thresholds)).toBe('#44AA44'); // Green
			expect(ResourceUtils.getResourceStatusColor(80, thresholds)).toBe('#FF8800'); // Orange
			expect(ResourceUtils.getResourceStatusColor(95, thresholds)).toBe('#FF4444'); // Red
		});

		it('should get thermal state colors', () => {
			expect(ResourceUtils.getThermalStateColor('nominal')).toBe('#44AA44'); // Green
			expect(ResourceUtils.getThermalStateColor('fair')).toBe('#AAAA44'); // Yellow
			expect(ResourceUtils.getThermalStateColor('serious')).toBe('#FF8800'); // Orange
			expect(ResourceUtils.getThermalStateColor('critical')).toBe('#FF4444'); // Red
		});

		it('should estimate inference time based on resource state', () => {
			const baseTime = 1000; // 1 second

			const goodResources = {
				memory: { pressure: 'low' },
				cpu: { usage: 30 },
				thermal: { throttlingActive: false },
				battery: { isCharging: true, level: 80 },
				timestamp: Date.now(),
			};

			const poorResources = {
				memory: { pressure: 'critical' },
				cpu: { usage: 90 },
				thermal: { throttlingActive: true },
				battery: { isCharging: false, level: 10 },
				timestamp: Date.now(),
			};

			const goodTime = ResourceUtils.estimateInferenceTime(baseTime, goodResources as any);
			const poorTime = ResourceUtils.estimateInferenceTime(baseTime, poorResources as any);

			expect(poorTime).toBeGreaterThan(goodTime);
		});
	});

	// Test event handling
	describe('Event Handling', () => {
		it('should add and remove event listeners', () => {
			const callback = vi.fn();

			resourceManager.addEventListener(callback);
			expect(resourceManager['eventCallbacks']).toContain(callback);

			resourceManager.removeEventListener(callback);
			expect(resourceManager['eventCallbacks']).not.toContain(callback);
		});

		it('should emit events to all listeners', async () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			resourceManager.addEventListener(callback1);
			resourceManager.addEventListener(callback2);

			const event = {
				type: 'memory_warning' as const,
				severity: 'warning' as const,
				message: 'Test event',
				data: {},
				timestamp: Date.now(),
				actionRequired: false,
			};

			(resourceManager as any).emitEvent(event);

			expect(callback1).toHaveBeenCalledWith(event);
			expect(callback2).toHaveBeenCalledWith(event);
		});

		it('should handle errors in event callbacks', async () => {
			const errorCallback = vi.fn().mockImplementation(() => {
				throw new Error('Test error');
			});

			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			resourceManager.addEventListener(errorCallback);

			const event = {
				type: 'memory_warning' as const,
				severity: 'warning' as const,
				message: 'Test event',
				data: {},
				timestamp: Date.now(),
				actionRequired: false,
			};

			// Should not throw despite callback error
			expect(() => (resourceManager as any).emitEvent(event)).not.toThrow();
			expect(consoleErrorSpy).toHaveBeenCalled();
		});
	});

	// Test cleanup
	describe('Cleanup', () => {
		it('should dispose resources properly', () => {
			const stopMonitoringSpy = vi.spyOn(resourceManager, 'stopMonitoring');

			resourceManager.dispose();

			expect(stopMonitoringSpy).toHaveBeenCalled();
			expect(resourceManager['eventCallbacks']).toHaveLength(0);
			expect(resourceManager['currentUsage']).toBeNull();
		});
	});
});
