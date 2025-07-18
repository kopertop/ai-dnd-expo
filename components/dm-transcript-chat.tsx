/**
 * DM Transcript Chat - Simple black terminal-style interface
 * Replaces the bubble chat with a clean transcript view
 */

import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
	Dimensions,
	Keyboard,
	KeyboardAvoidingView,
	Platform,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	useWindowDimensions,
	View,
} from 'react-native';

import { VoiceChatButton } from './voice-chat-button';
import { useSimpleCompanions } from '@/hooks/use-simple-companions';
import { DMMessage } from '@/services/ai/agents/dungeon-master-agent';
import type { Character } from '@/types/character';

interface TranscriptMessage {
	id: string;
	speakerId: 'dm' | 'player' | string;
	speakerName: string;
	content: string;
	timestamp: number;
	type: 'action' | 'dialogue' | 'system';
}

interface DMTranscriptChatProps {
	playerCharacter: Character | null;
	dmMessages: DMMessage[];
	onSendMessage: (message: string, speakerId: string) => Promise<void>;
	onVoiceMessage: (transcript: string) => Promise<void>;
	activeCharacter: 'dm' | 'player' | string;
	onTurnChange: (newActiveCharacter: 'dm' | 'player' | string) => void;
	isLoading?: boolean;
}

export const DMTranscriptChat: React.FC<DMTranscriptChatProps> = ({
	playerCharacter,
	dmMessages,
	onSendMessage,
	onVoiceMessage,
	activeCharacter,
	isLoading = false,
}) => {
	const [inputText, setInputText] = useState('');
	const companions = useSimpleCompanions();
	const scrollViewRef = useRef<ScrollView>(null);
	const { width: screenWidth } = useWindowDimensions();
	const isMobile = screenWidth < 768;
	const { height: windowHeight } = Dimensions.get('window');
	const BOTTOM_BAR_HEIGHT = 100;
	const TOP_OFFSET = 80;
	const chatHeight = windowHeight - BOTTOM_BAR_HEIGHT - TOP_OFFSET;
	const [keyboardOpen, setKeyboardOpen] = useState(false);

	useEffect(() => {
		const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
		const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
		return () => {
			showSub.remove();
			hideSub.remove();
		};
	}, []);

	// Convert DM messages to transcript format
	const transcriptMessages: TranscriptMessage[] = dmMessages.map((msg, index) => {
		let speakerId = 'dm';
		let speakerName = 'DM';
		let content = msg.content;

		// Check if message starts with a speaker prefix like "player: content"
		const speakerMatch = content.match(/^(player|dm):\s*(.*)/i);
		if (speakerMatch) {
			const [, speaker, messageContent] = speakerMatch;
			speakerId = speaker.toLowerCase() === 'player' ? 'player' : 'dm';
			speakerName = speakerId === 'player' ? playerCharacter?.name || 'Player' : 'DM';
			content = messageContent;
		} else if (msg.speaker === 'Player') {
			speakerId = 'player';
			speakerName = playerCharacter?.name || 'Player';
			content = content.replace(/^Player:\s*/, '');
		}

		return {
			id: msg.id || `msg-${index}`,
			speakerId,
			speakerName,
			content,
			timestamp: msg.timestamp,
			type: 'dialogue',
		};
	});

	const handleSendMessage = async () => {
		if (inputText.trim() && !isLoading) {
			const message = inputText.trim();
			setInputText('');
			await onSendMessage(message, activeCharacter);
		}
	};

	const getSpeakerName = (speakerId: string) => {
		if (speakerId === 'dm') return 'DM';
		if (speakerId === 'player') return playerCharacter?.name || 'Player';
		const companion = companions.activeCompanions.find(c => c.id === speakerId);
		return companion?.name || 'Companion';
	};

	const formatTimestamp = (timestamp: number) => {
		return new Date(timestamp).toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const renderTranscriptLine = (message: TranscriptMessage) => {
		const isDM = message.speakerId === 'dm';
		
		return (
			<View key={message.id} style={styles.messageLine}>
				<Text style={styles.timestamp}>[{formatTimestamp(message.timestamp)}]</Text>
				<Text style={[styles.speakerName, isDM ? styles.dmSpeaker : styles.playerSpeaker]}>
					{message.speakerName}:
				</Text>
				<Text style={styles.messageContent}>{message.content}</Text>
			</View>
		);
	};

	// Auto-scroll to bottom when a new message is added
	useEffect(() => {
		if (scrollViewRef.current) {
			scrollViewRef.current.scrollToEnd({ animated: true });
		}
	}, [transcriptMessages.length]);

	return (
		<SafeAreaView
			style={[
				styles.container,
				isMobile
					? { ...styles.containerMobile, height: keyboardOpen ? undefined : chatHeight }
					: styles.containerDesktop,
			]}
		>
			<KeyboardAvoidingView
				style={[styles.chatContainer, keyboardOpen ? { flex: 1 } : { height: chatHeight }]}
			>
				{/* Chat Header */}
				<View style={styles.chatHeader}>
					<Text style={styles.headerTitle}>DM Transcript</Text>
					<Text style={styles.turnIndicator}>
						{getSpeakerName(activeCharacter)}'s Turn
					</Text>
				</View>

				{/* Transcript */}
				<ScrollView
					ref={scrollViewRef}
					style={styles.transcriptContainer}
					showsVerticalScrollIndicator={false}
				>
					{transcriptMessages.map(renderTranscriptLine)}
					{isLoading && (
						<View style={styles.messageLine}>
							<Text style={styles.timestamp}>[{formatTimestamp(Date.now())}]</Text>
							<Text style={[styles.speakerName, styles.dmSpeaker]}>DM:</Text>
							<Text style={styles.messageContent}>
								<Text style={styles.loadingText}>thinking...</Text>
							</Text>
						</View>
					)}
				</ScrollView>

				{/* Input Area - Only show if it's player's turn */}
				{(activeCharacter === 'player' ||
					companions.activeCompanions.some(c => c.id === activeCharacter)) && (
					<KeyboardAvoidingView
						style={styles.inputContainer}
						behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
					>
						<TextInput
							style={styles.textInput}
							value={inputText}
							onChangeText={setInputText}
							placeholder={`What does ${getSpeakerName(activeCharacter)} do?`}
							placeholderTextColor="#666"
							multiline={false}
							maxLength={500}
							onSubmitEditing={handleSendMessage}
							returnKeyType="send"
							blurOnSubmit={false}
						/>
						<TouchableOpacity
							style={styles.sendButton}
							onPress={handleSendMessage}
							disabled={!inputText.trim() || isLoading}
						>
							<Feather 
								name="send" 
								size={18} 
								color={!inputText.trim() || isLoading ? "#666" : "#00ff00"} 
							/>
						</TouchableOpacity>
					</KeyboardAvoidingView>
				)}

				{/* DM Turn Indicator */}
				{activeCharacter === 'dm' && (
					<View style={styles.dmTurnIndicator}>
						<Text style={styles.dmTurnText}>Waiting for Dungeon Master...</Text>
					</View>
				)}
			</KeyboardAvoidingView>

			{/* Voice Chat Button */}
			<VoiceChatButton
				onVoiceInput={onVoiceMessage}
				isDisabled={isLoading}
				position={isMobile ? 'bottom-left' : 'top-right'}
			/>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		top: 80,
		zIndex: 300,
	},
	containerDesktop: {
		right: 16,
		width: 600,
		maxWidth: 600,
	},
	containerMobile: {
		left: 16,
		right: 16,
	},
	chatContainer: {
		backgroundColor: '#000000',
		borderRadius: 8,
		overflow: 'hidden',
		borderWidth: 2,
		borderColor: '#333333',
	},
	chatHeader: {
		backgroundColor: '#1a1a1a',
		padding: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderBottomWidth: 1,
		borderBottomColor: '#333333',
	},
	headerTitle: {
		color: '#00ff00',
		fontSize: 16,
		fontWeight: 'bold',
		fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
	},
	turnIndicator: {
		color: '#ffff00',
		fontSize: 12,
		fontWeight: '600',
		fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
	},
	transcriptContainer: {
		padding: 12,
		flex: 1,
	},
	messageLine: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginBottom: 4,
		alignItems: 'baseline',
	},
	timestamp: {
		color: '#666666',
		fontSize: 12,
		fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
		marginRight: 8,
	},
	speakerName: {
		fontSize: 14,
		fontWeight: 'bold',
		fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
		marginRight: 8,
	},
	dmSpeaker: {
		color: '#ff6b6b',
	},
	playerSpeaker: {
		color: '#4ecdc4',
	},
	messageContent: {
		color: '#ffffff',
		fontSize: 14,
		fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
		flex: 1,
		lineHeight: 18,
	},
	loadingText: {
		fontStyle: 'italic',
		color: '#999999',
	},
	inputContainer: {
		flexDirection: 'row',
		padding: 12,
		gap: 8,
		alignItems: 'center',
		borderTopWidth: 1,
		borderTopColor: '#333333',
		backgroundColor: '#1a1a1a',
	},
	textInput: {
		flex: 1,
		backgroundColor: '#000000',
		borderRadius: 4,
		paddingHorizontal: 12,
		paddingVertical: 8,
		color: '#ffffff',
		fontSize: 14,
		fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
		borderWidth: 1,
		borderColor: '#333333',
	},
	sendButton: {
		width: 36,
		height: 36,
		borderRadius: 4,
		backgroundColor: '#1a1a1a',
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: '#333333',
	},
	dmTurnIndicator: {
		padding: 12,
		backgroundColor: '#1a1a1a',
		borderTopWidth: 1,
		borderTopColor: '#333333',
		alignItems: 'center',
	},
	dmTurnText: {
		color: '#ffff00',
		fontSize: 14,
		fontStyle: 'italic',
		fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
	},
});