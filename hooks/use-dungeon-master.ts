import { useState, useCallback, useRef, useEffect } from 'react';

import { useDMVoice } from '@/hooks/use-text-to-speech';
import { DungeonMasterAgent, DMMessage, DMContext } from '@/services/ai/agents/dungeon-master-agent';
import { useGemmaModel } from '@/services/ai/models/gemma-integration';
import { Character } from '@/types/character';
import { GameWorldState } from '@/types/world-map';

export interface UseDungeonMasterReturn {
	messages: DMMessage[];
	isLoading: boolean;
	sendMessage: (message: string) => Promise<void>;
	sendVoiceMessage: (message: string) => Promise<void>;
	clearHistory: () => void;
	agent: DungeonMasterAgent | null;
	error: string | null;
	dmVoice: ReturnType<typeof useDMVoice>;
	replaceWelcomeMessage: (newContent: string) => void;
}

export interface DungeonMasterConfig {
	worldState: GameWorldState | null;
	playerCharacter: Character | null;
	autoSave?: boolean;
}

export const useDungeonMaster = (config: DungeonMasterConfig): UseDungeonMasterReturn => {
	const [messages, setMessages] = useState<DMMessage[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const agentRef = useRef<DungeonMasterAgent | null>(null);
	
	// Initialize Gemma ONNX model with balanced configuration
	const gemmaModel = useGemmaModel({
		modelPath: 'https://huggingface.co/onnx-community/gemma-3n-E2B-it-ONNX/resolve/main/onnx/model.onnx',
		maxTokens: 150,
		temperature: 0.7,
		topP: 0.9,
		useOnDevice: true,
		progressCallback: (progress) => {
			console.log('🔄 Gemma ONNX model loading:', progress);
		},
	});

	// Initialize DM voice for TTS
	const dmVoice = useDMVoice();

	// Initialize DM agent when dependencies are available
	useEffect(() => {
		if (config.worldState && config.playerCharacter) {
			console.log('🎲 Initializing DM agent for:', config.playerCharacter.name);
			
			const context: DMContext = {
				worldState: config.worldState,
				playerCharacter: config.playerCharacter,
				recentMessages: [],
				currentScene: 'Starting Adventure',
				gameRules: {}, // Could be populated with custom rules
			};

			agentRef.current = new DungeonMasterAgent(context, gemmaModel);
			
			// Add simple welcome message (will be customized by game.tsx)
			const welcomeMessage: DMMessage = {
				id: 'welcome',
				content: `Welcome to your adventure, ${config.playerCharacter.name}! You find yourself in ${config.worldState.worldMap.name}. What would you like to do?`,
				timestamp: Date.now(),
				type: 'narration',
				speaker: 'Dungeon Master',
			};
			
			console.log('💬 Adding initial welcome message');
			setMessages([welcomeMessage]);
		}
	}, [config.worldState, config.playerCharacter]);

	// Add method to replace welcome message
	const replaceWelcomeMessage = useCallback((newContent: string) => {
		setMessages(prevMessages => {
			if (prevMessages.length > 0 && prevMessages[0].id === 'welcome') {
				const updatedMessage: DMMessage = {
					...prevMessages[0],
					content: newContent,
					timestamp: Date.now(),
				};
				console.log('🔄 Replacing welcome message with custom greeting');
				return [updatedMessage, ...prevMessages.slice(1)];
			}
			return prevMessages;
		});
	}, []);

	// Update agent context when world state or character changes
	useEffect(() => {
		if (agentRef.current && config.worldState && config.playerCharacter) {
			agentRef.current.updateContext({
				worldState: config.worldState,
				playerCharacter: config.playerCharacter,
			});
		}
	}, [config.worldState, config.playerCharacter]);

	const sendMessage = useCallback(async (playerInput: string) => {
		if (!agentRef.current) {
			setError('Dungeon Master is not initialized');
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

			// Get DM response
			const dmResponse = await agentRef.current.processPlayerAction(playerInput);
			
			setMessages(prev => [...prev, dmResponse]);

			// Automatically speak DM responses
			if (dmResponse.content && dmResponse.content.trim()) {
				await speakDMResponse(dmResponse);
			}

			// Auto-save if enabled
			if (config.autoSave) {
				// This would integrate with the game state saving system
				console.log('Auto-saving game state...');
			}

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
	}, [config.autoSave]);

	/**
	 * Send voice message with immediate text display
	 */
	const sendVoiceMessage = useCallback(async (playerInput: string) => {
		// Voice messages work the same as text messages, but indicate voice origin
		await sendMessage(playerInput);
	}, [sendMessage]);

	/**
	 * Speak DM response using appropriate voice preset
	 */
	const speakDMResponse = useCallback(async (dmMessage: DMMessage) => {
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
	}, [dmVoice]);

	const clearHistory = useCallback(() => {
		setMessages([]);
		setError(null);
		if (agentRef.current) {
			agentRef.current.clearHistory();
		}
		// Stop any ongoing TTS
		dmVoice.stop();
	}, [dmVoice]);

	return {
		messages,
		isLoading,
		sendMessage,
		sendVoiceMessage,
		clearHistory,
		agent: agentRef.current,
		error,
		dmVoice,
		replaceWelcomeMessage,
	};
};

// Hook for DM agent without UI (for background processing)
export const useDungeonMasterAgent = (
	worldState: GameWorldState | null,
	playerCharacter: Character | null,
) => {
	const agentRef = useRef<DungeonMasterAgent | null>(null);
	const gemmaModel = useGemmaModel();

	useEffect(() => {
		if (worldState && playerCharacter) {
			const context: DMContext = {
				worldState,
				playerCharacter,
				recentMessages: [],
				currentScene: 'Adventure',
				gameRules: {},
			};

			agentRef.current = new DungeonMasterAgent(context, gemmaModel);
		}
	}, [worldState, playerCharacter, gemmaModel]);

	const processAction = useCallback(async (action: string): Promise<DMMessage | null> => {
		if (!agentRef.current) return null;
		
		try {
			return await agentRef.current.processPlayerAction(action);
		} catch (error) {
			console.error('DM Agent error:', error);
			return null;
		}
	}, []);

	const updateContext = useCallback((updates: Partial<DMContext>) => {
		if (agentRef.current) {
			agentRef.current.updateContext(updates);
		}
	}, []);

	return {
		agent: agentRef.current,
		processAction,
		updateContext,
	};
};