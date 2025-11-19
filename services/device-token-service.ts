import { Platform } from 'react-native';

import { secureStoreService } from '@/services/secure-store-service';

const DEVICE_TOKEN_KEY = 'deviceToken';
const DEVICE_TOKEN_LENGTH = 64; // 256 bits of entropy

/**
 * Service for managing device tokens for persistent authentication
 */
class DeviceTokenService {
	private currentDeviceToken: string | null = null;
	private deviceInfo: {
		deviceName?: string;
		devicePlatform: string;
		userAgent?: string;
	};

	constructor() {
		this.deviceInfo = {
			devicePlatform: Platform.OS,
			deviceName: this.getDeviceName(),
			userAgent: this.getUserAgent(),
		};
	}

	/**
	 * Generate a cryptographically secure random device token
	 */
	private generateDeviceToken(): string {
		// Use crypto.getRandomValues if available (web), otherwise fallback
		if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
			const array = new Uint8Array(DEVICE_TOKEN_LENGTH / 2); // 32 bytes = 64 hex chars
			crypto.getRandomValues(array);
			return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
		}

		// Fallback for environments without crypto.getRandomValues
		const chars = '0123456789abcdef';
		let result = '';
		for (let i = 0; i < DEVICE_TOKEN_LENGTH; i++) {
			result += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return result;
	}

	/**
	 * Get device name for identification
	 */
	private getDeviceName(): string | undefined {
		if (Platform.OS === 'web') {
			return typeof navigator !== 'undefined' ? navigator.platform : 'Web Browser';
		}
		// For mobile platforms, this could be enhanced with device info libraries
		return Platform.OS === 'ios' ? 'iOS Device' : 'Android Device';
	}

	/**
	 * Get user agent string
	 */
	private getUserAgent(): string | undefined {
		if (typeof navigator !== 'undefined') {
			return navigator.userAgent;
		}
		return undefined;
	}

	/**
	 * Get the current device token from storage
	 */
	async getDeviceToken(): Promise<string | null> {
		if (this.currentDeviceToken) {
			return this.currentDeviceToken;
		}

		try {
			const storedToken = await secureStoreService.getItemAsync(DEVICE_TOKEN_KEY);
			if (storedToken) {
				this.currentDeviceToken = storedToken;
				console.log('DeviceTokenService: Loaded existing device token');
				return storedToken;
			}
		} catch (error) {
			console.error('DeviceTokenService: Error loading device token:', error);
		}

		return null;
	}

	/**
	 * Generate and store a new device token
	 */
	async generateAndStoreDeviceToken(): Promise<string> {
		const newToken = this.generateDeviceToken();
		
		try {
			await secureStoreService.setItemAsync(DEVICE_TOKEN_KEY, newToken);
			this.currentDeviceToken = newToken;
			console.log('DeviceTokenService: Generated and stored new device token');
			return newToken;
		} catch (error) {
			console.error('DeviceTokenService: Error storing device token:', error);
			throw new Error('Failed to store device token');
		}
	}

	/**
	 * Clear the stored device token
	 */
	async clearDeviceToken(): Promise<void> {
		try {
			await secureStoreService.deleteItemAsync(DEVICE_TOKEN_KEY);
			this.currentDeviceToken = null;
			console.log('DeviceTokenService: Cleared device token');
		} catch (error) {
			console.error('DeviceTokenService: Error clearing device token:', error);
		}
	}

	/**
	 * Get device information for registration
	 */
	getDeviceInfo() {
		return {
			...this.deviceInfo,
			userAgent: this.getUserAgent(), // Get fresh user agent
		};
	}

	/**
	 * Validate device token format
	 */
	isValidDeviceToken(token: string): boolean {
		if (!token || typeof token !== 'string') {
			return false;
		}

		// Check if it's the right length and only contains hex characters
		const hexRegex = /^[0-9a-f]+$/i;
		return token.length === DEVICE_TOKEN_LENGTH && hexRegex.test(token);
	}

	/**
	 * Get or create a device token
	 */
	async getOrCreateDeviceToken(): Promise<string> {
		const existingToken = await this.getDeviceToken();
		if (existingToken && this.isValidDeviceToken(existingToken)) {
			return existingToken;
		}

		// Generate new token if none exists or existing is invalid
		return await this.generateAndStoreDeviceToken();
	}
}

// Export singleton instance
export const deviceTokenService = new DeviceTokenService();

