/**
 * Cactus Integration Bridge
 *
 * This file provides a bridge between the app's existing AI system and the Cactus Compute LLM.
 * It handles initialization, model loading, and response generation.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { DMProvider } from './providers/dm-provider';

// Configuration constants
const CACTUS_API_KEY_STORAGE_KEY = 'cactus_api_key';
const CACTUS_MODEL_PREFERENCE_KEY = 'cactus_model_preference';
const DEFAULT_MODEL_URL = 'https://huggingface.co/Cactus-Compute/Gemma3-1B-Instruct-GGUF/resolve/main/Gemma3-1B-Instruct-Q4_0.gguf';

// Event emitter for progress updates
let progressCallback: ((progress: { status: string; url?: string }) => void) | null = null;

// Provider instance
let provider: DMProvider | null = null;

/**
 * Initialize the Cactus LLM
 */
export async function initializeCactusLLM(
	onProgress?: (progress: { status: string; url?: string }) => void,
): Promise<boolean> {
	try {
		// Store the progress callback
		progressCallback = onProgress || null;

		// Send initial progress update
		if (progressCallback) {
			progressCallback({ status: 'downloading' });
		}

		// Get API key from storage
		const apiKey = await AsyncStorage.getItem(CACTUS_API_KEY_STORAGE_KEY);

		// Get model preference from storage
		const modelUrl = await AsyncStorage.getItem(CACTUS_MODEL_PREFERENCE_KEY) || DEFAULT_MODEL_URL;

		// Create provider
		provider = new DMProvider({
			modelUrl,
			apiKey: apiKey || undefined,
			fallbackMode: 'localfirst',
			timeout: 30000, // 30 seconds timeout
		});

		// Initialize provider with progress tracking
		const success = await provider.initialize((progress) => {
			if (progressCallback) {
				progressCallback({
					status: progress < 1 ? 'download' : 'done',
					url: modelUrl,
				});
			}
		});

		if (success) {
			console.warn('✅ Cactus LLM initialized successfully');
			if (progressCallback) {
				progressCallback({ status: 'done' });
			}
			return true;
		} else {
			console.error('❌ Failed to initialize Cactus LLM');
			if (progressCallback) {
				progressCallback({ status: 'error' });
			}
			return false;
		}
	} catch (error) {
		console.error('❌ Error initializing Cactus LLM:', error);
		if (progressCallback) {
			progressCallback({ status: 'error' });
		}
		return false;
	}
}

/**
 * Generate a response from the Cactus LLM
 */
export async function generateCactusResponse(
	prompt: string,
	context: {
		playerName: string;
		playerClass: string;
		playerRace: string;
		currentScene: string;
		gameHistory: string[];
	},
): Promise<{
	text: string;
	toolCommands: Array<{ type: string; params: string }>;
}> {
	if (!provider) {
		throw new Error('Cactus LLM not initialized');
	}

	try {
		const response = await provider.generateDnDResponse(prompt, context);
		return {
			text: response.text,
			toolCommands: response.toolCommands,
		};
	} catch (error) {
		console.error('❌ Error generating Cactus response:', error);
		throw error;
	}
}

/**
 * Generate a narration from the Cactus LLM
 */
export async function generateCactusNarration(
	scene: string,
	context: {
		playerName: string;
		playerClass: string;
		playerRace: string;
		currentLocation: string;
	},
): Promise<string> {
	if (!provider) {
		throw new Error('Cactus LLM not initialized');
	}

	try {
		return await provider.generateNarration(scene, context);
	} catch (error) {
		console.error('❌ Error generating Cactus narration:', error);
		throw error;
	}
}

/**
 * Check if the Cactus LLM is initialized
 */
export function isCactusInitialized(): boolean {
	return !!provider && provider.isProviderReady();
}

/**
 * Set the Cactus API key
 */
export async function setCactusApiKey(apiKey: string): Promise<void> {
	await AsyncStorage.setItem(CACTUS_API_KEY_STORAGE_KEY, apiKey);
}

/**
 * Set the Cactus model preference
 */
export async function setCactusModelPreference(modelUrl: string): Promise<void> {
	await AsyncStorage.setItem(CACTUS_MODEL_PREFERENCE_KEY, modelUrl);
}

/**
 * Get device information for Cactus
 */
export function getCactusDeviceInfo(): {
	platform: string;
	os: string;
	model?: string;
	} {
	return {
		platform: Platform.OS,
		os: Platform.Version.toString(),
		model: Platform.OS === 'ios' ? 'iPhone' : 'Android',
	};
}

/**
 * Clean up Cactus resources
 */
export async function cleanupCactus(): Promise<void> {
	if (provider) {
		await provider.cleanup();
		provider = null;
	}
	progressCallback = null;
}
