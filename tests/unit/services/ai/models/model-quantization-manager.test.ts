import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ModelQuantizationManager } from '@/services/ai/models/model-quantization-manager';

describe('ModelQuantizationManager (stub)', () => {
	let manager: ModelQuantizationManager;

	beforeEach(() => {
		manager = new ModelQuantizationManager();
	});

	it('recommends a quantization based on available memory', () => {
		vi.spyOn(manager['deviceCapabilityManager'], 'getDeviceCapabilities').mockReturnValue({
			availableMemory: 5000,
		} as any);
		expect(manager.getRecommendedQuantization()).toBe('fp16');
	});

	it('falls back to a smaller quantization for low-memory devices', () => {
		vi.spyOn(manager['deviceCapabilityManager'], 'getDeviceCapabilities').mockReturnValue({
			memory: { available: 256 },
		} as any);
		expect(['int4', 'int8']).toContain(manager.getRecommendedQuantization());
	});

	it('returns quantization options and size estimates', () => {
		const options = manager.getQuantizationOptions('gemma');
		expect(options.length).toBeGreaterThan(0);
		const estimated = manager.estimateQuantizedSize(100, 'int8');
		expect(estimated).toBeLessThan(100);
	});
});
