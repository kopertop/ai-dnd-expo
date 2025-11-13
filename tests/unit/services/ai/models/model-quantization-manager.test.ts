import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ModelQuantizationManager } from '@/services/ai/models/model-quantization-manager';

describe('ModelQuantizationManager', () => {
	beforeEach(() => {
		// Mock dependencies using vi.spyOn
		const {
			DeviceCapabilityManager,
		} = require('../../../../../services/ai/models/device-capability-manager');
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

		describe('ModelQuantizationManager', () => {
			let quantizationManager: ModelQuantizationManager;

			beforeEach(() => {
				vi.clearAllMocks();
				quantizationManager = new ModelQuantizationManager();
			});

			// Task 2.3: Add model quantization support for different device capabilities
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

					// High-end device should get higher precision (fp16 or fp32)
					// Low-end device should get lower precision (int4 or int8)
					expect(
						highEndRecommendation === 'fp16' || highEndRecommendation === 'fp32',
					).toBe(true);
					expect(lowEndRecommendation === 'int4' || lowEndRecommendation === 'int8').toBe(
						true,
					);
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
					const fp32Size = quantizationManager.estimateQuantizedSize(
						originalSize,
						'fp32',
					);

					// Check relative sizes
					expect(int4Size).toBeLessThan(int8Size);
					expect(int8Size).toBeLessThan(fp16Size);
					expect(fp16Size).toBeLessThan(fp32Size);
					expect(fp32Size).toBe(originalSize); // fp32 is the original size
				});
			});

			// Test device-specific recommendations
			describe('Device-Specific Recommendations', () => {
				it('should recommend quantization based on memory constraints', () => {
					// Mock memory-constrained device
					vi.spyOn(
						quantizationManager['deviceCapabilityManager'],
						'getDeviceCapabilities',
					).mockReturnValue({
						memory: {
							total: 2048,
							available: 512,
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

					const recommendation = quantizationManager.getRecommendedQuantization();

					// Should recommend int4 or int8 for memory-constrained devices
					expect(recommendation === 'int4' || recommendation === 'int8').toBe(true);
				});

				it('should recommend quantization based on neural engine availability', () => {
					// Mock device with neural engine
					vi.spyOn(
						quantizationManager['deviceCapabilityManager'],
						'hasNeuralEngine',
					).mockReturnValue(true);

					const withNeuralEngine = quantizationManager.getRecommendedQuantization();

					// Mock device without neural engine
					vi.spyOn(
						quantizationManager['deviceCapabilityManager'],
						'hasNeuralEngine',
					).mockReturnValue(false);

					const withoutNeuralEngine = quantizationManager.getRecommendedQuantization();

					// Neural engine should allow for better quantization
					expect(['fp16', 'int8']).toContain(withNeuralEngine);
					expect(['int8', 'int4']).toContain(withoutNeuralEngine);
				});
			});

			// Test model variant selection
			describe('Model Variant Selection', () => {
				it('should select appropriate model variant based on device', () => {
					const variants = [
						{ name: 'gemma-3-2b-int4', quantization: 'int4', size: 512 * 1024 * 1024 },
						{ name: 'gemma-3-2b-int8', quantization: 'int8', size: 1024 * 1024 * 1024 },
						{ name: 'gemma-3-2b-fp16', quantization: 'fp16', size: 2048 * 1024 * 1024 },
						{ name: 'gemma-3-2b-fp32', quantization: 'fp32', size: 4096 * 1024 * 1024 },
					];

					// Mock high-memory device
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

					const highMemoryVariant = quantizationManager.selectBestModelVariant(variants);

					// Mock low-memory device
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

					const lowMemoryVariant = quantizationManager.selectBestModelVariant(variants);

					// High-memory device should get higher precision variant
					expect(
						highMemoryVariant.quantization === 'fp16' ||
							highMemoryVariant.quantization === 'fp32',
					).toBe(true);

					// Low-memory device should get lower precision variant
					expect(
						lowMemoryVariant.quantization === 'int4' ||
							lowMemoryVariant.quantization === 'int8',
					).toBe(true);
				});

				it('should handle empty variant list', () => {
					expect(() => quantizationManager.selectBestModelVariant([])).toThrow(
						'No model variants available',
					);
				});
			});

			// Test performance impact estimation
			describe('Performance Impact Estimation', () => {
				it('should estimate inference speed impact of quantization', () => {
					const int4Impact = quantizationManager.estimateInferenceSpeedImpact('int4');
					const int8Impact = quantizationManager.estimateInferenceSpeedImpact('int8');
					const fp16Impact = quantizationManager.estimateInferenceSpeedImpact('fp16');
					const fp32Impact = quantizationManager.estimateInferenceSpeedImpact('fp32');

					// Lower precision should be faster
					expect(int4Impact).toBeGreaterThan(int8Impact);
					expect(int8Impact).toBeGreaterThan(fp16Impact);
					expect(fp16Impact).toBeGreaterThan(fp32Impact);
				});

				it('should estimate quality impact of quantization', () => {
					const int4Quality = quantizationManager.estimateQualityImpact('int4');
					const int8Quality = quantizationManager.estimateQualityImpact('int8');
					const fp16Quality = quantizationManager.estimateQualityImpact('fp16');
					const fp32Quality = quantizationManager.estimateQualityImpact('fp32');

					// Higher precision should have better quality
					expect(int4Quality).toBeLessThan(int8Quality);
					expect(int8Quality).toBeLessThan(fp16Quality);
					expect(fp16Quality).toBeLessThan(fp32Quality);
				});
			});
		});
	});
});
