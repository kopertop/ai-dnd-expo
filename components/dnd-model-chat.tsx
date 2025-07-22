import React, { useState, useEffect, useCallback } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ScrollView,
	Alert,
	ActivityIndicator,
	StyleSheet,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { dndModel, type DnDMessage } from '@/services/dnd-model';

interface ChatMessage {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp: Date;
	context?: DnDMessage['context'];
}

interface DnDModelChatProps {
	initialContext?: DnDMessage['context'];
	onModelReady?: (isReady: boolean) => void;
}

const DnDModelChat = ({ initialContext, onModelReady }: DnDModelChatProps) => {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [inputText, setInputText] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [isModelInitialized, setIsModelInitialized] = useState(false);
	const [initProgress, setInitProgress] = useState(0);
	const [currentContext, setCurrentContext] = useState<DnDMessage['context']>(initialContext);

	const backgroundColor = useThemeColor({}, 'background');
	const textColor = useThemeColor({}, 'text');
	const tintColor = useThemeColor({}, 'tint');

	const initializeModel = useCallback(async () => {
		try {
			setIsLoading(true);
			await dndModel.initialize(progress => {
				setInitProgress(progress);
			});
			setIsModelInitialized(true);
			onModelReady?.(true);

			// Add welcome message
			const welcomeMessage: ChatMessage = {
				id: Date.now().toString(),
				role: 'system',
				content:
					"🎲 D&D Model initialized! I'm ready to help with your D&D adventure. What would you like to do?",
				timestamp: new Date(),
			};
			setMessages([welcomeMessage]);
		} catch (error) {
			console.error('Failed to initialize D&D model:', error);
			Alert.alert('Error', 'Failed to initialize D&D model. Please try again.');
			onModelReady?.(false);
		} finally {
			setIsLoading(false);
		}
	}, [onModelReady]);

	useEffect(() => {
		if (!isModelInitialized) {
			initializeModel();
		}
	}, [initializeModel, isModelInitialized]);

	const sendMessage = useCallback(async () => {
		if (!inputText.trim() || !isModelInitialized || isLoading) return;

		const userMessage: ChatMessage = {
			id: Date.now().toString(),
			role: 'user',
			content: inputText.trim(),
			timestamp: new Date(),
			context: currentContext,
		};

		setMessages(prev => [...prev, userMessage]);
		setInputText('');
		setIsLoading(true);

		try {
			const dndMessage: DnDMessage = {
				role: 'user',
				content: userMessage.content,
				context: currentContext,
			};

			const response = await dndModel.generateResponse(dndMessage);

			const assistantMessage: ChatMessage = {
				id: (Date.now() + 1).toString(),
				role: 'assistant',
				content: response,
				timestamp: new Date(),
			};

			setMessages(prev => [...prev, assistantMessage]);
		} catch (error) {
			console.error('Error generating response:', error);
			const errorMessage: ChatMessage = {
				id: (Date.now() + 1).toString(),
				role: 'system',
				content: '❌ Error generating response. Please try again.',
				timestamp: new Date(),
			};
			setMessages(prev => [...prev, errorMessage]);
		} finally {
			setIsLoading(false);
		}
	}, [inputText, isModelInitialized, isLoading, currentContext]);

	const updateContext = useCallback((newContext: Partial<DnDMessage['context']>) => {
		setCurrentContext(prev => ({ ...prev, ...newContext }));
	}, []);

	const clearConversation = useCallback(() => {
		setMessages([
			{
				id: Date.now().toString(),
				role: 'system',
				content: "🔄 Conversation cleared. What's your next adventure?",
				timestamp: new Date(),
			},
		]);
	}, []);

	const renderMessage = (message: ChatMessage) => {
		const isUser = message.role === 'user';
		const isSystem = message.role === 'system';

		return (
			<View
				key={message.id}
				style={[
					styles.messageContainer,
					isUser && styles.userMessage,
					isSystem && styles.systemMessage,
				]}
			>
				<ThemedText
					style={[
						styles.messageText,
						isUser && { color: 'white' },
						isSystem && { fontStyle: 'italic', opacity: 0.8 },
					]}
				>
					{message.content}
				</ThemedText>
				<ThemedText
					style={[styles.timestamp, isUser && { color: 'rgba(255,255,255,0.7)' }]}
				>
					{message.timestamp.toLocaleTimeString()}
				</ThemedText>
			</View>
		);
	};

	const renderContextPanel = () => {
		if (!currentContext) return null;

		return (
			<ThemedView style={styles.contextPanel}>
				<ThemedText style={styles.contextTitle}>Current Context</ThemedText>
				{currentContext.role && (
					<ThemedText style={styles.contextItem}>Role: {currentContext.role}</ThemedText>
				)}
				{currentContext.world && (
					<ThemedText style={styles.contextItem}>
						World: {currentContext.world}
					</ThemedText>
				)}
				{currentContext.location && (
					<ThemedText style={styles.contextItem}>
						Location: {currentContext.location}
					</ThemedText>
				)}
				{currentContext.party && currentContext.party.length > 0 && (
					<ThemedText style={styles.contextItem}>
						Party: {currentContext.party.join(', ')}
					</ThemedText>
				)}
			</ThemedView>
		);
	};

	if (!isModelInitialized && isLoading) {
		return (
			<ThemedView style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={tintColor} />
				<ThemedText style={styles.loadingText}>
					Initializing D&D Model... {Math.round(initProgress * 100)}%
				</ThemedText>
				<ThemedText style={styles.loadingSubtext}>
					Setting up your AI Dungeon Master
				</ThemedText>
			</ThemedView>
		);
	}

	return (
		<ThemedView style={styles.container}>
			{renderContextPanel()}

			<ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
				{messages.map(renderMessage)}
				{isLoading && (
					<View style={styles.typingIndicator}>
						<ActivityIndicator size="small" color={tintColor} />
						<ThemedText style={styles.typingText}>DM is thinking...</ThemedText>
					</View>
				)}
			</ScrollView>

			<View style={styles.inputContainer}>
				<TextInput
					style={[styles.textInput, { borderColor: tintColor, color: textColor }]}
					value={inputText}
					onChangeText={setInputText}
					placeholder="What do you want to do?"
					placeholderTextColor={textColor + '80'}
					multiline
					onSubmitEditing={sendMessage}
					editable={!isLoading && isModelInitialized}
				/>
				<TouchableOpacity
					style={[
						styles.sendButton,
						{ backgroundColor: tintColor },
						(!inputText.trim() || isLoading || !isModelInitialized) &&
							styles.sendButtonDisabled,
					]}
					onPress={sendMessage}
					disabled={!inputText.trim() || isLoading || !isModelInitialized}
				>
					<Text style={styles.sendButtonText}>{isLoading ? '...' : '🎲'}</Text>
				</TouchableOpacity>
			</View>

			<View style={styles.actionBar}>
				<TouchableOpacity
					style={[styles.actionButton, { borderColor: tintColor }]}
					onPress={clearConversation}
				>
					<ThemedText style={styles.actionButtonText}>Clear Chat</ThemedText>
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.actionButton, { borderColor: tintColor }]}
					onPress={() => {
						Alert.alert(
							'Model Info',
							`Model: ${dndModel.getModelConfig()?.model?.name || 'D&D Model'}\nStatus: ${isModelInitialized ? 'Ready' : 'Loading'}\nTools: ${dndModel.getModelConfig()?.tools?.supported?.join(', ') || 'None'}`,
						);
					}}
				>
					<ThemedText style={styles.actionButtonText}>Model Info</ThemedText>
				</TouchableOpacity>
			</View>
		</ThemedView>
	);
};

export default DnDModelChat;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	loadingText: {
		fontSize: 18,
		fontWeight: 'bold',
		marginTop: 16,
		textAlign: 'center',
	},
	loadingSubtext: {
		fontSize: 14,
		marginTop: 8,
		opacity: 0.7,
		textAlign: 'center',
	},
	contextPanel: {
		padding: 12,
		borderRadius: 8,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: 'rgba(128, 128, 128, 0.3)',
	},
	contextTitle: {
		fontSize: 14,
		fontWeight: 'bold',
		marginBottom: 8,
	},
	contextItem: {
		fontSize: 12,
		marginBottom: 4,
		opacity: 0.8,
	},
	messagesContainer: {
		flex: 1,
		marginBottom: 16,
	},
	messageContainer: {
		padding: 12,
		marginVertical: 4,
		borderRadius: 12,
		maxWidth: '80%',
		alignSelf: 'flex-start',
	},
	userMessage: {
		backgroundColor: '#007AFF',
		alignSelf: 'flex-end',
	},
	systemMessage: {
		backgroundColor: 'rgba(128, 128, 128, 0.2)',
		alignSelf: 'center',
		maxWidth: '90%',
	},
	messageText: {
		fontSize: 16,
		lineHeight: 20,
	},
	timestamp: {
		fontSize: 12,
		marginTop: 4,
		opacity: 0.6,
	},
	typingIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		marginVertical: 4,
	},
	typingText: {
		marginLeft: 8,
		fontStyle: 'italic',
		opacity: 0.7,
	},
	inputContainer: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		marginBottom: 16,
	},
	textInput: {
		flex: 1,
		borderWidth: 1,
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 16,
		maxHeight: 100,
		marginRight: 12,
	},
	sendButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		justifyContent: 'center',
		alignItems: 'center',
	},
	sendButtonDisabled: {
		opacity: 0.5,
	},
	sendButtonText: {
		fontSize: 18,
		color: 'white',
	},
	actionBar: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	actionButton: {
		flex: 1,
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 8,
		borderWidth: 1,
		marginHorizontal: 4,
		alignItems: 'center',
	},
	actionButtonText: {
		fontSize: 14,
		fontWeight: '500',
	},
});
