/**
 * Hook for using the AI Dungeon Master.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { DMProvider } from '@/services/ai/providers/dm-provider';
import type { Character } from '@/types/character';
import type { GameWorldState } from '@/types/world-map';

// Types
export interface UseDungeonMasterOptions {
	modelUrl?: string;
	apiKey?: string;
	fallbackMode?: 'local' | 'localfirst' | 'remotefirst' | 'remote';
	autoInitialize?: boolean;
  // Optional convenience inputs to build context automatically
  worldState?: GameWorldState | null;
  playerCharacter?: Character | null;
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

// Constants (kept generic to avoid vendor naming)
const DM_API_KEY_STORAGE_KEY = 'dm_api_key';

/**
 * Hook for using the AI Dungeon Master.
 */
export const useDungeonMaster = (options: UseDungeonMasterOptions = {}) => {
	const [provider, setProvider] = useState<DMProvider | null>(null);
	const [isInitialized, setIsInitialized] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [initProgress, setInitProgress] = useState(0);
	const colorScheme = useColorScheme();
	const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

	// Initialize the provider
	const initialize = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);


			// Create provider (modelUrl/apiKey optional; unused by rule-based provider)
			const dmProvider = new DMProvider({
				modelUrl: options.modelUrl,
				apiKey: options.apiKey,
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
				// Set a default welcome message for UI consumers that expect it
				setMessages([{ role: 'assistant', content: 'Welcome to your adventure!' }]);
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

	// High-level chat API expected by UI
	const sendMessage = useCallback(
		async (message: string) => {
			if (!provider || !isInitialized) {
				setError('DM is not initialized');
				return;
			}

			// Append user message
			setMessages(prev => [...prev, { role: 'user', content: message }]);

			// Build DM context from options + recent messages
			const ctx: DMContext = {
				playerName: options.playerCharacter?.name || 'Player',
				playerClass: options.playerCharacter?.class || 'Adventurer',
				playerRace: options.playerCharacter?.race || 'Human',
				currentScene: options.worldState?.worldMap?.name || 'Unknown Location',
				gameHistory: messages.map(m => `${m.role}: ${m.content}`).slice(-5),
			};

			const result = await processPlayerAction(message, ctx);
			setMessages(prev => [...prev, { role: 'assistant', content: result.text }]);
			return result;
		},
		[provider, isInitialized, options.playerCharacter, options.worldState, messages, processPlayerAction],
	);

	const replaceWelcomeMessage = useCallback((content: string) => {
		setMessages([{ role: 'assistant', content }]);
	}, []);

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
			await AsyncStorage.setItem(DM_API_KEY_STORAGE_KEY, apiKey);
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
		// compatibility additions
		messages,
		sendMessage,
		replaceWelcomeMessage,
	};
};
