import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	ONNXModelManager,
	ONNXModelUtils,
} from '../../../../../services/ai/models/onnx-model-manager';

describe('ONNXModelManager', () => {
	beforeEach(() => {
		// Mock ONNX Runtime using vi.spyOn
		const ONNX = require('onnxruntime-react-native');
		vi.spyOn(ONNX.InferenceSession, 'create').mockResolvedValue({
			inputNames: ['input_ids', 'attention_mask'],
			outputNames: ['logits'],
			run: vi.fn().mockResolvedValue({
				logits: {
					data: new Float32Array([0.1, 0.2, 0.7]),
				},
			}),
		});

		// Mock fetch for model loading
		global.fetch = vi.fn().mockImplementation(url => {
			return Promise.resolve({
				ok: true,
				arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
				status: 200,
				statusText: 'OK',
			});
		});

		describe('ONNXModelManager', () => {
			let modelManager: ONNXModelManager;

			beforeEach(() => {
				vi.clearAllMocks();
				modelManager = new ONNXModelManager();
			});

			// Task 2.1: Create ONNXModelManager class for model lifecycle management
			describe('Model Lifecycle Management (Task 2.1)', () => {
				it('should load Gemma3 model successfully', async () => {
					const session = await modelManager.loadGemma3Model('/test/path/model.onnx');

					expect(session).toBeDefined();
					expect(
						vi.mocked(require('onnxruntime-react-native').InferenceSession.create),
					).toHaveBeenCalled();
				});

				it('should validate model file path', async () => {
					await expect(modelManager.loadGemma3Model('')).rejects.toThrow(
						'Model path is empty',
					);
					await expect(
						modelManager.loadGemma3Model('/test/path/model.txt'),
					).rejects.toThrow('Model file must have .onnx extension');
				});

				it('should validate model for Gemma3 compatibility', async () => {
					const mockSession = {
						inputNames: ['input_ids', 'attention_mask'],
						outputNames: ['logits'],
						run: vi.fn().mockResolvedValue({
							logits: {
								data: new Float32Array([0.1, 0.2, 0.7]),
							},
						}),
					};

					const isValid = await modelManager.validateModel(mockSession);
					expect(isValid).toBe(true);
				});

				it('should detect invalid models during validation', async () => {
					const invalidSession = {
						inputNames: ['wrong_input'],
						outputNames: ['wrong_output'],
						run: vi.fn(),
					};

					const isValid = await modelManager.validateModel(invalidSession);
					expect(isValid).toBe(false);
				});

				it('should clean up session and free memory', async () => {
					const mockSession = {
						inputNames: ['input_ids', 'attention_mask'],
						outputNames: ['logits'],
						run: vi.fn(),
					};

					await modelManager.cleanupSession(mockSession);
					expect(modelManager.isModelReady()).toBe(false);
				});
			});

			// Task 2.2: Implement Gemma3-specific tokenization and inference
			describe('Inference Execution (Task 2.2)', () => {
				it('should run inference with proper input/output handling', async () => {
					const mockSession = {
						inputNames: ['input_ids', 'attention_mask'],
						outputNames: ['logits'],
						run: vi.fn().mockResolvedValue({
							logits: {
								data: new Float32Array([0.1, 0.2, 0.7]),
							},
						}),
					};

					// Set model as validated
					vi.spyOn(modelManager as any, 'isValidated', 'get').mockReturnValue(true);

					const input = {
						input_ids: [1, 2, 3],
						attention_mask: [1, 1, 1],
					};

					const output = await modelManager.runInference(mockSession, input);

					expect(mockSession.run).toHaveBeenCalled();
					expect(output.logits).toBeDefined();
				});

				it('should throw error if model is not validated', async () => {
					const mockSession = {
						inputNames: ['input_ids', 'attention_mask'],
						outputNames: ['logits'],
						run: vi.fn(),
					};

					const input = {
						input_ids: [1, 2, 3],
						attention_mask: [1, 1, 1],
					};

					await expect(modelManager.runInference(mockSession, input)).rejects.toThrow(
						'Model not validated',
					);
				});

				it('should prepare input tensors correctly', async () => {
					const mockSession = {
						inputNames: ['input_ids', 'attention_mask'],
						outputNames: ['logits'],
						run: vi.fn().mockImplementation(tensors => {
							// Verify tensor structure
							expect(tensors.input_ids).toBeDefined();
							expect(tensors.attention_mask).toBeDefined();

							return Promise.resolve({
								logits: {
									data: new Float32Array([0.1, 0.2, 0.7]),
								},
							});
						}),
					};

					// Set model as validated
					vi.spyOn(modelManager as any, 'isValidated', 'get').mockReturnValue(true);

					const input = {
						input_ids: [1, 2, 3],
						attention_mask: [1, 1, 1],
						position_ids: [0, 1, 2], // Optional input
					};

					await modelManager.runInference(mockSession, input);

					expect(mockSession.run).toHaveBeenCalled();
				});
			});

			// Task 2.3: Add model quantization support for different device capabilities
			describe('Device Optimization (Task 2.3)', () => {
				it('should optimize session for specific device capabilities', () => {
					const deviceInfo = {
						platform: 'ios' as const,
						totalMemory: 4096,
						availableMemory: 2048,
						cpuCores: 6,
						hasGPU: true,
						thermalState: 'nominal' as const,
					};

					modelManager.optimizeSession({} as any, deviceInfo);

					// Verify session config was updated
					expect((modelManager as any).sessionConfig.intraOpNumThreads).toBe(6);
					expect((modelManager as any).sessionConfig.executionProviders).toContain(
						'coreml',
					);
				});

				it('should adjust settings for low memory devices', () => {
					const lowMemoryDevice = {
						platform: 'ios' as const,
						totalMemory: 2048,
						availableMemory: 512,
						cpuCores: 4,
						hasGPU: false,
						thermalState: 'nominal' as const,
					};

					modelManager.optimizeSession({} as any, lowMemoryDevice);

					// Verify memory-saving settings
					expect((modelManager as any).sessionConfig.enableCpuMemArena).toBe(false);
					expect((modelManager as any).sessionConfig.graphOptimizationLevel).toBe(
						'basic',
					);
				});

				it('should adjust for thermal throttling', () => {
					const thermalDevice = {
						platform: 'ios' as const,
						totalMemory: 4096,
						availableMemory: 2048,
						cpuCores: 6,
						hasGPU: true,
						thermalState: 'critical' as const,
					};

					modelManager.optimizeSession({} as any, thermalDevice);

					// Verify thermal throttling settings
					expect((modelManager as any).sessionConfig.intraOpNumThreads).toBeLessThan(6);
					expect((modelManager as any).sessionConfig.executionMode).toBe('sequential');
				});
			});

			// Test ONNXModelUtils
			describe('ONNXModelUtils', () => {
				it('should get recommended session config for device', () => {
					const deviceInfo = {
						platform: 'ios' as const,
						totalMemory: 4096,
						availableMemory: 2048,
						cpuCores: 6,
						hasGPU: true,
						thermalState: 'nominal' as const,
					};

					const config = ONNXModelUtils.getRecommendedSessionConfig(deviceInfo);

					expect(config.intraOpNumThreads).toBe(4);
					expect(config.executionProviders).toContain('coreml');
				});

				it('should estimate memory requirements for model', () => {
					const int8Memory = ONNXModelUtils.estimateMemoryRequirements(
						100 * 1024 * 1024,
						'int8',
					);
					const fp32Memory = ONNXModelUtils.estimateMemoryRequirements(
						100 * 1024 * 1024,
						'fp32',
					);

					expect(fp32Memory).toBeGreaterThan(int8Memory);
				});

				it('should validate model compatibility with device', () => {
					const metadata = {
						name: 'test-model',
						version: '1.0.0',
						size: 100 * 1024 * 1024,
						quantization: 'int8',
						inputShape: [1, -1],
						outputShape: [1, -1, 32000],
						vocabSize: 32000,
						contextLength: 2048,
						supportedDevices: ['ios', 'cpu'],
						minMemoryRequirement: 512,
						recommendedMemory: 1024,
						checksum: 'test-checksum',
					};

					const deviceInfo = {
						platform: 'ios' as const,
						totalMemory: 4096,
						availableMemory: 2048,
						cpuCores: 6,
						hasGPU: true,
						thermalState: 'nominal' as const,
					};

					const result = ONNXModelUtils.validateModelCompatibility(metadata, deviceInfo);

					expect(result.compatible).toBe(true);
					expect(result.issues).toHaveLength(0);
				});

				it('should detect compatibility issues', () => {
					const metadata = {
						name: 'test-model',
						version: '1.0.0',
						size: 100 * 1024 * 1024,
						quantization: 'int8',
						inputShape: [1, -1],
						outputShape: [1, -1, 32000],
						vocabSize: 32000,
						contextLength: 2048,
						supportedDevices: ['android'],
						minMemoryRequirement: 3000,
						recommendedMemory: 4000,
						checksum: 'test-checksum',
					};

					const deviceInfo = {
						platform: 'ios' as const,
						totalMemory: 4096,
						availableMemory: 2048,
						cpuCores: 6,
						hasGPU: true,
						thermalState: 'nominal' as const,
					};

					const result = ONNXModelUtils.validateModelCompatibility(metadata, deviceInfo);

					expect(result.compatible).toBe(false);
					expect(result.issues.length).toBeGreaterThan(0);
				});
			});
		});
	});
});
