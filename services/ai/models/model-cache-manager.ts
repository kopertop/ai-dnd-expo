/**
 * Model Cache Manager for Local AI D&D Platform
 *
 * Manages inference result caching, model warm-up, and response optimization
 * for improved performance and reduced inference times.
 *
 * Requirements: 2.1, 3.1
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { DeviceResourceManager } from './device-resource-manager';

export interface CacheEntry {
	key: string;
	inputHash: string;
	response: any;
	modelId: string;
	timestamp: number;
	accessCount: number;
	lastAccessed: number;
	size: number; // estimated size in bytes
	tags: string[];
	expiresAt?: number;
}

export interface CacheConfig {
	maxCacheSize: number; // bytes
	maxEntries: number;
	defaultTTL: number; // milliseconds
	compressionEnabled: boolean;
	encryptSensitive: boolean;
	strategies: {
		eviction: 'lru' | 'lfu' | 'fifo' | 'adaptive';
		compression: 'none' | 'gzip' | 'smart';
		warming: 'eager' | 'lazy' | 'predictive';
	};
}

export interface CacheStats {
	totalEntries: number;
	totalSize: number;
	hitRate: number;
	missRate: number;
	avgResponseTime: number;
	memoryPressure: number;
	oldestEntry: number;
	newestEntry: number;
}

export interface WarmupConfig {
	enabled: boolean;
	commonPrompts: string[];
	backgroundPreload: boolean;
	predictiveLoading: boolean;
	maxConcurrentWarmups: number;
}

export interface InferenceContext {
	modelId: string;
	input: any;
	sessionId?: string;
	userId?: string;
	gameContext?: string;
	priority: 'low' | 'normal' | 'high' | 'critical';
	cacheable?: boolean;
	tags?: string[];
}

const STORAGE_KEYS = {
	CACHE_ENTRIES: 'model_cache_entries',
	CACHE_CONFIG: 'model_cache_config',
	CACHE_STATS: 'model_cache_stats',
	WARMUP_CONFIG: 'model_warmup_config',
	WARMUP_QUEUE: 'model_warmup_queue',
} as const;

const DEFAULT_CACHE_CONFIG: CacheConfig = {
	maxCacheSize: 100 * 1024 * 1024, // 100MB
	maxEntries: 1000,
	defaultTTL: 60 * 60 * 1000, // 1 hour
	compressionEnabled: true,
	encryptSensitive: true,
	strategies: {
		eviction: 'adaptive',
		compression: 'smart',
		warming: 'predictive',
	},
};

const DEFAULT_WARMUP_CONFIG: WarmupConfig = {
	enabled: true,
	commonPrompts: [
		'You enter a tavern.',
		'Roll for initiative.',
		'What do you do?',
		'The door is locked.',
		'You hear footsteps approaching.',
	],
	backgroundPreload: true,
	predictiveLoading: true,
	maxConcurrentWarmups: 2,
};

export class ModelCacheManager {
	private cache: Map<string, CacheEntry> = new Map();
	private cacheConfig: CacheConfig = DEFAULT_CACHE_CONFIG;
	private warmupConfig: WarmupConfig = DEFAULT_WARMUP_CONFIG;
	private stats: CacheStats = this.initializeStats();
	private warmupQueue: string[] = [];
	private deviceResourceManager?: DeviceResourceManager;

	constructor(deviceResourceManager?: DeviceResourceManager) {
		this.deviceResourceManager = deviceResourceManager;
		this.initialize();
	}

	/**
	 * Initialize cache manager
	 */
	private async initialize(): Promise<void> {
		try {
			await this.loadCacheConfig();
			await this.loadWarmupConfig();
			await this.loadCacheEntries();
			await this.loadStats();
			
			// Start background maintenance
			this.startBackgroundMaintenance();
			
			// Perform initial warmup if enabled
			if (this.warmupConfig.enabled && this.warmupConfig.backgroundPreload) {
				this.scheduleWarmup();
			}
		} catch (error) {
			console.error('Failed to initialize ModelCacheManager:', error);
		}
	}

	/**
	 * Initialize stats object
	 */
	private initializeStats(): CacheStats {
		return {
			totalEntries: 0,
			totalSize: 0,
			hitRate: 0,
			missRate: 0,
			avgResponseTime: 0,
			memoryPressure: 0,
			oldestEntry: Date.now(),
			newestEntry: Date.now(),
		};
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
	 * Load warmup configuration
	 */
	private async loadWarmupConfig(): Promise<void> {
		try {
			const configData = await AsyncStorage.getItem(STORAGE_KEYS.WARMUP_CONFIG);
			if (configData) {
				this.warmupConfig = { ...DEFAULT_WARMUP_CONFIG, ...JSON.parse(configData) };
			}
		} catch (error) {
			console.error('Failed to load warmup config:', error);
		}
	}

	/**
	 * Load cache entries from storage
	 */
	private async loadCacheEntries(): Promise<void> {
		try {
			const entriesData = await AsyncStorage.getItem(STORAGE_KEYS.CACHE_ENTRIES);
			if (entriesData) {
				const entries = JSON.parse(entriesData);
				this.cache = new Map(Object.entries(entries));
				
				// Clean up expired entries
				await this.cleanupExpiredEntries();
			}
		} catch (error) {
			console.error('Failed to load cache entries:', error);
		}
	}

	/**
	 * Load cache statistics
	 */
	private async loadStats(): Promise<void> {
		try {
			const statsData = await AsyncStorage.getItem(STORAGE_KEYS.CACHE_STATS);
			if (statsData) {
				this.stats = { ...this.initializeStats(), ...JSON.parse(statsData) };
			}
		} catch (error) {
			console.error('Failed to load cache stats:', error);
		}
	}

	/**
	 * Save cache entries to storage
	 */
	private async saveCacheEntries(): Promise<void> {
		try {
			const entriesObject = Object.fromEntries(this.cache);
			await AsyncStorage.setItem(STORAGE_KEYS.CACHE_ENTRIES, JSON.stringify(entriesObject));
		} catch (error) {
			console.error('Failed to save cache entries:', error);
		}
	}

	/**
	 * Save cache statistics
	 */
	private async saveStats(): Promise<void> {
		try {
			await AsyncStorage.setItem(STORAGE_KEYS.CACHE_STATS, JSON.stringify(this.stats));
		} catch (error) {
			console.error('Failed to save cache stats:', error);
		}
	}

	/**
	 * Generate cache key for input
	 */
	private generateCacheKey(context: InferenceContext): string {
		const { modelId, input, sessionId, gameContext } = context;
		
		// Create a normalized input string
		const inputString = typeof input === 'string' ? input : JSON.stringify(input);
		const contextString = [sessionId, gameContext].filter(Boolean).join('|');
		
		// Simple hash function (in production, use a proper hash function)
		const hashInput = `${modelId}:${inputString}:${contextString}`;
		let hash = 0;
		for (let i = 0; i < hashInput.length; i++) {
			const char = hashInput.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		
		return `cache_${Math.abs(hash)}_${modelId}`;
	}

	/**
	 * Get cached response
	 */
	async getCachedResponse(context: InferenceContext): Promise<any | null> {
		const cacheKey = this.generateCacheKey(context);
		const entry = this.cache.get(cacheKey);
		
		if (!entry) {
			this.stats.missRate++;
			return null;
		}

		// Check expiration
		if (entry.expiresAt && Date.now() > entry.expiresAt) {
			this.cache.delete(cacheKey);
			await this.saveCacheEntries();
			this.stats.missRate++;
			return null;
		}

		// Update access tracking
		entry.accessCount++;
		entry.lastAccessed = Date.now();
		
		this.stats.hitRate++;
		this.updateStats();
		
		// Decompress if needed
		let response = entry.response;
		if (this.cacheConfig.compressionEnabled && entry.tags?.includes('compressed')) {
			response = await this.decompressResponse(response);
		}

		return response;
	}

	/**
	 * Cache response
	 */
	async cacheResponse(context: InferenceContext, response: any): Promise<void> {
		if (!context.cacheable) {
			return;
		}

		const cacheKey = this.generateCacheKey(context);
		const now = Date.now();
		
		// Estimate response size
		const responseSize = this.estimateSize(response);
		
		// Check if we should cache this response
		if (!this.shouldCache(context, responseSize)) {
			return;
		}

		// Compress if needed
		let finalResponse = response;
		const tags: string[] = context.tags || [];
		
		if (this.cacheConfig.compressionEnabled && this.shouldCompress(responseSize)) {
			finalResponse = await this.compressResponse(response);
			tags.push('compressed');
		}

		// Encrypt sensitive responses
		if (this.cacheConfig.encryptSensitive && this.isSensitive(context)) {
			finalResponse = await this.encryptResponse(finalResponse);
			tags.push('encrypted');
		}

		// Create cache entry
		const entry: CacheEntry = {
			key: cacheKey,
			inputHash: this.generateInputHash(context.input),
			response: finalResponse,
			modelId: context.modelId,
			timestamp: now,
			accessCount: 1,
			lastAccessed: now,
			size: responseSize,
			tags,
			expiresAt: now + this.cacheConfig.defaultTTL,
		};

		// Ensure cache limits before adding
		await this.ensureCacheCapacity(responseSize);
		
		this.cache.set(cacheKey, entry);
		this.updateStats();
		await this.saveCacheEntries();
	}

	/**
	 * Should cache this response
	 */
	private shouldCache(context: InferenceContext, responseSize: number): boolean {
		// Don't cache if disabled
		if (!context.cacheable) return false;
		
		// Don't cache overly large responses
		if (responseSize > this.cacheConfig.maxCacheSize * 0.1) return false;
		
		// Don't cache user-specific content unless in session
		if (context.userId && !context.sessionId) return false;
		
		// Always cache high priority responses
		if (context.priority === 'critical' || context.priority === 'high') return true;
		
		// Check memory pressure
		if (this.deviceResourceManager) {
			const memoryPressure = this.deviceResourceManager.getResourceHealthScore();
			if (memoryPressure < 0.3) return false; // Low memory
		}
		
		return true;
	}

	/**
	 * Should compress this response
	 */
	private shouldCompress(responseSize: number): boolean {
		// Compress responses larger than 1KB
		return responseSize > 1024;
	}

	/**
	 * Check if context contains sensitive data
	 */
	private isSensitive(context: InferenceContext): boolean {
		return (context.userId !== undefined) || 
			   (context.tags?.includes('sensitive') || false) ||
			   (context.tags?.includes('personal') || false);
	}

	/**
	 * Ensure cache has capacity for new entry
	 */
	private async ensureCacheCapacity(newEntrySize: number): Promise<void> {
		while (this.shouldEvict(newEntrySize)) {
			await this.evictEntry();
		}
	}

	/**
	 * Check if eviction is needed
	 */
	private shouldEvict(newEntrySize: number): boolean {
		const currentSize = this.getCurrentCacheSize();
		const wouldExceedSize = (currentSize + newEntrySize) > this.cacheConfig.maxCacheSize;
		const wouldExceedCount = this.cache.size >= this.cacheConfig.maxEntries;
		
		return wouldExceedSize || wouldExceedCount;
	}

	/**
	 * Evict entry based on strategy
	 */
	private async evictEntry(): Promise<void> {
		const strategy = this.cacheConfig.strategies.eviction;
		let entryToEvict: string | null = null;

		switch (strategy) {
		case 'lru':
			entryToEvict = this.findLRUEntry();
			break;
		case 'lfu':
			entryToEvict = this.findLFUEntry();
			break;
		case 'fifo':
			entryToEvict = this.findFIFOEntry();
			break;
		case 'adaptive':
			entryToEvict = this.findAdaptiveEntry();
			break;
		}

		if (entryToEvict) {
			this.cache.delete(entryToEvict);
			this.updateStats();
		}
	}

	/**
	 * Find LRU (Least Recently Used) entry
	 */
	private findLRUEntry(): string | null {
		let oldestKey: string | null = null;
		let oldestTime = Date.now();

		for (const [key, entry] of this.cache) {
			if (entry.lastAccessed < oldestTime) {
				oldestTime = entry.lastAccessed;
				oldestKey = key;
			}
		}

		return oldestKey;
	}

	/**
	 * Find LFU (Least Frequently Used) entry
	 */
	private findLFUEntry(): string | null {
		let leastUsedKey: string | null = null;
		let leastCount = Infinity;

		for (const [key, entry] of this.cache) {
			if (entry.accessCount < leastCount) {
				leastCount = entry.accessCount;
				leastUsedKey = key;
			}
		}

		return leastUsedKey;
	}

	/**
	 * Find FIFO (First In First Out) entry
	 */
	private findFIFOEntry(): string | null {
		let oldestKey: string | null = null;
		let oldestTime = Date.now();

		for (const [key, entry] of this.cache) {
			if (entry.timestamp < oldestTime) {
				oldestTime = entry.timestamp;
				oldestKey = key;
			}
		}

		return oldestKey;
	}

	/**
	 * Find entry using adaptive strategy
	 */
	private findAdaptiveEntry(): string | null {
		// Adaptive strategy considers multiple factors:
		// - Access frequency
		// - Recency
		// - Size
		// - Memory pressure

		let bestKey: string | null = null;
		let bestScore = -Infinity;

		for (const [key, entry] of this.cache) {
			const score = this.calculateEvictionScore(entry);
			if (score > bestScore) {
				bestScore = score;
				bestKey = key;
			}
		}

		return bestKey;
	}

	/**
	 * Calculate eviction score for adaptive strategy
	 */
	private calculateEvictionScore(entry: CacheEntry): number {
		const now = Date.now();
		const age = now - entry.timestamp;
		const recency = now - entry.lastAccessed;
		
		// Higher score = more likely to evict
		let score = 0;
		
		// Age factor (older = higher score)
		score += age / (1000 * 60 * 60); // Hours
		
		// Recency factor (less recent = higher score)
		score += recency / (1000 * 60 * 10); // 10-minute intervals
		
		// Frequency factor (less frequent = higher score)
		score += Math.max(0, 10 - entry.accessCount);
		
		// Size factor (larger = slightly higher score)
		score += Math.log(entry.size + 1) / 10;
		
		return score;
	}

	/**
	 * Get current cache size
	 */
	private getCurrentCacheSize(): number {
		let size = 0;
		for (const entry of this.cache.values()) {
			size += entry.size;
		}
		return size;
	}

	/**
	 * Update cache statistics
	 */
	private updateStats(): void {
		this.stats.totalEntries = this.cache.size;
		this.stats.totalSize = this.getCurrentCacheSize();
		
		// Calculate hit rate
		const totalRequests = this.stats.hitRate + this.stats.missRate;
		if (totalRequests > 0) {
			this.stats.hitRate = this.stats.hitRate / totalRequests;
			this.stats.missRate = this.stats.missRate / totalRequests;
		}

		// Find oldest and newest entries
		let oldest = Date.now();
		let newest = 0;
		
		for (const entry of this.cache.values()) {
			oldest = Math.min(oldest, entry.timestamp);
			newest = Math.max(newest, entry.timestamp);
		}
		
		this.stats.oldestEntry = oldest;
		this.stats.newestEntry = newest;
	}

	/**
	 * Clean up expired entries
	 */
	private async cleanupExpiredEntries(): Promise<void> {
		const now = Date.now();
		const toDelete: string[] = [];

		for (const [key, entry] of this.cache) {
			if (entry.expiresAt && now > entry.expiresAt) {
				toDelete.push(key);
			}
		}

		for (const key of toDelete) {
			this.cache.delete(key);
		}

		if (toDelete.length > 0) {
			this.updateStats();
			await this.saveCacheEntries();
		}
	}

	/**
	 * Start background maintenance
	 */
	private startBackgroundMaintenance(): void {
		// Clean up expired entries every 5 minutes
		setInterval(() => {
			this.cleanupExpiredEntries();
		}, 5 * 60 * 1000);

		// Update and save stats every minute
		setInterval(() => {
			this.updateStats();
			this.saveStats();
		}, 60 * 1000);
	}

	/**
	 * Schedule warmup for common prompts
	 */
	private async scheduleWarmup(): Promise<void> {
		if (!this.warmupConfig.enabled) return;

		// Add common prompts to warmup queue
		for (const prompt of this.warmupConfig.commonPrompts) {
			this.warmupQueue.push(prompt);
		}

		// Start warmup process
		this.processWarmupQueue();
	}

	/**
	 * Process warmup queue
	 */
	private async processWarmupQueue(): Promise<void> {
		// This would trigger actual model warmup
		// Implementation depends on the inference system
		console.log('Processing warmup queue:', this.warmupQueue.length, 'items');
	}

	/**
	 * Estimate response size
	 */
	private estimateSize(response: any): number {
		// Simple size estimation (in production, use more accurate method)
		const jsonString = JSON.stringify(response);
		return jsonString.length * 2; // Rough estimate including overhead
	}

	/**
	 * Generate input hash
	 */
	private generateInputHash(input: any): string {
		const inputString = typeof input === 'string' ? input : JSON.stringify(input);
		// Simple hash (use proper hash function in production)
		let hash = 0;
		for (let i = 0; i < inputString.length; i++) {
			const char = inputString.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash;
		}
		return Math.abs(hash).toString(36);
	}

	/**
	 * Compress response (placeholder)
	 */
	private async compressResponse(response: any): Promise<any> {
		// In production, use actual compression library
		return response;
	}

	/**
	 * Decompress response (placeholder)
	 */
	private async decompressResponse(response: any): Promise<any> {
		// In production, use actual decompression
		return response;
	}

	/**
	 * Encrypt response (placeholder)
	 */
	private async encryptResponse(response: any): Promise<any> {
		// In production, use actual encryption
		return response;
	}

	/**
	 * Clear cache
	 */
	async clearCache(options?: { modelId?: string; olderThan?: number; tags?: string[] }): Promise<void> {
		if (!options) {
			this.cache.clear();
		} else {
			const toDelete: string[] = [];
			
			for (const [key, entry] of this.cache) {
				let shouldDelete = true;
				
				if (options.modelId && entry.modelId !== options.modelId) {
					shouldDelete = false;
				}
				
				if (options.olderThan && entry.timestamp > options.olderThan) {
					shouldDelete = false;
				}
				
				if (options.tags && !options.tags.some(tag => entry.tags.includes(tag))) {
					shouldDelete = false;
				}
				
				if (shouldDelete) {
					toDelete.push(key);
				}
			}
			
			for (const key of toDelete) {
				this.cache.delete(key);
			}
		}

		this.updateStats();
		await this.saveCacheEntries();
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): CacheStats {
		this.updateStats();
		return { ...this.stats };
	}

	/**
	 * Update cache configuration
	 */
	async updateCacheConfig(newConfig: Partial<CacheConfig>): Promise<void> {
		this.cacheConfig = { ...this.cacheConfig, ...newConfig };
		await AsyncStorage.setItem(STORAGE_KEYS.CACHE_CONFIG, JSON.stringify(this.cacheConfig));
	}

	/**
	 * Update warmup configuration
	 */
	async updateWarmupConfig(newConfig: Partial<WarmupConfig>): Promise<void> {
		this.warmupConfig = { ...this.warmupConfig, ...newConfig };
		await AsyncStorage.setItem(STORAGE_KEYS.WARMUP_CONFIG, JSON.stringify(this.warmupConfig));
	}
}