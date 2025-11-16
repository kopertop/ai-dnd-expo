import React, { useEffect, useRef, useState } from 'react';
import {
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { useScreenSize } from '@/hooks/use-screen-size';
import { GameMessage } from '@/types/multiplayer-game';

interface MultiplayerChatProps {
	messages: GameMessage[];
	onSendMessage: (message: string) => void;
	disabled?: boolean;
	currentPlayerId?: string;
}

export const MultiplayerChat: React.FC<MultiplayerChatProps> = ({
	messages,
	onSendMessage,
	disabled = false,
	currentPlayerId,
}) => {
	const [inputText, setInputText] = useState('');
	const scrollViewRef = useRef<ScrollView>(null);
	const { isMobile } = useScreenSize();

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		if (scrollViewRef.current && messages.length > 0) {
			setTimeout(() => {
				scrollViewRef.current?.scrollToEnd({ animated: true });
			}, 100);
		}
	}, [messages.length]);

	const handleSend = () => {
		if (inputText.trim() && !disabled) {
			onSendMessage(inputText.trim());
			setInputText('');
		}
	};

	return (
		<ThemedView style={styles.container}>
			<ThemedText type="subtitle" style={styles.title}>
				Game Chat
			</ThemedText>
			<ScrollView
				ref={scrollViewRef}
				style={styles.messagesContainer}
				contentContainerStyle={styles.messagesContent}
				showsVerticalScrollIndicator={true}
			>
				{messages.length === 0 ? (
					<ThemedText style={styles.emptyText}>
						No messages yet. Start the conversation!
					</ThemedText>
				) : (
					messages.map((message) => {
						const isPlayerMessage = message.type === 'system' && message.characterId === currentPlayerId;
						return (
							<View
								key={message.id}
								style={[
									styles.messageContainer,
									isPlayerMessage && styles.playerMessageContainer,
								]}
							>
								<ThemedText style={styles.messageSpeaker}>
									{message.speaker}:
								</ThemedText>
								<ThemedText style={styles.messageContent}>
									{message.content}
								</ThemedText>
								<ThemedText style={styles.messageTime}>
									{new Date(message.timestamp).toLocaleTimeString()}
								</ThemedText>
							</View>
						);
					})
				)}
			</ScrollView>
			<View style={styles.inputContainer}>
				<TextInput
					style={[styles.input, isMobile && styles.inputMobile]}
					value={inputText}
					onChangeText={setInputText}
					placeholder="Type your message..."
					placeholderTextColor="#9B8B7A"
					multiline
					editable={!disabled}
					onSubmitEditing={handleSend}
				/>
				<TouchableOpacity
					style={[
						styles.sendButton,
						(!inputText.trim() || disabled) && styles.sendButtonDisabled,
					]}
					onPress={handleSend}
					disabled={!inputText.trim() || disabled}
				>
					<ThemedText style={styles.sendButtonText}>Send</ThemedText>
				</TouchableOpacity>
			</View>
		</ThemedView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
	},
	title: {
		marginBottom: 12,
		fontSize: 18,
		color: '#3B2F1B',
	},
	messagesContainer: {
		flex: 1,
		backgroundColor: '#F5E6D3',
		borderRadius: 12,
		marginBottom: 12,
	},
	messagesContent: {
		padding: 12,
	},
	emptyText: {
		textAlign: 'center',
		color: '#9B8B7A',
		marginTop: 20,
		fontSize: 14,
	},
	messageContainer: {
		backgroundColor: '#E2D3B3',
		borderRadius: 8,
		padding: 10,
		marginBottom: 8,
	},
	playerMessageContainer: {
		backgroundColor: '#C9B037',
	},
	messageSpeaker: {
		fontSize: 14,
		fontWeight: 'bold',
		color: '#3B2F1B',
		marginBottom: 4,
	},
	messageContent: {
		fontSize: 14,
		color: '#3B2F1B',
		marginBottom: 4,
	},
	messageTime: {
		fontSize: 10,
		color: '#6B5B3D',
	},
	inputContainer: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		gap: 8,
	},
	input: {
		flex: 1,
		backgroundColor: '#F5E6D3',
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 16,
		color: '#3B2F1B',
		borderWidth: 1,
		borderColor: '#C9B037',
		maxHeight: 100,
	},
	inputMobile: {
		fontSize: 14,
		paddingVertical: 10,
	},
	sendButton: {
		backgroundColor: '#C9B037',
		paddingHorizontal: 20,
		paddingVertical: 12,
		borderRadius: 12,
	},
	sendButtonDisabled: {
		opacity: 0.5,
	},
	sendButtonText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 16,
	},
});

