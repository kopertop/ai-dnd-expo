/**
 * DM Chat Component
 *
 * A component for interacting with the DM agent using Cactus VLM
 */
import React, { useEffect, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';

import { cactus, Message } from '../cactus';

import { useColorScheme } from '@/hooks/use-color-scheme';

interface DMChatProps {
	playerName: string;
	playerClass: string;
	playerRace: string;
	currentScene: string;
	onToolCommand?: (type: string, params: string) => void;
}

type ChatMessage = Message;

export const DMChat: React.FC<DMChatProps> = ({
	playerName,
	playerClass,
	playerRace,
	currentScene,
	onToolCommand,
}) => {
	const [input, setInput] = useState('');
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isInitializing, setIsInitializing] = useState(true);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isInitialized, setIsInitialized] = useState(false);
	const [initProgress, setInitProgress] = useState(0);
	const scrollViewRef = useRef<ScrollView>(null);
	const colorScheme = useColorScheme();

	// Initialize Cactus VLM
	useEffect(() => {
		const initializeCactus = async () => {
			try {
				setError(null);
				await cactus.initialize(progress => {
					setInitProgress(progress);
				});
				setIsInitialized(true);

				// Generate initial DM narration
				const initialMessage: Message = {
					role: 'user',
					content: `You are an expert Dungeon Master for D&D 5e. Start a new adventure for ${playerName}, a ${playerRace} ${playerClass}, in the ${currentScene}. Set the scene with vivid descriptions and present them with an engaging situation or choice. Keep it concise but immersive.`,
				};

				const response = await cactus.generateResponse(initialMessage);
				setMessages([{ role: 'assistant', content: response }]);
				setIsInitializing(false);
			} catch (error) {
				console.error('Failed to initialize Cactus:', error);
				setError('Failed to initialize DM. Please try again.');
				setIsInitializing(false);
			}
		};

		if (isInitializing) {
			initializeCactus();
		}
	}, [isInitializing, playerName, playerRace, playerClass, currentScene]);

	// Handle sending a message
	const handleSend = async () => {
		if (!input.trim() || isLoading) return;

		const userMessage = input.trim();
		setInput('');

		// Add user message to chat
		const userChatMessage: ChatMessage = { role: 'user', content: userMessage };
		const updatedMessages: ChatMessage[] = [...messages, userChatMessage];
		setMessages(updatedMessages);
		setIsLoading(true);

		try {
			// Create DM context message
			const dmContextMessage: Message = {
				role: 'user',
				content: `You are an expert Dungeon Master for D&D 5e. The player ${playerName} (${playerRace} ${playerClass}) is in ${currentScene}. They said: "${userMessage}". 
				
Respond as the DM with:
1. Narrative description of what happens
2. Any dice rolls or skill checks needed
3. New situations or choices for the player
4. Keep responses engaging but concise.

Previous context: ${messages
		.slice(-3)
		.map(m => `${m.role}: ${m.content}`)
		.join('\n')}`,
			};

			const response = await cactus.generateResponse(dmContextMessage);

			// Add assistant response to chat
			setMessages([...updatedMessages, { role: 'assistant', content: response }]);

			// Scroll to bottom
			setTimeout(() => {
				scrollViewRef.current?.scrollToEnd({ animated: true });
			}, 100);
		} catch (error) {
			console.error('Error generating DM response:', error);
			Alert.alert('Error', 'Failed to get DM response. Please try again.');
		} finally {
			setIsLoading(false);
		}
	};

	// Retry initialization if it failed
	const handleRetryInit = () => {
		setIsInitializing(true);
		setError(null);
		setIsInitialized(false);
		setInitProgress(0);
	};

	// Determine text and background colors based on color scheme
	const textColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
	const backgroundColor = colorScheme === 'dark' ? '#1A1A1A' : '#F5F5F5';
	const inputBackgroundColor = colorScheme === 'dark' ? '#333333' : '#FFFFFF';
	const buttonColor = colorScheme === 'dark' ? '#4A90E2' : '#2E78B7';

	return (
		<View style={[styles.container, { backgroundColor }]}>
			{/* Loading or Error State */}
			{(isInitializing || !isInitialized) && (
				<View style={styles.centerContainer}>
					{isInitializing ? (
						<View style={styles.loadingContainer}>
							<ActivityIndicator size="large" color={buttonColor} />
							<Text style={[styles.loadingText, { color: textColor }]}>
								Initializing DM ({Math.round(initProgress * 100)}%)
							</Text>
						</View>
					) : error ? (
						<View style={styles.errorContainer}>
							<Text style={[styles.errorText, { color: textColor }]}>{error}</Text>
							<TouchableOpacity
								style={[styles.retryButton, { backgroundColor: buttonColor }]}
								onPress={handleRetryInit}
							>
								<Text style={styles.retryButtonText}>Retry</Text>
							</TouchableOpacity>
						</View>
					) : null}
				</View>
			)}

			{/* Chat Messages */}
			{isInitialized && !isInitializing && (
				<>
					<ScrollView
						ref={scrollViewRef}
						style={styles.messagesContainer}
						contentContainerStyle={styles.messagesContent}
					>
						{messages.map((message, index) => (
							<View
								key={index}
								style={[
									styles.messageContainer,
									message.role === 'user'
										? styles.userMessage
										: styles.assistantMessage,
									message.role === 'user'
										? { backgroundColor: buttonColor }
										: { backgroundColor: inputBackgroundColor },
								]}
							>
								<Text
									style={[
										styles.messageText,
										message.role === 'user'
											? styles.userMessageText
											: { color: textColor },
									]}
								>
									{message.content}
								</Text>
							</View>
						))}
						{isLoading && (
							<View
								style={[
									styles.loadingMessage,
									{ backgroundColor: inputBackgroundColor },
								]}
							>
								<ActivityIndicator size="small" color={buttonColor} />
								<Text style={[styles.loadingMessageText, { color: textColor }]}>
									Thinking...
								</Text>
							</View>
						)}
					</ScrollView>

					{/* Input Area */}
					<View style={styles.inputContainer}>
						<TextInput
							style={[
								styles.input,
								{
									color: textColor,
									backgroundColor: inputBackgroundColor,
									borderColor: colorScheme === 'dark' ? '#444444' : '#DDDDDD',
								},
							]}
							value={input}
							onChangeText={setInput}
							placeholder="What do you want to do?"
							placeholderTextColor={colorScheme === 'dark' ? '#888888' : '#999999'}
							multiline
							onSubmitEditing={handleSend}
							editable={!isLoading}
						/>
						<TouchableOpacity
							style={[
								styles.sendButton,
								{ backgroundColor: buttonColor },
								isLoading && styles.disabledButton,
							]}
							onPress={handleSend}
							disabled={isLoading || !input.trim()}
						>
							<Text style={styles.sendButtonText}>Send</Text>
						</TouchableOpacity>
					</View>
				</>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 10,
	},
	centerContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingContainer: {
		alignItems: 'center',
	},
	loadingText: {
		marginTop: 10,
		fontSize: 16,
	},
	errorContainer: {
		alignItems: 'center',
		padding: 20,
	},
	errorText: {
		fontSize: 16,
		textAlign: 'center',
		marginBottom: 20,
	},
	retryButton: {
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 5,
	},
	retryButtonText: {
		color: 'white',
		fontSize: 16,
	},
	messagesContainer: {
		flex: 1,
	},
	messagesContent: {
		paddingVertical: 10,
	},
	messageContainer: {
		borderRadius: 10,
		padding: 10,
		marginVertical: 5,
		maxWidth: '80%',
	},
	userMessage: {
		alignSelf: 'flex-end',
	},
	assistantMessage: {
		alignSelf: 'flex-start',
	},
	messageText: {
		fontSize: 16,
	},
	userMessageText: {
		color: 'white',
	},
	loadingMessage: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'flex-start',
		borderRadius: 10,
		padding: 10,
		marginVertical: 5,
	},
	loadingMessageText: {
		marginLeft: 10,
		fontSize: 16,
	},
	inputContainer: {
		flexDirection: 'row',
		marginTop: 10,
	},
	input: {
		flex: 1,
		borderWidth: 1,
		borderRadius: 20,
		paddingHorizontal: 15,
		paddingVertical: 10,
		fontSize: 16,
		maxHeight: 100,
	},
	sendButton: {
		marginLeft: 10,
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 20,
		justifyContent: 'center',
		alignItems: 'center',
	},
	sendButtonText: {
		color: 'white',
		fontSize: 16,
	},
	disabledButton: {
		opacity: 0.5,
	},
});
