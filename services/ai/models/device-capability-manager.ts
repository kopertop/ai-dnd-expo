/**
 * Device Capability Manager for Local AI D&D Platform
 *
 * Detects device capabilities and recommends optimal model quantization
 * and configuration based on available resources.
 *
 * Requirements: 1.4, 3.1
 */

import { Platform } from 'react-native';

export interface DeviceCapabilities {
	platform: 'ios' | 'android' | 'web';
	deviceModel: string;
	osVersion: string;
	totalMemory: number; // in MB
	availableMemory: number; // in MB
	cpuCores: number;
	cpuArchitecture: string;
	hasGPU: boolean;
	gpuModel?: string;
	thermalState: 'nominal' | 'fair' | 'serious' | 'critical';
	batteryLevel: number; // 0-100
	isCharging: boolean;
	performanceClass: 'high' | 'medium' | 'low';
	supportedQuantizations: QuantizationType[];
	recommendedQuantization: QuantizationType;
}

export type QuantizationType = 'int8' | 'int4' | 'fp16' | 'fp32';

export interface ModelVariant {
	name: string;
	quantization: QuantizationType;
	modelSize: number; // in MB
	memoryRequirement: number; // in MB
	estimatedSpeed: 'fast' | 'medium' | 'slow';
	qualityScore: number; // 0-100
	supportedDevices: string[];
	minMemoryMB: number;
	recommendedMemoryMB: number;
}

export interface QuantizationRecommendation {
	recommended: QuantizationType;
	alternatives: QuantizationType[];
	reasoning: string;
	expectedPerformance: {
		speed: 'fast' | 'medium' | 'slow';
		quality: 'high' | 'medium' | 'low';
		memoryUsage: number; // in MB
	};
	warnings: string[];
}

/**
 * Device Capability Manager
 * Detects device capabilities and provides model recommendations
 */
export class DeviceCapabilityManager {
	private capabilities: DeviceCapabilities | null = null;
	private isInitialized = false;

	constructor() {
		// Initialize with basic platform detection
	}

	/**
	 * Initialize device capability detection
	 * Requirement 3.1: Device capability detection
	 */
	async initialize(): Promise<void> {
		try {
			console.log('📱 Detecting device capabilities...');

			this.capabilities = await this.detectDeviceCapabilities();
			this.isInitialized = true;

			console.log('✅ Device capabilities detected:', this.capabilities);
		} catch (error) {
			console.error('❌ Failed to detect device capabilities:', error);

			// Fallback to conservative estimates
			this.capabilities = this.getConservativeCapabilities();
			this.isInitialized = true;
		}
	}

	/**
	 * Get current device capabilities
	 */
	getCapabilities(): DeviceCapabilities | null {
		return this.capabilities;
	}

	/**
	 * Get optimal quantization recommendation for current device
	 * Requirement 1.4: Optimal quantization selection
	 */
	getQuantizationRecommendation(availableVariants: ModelVariant[]): QuantizationRecommendation {
		if (!this.capabilities) {
			throw new Error('Device capabilities not initialized');
		}

		const { availableMemory, performanceClass, thermalState, batteryLevel } = this.capabilities;

		// Filter variants that can run on this device
		const compatibleVariants = availableVariants.filter(
			variant =>
				variant.memoryRequirement <= availableMemory &&
				this.capabilities!.supportedQuantizations.includes(variant.quantization),
		);

		if (compatibleVariants.length === 0) {
			return {
				recommended: 'int8',
				alternatives: [],
				reasoning: 'No compatible model variants found for this device',
				expectedPerformance: {
					speed: 'slow',
					quality: 'low',
					memoryUsage: availableMemory * 0.8,
				},
				warnings: ['Device may not have sufficient resources for local AI'],
			};
		}

		// Score variants based on device capabilities
		const scoredVariants = compatibleVariants.map(variant => ({
			variant,
			score: this.scoreVariantForDevice(variant),
		}));

		// Sort by score (highest first)
		scoredVariants.sort((a, b) => b.score - a.score);

		const bestVariant = scoredVariants[0].variant;
		const alternatives = scoredVariants.slice(1, 4).map(sv => sv.variant.quantization);

		// Generate reasoning
		let reasoning = `Recommended ${bestVariant.quantization} quantization for ${performanceClass} performance device`;

		if (thermalState !== 'nominal') {
			reasoning += ` (adjusted for thermal state: ${thermalState})`;
		}

		if (batteryLevel < 20) {
			reasoning += ' (power-saving mode due to low battery)';
		}

		// Generate warnings
		const warnings: string[] = [];

		if (bestVariant.memoryRequirement > availableMemory * 0.8) {
			warnings.push('High memory usage may affect device performance');
		}

		if (thermalState === 'serious' || thermalState === 'critical') {
			warnings.push('Device thermal state may limit performance');
		}

		if (batteryLevel < 20 && !this.capabilities.isCharging) {
			warnings.push('Low battery may affect inference performance');
		}

		return {
			recommended: bestVariant.quantization,
			alternatives,
			reasoning,
			expectedPerformance: {
				speed: bestVariant.estimatedSpeed,
				quality:
					bestVariant.qualityScore > 80
						? 'high'
						: bestVariant.qualityScore > 60
							? 'medium'
							: 'low',
				memoryUsage: bestVariant.memoryRequirement,
			},
			warnings,
		};
	}

	/**
	 * Load model variant based on available memory
	 * Requirement 3.1: Memory-based model selection
	 */
	selectModelVariant(availableVariants: ModelVariant[]): ModelVariant | null {
		if (!this.capabilities) {
			return null;
		}

		const recommendation = this.getQuantizationRecommendation(availableVariants);

		return (
			availableVariants.find(
				variant => variant.quantization === recommendation.recommended,
			) || null
		);
	}

	/**
	 * Check if device can run specific model variant
	 */
	canRunModelVariant(variant: ModelVariant): boolean {
		if (!this.capabilities) {
			return false;
		}

		return (
			variant.memoryRequirement <= this.capabilities.availableMemory &&
			this.capabilities.supportedQuantizations.includes(variant.quantization) &&
			variant.minMemoryMB <= this.capabilities.totalMemory
		);
	}

	/**
	 * Get performance estimate for model variant on current device
	 */
	getPerformanceEstimate(variant: ModelVariant): {
		tokensPerSecond: number;
		averageLatency: number;
		memoryPressure: 'low' | 'medium' | 'high';
		thermalImpact: 'low' | 'medium' | 'high';
	} {
		if (!this.capabilities) {
			return {
				tokensPerSecond: 1,
				averageLatency: 5000,
				memoryPressure: 'high',
				thermalImpact: 'high',
			};
		}

		const { performanceClass, availableMemory, thermalState } = this.capabilities;

		// Base performance by device class
		const baseTokensPerSecond = {
			high: 10,
			medium: 5,
			low: 2,
		}[performanceClass];

		// Adjust for quantization
		const quantizationMultiplier = {
			int4: 1.5,
			int8: 1.2,
			fp16: 1.0,
			fp32: 0.7,
		}[variant.quantization];

		const tokensPerSecond = baseTokensPerSecond * quantizationMultiplier;
		const averageLatency = 1000 / tokensPerSecond;

		// Calculate memory pressure
		const memoryUsageRatio = variant.memoryRequirement / availableMemory;
		const memoryPressure =
			memoryUsageRatio > 0.8 ? 'high' : memoryUsageRatio > 0.6 ? 'medium' : 'low';

		// Calculate thermal impact
		const thermalImpact =
			thermalState === 'critical'
				? 'high'
				: thermalState === 'serious'
					? 'high'
					: variant.quantization === 'fp32'
						? 'high'
						: variant.quantization === 'fp16'
							? 'medium'
							: 'low';

		return {
			tokensPerSecond,
			averageLatency,
			memoryPressure,
			thermalImpact,
		};
	}

	/**
	 * Monitor device state changes
	 */
	async updateDeviceState(): Promise<void> {
		if (!this.isInitialized) {
			return;
		}

		try {
			// Update dynamic properties
			const updatedCapabilities = await this.detectDeviceCapabilities();

			if (this.capabilities) {
				this.capabilities.availableMemory = updatedCapabilities.availableMemory;
				this.capabilities.thermalState = updatedCapabilities.thermalState;
				this.capabilities.batteryLevel = updatedCapabilities.batteryLevel;
				this.capabilities.isCharging = updatedCapabilities.isCharging;
			}
		} catch (error) {
			console.error('❌ Failed to update device state:', error);
		}
	}

	// Private helper methods

	/**
	 * Detect device capabilities using available APIs
	 */
	private async detectDeviceCapabilities(): Promise<DeviceCapabilities> {
		const platform = Platform.OS as 'ios' | 'android';

		// Basic platform detection
		const baseCapabilities: DeviceCapabilities = {
			platform,
			deviceModel: await this.getDeviceModel(),
			osVersion: Platform.Version.toString(),
			totalMemory: await this.getTotalMemory(),
			availableMemory: await this.getAvailableMemory(),
			cpuCores: await this.getCPUCores(),
			cpuArchitecture: await this.getCPUArchitecture(),
			hasGPU: await this.hasGPUAcceleration(),
			thermalState: await this.getThermalState(),
			batteryLevel: await this.getBatteryLevel(),
			isCharging: await this.getChargingState(),
			performanceClass: 'medium', // Will be calculated
			supportedQuantizations: ['int8', 'int4'], // Conservative default
			recommendedQuantization: 'int8',
		};

		// Calculate performance class
		baseCapabilities.performanceClass = this.calculatePerformanceClass(baseCapabilities);

		// Determine supported quantizations
		baseCapabilities.supportedQuantizations = this.getSupportedQuantizations(baseCapabilities);

		// Set recommended quantization
		baseCapabilities.recommendedQuantization = this.getDefaultQuantization(baseCapabilities);

		return baseCapabilities;
	}

	/**
	 * Get device model information
	 */
	private async getDeviceModel(): Promise<string> {
		// In React Native, we'd use react-native-device-info
		// For now, return platform-based estimate
		return Platform.OS === 'ios' ? 'iPhone' : 'Android Device';
	}

	/**
	 * Get total device memory
	 */
	private async getTotalMemory(): Promise<number> {
		// This would require native modules to get actual memory
		// Return conservative estimates based on platform
		if (Platform.OS === 'ios') {
			return 4096; // 4GB conservative estimate for iOS
		} else {
			return 3072; // 3GB conservative estimate for Android
		}
	}

	/**
	 * Get available memory
	 */
	private async getAvailableMemory(): Promise<number> {
		const totalMemory = await this.getTotalMemory();
		// Assume 60% of total memory is available for our use
		return Math.floor(totalMemory * 0.6);
	}

	/**
	 * Get CPU core count
	 */
	private async getCPUCores(): Promise<number> {
		// This would require native modules
		// Return reasonable estimates
		return Platform.OS === 'ios' ? 6 : 8;
	}

	/**
	 * Get CPU architecture
	 */
	private async getCPUArchitecture(): Promise<string> {
		return Platform.OS === 'ios' ? 'arm64' : 'arm64-v8a';
	}

	/**
	 * Check for GPU acceleration support
	 */
	private async hasGPUAcceleration(): Promise<boolean> {
		// iOS has Metal, Android has Vulkan/OpenGL ES
		return true;
	}

	/**
	 * Get thermal state
	 */
	private async getThermalState(): Promise<'nominal' | 'fair' | 'serious' | 'critical'> {
		// This would require native thermal monitoring
		// Return nominal as default
		return 'nominal';
	}

	/**
	 * Get battery level
	 */
	private async getBatteryLevel(): Promise<number> {
		// This would require battery info API
		// Return reasonable default
		return 80;
	}

	/**
	 * Get charging state
	 */
	private async getChargingState(): Promise<boolean> {
		// This would require battery info API
		return false;
	}

	/**
	 * Calculate performance class based on device specs
	 */
	private calculatePerformanceClass(capabilities: DeviceCapabilities): 'high' | 'medium' | 'low' {
		const { totalMemory, cpuCores, platform } = capabilities;

		// High-end devices
		if (totalMemory >= 6144 && cpuCores >= 8) {
			return 'high';
		}

		// iOS devices generally perform better
		if (platform === 'ios' && totalMemory >= 4096) {
			return 'high';
		}

		// Medium-range devices
		if (totalMemory >= 3072 && cpuCores >= 6) {
			return 'medium';
		}

		// Low-end devices
		return 'low';
	}

	/**
	 * Get supported quantizations for device
	 */
	private getSupportedQuantizations(capabilities: DeviceCapabilities): QuantizationType[] {
		const { performanceClass, hasGPU, totalMemory } = capabilities;

		const supported: QuantizationType[] = ['int8']; // Always support int8

		// Add int4 for most devices
		if (totalMemory >= 2048) {
			supported.push('int4');
		}

		// Add fp16 for higher-end devices with GPU
		if (performanceClass !== 'low' && hasGPU && totalMemory >= 4096) {
			supported.push('fp16');
		}

		// Add fp32 only for high-end devices
		if (performanceClass === 'high' && totalMemory >= 8192) {
			supported.push('fp32');
		}

		return supported;
	}

	/**
	 * Get default quantization for device
	 */
	private getDefaultQuantization(capabilities: DeviceCapabilities): QuantizationType {
		const { performanceClass, availableMemory } = capabilities;

		if (performanceClass === 'high' && availableMemory >= 3072) {
			return 'int4'; // Better quality for high-end devices
		} else if (performanceClass === 'medium' && availableMemory >= 2048) {
			return 'int8'; // Balanced for medium devices
		} else {
			return 'int8'; // Conservative for low-end devices
		}
	}

	/**
	 * Score model variant for current device
	 */
	private scoreVariantForDevice(variant: ModelVariant): number {
		if (!this.capabilities) {
			return 0;
		}

		let score = 0;
		const { availableMemory, performanceClass, thermalState, batteryLevel } = this.capabilities;

		// Base score from quality
		score += variant.qualityScore * 0.4;

		// Memory efficiency score
		const memoryRatio = variant.memoryRequirement / availableMemory;
		if (memoryRatio <= 0.5) {
			score += 30; // Excellent memory efficiency
		} else if (memoryRatio <= 0.7) {
			score += 20; // Good memory efficiency
		} else if (memoryRatio <= 0.9) {
			score += 10; // Acceptable memory efficiency
		}

		// Performance class bonus
		const performanceBonus = {
			high: 20,
			medium: 10,
			low: 0,
		}[performanceClass];

		if (variant.estimatedSpeed === 'fast') {
			score += performanceBonus;
		} else if (variant.estimatedSpeed === 'medium') {
			score += performanceBonus * 0.7;
		}

		// Thermal state penalty
		if (thermalState === 'serious' && variant.quantization === 'fp32') {
			score -= 20;
		} else if (thermalState === 'critical') {
			score -= 30;
		}

		// Battery level adjustment
		if (batteryLevel < 20 && variant.quantization === 'fp32') {
			score -= 15;
		}

		return Math.max(0, score);
	}

	/**
	 * Get conservative capabilities for fallback
	 */
	private getConservativeCapabilities(): DeviceCapabilities {
		return {
			platform: Platform.OS as 'ios' | 'android',
			deviceModel: 'Unknown',
			osVersion: Platform.Version.toString(),
			totalMemory: 2048, // 2GB conservative
			availableMemory: 1024, // 1GB available
			cpuCores: 4,
			cpuArchitecture: 'arm64',
			hasGPU: false,
			thermalState: 'nominal',
			batteryLevel: 50,
			isCharging: false,
			performanceClass: 'low',
			supportedQuantizations: ['int8'],
			recommendedQuantization: 'int8',
		};
	}

	/**
	 * Check if device capabilities are initialized
	 */
	isReady(): boolean {
		return this.isInitialized && this.capabilities !== null;
	}
}

/**
 * Predefined model variants for Gemma3
 */
export const Gemma3ModelVariants: ModelVariant[] = [
	{
		name: 'Gemma3-2B-INT4',
		quantization: 'int4',
		modelSize: 1200,
		memoryRequirement: 1500,
		estimatedSpeed: 'fast',
		qualityScore: 85,
		supportedDevices: ['ios', 'android'],
		minMemoryMB: 2048,
		recommendedMemoryMB: 3072,
	},
	{
		name: 'Gemma3-2B-INT8',
		quantization: 'int8',
		modelSize: 2100,
		memoryRequirement: 2500,
		estimatedSpeed: 'medium',
		qualityScore: 90,
		supportedDevices: ['ios', 'android'],
		minMemoryMB: 3072,
		recommendedMemoryMB: 4096,
	},
	{
		name: 'Gemma3-2B-FP16',
		quantization: 'fp16',
		modelSize: 4200,
		memoryRequirement: 5000,
		estimatedSpeed: 'medium',
		qualityScore: 95,
		supportedDevices: ['ios', 'android'],
		minMemoryMB: 6144,
		recommendedMemoryMB: 8192,
	},
	{
		name: 'Gemma3-9B-INT4',
		quantization: 'int4',
		modelSize: 5400,
		memoryRequirement: 6500,
		estimatedSpeed: 'slow',
		qualityScore: 92,
		supportedDevices: ['ios'],
		minMemoryMB: 8192,
		recommendedMemoryMB: 12288,
	},
	{
		name: 'Gemma3-9B-INT8',
		quantization: 'int8',
		modelSize: 9500,
		memoryRequirement: 11000,
		estimatedSpeed: 'slow',
		qualityScore: 97,
		supportedDevices: ['ios'],
		minMemoryMB: 12288,
		recommendedMemoryMB: 16384,
	},
];

/**
 * Utility functions for device capability management
 */
export const DeviceCapabilityUtils = {
	/**
	 * Get model variant by quantization type
	 */
	getVariantByQuantization(quantization: QuantizationType): ModelVariant | undefined {
		return Gemma3ModelVariants.find(variant => variant.quantization === quantization);
	},

	/**
	 * Filter variants by device compatibility
	 */
	getCompatibleVariants(capabilities: DeviceCapabilities): ModelVariant[] {
		return Gemma3ModelVariants.filter(
			variant =>
				variant.memoryRequirement <= capabilities.availableMemory &&
				capabilities.supportedQuantizations.includes(variant.quantization) &&
				variant.supportedDevices.includes(capabilities.platform),
		);
	},

	/**
	 * Estimate download size for model variant
	 */
	estimateDownloadSize(variant: ModelVariant): number {
		// Add ~20% overhead for tokenizer and config files
		return Math.ceil(variant.modelSize * 1.2);
	},

	/**
	 * Check if device meets minimum requirements
	 */
	meetsMinimumRequirements(capabilities: DeviceCapabilities): boolean {
		return (
			capabilities.totalMemory >= 2048 && // At least 2GB RAM
			capabilities.availableMemory >= 1024 && // At least 1GB available
			capabilities.cpuCores >= 4 // At least 4 CPU cores
		);
	},

	/**
	 * Get performance tier description
	 */
	getPerformanceTierDescription(capabilities: DeviceCapabilities): string {
		switch (capabilities.performanceClass) {
			case 'high':
				return 'Excellent performance with fast inference and high-quality responses';
			case 'medium':
				return 'Good performance with balanced speed and quality';
			case 'low':
				return 'Basic performance with slower inference but functional responses';
		}
	},
};
