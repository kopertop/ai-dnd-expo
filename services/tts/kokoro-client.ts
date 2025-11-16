/**
 * Kokoro TTS Client
 * 
 * Provides text-to-speech using Kokoro TTS API
 * Supports caching and offline playback
 */

import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export interface KokoroTTSOptions {
	text: string;
	voice?: string;
	speed?: number;
	pitch?: number;
	emotion?: string;
}

export interface KokoroTTSResponse {
	audioUrl: string;
	duration?: number;
	format?: string;
}

export class KokoroTTSClient {
	private baseUrl: string;
	private cacheDir: string;
	private audioCache: Map<string, string> = new Map();

	constructor(config?: { baseUrl?: string; cacheDir?: string }) {
		this.baseUrl = config?.baseUrl || process.env.EXPO_PUBLIC_TTS_BASE_URL || 'http://localhost:5000';
		this.cacheDir = config?.cacheDir || (Platform.OS === 'web' ? 'kokoro-cache' : `${FileSystem.cacheDirectory}kokoro/`);
		this.initializeCache();
	}

	/**
	 * Initialize cache directory
	 */
	private async initializeCache(): Promise<void> {
		if (Platform.OS !== 'web') {
			try {
				const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
				if (!dirInfo.exists) {
					await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
				}
			} catch (error) {
				console.warn('Failed to create Kokoro cache directory:', error);
			}
		} else {
			// Web: Use CacheStorage API
			try {
				if ('caches' in window) {
					await caches.open('kokoro-tts-cache');
				}
			} catch (error) {
				console.warn('Failed to initialize web cache:', error);
			}
		}
	}

	/**
	 * Generate speech from text
	 */
	async synthesize(
		options: KokoroTTSOptions,
	): Promise<{ uri: string; duration?: number }> {
		const cacheKey = this.generateCacheKey(options);
		
		// Check cache first
		const cached = await this.getCachedAudio(cacheKey);
		if (cached) {
			return cached;
		}

		// Generate new audio
		const audioUri = await this.fetchAudio(options);
		
		// Cache the audio
		await this.cacheAudio(cacheKey, audioUri);
		
		return { uri: audioUri };
	}

	/**
	 * Generate cache key from options
	 */
	private generateCacheKey(options: KokoroTTSOptions): string {
		return `${options.text}-${options.voice || 'default'}-${options.speed || 1.0}-${options.pitch || 1.0}-${options.emotion || 'neutral'}`;
	}

	/**
	 * Fetch audio from Kokoro API
	 */
	private async fetchAudio(options: KokoroTTSOptions): Promise<string> {
		const url = `${this.baseUrl}/api/tts`;
		
		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					text: options.text,
					voice: options.voice || 'default',
					speed: options.speed || 1.0,
					pitch: options.pitch || 1.0,
					emotion: options.emotion || 'neutral',
				}),
			});

			if (!response.ok) {
				throw new Error(`Kokoro TTS API error: ${response.status} ${response.statusText}`);
			}

			// Handle different response formats
			const contentType = response.headers.get('content-type');
			
			if (contentType?.includes('application/json')) {
				const data: KokoroTTSResponse = await response.json();
				return data.audioUrl;
			} else {
				// Binary audio data
				const blob = await response.blob();
				return await this.saveBlobToFile(blob, options);
			}
		} catch (error) {
			console.error('Failed to fetch Kokoro audio:', error);
			throw error;
		}
	}

	/**
	 * Save blob to file (web or native)
	 */
	private async saveBlobToFile(blob: Blob, options: KokoroTTSOptions): Promise<string> {
		if (Platform.OS === 'web') {
			// Web: Create object URL
			const url = URL.createObjectURL(blob);
			return url;
		} else {
			// Native: Save to file system
			const fileName = `${this.generateCacheKey(options)}.wav`;
			const fileUri = `${this.cacheDir}${fileName}`;
			
			const reader = new FileReader();
			return new Promise((resolve, reject) => {
				reader.onloadend = async () => {
					try {
						const base64 = (reader.result as string).split(',')[1];
						await FileSystem.writeAsStringAsync(fileUri, base64, {
							encoding: FileSystem.EncodingType.Base64,
						});
						resolve(fileUri);
					} catch (error) {
						reject(error);
					}
				};
				reader.onerror = reject;
				reader.readAsDataURL(blob);
			});
		}
	}

	/**
	 * Get cached audio
	 */
	private async getCachedAudio(cacheKey: string): Promise<{ uri: string; duration?: number } | null> {
		if (Platform.OS === 'web') {
			// Web: Check CacheStorage
			try {
				if ('caches' in window) {
					const cache = await caches.open('kokoro-tts-cache');
					const cached = await cache.match(cacheKey);
					if (cached) {
						const blob = await cached.blob();
						const url = URL.createObjectURL(blob);
						return { uri: url };
					}
				}
			} catch (error) {
				console.warn('Failed to get cached audio from web cache:', error);
			}
		} else {
			// Native: Check file system
			const fileName = `${cacheKey}.wav`;
			const fileUri = `${this.cacheDir}${fileName}`;
			
			try {
				const fileInfo = await FileSystem.getInfoAsync(fileUri);
				if (fileInfo.exists) {
					return { uri: fileUri };
				}
			} catch (error) {
				console.warn('Failed to check cached audio file:', error);
			}
		}

		return null;
	}

	/**
	 * Cache audio
	 */
	private async cacheAudio(cacheKey: string, audioUri: string): Promise<void> {
		this.audioCache.set(cacheKey, audioUri);
		
		if (Platform.OS === 'web') {
			// Web: Store in CacheStorage
			try {
				if ('caches' in window) {
					const cache = await caches.open('kokoro-tts-cache');
					const response = await fetch(audioUri);
					await cache.put(cacheKey, response);
				}
			} catch (error) {
				console.warn('Failed to cache audio in web cache:', error);
			}
		}
		// Native: Already saved to file system in saveBlobToFile
	}

	/**
	 * Clear cache
	 */
	async clearCache(): Promise<void> {
		this.audioCache.clear();
		
		if (Platform.OS === 'web') {
			try {
				if ('caches' in window) {
					await caches.delete('kokoro-tts-cache');
					await this.initializeCache();
				}
			} catch (error) {
				console.warn('Failed to clear web cache:', error);
			}
		} else {
			try {
				const files = await FileSystem.readDirectoryAsync(this.cacheDir);
				for (const file of files) {
					await FileSystem.deleteAsync(`${this.cacheDir}${file}`, { idempotent: true });
				}
			} catch (error) {
				console.warn('Failed to clear native cache:', error);
			}
		}
	}

	/**
	 * Get cache size
	 */
	async getCacheSize(): Promise<number> {
		if (Platform.OS === 'web') {
			// Web: Estimate from CacheStorage
			try {
				if ('caches' in window) {
					const cache = await caches.open('kokoro-tts-cache');
					const keys = await cache.keys();
					return keys.length;
				}
			} catch (error) {
				console.warn('Failed to get web cache size:', error);
			}
			return 0;
		} else {
			// Native: Sum file sizes
			try {
				const files = await FileSystem.readDirectoryAsync(this.cacheDir);
				let totalSize = 0;
				for (const file of files) {
					const fileInfo = await FileSystem.getInfoAsync(`${this.cacheDir}${file}`);
					if (fileInfo.exists && 'size' in fileInfo) {
						totalSize += fileInfo.size || 0;
					}
				}
				return totalSize;
			} catch (error) {
				console.warn('Failed to get native cache size:', error);
				return 0;
			}
		}
	}
}

// Helper function to create a client instance
export const createKokoroTTSClient = (config?: { baseUrl?: string; cacheDir?: string }): KokoroTTSClient => {
	return new KokoroTTSClient(config);
};

