import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Secure storage service that works across platforms
 * - Uses expo-secure-store on native platforms
 * - Falls back to localStorage on web (less secure)
 */
class SecureStoreService {
	private isAvailable(): boolean {
		return Platform.OS !== 'web' && !!SecureStore.getItemAsync;
	}

	async setItemAsync(key: string, value: string): Promise<void> {
		try {
			if (this.isAvailable()) {
				await SecureStore.setItemAsync(key, value);
			} else {
				// Fallback to localStorage on web
				if (typeof window !== 'undefined' && window.localStorage) {
					localStorage.setItem(key, value);
				} else {
					console.warn('No secure storage available');
				}
			}
		} catch (error) {
			console.error('Error storing item securely:', error);
			throw error;
		}
	}

	async getItemAsync(key: string): Promise<string | null> {
		try {
			if (this.isAvailable()) {
				return await SecureStore.getItemAsync(key);
			} else {
				// Fallback to localStorage on web
				if (typeof window !== 'undefined' && window.localStorage) {
					const value = localStorage.getItem(key);
					// Validate that stored data is valid JSON if it looks like JSON
					if (value && (value.startsWith('{') || value.startsWith('['))) {
						try {
							JSON.parse(value);
						} catch (parseError) {
							console.warn(`Corrupted JSON data in localStorage for key "${key}", removing`, parseError);
							localStorage.removeItem(key);
							return null;
						}
					}
					return value;
				} else {
					console.warn('No secure storage available');
					return null;
				}
			}
		} catch (error) {
			console.error('Error retrieving item from secure storage:', error);
			return null;
		}
	}

	async deleteItemAsync(key: string): Promise<void> {
		try {
			if (this.isAvailable()) {
				await SecureStore.deleteItemAsync(key);
			} else {
				// Fallback to localStorage on web
				if (typeof window !== 'undefined' && window.localStorage) {
					localStorage.removeItem(key);
				} else {
					console.warn('No secure storage available');
				}
			}
		} catch (error) {
			console.error('Error deleting item from secure storage:', error);
			// Don't throw on delete errors
		}
	}

	/**
	 * Get information about the storage implementation being used
	 */
	getStorageInfo(): { platform: string; secure: boolean; available: boolean } {
		const isNativeSecure = this.isAvailable();
		const hasLocalStorage = typeof window !== 'undefined' && !!window.localStorage;

		return {
			platform: Platform.OS,
			secure: isNativeSecure,
			available: isNativeSecure || hasLocalStorage,
		};
	}
}

// Export singleton instance
export const secureStoreService = new SecureStoreService();

