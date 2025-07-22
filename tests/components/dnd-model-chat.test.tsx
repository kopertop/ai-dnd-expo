import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import DnDModelChat from '@/components/dnd-model-chat';
import * as themedTextModule from '@/components/themed-text';
import * as themedViewModule from '@/components/themed-view';
import * as useThemeColorModule from '@/hooks/use-theme-color';
import * as dndModelModule from '@/services/dnd-model';

describe('DnDModelChat Component Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Mock themed components within beforeEach
		vi.spyOn(themedTextModule, 'ThemedText').mockImplementation(
			({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
				const { Text } = require('react-native');
				return <Text {...props}>{children}</Text>;
			},
		);

		vi.spyOn(themedViewModule, 'ThemedView').mockImplementation(
			({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
				const { View } = require('react-native');
				return <View {...props}>{children}</View>;
			},
		);

		vi.spyOn(useThemeColorModule, 'useThemeColor').mockReturnValue('#007AFF');

		// Mock D&D model service within beforeEach
		vi.spyOn(dndModelModule.dndModel, 'initialize').mockResolvedValue();
		vi.spyOn(dndModelModule.dndModel, 'generateResponse').mockResolvedValue(
			'Test response from AI',
		);
		vi.spyOn(dndModelModule.dndModel, 'getIsInitialized').mockReturnValue(false);
		vi.spyOn(dndModelModule.dndModel, 'getModelConfig').mockReturnValue(null);
	});

	describe('Component Rendering', () => {
		it('should render chat interface correctly', () => {
			const { getByPlaceholderText } = render(<DnDModelChat />);

			expect(getByPlaceholderText('Ask your AI Dungeon Master...')).toBeTruthy();
		});

		it('should show loading state initially', () => {
			const { getByText } = render(<DnDModelChat />);

			expect(getByText('Initializing AI Dungeon Master...')).toBeTruthy();
		});

		it('should display initial context when provided', () => {
			const sampleContext = {
				role: 'Dungeon Master',
				world: 'Test World',
				location: 'Test Location',
			};

			const { getByText } = render(<DnDModelChat initialContext={sampleContext} />);

			expect(getByText(/Test World/)).toBeTruthy();
			expect(getByText(/Test Location/)).toBeTruthy();
		});
	});

	describe('Model Initialization', () => {
		it('should initialize the model on mount', async () => {
			render(<DnDModelChat />);

			await waitFor(() => {
				expect(dndModelModule.dndModel.initialize).toHaveBeenCalled();
			});
		});

		it('should call onModelReady callback when model is ready', async () => {
			const onModelReady = vi.fn();
			vi.spyOn(dndModelModule.dndModel, 'getIsInitialized').mockReturnValue(true);

			render(<DnDModelChat onModelReady={onModelReady} />);

			await waitFor(() => {
				expect(onModelReady).toHaveBeenCalledWith(true);
			});
		});

		it('should handle initialization errors gracefully', async () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			vi.spyOn(dndModelModule.dndModel, 'initialize').mockRejectedValue(
				new Error('Init failed'),
			);

			render(<DnDModelChat />);

			await waitFor(() => {
				expect(consoleSpy).toHaveBeenCalledWith(
					'Failed to initialize D&D model:',
					expect.any(Error),
				);
			});

			consoleSpy.mockRestore();
		});
	});

	describe('Chat Interaction', () => {
		beforeEach(() => {
			vi.spyOn(dndModelModule.dndModel, 'getIsInitialized').mockReturnValue(true);
		});

		it('should send message when form is submitted', async () => {
			const { getByPlaceholderText, getByText } = render(<DnDModelChat />);
			const input = getByPlaceholderText('Ask your AI Dungeon Master...');
			const sendButton = getByText('Send');

			await act(async () => {
				fireEvent.changeText(input, 'Test message');
				fireEvent.press(sendButton);
			});

			await waitFor(() => {
				expect(dndModelModule.dndModel.generateResponse).toHaveBeenCalledWith(
					expect.objectContaining({
						role: 'user',
						content: 'Test message',
					}),
				);
			});
		});

		it('should display user and AI messages', async () => {
			const { getByPlaceholderText, getByText } = render(<DnDModelChat />);
			const input = getByPlaceholderText('Ask your AI Dungeon Master...');
			const sendButton = getByText('Send');

			await act(async () => {
				fireEvent.changeText(input, 'Hello AI');
				fireEvent.press(sendButton);
			});

			await waitFor(() => {
				expect(getByText('Hello AI')).toBeTruthy();
				expect(getByText('Test response from AI')).toBeTruthy();
			});
		});

		it('should clear input after sending message', async () => {
			const { getByPlaceholderText, getByText } = render(<DnDModelChat />);
			const input = getByPlaceholderText('Ask your AI Dungeon Master...');
			const sendButton = getByText('Send');

			await act(async () => {
				fireEvent.changeText(input, 'Test message');
				fireEvent.press(sendButton);
			});

			await waitFor(() => {
				expect(input.props.value).toBe('');
			});
		});

		it('should disable send button when model is not ready', () => {
			vi.spyOn(dndModelModule.dndModel, 'getIsInitialized').mockReturnValue(false);
			const { getByText } = render(<DnDModelChat />);
			const sendButton = getByText('Send');

			expect(sendButton.props.accessibilityState.disabled).toBe(true);
		});

		it('should handle message generation errors', async () => {
			vi.spyOn(dndModelModule.dndModel, 'generateResponse').mockRejectedValue(
				new Error('Generation failed'),
			);
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const { getByPlaceholderText, getByText } = render(<DnDModelChat />);
			const input = getByPlaceholderText('Ask your AI Dungeon Master...');
			const sendButton = getByText('Send');

			await act(async () => {
				fireEvent.changeText(input, 'Test message');
				fireEvent.press(sendButton);
			});

			await waitFor(() => {
				expect(consoleSpy).toHaveBeenCalledWith(
					'Error generating response:',
					expect.any(Error),
				);
			});

			consoleSpy.mockRestore();
		});
	});

	describe('Context Management', () => {
		beforeEach(() => {
			vi.spyOn(dndModelModule.dndModel, 'getIsInitialized').mockReturnValue(true);
		});

		it('should include context in messages when provided', async () => {
			const initialContext = {
				role: 'Dungeon Master',
				world: 'Forgotten Realms',
			};

			const { getByPlaceholderText, getByText } = render(
				<DnDModelChat initialContext={initialContext} />,
			);

			const input = getByPlaceholderText('Ask your AI Dungeon Master...');
			const sendButton = getByText('Send');

			await act(async () => {
				fireEvent.changeText(input, 'What can you see?');
				fireEvent.press(sendButton);
			});

			await waitFor(() => {
				expect(dndModelModule.dndModel.generateResponse).toHaveBeenCalledWith(
					expect.objectContaining({
						context: initialContext,
					}),
				);
			});
		});
	});

	describe('Loading States', () => {
		beforeEach(() => {
			vi.spyOn(dndModelModule.dndModel, 'getIsInitialized').mockReturnValue(true);
		});

		it('should show loading state while generating response', async () => {
			let resolveGeneration: (value: string) => void;
			const generationPromise = new Promise<string>((resolve) => {
				resolveGeneration = resolve;
			});
			vi.spyOn(dndModelModule.dndModel, 'generateResponse').mockReturnValue(
				generationPromise,
			);

			const { getByPlaceholderText, getByText } = render(<DnDModelChat />);
			const input = getByPlaceholderText('Ask your AI Dungeon Master...');
			const sendButton = getByText('Send');

			await act(async () => {
				fireEvent.changeText(input, 'Test message');
				fireEvent.press(sendButton);
			});

			expect(getByText('AI is thinking...')).toBeTruthy();

			await act(async () => {
				resolveGeneration('Response');
			});
		});
	});
});