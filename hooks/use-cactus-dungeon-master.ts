/**
 * Simple Cactus Dungeon Master Hook
 *
 * A React hook for using the Cactus DM Agent in React components
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { CactusDMAgentSimple, DMResponse, GameContext } from '../services/ai/agents/cactus-dm-agent-simple';

// Constants
const CACTUS_API_KEY_STORAGE_KEY = 'cactus_api_key';
const CACTUS_MODEL_PREFERENCE_KEY = 'cactus_model_preference';
const DEFAULT_MODEL_URL = 'https://huggingface.co/Cactus-Compute/Gemma3-1B-Instruct-GGUF/resolve/main/Gemma3-1B-Instruct-Q4_0.gguf';

// Types
export interface Message {
	role: string;
	content: string;
}

export interface UseCactusDungeonMasterOptions {
	modelUrl?: string;
	apiKey?: string;
	autoInitialize?: boolean;
	worldState?: any;
	playerCharacter?: any;
}

export interface DMContext {
	playerName: string;
	playerClass: string;
	playerRace: string;
	currentScene: string;
	gameHistory: string[];
}

/**
 * Hook for using Cactus Compute's LLM as a Dungeon Master
 */
export const useCactusDungeonMaster = (options: UseCactusDungeonMasterOptions = {}) => {
	const [isInitialized, setIsInitialized] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [initProgress, setInitProgress] = useState(0);
	const [messages, setMessages] = useState<Message[]>([]);

	const agentRef = useRef<CactusDMAgentSimple | null>(null);

	// Initialize the agent
	useEffect(() => {
		const initAgent = async () => {
			try {
				// Get API key from storage if not provided
				let apiKey = options.apiKey;
				if (!apiKey) {
					apiKey = await AsyncStorage.getItem(CACTUS_API_KEY_STORAGE_KEY) || undefined;
				}

				// Get model URL from storage if not provided
				let modelUrl = options.modelUrl;
				if (!modelUrl) {
					modelUrl = await AsyncStorage.getItem(CACTUS_MODEL_PREFERENCE_KEY) || DEFAULT_MODEL_URL;
				}

				// Create and initialize the agent
				const agent = new CactusDMAgentSimple({
					modelUrl,
					apiKey,
				});

				setIsLoading(true);
				setError(null);

				const success = await agent.initialize((progress) => {
					setInitProgress(progress);
				});

				if (success) {
					agentRef.current = agent;
					setIsInitialized(true);
					setMessages([{ role: 'assistant', content: 'Welcome to your adventure!' }]);
				} else {
					setError('Failed to initialize DM agent');
				}
			} catch (error) {
				console.error('Error initializing DM agent:', error);
				setError(`Failed to initialize: ${error instanceof Error ? error.message : String(error)}`);
			} finally {
				setIsLoading(false);
			}
		};

		if (options.autoInitialize !== false) {
			initAgent();
		}

		// Cleanup
		return () => {
			if (agentRef.current) {
				agentRef.current.cleanup();
			}
		};
	}, [options.apiKey, options.modelUrl, options.autoInitialize]);

	/**
	* Process a player action
	*/
	const processPlayerAction = useCallback(async (action: string, context: DMContext): Promise<DMResponse> => {
		if (!agentRef.current || !isInitialized) {
			throw new Error('DM agent not initialized');
		}

		setIsLoading(true);
		setError(null);

		try {
			const response = await agentRef.current.processPlayerAction(action, context);
			return response;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			setError(`Error processing action: ${errorMessage}`);
			throw error;
		} finally {
			setIsLoading(false);
		}
	}, [isInitialized]);

	/**
	* Generate a narration
	*/
	const generateNarration = useCallback(async (scene: string, context: Omit<DMContext, 'gameHistory'>): Promise<string> => {
		if (!agentRef.current || !isInitialized) {
			throw new Error('DM agent not initialized');
		}

		setIsLoading(true);
		setError(null);

		try {
			const narration = await agentRef.current.generateNarration(scene, {
				...context,
				gameHistory: [],
			});
			return narration;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			setError(`Error generating narration: ${errorMessage}`);
			throw error;
		} finally {
			setIsLoading(false);
		}
	}, [isInitialized]);

	/**
	* Set API key
	*/
	const setApiKey = useCallback(async (apiKey: string): Promise<void> => {
		await AsyncStorage.setItem(CACTUS_API_KEY_STORAGE_KEY, apiKey);
	}, []);

	/**
	* Set model URL
	*/
	const setModelUrl = useCallback(async (modelUrl: string): Promise<void> => {
		await AsyncStorage.setItem(CACTUS_MODEL_PREFERENCE_KEY, modelUrl);
	}, []);

	/**
	* Initialize the agent manually
	*/
	const initialize = useCallback(async (): Promise<void> => {
		try {
			// Get API key from storage if not provided
			let apiKey = options.apiKey;
			if (!apiKey) {
				apiKey = await AsyncStorage.getItem(CACTUS_API_KEY_STORAGE_KEY) || undefined;
			}

			// Get model URL from storage if not provided
			let modelUrl = options.modelUrl;
			if (!modelUrl) {
				modelUrl = await AsyncStorage.getItem(CACTUS_MODEL_PREFERENCE_KEY) || DEFAULT_MODEL_URL;
			}

			// Create and initialize the agent
			const agent = new CactusDMAgentSimple({
				modelUrl,
				apiKey,
			});

			setIsLoading(true);
			setError(null);

			const success = await agent.initialize((progress) => {
				setInitProgress(progress);
			});

			if (success) {
				agentRef.current = agent;
				setIsInitialized(true);
				setMessages([{ role: 'assistant', content: 'Welcome to your adventure!' }]);
			} else {
				setError('Failed to initialize DM agent');
			}
		} catch (error) {
			console.error('Error initializing DM agent:', error);
			setError(`Failed to initialize: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			setIsLoading(false);
		}
	}, [options.apiKey, options.modelUrl]);

	/**
	* Send a message to the DM
	*/
	const sendMessage = useCallback(
		async (message: string) => {
			if (!agentRef.current || !isInitialized) {
				setError('DM agent not initialized');
				return;
			}

			// Add user message
			const updatedMessages = [...messages, { role: 'user', content: message }];
			setMessages(updatedMessages);
			setIsLoading(true);

			try {
				// Get context from game history
				const context: GameContext = {
					playerName: options.playerCharacter?.name || 'Player',
					playerClass: options.playerCharacter?.class || 'Adventurer',
					playerRace: options.playerCharacter?.race || 'Human',
					currentScene: options.worldState?.currentLocation?.name || 'Unknown Location',
					gameHistory: updatedMessages.map(msg => msg.content),
				};

				// Process the action
				const response = await agentRef.current.processPlayerAction(message, context);

				// Add assistant response
				setMessages(prev => [...prev, { role: 'assistant', content: response.text }]);

				return response;
			} catch (error) {
				console.error('Error sending message:', error);
				// Add error message
				setMessages(prev => [
					...prev,
					{ role: 'assistant', content: 'I apologize, but I encountered an error processing your request.' },
				]);
				setError(`Error sending message: ${error instanceof Error ? error.message : String(error)}`);
			} finally {
				setIsLoading(false);
			}
		},
		[isInitialized, messages, options.playerCharacter, options.worldState],
	);

	/**
	* Replace welcome message
	*/
	const replaceWelcomeMessage = useCallback(
		(message: string) => {
			if (messages.length === 0 || messages.length === 1) {
				setMessages([{ role: 'assistant', content: message }]);
			}
		},
		[messages.length],
	);

	/**
	* Clear conversation history
	*/
	const clearHistory = useCallback(() => {
		setMessages([]);
	}, []);

	return {
		isInitialized,
		isLoading,
		error,
		initProgress,
		messages,
		initialize,
		processPlayerAction,
		generateNarration,
		setApiKey,
		setModelUrl,
		clearHistory,
		sendMessage,
		replaceWelcomeMessage,
	};
};