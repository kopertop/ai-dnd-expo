import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
	id: string;
	content: string;
	speaker: 'player' | 'dm' | 'npc';
	timestamp: number;
	characterName?: string;
}

interface ChatState {
	messages: ChatMessage[];
	currentInput: string;
	isVoiceMode: boolean;
	addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
	setCurrentInput: (input: string) => void;
	toggleVoiceMode: () => void;
	clearMessages: () => void;
	updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
}

export const useChatStore = create<ChatState>()(
	persist(
		set => ({
			messages: [],
			currentInput: '',
			isVoiceMode: false,
			addMessage: message =>
				set(state => ({
					messages: [
						...state.messages,
						{
							...message,
							id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
							timestamp: Date.now(),
						},
					],
				})),
			setCurrentInput: input => set({ currentInput: input }),
			toggleVoiceMode: () => set(state => ({ isVoiceMode: !state.isVoiceMode })),
			clearMessages: () => set({ messages: [] }),
			updateMessage: (id, updates) =>
				set(state => ({
					messages: state.messages.map(msg =>
						msg.id === id ? { ...msg, ...updates } : msg,
					),
				})),
		}),
		{
			name: 'chat-storage',
			partialize: state => ({ messages: state.messages }),
			onRehydrateStorage: () => (state) => {
				// Handle storage rehydration errors gracefully
				if (state) {
					console.log('✅ Chat store rehydrated successfully');
				} else {
					console.warn('⚠️ Chat store rehydration failed, using default state');
				}
			},
			// Add error handling for storage failures
			skipHydration: false,
			version: 1,
			migrate: (persistedState: any, version: number) => {
				// Handle migration if needed
				if (version === 0) {
					// Migrate from version 0 to 1
					return {
						...persistedState,
						messages: persistedState.messages || [],
					};
				}
				return persistedState;
			},
		},
	),
);
