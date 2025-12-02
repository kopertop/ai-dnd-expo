import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DeviceCapabilityManager } from '@/services/ai/models/device-capability-manager';
import { ModelQuantizationManager } from '@/services/ai/models/model-quantization-manager';

describe('ModelQuantizationManager', () => {
	let quantizationManager: ModelQuantizationManager;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(DeviceCapabilityManager.prototype, 'getDeviceCapabilities').mockReturnValue({
			memory: {
				total: 4096,
				available: 2048,
			},
			cpu: {
				cores: 6,
				architecture: 'arm64',
			},
			gpu: {
				available: true,
				type: 'integrated',
			},
			platform: 'ios',
		});
		vi.spyOn(DeviceCapabilityManager.prototype, 'hasNeuralEngine').mockReturnValue(true);
		vi.spyOn(DeviceCapabilityManager.prototype, 'getMemoryClass').mockReturnValue('high');

		quantizationManager = new ModelQuantizationManager();
	});

	describe('Model Quantization Support', () => {
		it('should recommend optimal quantization level for device', () => {
			const recommendation = quantizationManager.getRecommendedQuantization();

			expect(['int8', 'int4', 'fp16', 'fp32']).toContain(recommendation);
		});

		it('should recommend different quantization levels based on device capabilities', () => {
			// Mock high-end device
			vi.spyOn(
				quantizationManager['deviceCapabilityManager'],
				'getDeviceCapabilities',
			).mockReturnValue({
				memory: {
					total: 8192,
					available: 4096,
				},
				cpu: {
					cores: 8,
					architecture: 'arm64',
				},
				gpu: {
					available: true,
					type: 'dedicated',
				},
				platform: 'ios',
			});

			const highEndRecommendation = quantizationManager.getRecommendedQuantization();

			// Mock low-end device
			vi.spyOn(
				quantizationManager['deviceCapabilityManager'],
				'getDeviceCapabilities',
			).mockReturnValue({
				memory: {
					total: 2048,
					available: 512,
				},
				cpu: {
					cores: 4,
					architecture: 'arm64',
				},
				gpu: {
					available: false,
					type: 'none',
				},
				platform: 'ios',
			});

			const lowEndRecommendation = quantizationManager.getRecommendedQuantization();

			expect(['fp16', 'fp32']).toContain(highEndRecommendation);
			expect(['int4', 'int8']).toContain(lowEndRecommendation);
		});

		it('should get quantization options for model', () => {
			const options = quantizationManager.getQuantizationOptions('gemma-3-2b');

			expect(options).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						type: expect.any(String),
						sizeReduction: expect.any(Number),
						speedImpact: expect.any(String),
						qualityImpact: expect.any(String),
					}),
				]),
			);
		});

		it('should estimate model size after quantization', () => {
			const originalSize = 1024 * 1024 * 1024; // 1GB

			const int8Size = quantizationManager.estimateQuantizedSize(
				originalSize,
				'int8',
			);
			const int4Size = quantizationManager.estimateQuantizedSize(
				originalSize,
				'int4',
			);
			const fp16Size = quantizationManager.estimateQuantizedSize(
				originalSize,
				'fp16',
			);

			expect(int4Size).toBeLessThan(int8Size);
			expect(int8Size).toBeLessThan(fp16Size);
		});

		it('should handle invalid quantization types', () => {
			const originalSize = 1024 * 1024 * 1024; // 1GB

			const unknownSize = quantizationManager.estimateQuantizedSize(
				originalSize,
				'unknown' as any,
			);
			expect(unknownSize).toBe(originalSize);
		});
	});
});
