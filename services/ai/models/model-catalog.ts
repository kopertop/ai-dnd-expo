/**
 * Model Catalog for Local AI D&D Platform
 *
 * Manages catalog of available AI models with device compatibility checking,
 * recommendations, and metadata management.
 *
 * Requirements: 1.2, 5.3
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { ModelMetadata } from './model-download-manager';
import { DeviceInfo } from './onnx-model-manager';

export interface ModelCatalogEntry extends ModelMetadata {
	recommended: boolean;
	downloadCount: number;
	rating: number; // 0-5
	category: 'general' | 'roleplay' | 'combat' | 'narrative' | 'character';
	difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
	features: string[];
	requirements: {
		minMemoryMB: number;
		minStorageMB: number;
		recommendedMemoryMB: number;
		cpuCores?: number;
		gpu?: boolean;
	};
	performance: {
		averageTokensPerSecond: number;
		memoryUsageMB: number;
		batteryImpact: 'low' | 'medium' | 'high';
		thermalImpact: 'low' | 'medium' | 'high';
	};
}

export interface DeviceCompatibility {
	compatible: boolean;
	confidence: 'high' | 'medium' | 'low';
	warnings: string[];
	recommendations: string[];
	estimatedPerformance: {
		tokensPerSecond: number;
		memoryUsage: number;
		batteryLife: number; // hours
	};
}

export interface ModelRecommendation {
	model: ModelCatalogEntry;
	compatibility: DeviceCompatibility;
	score: number; // 0-100
	reasoning: string[];
}

export interface CatalogFilters {
	category?: string[];
	difficulty?: string[];
	maxSize?: number; // bytes
	minRating?: number;
	features?: string[];
	compatibleOnly?: boolean;
}

const STORAGE_KEYS = {
	CATALOG_CACHE: 'model_catalog_cache',
	CATALOG_LAST_UPDATE: 'model_catalog_last_update',
	USER_PREFERENCES: 'model_catalog_user_preferences',
} as const;

const CATALOG_UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export class ModelCatalog {
	private catalog: ModelCatalogEntry[] = [];
	private lastUpdate: number = 0;
	private deviceInfo: DeviceInfo | null = null;

	constructor() {
		this.loadCachedCatalog();
	}

	/**
	 * Initialize catalog with device information
	 */
	async initialize(deviceInfo: DeviceInfo): Promise<void> {
		this.deviceInfo = deviceInfo;
		await this.updateCatalog();
	}

	/**
	 * Load cached catalog from storage
	 */
	private async loadCachedCatalog(): Promise<void> {
		try {
			const [catalogData, lastUpdateData] = await Promise.all([
				AsyncStorage.getItem(STORAGE_KEYS.CATALOG_CACHE),
				AsyncStorage.getItem(STORAGE_KEYS.CATALOG_LAST_UPDATE),
			]);

			if (catalogData) {
				this.catalog = JSON.parse(catalogData);
			}

			if (lastUpdateData) {
				this.lastUpdate = parseInt(lastUpdateData, 10);
			}
		} catch (error) {
			console.error('Failed to load cached catalog:', error);
		}
	}

	/**
	 * Update catalog from remote source
	 */
	async updateCatalog(force: boolean = false): Promise<void> {
		const now = Date.now();
		
		if (!force && (now - this.lastUpdate) < CATALOG_UPDATE_INTERVAL) {
			return; // Cache is still fresh
		}

		try {
			// In production, this would fetch from a remote API
			// For now, we'll use a hardcoded catalog
			this.catalog = this.getDefaultCatalog();
			this.lastUpdate = now;

			// Save to cache
			await Promise.all([
				AsyncStorage.setItem(STORAGE_KEYS.CATALOG_CACHE, JSON.stringify(this.catalog)),
				AsyncStorage.setItem(STORAGE_KEYS.CATALOG_LAST_UPDATE, now.toString()),
			]);

		} catch (error) {
			console.error('Failed to update catalog:', error);
			throw new Error(`Catalog update failed: ${error}`);
		}
	}

	/**
	 * Get default hardcoded catalog (replace with API call in production)
	 */
	private getDefaultCatalog(): ModelCatalogEntry[] {
		return [
			{
				id: 'gemma3-2b-dnd',
				name: 'Gemma3 2B D&D Edition',
				version: '1.0.0',
				description: 'Lightweight D&D model optimized for mobile devices. Great for character interactions and basic storytelling.',
				size: 1.8 * 1024 * 1024 * 1024, // 1.8GB
				checksum: 'abc123def456...',
				downloadUrl: 'https://models.example.com/gemma3-2b-dnd.onnx',
				requiredMemory: 2048, // 2GB
				supportedQuantizations: ['int8', 'int4', 'fp16'],
				compatibility: {
					ios: true,
					android: true,
					web: false,
					minOSVersion: '14.0',
				},
				tags: ['lightweight', 'mobile-optimized', 'beginner-friendly'],
				createdAt: '2024-01-15T00:00:00Z',
				updatedAt: '2024-01-15T00:00:00Z',
				recommended: true,
				downloadCount: 15420,
				rating: 4.2,
				category: 'general',
				difficulty: 'beginner',
				features: ['character-dialogue', 'basic-combat', 'story-generation'],
				requirements: {
					minMemoryMB: 2048,
					minStorageMB: 2048,
					recommendedMemoryMB: 3072,
					cpuCores: 4,
				},
				performance: {
					averageTokensPerSecond: 8.5,
					memoryUsageMB: 1800,
					batteryImpact: 'low',
					thermalImpact: 'low',
				},
			},
			{
				id: 'gemma3-7b-dnd-pro',
				name: 'Gemma3 7B D&D Professional',
				version: '1.2.0',
				description: 'Advanced D&D model with superior storytelling, complex character personalities, and detailed world-building capabilities.',
				size: 6.2 * 1024 * 1024 * 1024, // 6.2GB
				checksum: 'def456ghi789...',
				downloadUrl: 'https://models.example.com/gemma3-7b-dnd-pro.onnx',
				requiredMemory: 6144, // 6GB
				supportedQuantizations: ['int8', 'fp16', 'fp32'],
				compatibility: {
					ios: true,
					android: true,
					web: false,
					minOSVersion: '15.0',
				},
				tags: ['professional', 'high-quality', 'advanced'],
				createdAt: '2024-02-01T00:00:00Z',
				updatedAt: '2024-02-15T00:00:00Z',
				recommended: false,
				downloadCount: 8930,
				rating: 4.7,
				category: 'narrative',
				difficulty: 'advanced',
				features: ['advanced-storytelling', 'complex-npcs', 'world-building', 'multiple-voices'],
				requirements: {
					minMemoryMB: 6144,
					minStorageMB: 7168,
					recommendedMemoryMB: 8192,
					cpuCores: 6,
					gpu: true,
				},
				performance: {
					averageTokensPerSecond: 3.2,
					memoryUsageMB: 5800,
					batteryImpact: 'high',
					thermalImpact: 'medium',
				},
			},
			{
				id: 'gemma3-combat-specialist',
				name: 'Gemma3 Combat Specialist',
				version: '1.1.0',
				description: 'Specialized model for tactical combat encounters, optimized for quick rule lookups and strategic decision making.',
				size: 3.1 * 1024 * 1024 * 1024, // 3.1GB
				checksum: 'ghi789jkl012...',
				downloadUrl: 'https://models.example.com/gemma3-combat.onnx',
				requiredMemory: 3584, // 3.5GB
				supportedQuantizations: ['int8', 'int4', 'fp16'],
				compatibility: {
					ios: true,
					android: true,
					web: true,
				},
				tags: ['combat', 'tactical', 'rules-focused'],
				createdAt: '2024-01-30T00:00:00Z',
				updatedAt: '2024-02-10T00:00:00Z',
				recommended: false,
				downloadCount: 5670,
				rating: 4.4,
				category: 'combat',
				difficulty: 'intermediate',
				features: ['combat-tactics', 'rule-assistance', 'quick-decisions', 'initiative-tracking'],
				requirements: {
					minMemoryMB: 3584,
					minStorageMB: 3584,
					recommendedMemoryMB: 4096,
					cpuCores: 4,
				},
				performance: {
					averageTokensPerSecond: 12.1,
					memoryUsageMB: 3200,
					batteryImpact: 'medium',
					thermalImpact: 'low',
				},
			},
			{
				id: 'gemma3-roleplay-master',
				name: 'Gemma3 Roleplay Master',
				version: '1.0.1',
				description: 'Character-focused model excelling at NPC personalities, dialogue, and immersive character interactions.',
				size: 4.5 * 1024 * 1024 * 1024, // 4.5GB
				checksum: 'jkl012mno345...',
				downloadUrl: 'https://models.example.com/gemma3-roleplay.onnx',
				requiredMemory: 4608, // 4.5GB
				supportedQuantizations: ['int8', 'fp16'],
				compatibility: {
					ios: true,
					android: true,
					web: false,
					minOSVersion: '14.5',
				},
				tags: ['roleplay', 'character-focused', 'dialogue'],
				createdAt: '2024-02-05T00:00:00Z',
				updatedAt: '2024-02-12T00:00:00Z',
				recommended: true,
				downloadCount: 11240,
				rating: 4.6,
				category: 'roleplay',
				difficulty: 'intermediate',
				features: ['character-voices', 'personality-simulation', 'emotion-modeling', 'dialogue-trees'],
				requirements: {
					minMemoryMB: 4608,
					minStorageMB: 5120,
					recommendedMemoryMB: 6144,
					cpuCores: 6,
				},
				performance: {
					averageTokensPerSecond: 6.8,
					memoryUsageMB: 4200,
					batteryImpact: 'medium',
					thermalImpact: 'medium',
				},
			},
		];
	}

	/**
	 * Get filtered catalog entries
	 */
	getCatalog(filters?: CatalogFilters): ModelCatalogEntry[] {
		let filtered = [...this.catalog];

		if (!filters) {
			return filtered;
		}

		if (filters.category?.length) {
			filtered = filtered.filter(model => filters.category!.includes(model.category));
		}

		if (filters.difficulty?.length) {
			filtered = filtered.filter(model => filters.difficulty!.includes(model.difficulty));
		}

		if (filters.maxSize) {
			filtered = filtered.filter(model => model.size <= filters.maxSize!);
		}

		if (filters.minRating) {
			filtered = filtered.filter(model => model.rating >= filters.minRating!);
		}

		if (filters.features?.length) {
			filtered = filtered.filter(model => 
				filters.features!.some(feature => model.features.includes(feature)),
			);
		}

		if (filters.compatibleOnly && this.deviceInfo) {
			filtered = filtered.filter(model => {
				const compatibility = this.checkDeviceCompatibility(model);
				return compatibility.compatible;
			});
		}

		return filtered;
	}

	/**
	 * Get model by ID
	 */
	getModel(modelId: string): ModelCatalogEntry | null {
		return this.catalog.find(model => model.id === modelId) || null;
	}

	/**
	 * Check device compatibility for a model
	 */
	checkDeviceCompatibility(model: ModelCatalogEntry): DeviceCompatibility {
		if (!this.deviceInfo) {
			return {
				compatible: false,
				confidence: 'low',
				warnings: ['Device information not available'],
				recommendations: ['Initialize with device info first'],
				estimatedPerformance: {
					tokensPerSecond: 0,
					memoryUsage: 0,
					batteryLife: 0,
				},
			};
		}

		const warnings: string[] = [];
		const recommendations: string[] = [];
		let compatible = true;
		let confidence: 'high' | 'medium' | 'low' = 'high';

		// Check platform compatibility
		if (!model.compatibility[this.deviceInfo.platform]) {
			compatible = false;
			warnings.push(`Not compatible with ${this.deviceInfo.platform}`);
		}

		// Check memory requirements
		if (this.deviceInfo.totalMemory < model.requirements.minMemoryMB) {
			compatible = false;
			warnings.push(`Requires ${model.requirements.minMemoryMB}MB RAM, device has ${this.deviceInfo.totalMemory}MB`);
		} else if (this.deviceInfo.totalMemory < model.requirements.recommendedMemoryMB) {
			confidence = 'medium';
			warnings.push(`May run slowly - recommended ${model.requirements.recommendedMemoryMB}MB RAM`);
			recommendations.push('Consider closing other apps to free memory');
		}

		// Check CPU cores
		if (model.requirements.cpuCores && this.deviceInfo.cpuCores < model.requirements.cpuCores) {
			confidence = 'low';
			warnings.push(`Optimized for ${model.requirements.cpuCores}+ CPU cores, device has ${this.deviceInfo.cpuCores}`);
			recommendations.push('Performance may be reduced on this device');
		}

		// Check GPU requirement
		if (model.requirements.gpu && !this.deviceInfo.hasGPU) {
			confidence = 'medium';
			warnings.push('Model benefits from GPU acceleration, not available on this device');
		}

		// Check thermal state
		if (this.deviceInfo.thermalState === 'serious' || this.deviceInfo.thermalState === 'critical') {
			if (model.performance.thermalImpact === 'high') {
				compatible = false;
				warnings.push('Device is overheating - this model may worsen thermal conditions');
			} else if (model.performance.thermalImpact === 'medium') {
				confidence = 'low';
				warnings.push('Device thermal state may affect performance');
			}
		}

		// Generate performance estimates
		const memoryEfficiency = Math.min(this.deviceInfo.totalMemory / model.requirements.recommendedMemoryMB, 1);
		const cpuEfficiency = model.requirements.cpuCores ? 
			Math.min(this.deviceInfo.cpuCores / model.requirements.cpuCores, 1) : 1;

		const performanceMultiplier = (memoryEfficiency + cpuEfficiency) / 2;

		// Add recommendations
		if (compatible) {
			if (confidence === 'medium') {
				recommendations.push('Monitor device temperature during use');
				recommendations.push('Consider power saving mode for longer sessions');
			}
			if (model.performance.batteryImpact === 'high') {
				recommendations.push('Keep device plugged in for extended use');
			}
		} else {
			recommendations.push('Consider a smaller model variant');
			recommendations.push('Try the int4 quantized version if available');
		}

		return {
			compatible,
			confidence,
			warnings,
			recommendations,
			estimatedPerformance: {
				tokensPerSecond: model.performance.averageTokensPerSecond * performanceMultiplier,
				memoryUsage: model.performance.memoryUsageMB,
				batteryLife: this.estimateBatteryLife(model),
			},
		};
	}

	/**
	 * Get model recommendations for current device
	 */
	getRecommendations(limit: number = 5): ModelRecommendation[] {
		if (!this.deviceInfo) {
			return [];
		}

		const recommendations: ModelRecommendation[] = [];

		for (const model of this.catalog) {
			const compatibility = this.checkDeviceCompatibility(model);
			const score = this.calculateRecommendationScore(model, compatibility);
			const reasoning = this.generateRecommendationReasoning(model, compatibility, score);

			recommendations.push({
				model,
				compatibility,
				score,
				reasoning,
			});
		}

		// Sort by score and return top results
		return recommendations
			.sort((a, b) => b.score - a.score)
			.slice(0, limit);
	}

	/**
	 * Calculate recommendation score (0-100)
	 */
	private calculateRecommendationScore(model: ModelCatalogEntry, compatibility: DeviceCompatibility): number {
		let score = 0;

		// Base compatibility score (40 points)
		if (compatibility.compatible) {
			score += 40;
			if (compatibility.confidence === 'high') score += 20;
			else if (compatibility.confidence === 'medium') score += 10;
		}

		// Model quality score (30 points)
		score += (model.rating / 5) * 20; // Rating out of 5
		if (model.recommended) score += 10;

		// Popularity score (15 points)
		const maxDownloads = Math.max(...this.catalog.map(m => m.downloadCount));
		score += (model.downloadCount / maxDownloads) * 15;

		// Performance score (15 points)
		if (this.deviceInfo) {
			const memoryRatio = model.requirements.minMemoryMB / this.deviceInfo.totalMemory;
			if (memoryRatio < 0.5) score += 15; // Uses less than half memory
			else if (memoryRatio < 0.7) score += 10;
			else if (memoryRatio < 0.9) score += 5;
		}

		return Math.round(Math.max(0, Math.min(100, score)));
	}

	/**
	 * Generate recommendation reasoning
	 */
	private generateRecommendationReasoning(
		model: ModelCatalogEntry,
		compatibility: DeviceCompatibility,
		score: number,
	): string[] {
		const reasoning: string[] = [];

		// Compatibility reasoning
		if (compatibility.compatible) {
			if (compatibility.confidence === 'high') {
				reasoning.push('Excellent compatibility with your device');
			} else if (compatibility.confidence === 'medium') {
				reasoning.push('Good compatibility with minor performance considerations');
			} else {
				reasoning.push('Compatible but may have reduced performance');
			}
		} else {
			reasoning.push('Not compatible with your current device configuration');
		}

		// Quality reasoning
		if (model.rating >= 4.5) {
			reasoning.push('Highly rated by users');
		} else if (model.rating >= 4.0) {
			reasoning.push('Well-rated by the community');
		}

		if (model.recommended) {
			reasoning.push('Recommended by the D&D AI team');
		}

		// Feature reasoning
		if (model.features.length > 3) {
			reasoning.push('Rich feature set for diverse gameplay');
		}

		// Performance reasoning
		if (model.performance.batteryImpact === 'low') {
			reasoning.push('Energy efficient for longer gaming sessions');
		}

		if (model.performance.thermalImpact === 'low') {
			reasoning.push('Low thermal impact keeps device cool');
		}

		// Size reasoning
		if (model.size < 2 * 1024 * 1024 * 1024) { // < 2GB
			reasoning.push('Compact size saves storage space');
		}

		return reasoning;
	}

	/**
	 * Estimate battery life for model
	 */
	private estimateBatteryLife(model: ModelCatalogEntry): number {
		// Simplified battery estimation (hours)
		// In production, this would be based on actual device testing
		const baseHours = 8; // Assume 8 hour base battery life
		
		const impactMultiplier = {
			low: 0.9,
			medium: 0.7,
			high: 0.5,
		}[model.performance.batteryImpact];

		return baseHours * impactMultiplier;
	}

	/**
	 * Search models by text
	 */
	searchModels(query: string): ModelCatalogEntry[] {
		const lowercaseQuery = query.toLowerCase();
		
		return this.catalog.filter(model => {
			return (
				model.name.toLowerCase().includes(lowercaseQuery) ||
				model.description.toLowerCase().includes(lowercaseQuery) ||
				model.features.some(feature => feature.toLowerCase().includes(lowercaseQuery)) ||
				model.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
				model.category.toLowerCase().includes(lowercaseQuery)
			);
		});
	}

	/**
	 * Get available categories
	 */
	getCategories(): string[] {
		return [...new Set(this.catalog.map(model => model.category))];
	}

	/**
	 * Get available features
	 */
	getFeatures(): string[] {
		const allFeatures = this.catalog.flatMap(model => model.features);
		return [...new Set(allFeatures)];
	}

	/**
	 * Get catalog statistics
	 */
	getStatistics() {
		return {
			totalModels: this.catalog.length,
			averageRating: this.catalog.reduce((sum, model) => sum + model.rating, 0) / this.catalog.length,
			totalDownloads: this.catalog.reduce((sum, model) => sum + model.downloadCount, 0),
			categories: this.getCategories().length,
			features: this.getFeatures().length,
			averageSize: this.catalog.reduce((sum, model) => sum + model.size, 0) / this.catalog.length,
			lastUpdate: new Date(this.lastUpdate).toISOString(),
		};
	}
}