/**
 * Hook for using Cactus Compute's LLM as a Dungeon Master
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { DMProvider } from '@/services/ai/providers/dm-provider';

// Types
export interface UseDungeonMasterOptions {
	modelUrl?: string;
	apiKey?: string;
	fallbackMode?: 'local' | 'localfirst' | 'remotefirst' | 'remote';
	autoInitialize?: boolean;
}

export interface DMResponse {
	text: string;
	toolCommands: Array<{ type: string; params: string }>;
	isLoading: boolean;
	error: string | null;
}

export interface DMContext {
	playerName: string;
	playerClass: string;
	playerRace: string;
	currentScene: string;
	gameHistory: string[];
}

// Constants
const CACTUS_API_KEY_STORAGE_KEY = 'cactus_api_key';
const DEFAULT_MODEL_URL =
	'https://huggingface.co/Cactus-Compute/Gemma3-1B-Instruct-GGUF/resolve/main/Gemma3-1B-Instruct-Q4_0.gguf';

/**
 * Hook for using Cactus Compute's LLM as a Dungeon Master
 */
export const useDungeonMaster = (options: UseDungeonMasterOptions = {}) => {
	const [provider, setProvider] = useState<DMProvider | null>(null);
	const [isInitialized, setIsInitialized] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [initProgress, setInitProgress] = useState(0);
	const colorScheme = useColorScheme();

	// Initialize the provider
	const initialize = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			// Get API key from storage if not provided
			let apiKey = options.apiKey;
			if (!apiKey) {
				apiKey = (await AsyncStorage.getItem(CACTUS_API_KEY_STORAGE_KEY)) || undefined;
			}

			// Create provider
			const dmProvider = new DMProvider({
				modelUrl: options.modelUrl || DEFAULT_MODEL_URL,
				apiKey,
				fallbackMode: options.fallbackMode || 'localfirst',
			});

			// Initialize provider
			const success = await dmProvider.initialize(progress => {
				setInitProgress(progress);
			});

			if (success) {
				setProvider(dmProvider);
				setIsInitialized(true);
				console.log('✅ DM initialized successfully');
			} else {
				setError('Failed to initialize DM');
			}
		} catch (err) {
			console.error('Error initializing DM:', err);
			setError(
				`Failed to initialize DM: ${err instanceof Error ? err.message : String(err)}`,
			);
		} finally {
			setIsLoading(false);
		}
	}, [options.apiKey, options.modelUrl, options.fallbackMode]);

	// Auto-initialize if enabled
	useEffect(() => {
		if (options.autoInitialize) {
			initialize();
		}
	}, [initialize, options.autoInitialize]);

	// Process player action
	const processPlayerAction = useCallback(
		async (action: string, context: DMContext): Promise<DMResponse> => {
			if (!provider || !isInitialized) {
				return {
					text: 'DM is not initialized. Please initialize first.',
					toolCommands: [],
					isLoading: false,
					error: 'Not initialized',
				};
			}

			try {
				setIsLoading(true);
				setError(null);

				const response = await provider.generateDnDResponse(action, context);

				return {
					text: response.text,
					toolCommands: response.toolCommands,
					isLoading: false,
					error: null,
				};
			} catch (err) {
				const errorMessage = `Error processing action: ${err instanceof Error ? err.message : String(err)}`;
				console.error(errorMessage);
				setError(errorMessage);

				return {
					text: 'I apologize, but I encountered an issue processing your action. Please try again.',
					toolCommands: [],
					isLoading: false,
					error: errorMessage,
				};
			} finally {
				setIsLoading(false);
			}
		},
		[provider, isInitialized],
	);

	// Generate narration
	const generateNarration = useCallback(
		async (
			scene: string,
			context: {
				playerName: string;
				playerClass: string;
				playerRace: string;
				currentLocation: string;
			},
		): Promise<string> => {
			if (!provider || !isInitialized) {
				return 'DM is not initialized. Please initialize first.';
			}

			try {
				setIsLoading(true);
				setError(null);

				const narration = await provider.generateNarration(scene, context);
				return narration;
			} catch (err) {
				const errorMessage = `Error generating narration: ${err instanceof Error ? err.message : String(err)}`;
				console.error(errorMessage);
				setError(errorMessage);
				return 'I apologize, but I encountered an issue generating the narration. Please try again.';
			} finally {
				setIsLoading(false);
			}
		},
		[provider, isInitialized],
	);

	// Set API key
	const setApiKey = useCallback(async (apiKey: string): Promise<boolean> => {
		try {
			await AsyncStorage.setItem(CACTUS_API_KEY_STORAGE_KEY, apiKey);
			return true;
		} catch (err) {
			console.error('Error saving API key:', err);
			setError(`Failed to save API key: ${err instanceof Error ? err.message : String(err)}`);
			return false;
		}
	}, []);

	// Cleanup
	const cleanup = useCallback(async (): Promise<void> => {
		if (provider) {
			try {
				await provider.cleanup();
				setProvider(null);
				setIsInitialized(false);
			} catch (err) {
				console.error('Error cleaning up DM:', err);
			}
		}
	}, [provider]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (provider) {
				provider.cleanup().catch(console.error);
			}
		};
	}, [provider]);

	return {
		isInitialized,
		isLoading,
		error,
		initProgress,
		initialize,
		processPlayerAction,
		generateNarration,
		setApiKey,
		cleanup,
	};
};
