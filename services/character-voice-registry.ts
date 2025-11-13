import AsyncStorage from '@react-native-async-storage/async-storage';

import { CharacterType, VoiceAssignment, VoiceAssignmentData } from '@/types/voice';

/**
 * Character Voice Registry - Manages persistent voice assignments using AsyncStorage
 */
export class CharacterVoiceRegistry {
	private static readonly STORAGE_KEY = '@character_voice_assignments';
	private static readonly STORAGE_VERSION = '1.0.0';

	private static cache: VoiceAssignmentData | null = null;
	private static isLoaded = false;

	/**
	 * Initialize the registry and load existing assignments
	 */
	public static async initialize(): Promise<void> {
		try {
			await this.loadAssignments();
			this.isLoaded = true;
		} catch (error) {
			console.error('Failed to initialize Character Voice Registry:', error);
			// Initialize with empty data if loading fails
			this.cache = this.createEmptyData();
			this.isLoaded = true;
		}
	}

	/**
	 * Load voice assignments from AsyncStorage
	 */
	private static async loadAssignments(): Promise<VoiceAssignmentData> {
		try {
			const stored = await AsyncStorage.getItem(this.STORAGE_KEY);

			if (!stored) {
				this.cache = this.createEmptyData();
				await this.saveAssignments();
				return this.cache;
			}

			const parsed = JSON.parse(stored) as VoiceAssignmentData;

			// Handle version migration if needed
			if (parsed.version !== this.STORAGE_VERSION) {
				this.cache = await this.migrateData(parsed);
				await this.saveAssignments();
			} else {
				this.cache = parsed;
			}

			return this.cache;
		} catch (error) {
			console.error('Failed to load voice assignments:', error);
			this.cache = this.createEmptyData();
			return this.cache;
		}
	}

	/**
	 * Save voice assignments to AsyncStorage
	 */
	private static async saveAssignments(): Promise<void> {
		if (!this.cache) return;

		try {
			this.cache.lastUpdated = Date.now();
			const serialized = JSON.stringify(this.cache);
			await AsyncStorage.setItem(this.STORAGE_KEY, serialized);
		} catch (error) {
			console.error('Failed to save voice assignments:', error);
			throw error;
		}
	}

	/**
	 * Create empty assignment data structure
	 */
	private static createEmptyData(): VoiceAssignmentData {
		return {
			version: this.STORAGE_VERSION,
			lastUpdated: Date.now(),
			assignments: {},
			voiceUsage: {},
		};
	}

	/**
	 * Migrate data from older versions
	 */
	private static async migrateData(oldData: any): Promise<VoiceAssignmentData> {
		// For now, just create new data structure
		// In future versions, implement actual migration logic
		console.log('Migrating voice assignment data from version:', oldData.version);
		return this.createEmptyData();
	}

	/**
	 * Ensure registry is loaded before operations
	 */
	private static async ensureLoaded(): Promise<void> {
		if (!this.isLoaded) {
			await this.initialize();
		}
	}

	/**
	 * Get voice assignment for a character
	 */
	public static async getAssignment(characterId: string): Promise<VoiceAssignment | null> {
		await this.ensureLoaded();

		if (!this.cache) return null;

		return this.cache.assignments[characterId] || null;
	}

	/**
	 * Set voice assignment for a character
	 */
	public static async setAssignment(
		characterId: string,
		voiceId: string,
		characterType: CharacterType,
		characterName: string,
		isLocked: boolean = false,
	): Promise<void> {
		await this.ensureLoaded();

		if (!this.cache) {
			this.cache = this.createEmptyData();
		}

		// Remove any existing assignment for this character
		await this.removeAssignment(characterId);

		// Create new assignment
		const assignment: VoiceAssignment = {
			characterId,
			voiceId,
			assignedAt: Date.now(),
			characterType,
			characterName,
			isLocked,
		};

		this.cache.assignments[characterId] = assignment;

		// Update voice usage tracking
		if (!this.cache.voiceUsage[voiceId]) {
			this.cache.voiceUsage[voiceId] = {
				assignedCount: 0,
				lastUsed: Date.now(),
				totalUsageTime: 0,
			};
		}

		this.cache.voiceUsage[voiceId].assignedCount += 1;
		this.cache.voiceUsage[voiceId].lastUsed = Date.now();

		await this.saveAssignments();
	}

	/**
	 * Remove voice assignment for a character
	 */
	public static async removeAssignment(characterId: string): Promise<void> {
		await this.ensureLoaded();

		if (!this.cache) return;

		const existingAssignment = this.cache.assignments[characterId];
		if (existingAssignment) {
			// Update voice usage tracking
			const voiceUsage = this.cache.voiceUsage[existingAssignment.voiceId];
			if (voiceUsage && voiceUsage.assignedCount > 0) {
				voiceUsage.assignedCount -= 1;
			}

			delete this.cache.assignments[characterId];
			await this.saveAssignments();
		}
	}

	/**
	 * Get all assignments
	 */
	public static async getAllAssignments(): Promise<Record<string, VoiceAssignment>> {
		await this.ensureLoaded();

		if (!this.cache) return {};

		return { ...this.cache.assignments };
	}

	/**
	 * Get assignments by character type
	 */
	public static async getAssignmentsByType(
		characterType: CharacterType,
	): Promise<VoiceAssignment[]> {
		await this.ensureLoaded();

		if (!this.cache) return [];

		return Object.values(this.cache.assignments).filter(
			assignment => assignment.characterType === characterType,
		);
	}

	/**
	 * Check if a voice is currently assigned
	 */
	public static async isVoiceAssigned(voiceId: string): Promise<boolean> {
		await this.ensureLoaded();

		if (!this.cache) return false;

		return Object.values(this.cache.assignments).some(
			assignment => assignment.voiceId === voiceId,
		);
	}

	/**
	 * Get characters assigned to a specific voice
	 */
	public static async getCharactersForVoice(voiceId: string): Promise<VoiceAssignment[]> {
		await this.ensureLoaded();

		if (!this.cache) return [];

		return Object.values(this.cache.assignments).filter(
			assignment => assignment.voiceId === voiceId,
		);
	}

	/**
	 * Update voice usage time
	 */
	public static async updateVoiceUsage(voiceId: string, usageTimeMs: number): Promise<void> {
		await this.ensureLoaded();

		if (!this.cache) return;

		if (!this.cache.voiceUsage[voiceId]) {
			this.cache.voiceUsage[voiceId] = {
				assignedCount: 0,
				lastUsed: Date.now(),
				totalUsageTime: 0,
			};
		}

		this.cache.voiceUsage[voiceId].lastUsed = Date.now();
		this.cache.voiceUsage[voiceId].totalUsageTime += usageTimeMs;

		await this.saveAssignments();
	}

	/**
	 * Get voice usage statistics
	 */
	public static async getVoiceUsage(voiceId: string): Promise<{
		assignedCount: number;
		lastUsed: number;
		totalUsageTime: number;
	} | null> {
		await this.ensureLoaded();

		if (!this.cache) return null;

		return this.cache.voiceUsage[voiceId] || null;
	}

	/**
	 * Clear all assignments (for testing or reset)
	 */
	public static async clearAllAssignments(): Promise<void> {
		await this.ensureLoaded();

		this.cache = this.createEmptyData();
		await this.saveAssignments();
	}

	/**
	 * Export assignments for backup
	 */
	public static async exportAssignments(): Promise<string> {
		await this.ensureLoaded();

		if (!this.cache) return JSON.stringify(this.createEmptyData());

		return JSON.stringify(this.cache, null, 2);
	}

	/**
	 * Import assignments from backup
	 */
	public static async importAssignments(data: string): Promise<void> {
		try {
			const parsed = JSON.parse(data) as VoiceAssignmentData;

			// Validate the data structure
			if (!parsed.version || !parsed.assignments || !parsed.voiceUsage) {
				throw new Error('Invalid assignment data format');
			}

			this.cache = parsed;
			await this.saveAssignments();
			this.isLoaded = true;
		} catch (error) {
			console.error('Failed to import voice assignments:', error);
			throw error;
		}
	}
}
