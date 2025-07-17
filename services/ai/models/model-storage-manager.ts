/**
 * Model Storage Manager for Local AI D&D Platform
 *
 * Manages local storage, caching, and file organization for AI models
 * with privacy controls and storage optimization.
 *
 * Requirements: 1.2, 5.3, 6.3
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

import { ModelMetadata } from './model-download-manager';

export interface StorageEntry {
	modelId: string;
	filePath: string;
	size: number;
	checksum: string;
	lastAccessed: number;
	accessCount: number;
	cacheLevel: 'permanent' | 'temporary' | 'system';
	encryptionKey?: string;
}

export interface CacheConfig {
	maxCacheSize: number; // bytes
	maxTempFiles: number;
	cleanupThreshold: number; // 0-1 (percentage full before cleanup)
	accessTimeWeightHours: number; // hours for LRU calculation
}

export interface StorageStats {
	totalSpace: number;
	usedSpace: number;
	freeSpace: number;
	modelCount: number;
	cacheSize: number;
	tempFiles: number;
	largestModel: number;
	oldestAccess: number;
}

export interface CleanupOptions {
	force?: boolean;
	preservePermanent?: boolean;
	targetFreeSpace?: number; // bytes
	olderThanDays?: number;
	maxFiles?: number;
}

const STORAGE_KEYS = {
	STORAGE_ENTRIES: 'model_storage_entries',
	CACHE_CONFIG: 'model_cache_config',
	ENCRYPTION_KEYS: 'model_encryption_keys',
	ACCESS_LOG: 'model_access_log',
} as const;

const DEFAULT_CACHE_CONFIG: CacheConfig = {
	maxCacheSize: 5 * 1024 * 1024 * 1024, // 5GB
	maxTempFiles: 10,
	cleanupThreshold: 0.85, // 85% full
	accessTimeWeightHours: 168, // 1 week
};

export class ModelStorageManager {
	private storageEntries: Map<string, StorageEntry> = new Map();
	private cacheConfig: CacheConfig = DEFAULT_CACHE_CONFIG;
	private modelsDirectory: string;
	private cacheDirectory: string;
	private tempDirectory: string;

	constructor() {
		this.modelsDirectory = `${FileSystem.documentDirectory}models/`;
		this.cacheDirectory = `${FileSystem.cacheDirectory}models/`;
		this.tempDirectory = `${FileSystem.cacheDirectory}temp-models/`;
		this.initialize();
	}

	/**
	 * Initialize storage manager
	 */
	private async initialize(): Promise<void> {
		try {
			await this.createDirectories();
			await this.loadStorageEntries();
			await this.loadCacheConfig();
		} catch (error) {
			console.error('Failed to initialize ModelStorageManager:', error);
		}
	}

	/**
	 * Create required directories
	 */
	private async createDirectories(): Promise<void> {
		const directories = [this.modelsDirectory, this.cacheDirectory, this.tempDirectory];
		
		for (const directory of directories) {
			const info = await FileSystem.getInfoAsync(directory);
			if (!info.exists) {
				await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
			}
		}
	}

	/**
	 * Load storage entries from persistent storage
	 */
	private async loadStorageEntries(): Promise<void> {
		try {
			const entriesData = await AsyncStorage.getItem(STORAGE_KEYS.STORAGE_ENTRIES);
			if (entriesData) {
				const entries = JSON.parse(entriesData);
				this.storageEntries = new Map(Object.entries(entries));
			}
		} catch (error) {
			console.error('Failed to load storage entries:', error);
		}
	}

	/**
	 * Save storage entries to persistent storage
	 */
	private async saveStorageEntries(): Promise<void> {
		try {
			const entriesObject = Object.fromEntries(this.storageEntries);
			await AsyncStorage.setItem(STORAGE_KEYS.STORAGE_ENTRIES, JSON.stringify(entriesObject));
		} catch (error) {
			console.error('Failed to save storage entries:', error);
		}
	}

	/**
	 * Load cache configuration
	 */
	private async loadCacheConfig(): Promise<void> {
		try {
			const configData = await AsyncStorage.getItem(STORAGE_KEYS.CACHE_CONFIG);
			if (configData) {
				this.cacheConfig = { ...DEFAULT_CACHE_CONFIG, ...JSON.parse(configData) };
			}
		} catch (error) {
			console.error('Failed to load cache config:', error);
		}
	}

	/**
	 * Store model file with metadata
	 */
	async storeModel(
		modelId: string,
		filePath: string,
		metadata: ModelMetadata,
		cacheLevel: 'permanent' | 'temporary' | 'system' = 'permanent',
	): Promise<string> {
		try {
			// Determine final storage path
			const targetDirectory = cacheLevel === 'permanent' ? this.modelsDirectory :
				cacheLevel === 'temporary' ? this.tempDirectory : this.cacheDirectory;
			
			const targetPath = `${targetDirectory}${modelId}.onnx`;

			// Move or copy file to target location
			if (filePath !== targetPath) {
				await FileSystem.moveAsync({
					from: filePath,
					to: targetPath,
				});
			}

			// Get file info
			const fileInfo = await FileSystem.getInfoAsync(targetPath);
			if (!fileInfo.exists || !fileInfo.size) {
				throw new Error('File storage failed - file not found after move');
			}

			// Create storage entry
			const entry: StorageEntry = {
				modelId,
				filePath: targetPath,
				size: fileInfo.size,
				checksum: metadata.checksum,
				lastAccessed: Date.now(),
				accessCount: 1,
				cacheLevel,
			};

			// Add encryption for sensitive models
			if (cacheLevel === 'system' || metadata.tags.includes('private')) {
				entry.encryptionKey = await this.generateEncryptionKey(modelId);
			}

			this.storageEntries.set(modelId, entry);
			await this.saveStorageEntries();

			// Check if cleanup is needed
			await this.performMaintenanceIfNeeded();

			return targetPath;

		} catch (error) {
			console.error('Failed to store model:', error);
			throw new Error(`Model storage failed: ${error}`);
		}
	}

	/**
	 * Retrieve model file path
	 */
	async getModelPath(modelId: string): Promise<string | null> {
		const entry = this.storageEntries.get(modelId);
		if (!entry) {
			return null;
		}

		// Verify file still exists
		const fileInfo = await FileSystem.getInfoAsync(entry.filePath);
		if (!fileInfo.exists) {
			// File was deleted externally, clean up entry
			this.storageEntries.delete(modelId);
			await this.saveStorageEntries();
			return null;
		}

		// Update access tracking
		entry.lastAccessed = Date.now();
		entry.accessCount++;
		await this.saveStorageEntries();

		return entry.filePath;
	}

	/**
	 * Check if model is stored locally
	 */
	async isModelStored(modelId: string): Promise<boolean> {
		const entry = this.storageEntries.get(modelId);
		if (!entry) {
			return false;
		}

		// Verify file exists
		const fileInfo = await FileSystem.getInfoAsync(entry.filePath);
		return fileInfo.exists;
	}

	/**
	 * Delete model from storage
	 */
	async deleteModel(modelId: string, secureDelete: boolean = false): Promise<void> {
		try {
			const entry = this.storageEntries.get(modelId);
			if (!entry) {
				return; // Already deleted
			}

			// Delete file
			if (secureDelete) {
				await this.secureDeleteFile(entry.filePath);
			} else {
				await FileSystem.deleteAsync(entry.filePath, { idempotent: true });
			}

			// Clean up encryption key
			if (entry.encryptionKey) {
				await this.deleteEncryptionKey(modelId);
			}

			// Remove from tracking
			this.storageEntries.delete(modelId);
			await this.saveStorageEntries();

		} catch (error) {
			console.error('Failed to delete model:', error);
			throw new Error(`Model deletion failed: ${error}`);
		}
	}

	/**
	 * Get storage statistics
	 */
	async getStorageStats(): Promise<StorageStats> {
		try {
			// Calculate free space
			const freeSpace = Platform.OS === 'ios' 
				? await FileSystem.getFreeDiskStorageAsync()
				: 1024 * 1024 * 1024; // 1GB fallback

			// Calculate used space by models
			let usedSpace = 0;
			let cacheSize = 0;
			let tempFiles = 0;
			let largestModel = 0;
			let oldestAccess = Date.now();

			for (const entry of this.storageEntries.values()) {
				usedSpace += entry.size;
				
				if (entry.cacheLevel === 'temporary') {
					cacheSize += entry.size;
					tempFiles++;
				}

				largestModel = Math.max(largestModel, entry.size);
				oldestAccess = Math.min(oldestAccess, entry.lastAccessed);
			}

			return {
				totalSpace: freeSpace + usedSpace,
				usedSpace,
				freeSpace,
				modelCount: this.storageEntries.size,
				cacheSize,
				tempFiles,
				largestModel,
				oldestAccess,
			};

		} catch (error) {
			console.error('Failed to get storage stats:', error);
			throw new Error(`Storage stats retrieval failed: ${error}`);
		}
	}

	/**
	 * Clean up storage based on options
	 */
	async cleanupStorage(options: CleanupOptions = {}): Promise<void> {
		const {
			force = false,
			preservePermanent = true,
			targetFreeSpace,
			olderThanDays,
			maxFiles,
		} = options;

		try {
			const stats = await this.getStorageStats();
			const needsCleanup = force || 
				(stats.usedSpace / stats.totalSpace) > this.cacheConfig.cleanupThreshold ||
				(targetFreeSpace && stats.freeSpace < targetFreeSpace) ||
				(maxFiles && stats.tempFiles > maxFiles);

			if (!needsCleanup) {
				return;
			}

			// Get cleanup candidates
			const candidates = Array.from(this.storageEntries.values())
				.filter(entry => {
					// Skip permanent models if preserving
					if (preservePermanent && entry.cacheLevel === 'permanent') {
						return false;
					}

					// Check age criteria
					if (olderThanDays) {
						const ageDays = (Date.now() - entry.lastAccessed) / (1000 * 60 * 60 * 24);
						return ageDays > olderThanDays;
					}

					return true;
				})
				.sort((a, b) => this.calculateCleanupPriority(a) - this.calculateCleanupPriority(b));

			// Clean up candidates until targets are met
			let freedSpace = 0;
			let filesRemoved = 0;

			for (const candidate of candidates) {
				if (targetFreeSpace && (stats.freeSpace + freedSpace) >= targetFreeSpace) {
					break;
				}
				if (maxFiles && stats.tempFiles - filesRemoved <= maxFiles) {
					break;
				}

				await this.deleteModel(candidate.modelId, true);
				freedSpace += candidate.size;
				filesRemoved++;
			}

		} catch (error) {
			console.error('Storage cleanup failed:', error);
			throw new Error(`Storage cleanup failed: ${error}`);
		}
	}

	/**
	 * Calculate cleanup priority (lower = clean first)
	 */
	private calculateCleanupPriority(entry: StorageEntry): number {
		const now = Date.now();
		const daysSinceAccess = (now - entry.lastAccessed) / (1000 * 60 * 60 * 24);
		const sizeWeight = entry.size / (1024 * 1024); // MB
		
		// Priority factors:
		// - Older files have lower priority (cleaned first)
		// - Larger files have lower priority for space savings
		// - Less accessed files have lower priority
		// - Temporary cache has lower priority than permanent
		
		let priority = 100;
		
		// Age factor (older = lower priority)
		priority -= daysSinceAccess * 2;
		
		// Size factor (larger = slightly lower priority for space)
		priority -= Math.log(sizeWeight + 1) * 5;
		
		// Access frequency factor
		priority += Math.log(entry.accessCount + 1) * 10;
		
		// Cache level factor
		if (entry.cacheLevel === 'temporary') priority -= 20;
		else if (entry.cacheLevel === 'system') priority += 10;
		
		return priority;
	}

	/**
	 * Move model between cache levels
	 */
	async moveModel(modelId: string, newCacheLevel: 'permanent' | 'temporary' | 'system'): Promise<void> {
		const entry = this.storageEntries.get(modelId);
		if (!entry) {
			throw new Error('Model not found in storage');
		}

		if (entry.cacheLevel === newCacheLevel) {
			return; // Already at target level
		}

		// Determine new directory
		const targetDirectory = newCacheLevel === 'permanent' ? this.modelsDirectory :
			newCacheLevel === 'temporary' ? this.tempDirectory : this.cacheDirectory;
		
		const newPath = `${targetDirectory}${modelId}.onnx`;

		try {
			// Move file
			await FileSystem.moveAsync({
				from: entry.filePath,
				to: newPath,
			});

			// Update entry
			entry.filePath = newPath;
			entry.cacheLevel = newCacheLevel;

			await this.saveStorageEntries();

		} catch (error) {
			console.error('Failed to move model:', error);
			throw new Error(`Model move failed: ${error}`);
		}
	}

	/**
	 * Get models by cache level
	 */
	getModelsByLevel(cacheLevel: 'permanent' | 'temporary' | 'system'): StorageEntry[] {
		return Array.from(this.storageEntries.values())
			.filter(entry => entry.cacheLevel === cacheLevel);
	}

	/**
	 * Update cache configuration
	 */
	async updateCacheConfig(newConfig: Partial<CacheConfig>): Promise<void> {
		this.cacheConfig = { ...this.cacheConfig, ...newConfig };
		await AsyncStorage.setItem(STORAGE_KEYS.CACHE_CONFIG, JSON.stringify(this.cacheConfig));
	}

	/**
	 * Perform maintenance if needed
	 */
	private async performMaintenanceIfNeeded(): Promise<void> {
		const stats = await this.getStorageStats();
		
		// Auto-cleanup if threshold exceeded
		if ((stats.usedSpace / stats.totalSpace) > this.cacheConfig.cleanupThreshold) {
			await this.cleanupStorage({ preservePermanent: true });
		}

		// Clean up temp files if too many
		if (stats.tempFiles > this.cacheConfig.maxTempFiles) {
			await this.cleanupStorage({ 
				preservePermanent: true,
				maxFiles: this.cacheConfig.maxTempFiles, 
			});
		}
	}

	/**
	 * Generate encryption key for model
	 */
	private async generateEncryptionKey(modelId: string): Promise<string> {
		// In production, use proper cryptographic key generation
		// This is a simplified version
		const key = Math.random().toString(36).substring(2, 15) + 
				  Math.random().toString(36).substring(2, 15);
		
		// Store key securely
		try {
			const keys = await AsyncStorage.getItem(STORAGE_KEYS.ENCRYPTION_KEYS) || '{}';
			const keyStore = JSON.parse(keys);
			keyStore[modelId] = key;
			await AsyncStorage.setItem(STORAGE_KEYS.ENCRYPTION_KEYS, JSON.stringify(keyStore));
		} catch (error) {
			console.error('Failed to store encryption key:', error);
		}

		return key;
	}

	/**
	 * Delete encryption key
	 */
	private async deleteEncryptionKey(modelId: string): Promise<void> {
		try {
			const keys = await AsyncStorage.getItem(STORAGE_KEYS.ENCRYPTION_KEYS) || '{}';
			const keyStore = JSON.parse(keys);
			delete keyStore[modelId];
			await AsyncStorage.setItem(STORAGE_KEYS.ENCRYPTION_KEYS, JSON.stringify(keyStore));
		} catch (error) {
			console.error('Failed to delete encryption key:', error);
		}
	}

	/**
	 * Secure file deletion (overwrite before delete)
	 */
	private async secureDeleteFile(filePath: string): Promise<void> {
		try {
			// Get file size
			const fileInfo = await FileSystem.getInfoAsync(filePath);
			if (!fileInfo.exists || !fileInfo.size) {
				return;
			}

			// Overwrite with random data (simplified - in production use proper secure deletion)
			const randomData = Array(Math.min(fileInfo.size, 1024)).fill(0)
				.map(() => Math.floor(Math.random() * 256))
				.map(byte => String.fromCharCode(byte))
				.join('');

			await FileSystem.writeAsStringAsync(filePath, randomData, {
				encoding: FileSystem.EncodingType.UTF8,
			});

			// Delete file
			await FileSystem.deleteAsync(filePath);

		} catch (error) {
			console.error('Secure delete failed, falling back to normal delete:', error);
			await FileSystem.deleteAsync(filePath, { idempotent: true });
		}
	}

	/**
	 * Get all stored models
	 */
	getAllStoredModels(): StorageEntry[] {
		return Array.from(this.storageEntries.values());
	}

	/**
	 * Validate storage integrity
	 */
	async validateStorage(): Promise<{ valid: boolean; issues: string[] }> {
		const issues: string[] = [];
		
		for (const [modelId, entry] of this.storageEntries) {
			// Check if file exists
			const fileInfo = await FileSystem.getInfoAsync(entry.filePath);
			if (!fileInfo.exists) {
				issues.push(`File missing for model ${modelId}: ${entry.filePath}`);
				continue;
			}

			// Check file size
			if (fileInfo.size !== entry.size) {
				issues.push(`Size mismatch for model ${modelId}: expected ${entry.size}, got ${fileInfo.size}`);
			}

			// TODO: Validate checksum in production
		}

		return {
			valid: issues.length === 0,
			issues,
		};
	}
}