/**
 * Local Dungeon Master Hook with On-Device Gemma3 Integration
 * 
 * This hook provides D&D AI functionality using local on-device models:
 * - Gemma3 models running via MLC LLM Engine
 * - Completely offline D&D gameplay
 * - Privacy-first approach (no data sent to servers)
 * - Intelligent fallback to rule-based responses
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useDMVoice } from '@/hooks/use-text-to-speech';
import { dndAIService } from '@/services/ai/dnd-ai-service';
import { Character } from '@/types/character';
import { GameWorldState } from '@/types/world-map';

export interface DMMessage {
	id: string;
	content: string;
	timestamp: number;
	type: 'dm' | 'player' | 'system';
	isStreaming?: boolean;
}

export interface UseLocalDungeonMasterReturn {
	messages: DMMessage[];
	isLoading: boolean;
	sendMessage: (message: string) => Promise<void>;
	sendVoiceMessage: (message: string) => Promise<void>;
	clearHistory: () => void;
	error: string | null;
	dmVoice: ReturnType<typeof useDMVoice>;
	replaceWelcomeMessage: (newContent: string) => void;
	serviceStatus: {
		initialized: boolean;
		modelReady: boolean;
		currentModel: string;
	};
	downloadModel: (modelId: string, onProgress?: (progress: number) => void) => Promise<void>;
	getAvailableModels: () => Promise<string[]>;
	isModelDownloaded: (modelId: string) => boolean;
}

export const useLocalDungeonMaster = (
	character: Character | null,
	worldState: GameWorldState | null,
): UseLocalDungeonMasterReturn => {
	const [messages, setMessages] = useState<DMMessage[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [serviceStatus, setServiceStatus] = useState({
		initialized: false,
		modelReady: false,
		currentModel: 'gemma-3-2b-instruct',
	});
	const [downloadedModels, setDownloadedModels] = useState<Set<string>>(new Set());

	const dmVoice = useDMVoice();
	const messagesRef = useRef<DMMessage[]>([]);

	// Initialize the service
	useEffect(() => {
		initializeService();
	}, []);

	// Update messages ref
	useEffect(() => {
		messagesRef.current = messages;
	}, [messages]);

	const initializeService = async () => {
		try {
			await dndAIService.initialize();
			setServiceStatus(prev => ({
				...prev,
				initialized: true,
				modelReady: true,
			}));
			
			// Add welcome message
			addWelcomeMessage();
		} catch (error) {
			console.error('Failed to initialize local DM service:', error);
			setError('Failed to initialize D&D AI. Please try downloading a model first.');
		}
	};

	const addWelcomeMessage = () => {
		const welcomeMessage: DMMessage = {
			id: 'welcome',
			content: "Welcome to your AI-powered D&D adventure! I'm your local Dungeon Master, running entirely on your device. What would you like to do?",
			timestamp: Date.now(),
			type: 'dm',
		};
		setMessages([welcomeMessage]);
	};

	const buildGameContext = useCallback(() => {
		if (!character || !worldState) return {};

		return {
			characterName: character.name,
			characterClass: character.class,
			characterRace: character.race,
			currentLocation: worldState.playerLocation || 'Unknown location',
			gameHistory: messagesRef.current
				.filter(m => m.type !== 'system')
				.slice(-5)
				.map(m => m.content),
			companions: worldState.companions?.map((c: any) => c.name) || [],
		};
	}, [character, worldState]);

	const sendMessage = useCallback(
		async (message: string) => {
			if (!message.trim()) return;

			setIsLoading(true);
			setError(null);

			// Add player message
			const playerMessage: DMMessage = {
				id: `player-${Date.now()}`,
				content: message,
				timestamp: Date.now(),
				type: 'player',
			};

			setMessages(prev => [...prev, playerMessage]);

			try {
				const context = buildGameContext();
				
				// Generate DM response using local AI
				const response = await dndAIService.generateDMResponse(message, context);

				// Add DM response
				const dmMessage: DMMessage = {
					id: `dm-${Date.now()}`,
					content: response,
					timestamp: Date.now(),
					type: 'dm',
				};

				setMessages(prev => [...prev, dmMessage]);

				// Speak the response if voice is available
				if (dmVoice.isAvailable) {
					dmVoice.speakAsNarrator(response);
				}
			} catch (error) {
				console.error('Failed to get DM response:', error);
				
				// Add fallback response
				const fallbackMessage: DMMessage = {
					id: `fallback-${Date.now()}`,
					content: 'The DM is momentarily distracted... (AI service temporarily unavailable)',
					timestamp: Date.now(),
					type: 'dm',
				};

				setMessages(prev => [...prev, fallbackMessage]);
				setError('AI service temporarily unavailable. Please try again.');
			} finally {
				setIsLoading(false);
			}
		},
		[buildGameContext, dmVoice],
	);

	const sendVoiceMessage = useCallback(
		async (message: string) => {
			// Voice messages are handled the same way as text messages
			await sendMessage(message);
		},
		[sendMessage],
	);

	const clearHistory = useCallback(() => {
		setMessages([]);
		addWelcomeMessage();
		setError(null);
	}, []);

	const replaceWelcomeMessage = useCallback((newContent: string) => {
		setMessages(prev => 
			prev.map(msg => 
				msg.id === 'welcome' 
					? { ...msg, content: newContent }
					: msg,
			),
		);
	}, []);

	const downloadModel = useCallback(
		async (modelId: string, onProgress?: (progress: number) => void) => {
			try {
				setError(null);
				await dndAIService.downloadModel(modelId, onProgress);
				setDownloadedModels(prev => new Set([...prev, modelId]));
				setServiceStatus(prev => ({
					...prev,
					modelReady: true,
					currentModel: modelId,
				}));
			} catch (error) {
				console.error('Failed to download model:', error);
				setError(`Failed to download model: ${modelId}`);
				throw error;
			}
		},
		[],
	);

	const getAvailableModels = useCallback(async () => {
		try {
			return await dndAIService.getAvailableModels();
		} catch (error) {
			console.error('Failed to get available models:', error);
			return ['gemma-3-2b-instruct', 'gemma-3-8b-instruct'];
		}
	}, []);

	const isModelDownloaded = useCallback(
		(modelId: string) => {
			return downloadedModels.has(modelId);
		},
		[downloadedModels],
	);

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
		downloadModel,
		getAvailableModels,
		isModelDownloaded,
	};
};