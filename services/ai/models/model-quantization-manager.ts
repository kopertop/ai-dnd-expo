import { DeviceCapabilityManager, QuantizationType } from './device-capability-manager';

export interface QuantizationConfig {
	type: QuantizationType;
	modelPath: string;
	configPath?: string;
	metadata?: {
		size?: number;
		memoryRequirement?: number;
		expectedSpeed?: 'fast' | 'medium' | 'slow';
		qualityScore?: number;
	};
}

export interface QuantizationOption {
	type: QuantizationType;
	sizeReduction: number;
	speedImpact: 'low' | 'medium' | 'high';
	qualityImpact: 'low' | 'medium' | 'high';
}

/**
 * Lightweight stub for quantization decisions now that ONNX/Gemma3 are removed.
 * Keeps tests and callers working by returning deterministic recommendations.
 */
export class ModelQuantizationManager {
	public deviceCapabilityManager: DeviceCapabilityManager;

	constructor(deviceManager: DeviceCapabilityManager = new DeviceCapabilityManager()) {
		this.deviceCapabilityManager = deviceManager;
	}

	getRecommendedQuantization(): QuantizationType {
		const caps =
			this.deviceCapabilityManager.getDeviceCapabilities?.() ??
			this.deviceCapabilityManager.getCapabilities?.();
		const available =
			(caps as any)?.availableMemory ??
			(caps as any)?.memory?.available ??
			(caps as any)?.memory?.free ??
			0;

		if (available >= 4096) return 'fp16';
		if (available >= 2048) return 'int8';
		return 'int4';
	}

	getQuantizationOptions(_modelId?: string): QuantizationOption[] {
		return [
			{ type: 'int4', sizeReduction: 0.25, speedImpact: 'low', qualityImpact: 'high' },
			{ type: 'int8', sizeReduction: 0.5, speedImpact: 'medium', qualityImpact: 'medium' },
			{ type: 'fp16', sizeReduction: 0.75, speedImpact: 'medium', qualityImpact: 'low' },
			{ type: 'fp32', sizeReduction: 1, speedImpact: 'high', qualityImpact: 'low' },
		];
	}

	estimateQuantizedSize(originalSize: number, quantization: QuantizationType | string): number {
		switch (quantization) {
			case 'int4':
				return originalSize * 0.25;
			case 'int8':
				return originalSize * 0.5;
			case 'fp16':
				return originalSize * 0.75;
			case 'fp32':
			default:
				return originalSize;
		}
	}
}

export const DefaultQuantizationConfigs: QuantizationConfig[] = [
	{
		type: 'int4',
		modelPath: '/models/int4',
		metadata: { size: 100, memoryRequirement: 512, expectedSpeed: 'fast', qualityScore: 50 },
	},
	{
		type: 'int8',
		modelPath: '/models/int8',
		metadata: { size: 200, memoryRequirement: 1024, expectedSpeed: 'medium', qualityScore: 70 },
	},
	{
		type: 'fp16',
		modelPath: '/models/fp16',
		metadata: { size: 400, memoryRequirement: 4096, expectedSpeed: 'medium', qualityScore: 85 },
	},
	{
		type: 'fp32',
		modelPath: '/models/fp32',
		metadata: { size: 800, memoryRequirement: 8192, expectedSpeed: 'slow', qualityScore: 95 },
	},
];
