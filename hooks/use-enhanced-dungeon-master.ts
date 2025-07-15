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
		cactus: { available: boolean; latency?: number };
		cache: { size: number; hitRate: number };
		overall: 'healthy' | 'degraded' | 'offline';
	};
	retryConnection: () => Promise<void>;
}

export interface EnhancedDungeonMasterConfig {
	worldState: GameWorldState | null;
	playerCharacter: Character | null;
	autoSave?: boolean;
	enableVoice?: boolean;
	cactusApiKey?: string;
}

export const useEnhancedDungeonMaster = (
	config: EnhancedDungeonMasterConfig,
): UseEnhancedDungeonMasterReturn => {
	const [messages, setMessages] = useState<DMMessage[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [serviceStatus, setServiceStatus] = useState<{
		cactus: { available: boolean; latency?: number };
		local: { available: boolean; resourceUsage?: import('../services/ai/providers/local-dm-provider').ResourceUsage };
		cache: { size: number; hitRate: number };
		overall: 'healthy' | 'degraded' | 'offline';
			}>({
				cactus: { available: false },
				local: { available: false },
				cache: { size: 0, hitRate: 0 },
				overall: 'offline',
			});

	const aiServiceRef = useRef<AIServiceManager | null>(null);
	const dmVoice = useDMVoice();

	// Initialize AI Service Manager
	useEffect(() => {
		const initializeAIService = async () => {
			try {
				const aiConfig = {
					...DefaultAIConfig,
					cactus: {
						...DefaultAIConfig.cactus,
						apiKey: config.cactusApiKey || process.env.EXPO_PUBLIC_CACTUS_API_KEY || '',
					},
				};

				aiServiceRef.current = new AIServiceManager(aiConfig);

				// Get initial service status
				const status = await aiServiceRef.current.getServiceStatus();
				setServiceStatus(status);

				console.log('🤖 Enhanced AI Service initialized:', status.overall);
			} catch (error) {
				console.error('Failed to initialize AI service:', error);
				setError('Failed to initialize AI services');
			}
		};

		initializeAIService();
	}, [config.cactusApiKey]);

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

	const sendMessage = useCallback(async (playerInput: string) => {
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

			console.log(`🎲 Response generated via ${aiResponse.source} in ${aiResponse.processingTime}ms`);

		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
			setError(errorMessage);

			// Add error message to chat
			const errorDMMessage: DMMessage = {
				id: `error_${Date.now()}`,
				content: '*The DM seems confused...* I\'m having trouble processing that. Could you try rephrasing your action?',
				timestamp: Date.now(),
				type: 'system',
				speaker: 'Dungeon Master',
			};

			setMessages(prev => [...prev, errorDMMessage]);
		} finally {
			setIsLoading(false);
		}
	}, [config.playerCharacter, config.worldState, config.enableVoice, messages]);

	const sendVoiceMessage = useCallback(async (playerInput: string) => {
		await sendMessage(playerInput);
	}, [sendMessage]);

	const speakDMResponse = useCallback(async (dmMessage: DMMessage) => {
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
				if (dmMessage.content.includes('attack') || dmMessage.content.includes('damage')) {
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
	}, [config.enableVoice, dmVoice]);

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

	return {
		messages,
		isLoading,
		sendMessage,
		sendVoiceMessage,
		clearHistory,
		error,
		dmVoice,
		replaceWelcomeMessage,
		serviceStatus,
		retryConnection,
	};
};

/**
 * Lightweight hook for background AI processing
 */
export const useEnhancedDungeonMasterAgent = (
	worldState: GameWorldState | null,
	playerCharacter: Character | null,
	cactusApiKey?: string,
) => {
	const aiServiceRef = useRef<AIServiceManager | null>(null);

	useEffect(() => {
		if (worldState && playerCharacter) {
			const aiConfig = {
				...DefaultAIConfig,
				cactus: {
					...DefaultAIConfig.cactus,
					apiKey: cactusApiKey || process.env.EXPO_PUBLIC_CACTUS_API_KEY || '',
				},
			};

			aiServiceRef.current = new AIServiceManager(aiConfig);
		}
	}, [worldState, playerCharacter, cactusApiKey]);

	const processAction = useCallback(async (action: string) => {
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
	}, [playerCharacter, worldState]);

	return {
		processAction,
		isReady: !!aiServiceRef.current,
	};
};
