/**
 * Enhanced Dungeon Master Hook with Cactus + Gemma3 Integration
 *
 * This replaces the old use-dungeon-master.ts with better architecture:
 * - Cactus compute network for Gemma3 inference
 * - Intelligent fallback strategies
 * - Better error handling and recovery
 * - Performance monitoring
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useDMVoice } from '@/hooks/use-text-to-speech';
import { DMMessage } from '@/services/ai/agents/dungeon-master-agent';
import { AIServiceManager, DefaultAIConfig } from '@/services/ai/ai-service-manager';
import { Character } from '@/types/character';
import { GameWorldState } from '@/types/world-map';

export interface UseEnhancedDungeonMasterReturn {
	messages: DMMessage[];
	isLoading: boolean;
	sendMessage: (message: string) => Promise<void>;
	sendVoiceMessage: (message: string) => Promise<void>;
	clearHistory: () => void;
	error: string | null;
	dmVoice: ReturnType<typeof useDMVoice>;
	replaceWelcomeMessage: (newContent: string) => void;
	serviceStatus: {
		primary: { available: boolean; latency?: number };
		local: {
			available: boolean;
			resourceUsage?: import('../services/ai/providers/local-dm-provider').ResourceUsage;
		};
		cache: { size: number; hitRate: number };
		overall: 'healthy' | 'degraded' | 'offline';
	};
	retryConnection: () => Promise<void>;
	// New local provider functionality
	localProviderStatus: {
		isReady: boolean;
		modelLoaded: boolean;
		error: string | null;
		resourceUsage?: import('../services/ai/providers/local-dm-provider').ResourceUsage;
	};
	switchProvider: (providerType: 'local' | 'ollama') => Promise<boolean>;
	getProviderRecommendation: () => {
		recommended: 'local' | 'ollama' | 'fallback';
		reason: string;
		confidence: number;
	};
	currentProvider: 'local' | 'ollama' | 'fallback';
	providerPreferences: {
		preferLocal: boolean;
		setPreferLocal: (prefer: boolean) => void;
		fallbackChain: ('local' | 'ollama' | 'rule-based')[];
		setFallbackChain: (chain: ('local' | 'ollama' | 'rule-based')[]) => void;
	};
}

export interface EnhancedDungeonMasterConfig {
	worldState: GameWorldState | null;
	playerCharacter: Character | null;
	autoSave?: boolean;
	enableVoice?: boolean;
}

export const useEnhancedDungeonMaster = (
	config: EnhancedDungeonMasterConfig,
): UseEnhancedDungeonMasterReturn => {
	const [messages, setMessages] = useState<DMMessage[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [serviceStatus, setServiceStatus] = useState<{
		primary: { available: boolean; latency?: number };
		local: {
			available: boolean;
			resourceUsage?: import('../services/ai/providers/local-dm-provider').ResourceUsage;
		};
		cache: { size: number; hitRate: number };
		overall: 'healthy' | 'degraded' | 'offline';
	}>({
		primary: { available: false },
		local: { available: false },
		cache: { size: 0, hitRate: 0 },
		overall: 'offline',
	});

	// New state for local provider functionality
	const [localProviderStatus, setLocalProviderStatus] = useState<{
		isReady: boolean;
		modelLoaded: boolean;
		error: string | null;
		resourceUsage?: import('../services/ai/providers/local-dm-provider').ResourceUsage;
			}>({
				isReady: false,
				modelLoaded: false,
				error: null,
			});

	const [currentProvider, setCurrentProvider] = useState<'local' | 'ollama' | 'fallback'>(
		'fallback',
	);
	const [preferLocal, setPreferLocal] = useState<boolean>(true); // Default to prefer local for privacy
	const [fallbackChain, setFallbackChain] = useState<('local' | 'ollama' | 'rule-based')[]>([
		'local',
		'ollama',
		'rule-based',
	]);
	const [gameContextId] = useState<string>(
		() => `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
	);

	const aiServiceRef = useRef<AIServiceManager | null>(null);
	const dmVoice = useDMVoice();

	// Monitor local provider status
	const updateLocalProviderStatus = useCallback(async () => {
		if (!aiServiceRef.current) return;

		try {
			const detailedStatus = aiServiceRef.current.getDetailedStatus();
			const localStatus = detailedStatus.local;

			// Convert resource usage to match expected type
			let resourceUsage:
				| import('../services/ai/providers/local-dm-provider').ResourceUsage
				| undefined;
			if (localStatus.status?.resourceUsage) {
				const rawUsage = localStatus.status.resourceUsage;
				resourceUsage = {
					memory: rawUsage.memory,
					cpu: rawUsage.cpu,
					battery: {
						level: rawUsage.battery.level,
						isCharging: rawUsage.battery.isCharging,
						estimatedTimeRemaining:
							(rawUsage.battery as any).estimatedTimeRemaining || 0,
					},
					thermal: {
						state: rawUsage.thermal.state,
						temperature: (rawUsage.thermal as any).temperature || 0,
					},
				};
			}

			setLocalProviderStatus({
				isReady: localStatus.ready,
				modelLoaded: localStatus.initialized,
				error: localStatus.status?.error || null,
				resourceUsage,
			});
		} catch (error) {
			console.error('Failed to update local provider status:', error);
		}
	}, []);

	// Initialize AI Service Manager with local provider support
	useEffect(() => {
		const initializeAIService = async () => {
			try {
				const aiConfig = {
					...DefaultAIConfig,
					providerSelection: {
						...DefaultAIConfig.providerSelection,
						preferLocal,
						fallbackChain,
					},
				};

				aiServiceRef.current = new AIServiceManager(aiConfig);

				// Get initial service status
				const status = await aiServiceRef.current.getServiceStatus();
				setServiceStatus(status);
				setCurrentProvider(
					status.overall === 'healthy'
						? aiServiceRef.current.getOptimalProvider()
						: 'fallback',
				);

				// Monitor local provider status
				await updateLocalProviderStatus();

				console.log('🤖 Enhanced AI Service initialized:', status.overall);
			} catch (error) {
				console.error('Failed to initialize AI service:', error);
				setError('Failed to initialize AI services');
			}
		};

		initializeAIService();
	}, [preferLocal, fallbackChain, updateLocalProviderStatus]);

	// Periodic status monitoring
	useEffect(() => {
		const interval = setInterval(async () => {
			if (aiServiceRef.current) {
				const status = await aiServiceRef.current.getServiceStatus();
				setServiceStatus(status);
				setCurrentProvider(aiServiceRef.current.getOptimalProvider());
				await updateLocalProviderStatus();
			}
		}, 10000); // Update every 10 seconds

		return () => clearInterval(interval);
	}, [updateLocalProviderStatus]);

	// Initialize welcome message when dependencies are ready
	useEffect(() => {
		if (config.worldState && config.playerCharacter && aiServiceRef.current) {
			const welcomeMessage: DMMessage = {
				id: 'welcome',
				content: `Welcome to your adventure, ${config.playerCharacter.name}! You find yourself in ${config.worldState.worldMap.name}. What would you like to do?`,
				timestamp: Date.now(),
				type: 'narration',
				speaker: 'Dungeon Master',
			};

			setMessages([welcomeMessage]);
		}
	}, [config.worldState, config.playerCharacter]);

	const sendMessage = useCallback(
		async (playerInput: string) => {
			if (!aiServiceRef.current || !config.playerCharacter || !config.worldState) {
				setError('AI service or game state not ready');
				return;
			}

			setIsLoading(true);
			setError(null);

			try {
				// Add player message to chat
				const playerMessage: DMMessage = {
					id: `player_${Date.now()}`,
					content: playerInput,
					timestamp: Date.now(),
					type: 'system',
					speaker: 'Player',
				};

				setMessages(prev => [...prev, playerMessage]);

				// Prepare context for AI
				const aiContext = {
					playerName: config.playerCharacter.name,
					playerClass: config.playerCharacter.class,
					playerRace: config.playerCharacter.race,
					currentScene: config.worldState.worldMap.name,
					gameHistory: messages.slice(-5).map(m => `${m.speaker}: ${m.content}`),
				};

				// Generate AI response
				const aiResponse = await aiServiceRef.current.generateDnDResponse(
					playerInput,
					aiContext,
				);

				// Create DM message
				const dmMessage: DMMessage = {
					id: `dm_${Date.now()}`,
					content: aiResponse.text,
					timestamp: Date.now(),
					type: 'narration',
					speaker: 'Dungeon Master',
					toolCalls: aiResponse.toolCommands.map(cmd => ({
						type: cmd.type as any,
						parameters: { notation: cmd.params },
						result: null,
					})),
				};

				setMessages(prev => [...prev, dmMessage]);

				// Speak DM response if voice is enabled
				if (config.enableVoice && dmMessage.content.trim()) {
					await speakDMResponse(dmMessage);
				}

				// Update service status
				const status = await aiServiceRef.current.getServiceStatus();
				setServiceStatus(status);

				console.log(
					`🎲 Response generated via ${aiResponse.source} in ${aiResponse.processingTime}ms`,
				);
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
				setError(errorMessage);

				// Add error message to chat
				const errorDMMessage: DMMessage = {
					id: `error_${Date.now()}`,
					content:
						"*The DM seems confused...* I'm having trouble processing that. Could you try rephrasing your action?",
					timestamp: Date.now(),
					type: 'system',
					speaker: 'Dungeon Master',
				};

				setMessages(prev => [...prev, errorDMMessage]);
			} finally {
				setIsLoading(false);
			}
		},
		[config.playerCharacter, config.worldState, config.enableVoice, messages],
	);

	const sendVoiceMessage = useCallback(
		async (playerInput: string) => {
			await sendMessage(playerInput);
		},
		[sendMessage],
	);

	const speakDMResponse = useCallback(
		async (dmMessage: DMMessage) => {
			if (!config.enableVoice) return;

			try {
				switch (dmMessage.type) {
					case 'narration':
						await dmVoice.speakAsNarrator(dmMessage.content);
						break;
					case 'dialogue':
						await dmVoice.speakAsCharacter(dmMessage.content, dmMessage.speaker);
						break;
					case 'action_result':
						if (
							dmMessage.content.includes('attack') ||
							dmMessage.content.includes('damage')
						) {
							await dmVoice.speakCombatAction(dmMessage.content);
						} else {
							await dmVoice.speakAsNarrator(dmMessage.content);
						}
						break;
					default:
						await dmVoice.speakAsNarrator(dmMessage.content);
						break;
				}
			} catch (error) {
				console.error('Error speaking DM response:', error);
			}
		},
		[config.enableVoice, dmVoice],
	);

	const replaceWelcomeMessage = useCallback((newContent: string) => {
		setMessages(prevMessages => {
			if (prevMessages.length > 0 && prevMessages[0].id === 'welcome') {
				const updatedMessage: DMMessage = {
					...prevMessages[0],
					content: newContent,
					timestamp: Date.now(),
				};
				return [updatedMessage, ...prevMessages.slice(1)];
			}
			return prevMessages;
		});
	}, []);

	const clearHistory = useCallback(() => {
		setMessages([]);
		setError(null);
		dmVoice.stop();
	}, [dmVoice]);

	const retryConnection = useCallback(async () => {
		if (aiServiceRef.current) {
			setIsLoading(true);
			try {
				await aiServiceRef.current.reset();
				const status = await aiServiceRef.current.getServiceStatus();
				setServiceStatus(status);
				setError(null);
				console.log('🔄 AI service connection retried:', status.overall);
			} catch (error) {
				setError('Failed to reconnect to AI services');
				console.error('Retry failed:', error);
			} finally {
				setIsLoading(false);
			}
		}
	}, []);

	// Provider switching functionality
	// Requirement 4.1: Support local provider selection
	const switchProvider = useCallback(
		async (providerType: 'local' | 'ollama'): Promise<boolean> => {
			if (!aiServiceRef.current) {
				return false;
			}

			try {
				setIsLoading(true);
				const result = await aiServiceRef.current.switchProviderWithContext(
					providerType,
					gameContextId,
				);

				if (result.success) {
					setCurrentProvider(result.newProvider as 'local' | 'ollama' | 'fallback');

					// Update preferences based on successful switch
					if (providerType === 'local') {
						setPreferLocal(true);
					} else {
						setPreferLocal(false);
					}

					// Update service status
					const status = await aiServiceRef.current.getServiceStatus();
					setServiceStatus(status);
					await updateLocalProviderStatus();

					console.log(`🔄 Successfully switched to ${result.newProvider} provider`);
				}

				return result.success;
			} catch (error) {
				console.error('Failed to switch provider:', error);
				return false;
			} finally {
				setIsLoading(false);
			}
		},
		[gameContextId, updateLocalProviderStatus],
	);

	// Get provider recommendation based on current context
	// Requirement 4.3: User preference handling for provider selection
	const getProviderRecommendation = useCallback(() => {
		if (!aiServiceRef.current) {
			return {
				recommended: 'fallback' as const,
				reason: 'AI service not initialized',
				confidence: 0.1,
			};
		}

		return aiServiceRef.current.getProviderRecommendation(gameContextId);
	}, [gameContextId]);

	// Enhanced sendMessage with context-aware provider selection
	const sendMessageWithContext = useCallback(
		async (playerInput: string) => {
			if (!aiServiceRef.current || !config.playerCharacter || !config.worldState) {
				setError('AI service or game state not ready');
				return;
			}

			setIsLoading(true);
			setError(null);

			try {
				// Add player message to chat
				const playerMessage: DMMessage = {
					id: `player_${Date.now()}`,
					content: playerInput,
					timestamp: Date.now(),
					type: 'system',
					speaker: 'Player',
				};

				setMessages(prev => [...prev, playerMessage]);

				// Prepare context for AI
				const aiContext = {
					playerName: config.playerCharacter.name,
					playerClass: config.playerCharacter.class,
					playerRace: config.playerCharacter.race,
					currentScene: config.worldState.worldMap.name,
					gameHistory: messages.slice(-5).map(m => `${m.speaker}: ${m.content}`),
				};

				// Use context-aware response generation
				const aiResponse = await aiServiceRef.current.generateDnDResponseWithContext(
					playerInput,
					gameContextId,
					aiContext,
				);

				// Update current provider based on response source
				setCurrentProvider(aiResponse.source);

				// Create DM message
				const dmMessage: DMMessage = {
					id: `dm_${Date.now()}`,
					content: aiResponse.text,
					timestamp: Date.now(),
					type: 'narration',
					speaker: 'Dungeon Master',
					toolCalls: aiResponse.toolCommands.map(cmd => ({
						type: cmd.type as any,
						parameters: { notation: cmd.params },
						result: null,
					})),
				};

				setMessages(prev => [...prev, dmMessage]);

				// Speak DM response if voice is enabled
				if (config.enableVoice && dmMessage.content.trim()) {
					await speakDMResponse(dmMessage);
				}

				// Update service status
				const status = await aiServiceRef.current.getServiceStatus();
				setServiceStatus(status);
				await updateLocalProviderStatus();

				console.log(
					`🎲 Response generated via ${aiResponse.source} in ${aiResponse.processingTime}ms`,
				);
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
				setError(errorMessage);

				// Add error message to chat
				const errorDMMessage: DMMessage = {
					id: `error_${Date.now()}`,
					content:
						"*The DM seems confused...* I'm having trouble processing that. Could you try rephrasing your action?",
					timestamp: Date.now(),
					type: 'system',
					speaker: 'Dungeon Master',
				};

				setMessages(prev => [...prev, errorDMMessage]);
			} finally {
				setIsLoading(false);
			}
		},
		[
			config.playerCharacter,
			config.worldState,
			config.enableVoice,
			messages,
			gameContextId,
			speakDMResponse,
			updateLocalProviderStatus,
		],
	);

	return {
		messages,
		isLoading,
		sendMessage: sendMessageWithContext, // Use the enhanced version
		sendVoiceMessage: sendMessageWithContext, // Use the enhanced version for voice too
		clearHistory,
		error,
		dmVoice,
		replaceWelcomeMessage,
		serviceStatus,
		retryConnection,
		// New local provider functionality
		localProviderStatus,
		switchProvider,
		getProviderRecommendation,
		currentProvider,
		providerPreferences: {
			preferLocal,
			setPreferLocal,
			fallbackChain,
			setFallbackChain,
		},
	};
};

/**
 * Lightweight hook for background AI processing
 */
export const useEnhancedDungeonMasterAgent = (
	worldState: GameWorldState | null,
	playerCharacter: Character | null,
) => {
	const aiServiceRef = useRef<AIServiceManager | null>(null);

	useEffect(() => {
		if (worldState && playerCharacter) {
			aiServiceRef.current = new AIServiceManager(DefaultAIConfig);
		}
	}, [worldState, playerCharacter]);

	const processAction = useCallback(
		async (action: string) => {
			if (!aiServiceRef.current || !playerCharacter || !worldState) return null;

			try {
				const context = {
					playerName: playerCharacter.name,
					playerClass: playerCharacter.class,
					playerRace: playerCharacter.race,
					currentScene: worldState.worldMap.name,
					gameHistory: [],
				};

				const response = await aiServiceRef.current.generateDnDResponse(action, context);

				return {
					id: `dm_${Date.now()}`,
					content: response.text,
					timestamp: Date.now(),
					type: 'narration' as const,
					speaker: 'Dungeon Master',
					toolCalls: response.toolCommands.map(cmd => ({
						type: cmd.type as any,
						parameters: { notation: cmd.params },
						result: null,
					})),
				};
			} catch (error) {
				console.error('DM Agent error:', error);
				return null;
			}
		},
		[playerCharacter, worldState],
	);

	return {
		processAction,
		isReady: !!aiServiceRef.current,
	};
};
