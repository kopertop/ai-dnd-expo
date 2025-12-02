import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DeviceResourceManager, ResourceUtils } from '@/services/ai/models/device-resource-manager';

describe('DeviceResourceManager (stub)', () => {
	let manager: DeviceResourceManager;

	beforeEach(() => {
		vi.useFakeTimers();
		manager = new DeviceResourceManager();
	});

	it('initializes and returns resource usage', async () => {
		await expect(manager.initialize()).resolves.not.toThrow();
		const usage = await manager.getCurrentResourceUsage();
		expect(usage.memory.total).toBeGreaterThan(0);
		expect(usage.cpu.usage).toBeGreaterThanOrEqual(0);
		expect(usage.battery.level).toBeGreaterThanOrEqual(0);
	});

	it('starts and stops monitoring', () => {
		manager.startMonitoring();
		expect(manager.isMonitoring).toBe(true);
		manager.stopMonitoring();
		expect(manager.isMonitoring).toBe(false);
	});

	it('reports cached usage without throwing', () => {
		expect(manager.getCachedResourceUsage()).toBeNull();
	});

	it('provides utility formatters', () => {
		expect(ResourceUtils.formatMemorySize(1024 * 1024)).toContain('MB');
		expect(ResourceUtils.formatTemperature(42)).toContain('42');
		expect(ResourceUtils.formatTimeRemaining(10)).toContain('10');
	});
});
