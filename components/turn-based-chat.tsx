/**
 * Turn-Based Chat Bubble System
 * Similar to transcript overlay but for turn-based gameplay
 */

import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
	Dimensions,
	Image,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	useWindowDimensions,
	View,
} from 'react-native';

import { Colors } from '@/constants/colors';
import { RaceByID } from '@/constants/races';
import { SKILL_LIST } from '@/constants/skills';
import { useSimpleCompanions } from '@/hooks/use-simple-companions';
import { DMMessage } from '@/services/ai/agents/dungeon-master-agent';
import type { Character } from '@/types/character';

interface ChatMessage {
	id: string;
	speakerId: 'dm' | 'player' | string; // 'dm', 'player', or companion ID
	speakerName: string;
	content: string;
	timestamp: number;
	type: 'action' | 'dialogue' | 'system';
}

interface TurnBasedChatProps {
	playerCharacter: Character | null;
	dmMessages: DMMessage[];
	onSendMessage: (message: string, speakerId: string) => Promise<void>;
	activeCharacter: 'dm' | 'player' | string;
	onTurnChange: (newActiveCharacter: 'dm' | 'player' | string) => void;
	isLoading?: boolean;
}

function getSuggestionsFromMessage(message: string) {
	const suggestions: { label: string; action: string }[] = [];
	const lower = message.toLowerCase();

	// Roll for initiative
	if (/roll for initiative|initiative check/.test(lower)) {
		suggestions.push({ label: 'Roll Initiative', action: '/roll initiative' });
	}

	// Roll for (skill) or (skill) check using SKILL_LIST
	for (const skill of SKILL_LIST) {
		const skillPattern = skill.name.toLowerCase().replace(/ /g, '\\s*'); // allow for optional spaces
		const rollRegex = new RegExp(`roll for ${skillPattern}`);
		const checkRegex = new RegExp(`${skillPattern} check`);
		if (rollRegex.test(lower) || checkRegex.test(lower)) {
			suggestions.push({
				label: `Roll ${skill.name}`,
				action: `/roll ${skill.id}`,
			});
		}
	}

	return suggestions;
}

export const TurnBasedChat: React.FC<TurnBasedChatProps> = ({
	playerCharacter,
	dmMessages,
	onSendMessage,
	activeCharacter,
	isLoading = false,
}) => {
	const [inputText, setInputText] = useState('');
	const companions = useSimpleCompanions();
	const scrollViewRef = useRef<ScrollView>(null);
	const { width: screenWidth } = useWindowDimensions();
	const isMobile = screenWidth < 768;
	const { height: windowHeight } = Dimensions.get('window');
	const BOTTOM_BAR_HEIGHT = 100; // Adjust if your bottom bar is a different height
	const TOP_OFFSET = 80; // Matches your 'top: 80' in styles
	const chatHeight = windowHeight - BOTTOM_BAR_HEIGHT - TOP_OFFSET;

	// Convert DM messages to chat format
	const chatMessages: ChatMessage[] = dmMessages.map((msg, index) => {
		// Default to DM unless explicitly identified as player
		let speakerId = 'dm';
		let speakerName = 'Dungeon Master';
		let content = msg.content;

		// Check if message starts with a speaker prefix like "player: content"
		const speakerMatch = content.match(/^(player|dm):\s*(.*)/i);
		if (speakerMatch) {
			const [, speaker, messageContent] = speakerMatch;
			speakerId = speaker.toLowerCase() === 'player' ? 'player' : 'dm';
			speakerName = speakerId === 'player' ? (playerCharacter?.name || 'Player') : 'Dungeon Master';
			content = messageContent;
		} else if (msg.speaker === 'Player') {
			// Only mark as player if explicitly marked as such
			speakerId = 'player';
			speakerName = playerCharacter?.name || 'Player';
			// Remove "Player:" prefix if present
			content = content.replace(/^Player:\s*/, '');
		}
		// All other messages default to DM (including msg.speaker === 'Dungeon Master')

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

	const getSpeakerImage = (speakerId: string) => {
		if (speakerId === 'dm') {
			return require('../assets/images/dungeon-master.png');
		}
		if (speakerId === 'player') {
			return playerCharacter?.image ? { uri: playerCharacter.image } : RaceByID.human.image;
		}
		// Companion
		const companion = companions.activeCompanions.find(c => c.id === speakerId);
		return companion?.image ? { uri: companion.image } : RaceByID.human.image;
	};

	const getSpeakerName = (speakerId: string) => {
		if (speakerId === 'dm') return 'Dungeon Master';
		if (speakerId === 'player') return playerCharacter?.name || 'Player';
		const companion = companions.activeCompanions.find(c => c.id === speakerId);
		return companion?.name || 'Companion';
	};

	const renderMessage = (message: ChatMessage) => {
		const isPlayer = message.speakerId === 'player' || companions.activeCompanions.some(c => c.id === message.speakerId);
		const isDM = message.speakerId === 'dm';

		return (
			<View key={message.id} style={[
				styles.messageContainer,
				isPlayer ? styles.playerMessageContainer : styles.dmMessageContainer,
			]}>
				<View style={[
					styles.messageContent,
					isPlayer ? styles.playerMessageContent : styles.dmMessageContent,
				]}>
					{isDM && (
						<Image source={getSpeakerImage(message.speakerId)} style={styles.speakerAvatar} />
					)}
					<View style={[
						styles.messageBubble,
						isPlayer ? styles.playerBubble : styles.dmBubble,
					]}>
						<View style={styles.messageHeader}>
							<Text style={[
								styles.speakerName,
								isPlayer ? styles.playerSpeakerName : styles.dmSpeakerName,
							]}>
								{getSpeakerName(message.speakerId)}
							</Text>
							<Text style={styles.timestamp}>
								{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
							</Text>
						</View>
						<Text style={[
							styles.messageText,
							isPlayer ? styles.playerMessageText : styles.dmMessageText,
						]}>
							{message.content}
						</Text>
					</View>
					{isPlayer && (
						<Image source={getSpeakerImage(message.speakerId)} style={styles.speakerAvatar} />
					)}
				</View>
			</View>
		);
	};

	// Auto-scroll to bottom when a new message is added
	useEffect(() => {
		if (scrollViewRef.current) {
			scrollViewRef.current.scrollToEnd({ animated: true });
		}
	}, [chatMessages.length]);

	const lastDM = [...chatMessages].reverse().find(m => m.speakerId === 'dm');
	const suggestions = lastDM ? getSuggestionsFromMessage(lastDM.content) : [];

	return (
		<View
			style={[
				styles.container,
				isMobile
					? { ...styles.containerMobile, height: chatHeight }
					: styles.containerDesktop,
			]}
		>
			<View style={[
				styles.chatContainer,
				{
					height: chatHeight,
				},
			]}>
				{/* Chat Header */}
				<View style={styles.chatHeader}>
					<Feather name="message-circle" size={20} color="#000" />
					<Text style={styles.headerTitle}>Party Chat</Text>
					<Text style={styles.turnIndicatorText}>
						{getSpeakerName(activeCharacter)}&apos;s Turn
					</Text>
				</View>

				{/* Messages */}
				<ScrollView
					ref={scrollViewRef}
					style={styles.messagesContainer}
					showsVerticalScrollIndicator={false}
				>
					{chatMessages.map(renderMessage)}
				</ScrollView>

				{suggestions.length > 0 && (
					<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 8, justifyContent: 'flex-start' }}>
						{suggestions.map(s => (
							<TouchableOpacity
								key={s.label}
								style={{ backgroundColor: '#FFD700', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, marginBottom: 6 }}
								onPress={() => onSendMessage(s.action, activeCharacter)}
							>
								<Text style={{ color: '#8B2323', fontWeight: 'bold' }}>{s.label}</Text>
							</TouchableOpacity>
						))}
					</View>
				)}

				{/* Input Area - Only show if it's player's turn */}
				{(activeCharacter === 'player' || companions.activeCompanions.some(c => c.id === activeCharacter)) && (
					<KeyboardAvoidingView
						style={styles.inputContainer}
						behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
					>
						<TextInput
							style={styles.textInput}
							value={inputText}
							onChangeText={setInputText}
							placeholder={`What does ${getSpeakerName(activeCharacter)} do?`}
							placeholderTextColor="#999"
							multiline={false}
							maxLength={500}
							onSubmitEditing={handleSendMessage}
							returnKeyType="send"
							blurOnSubmit={false}
						/>
						<TouchableOpacity
							style={styles.micButton}
							onPress={() => {/* TODO: Add mic functionality */ }}
						>
							<Feather name="mic" size={20} color="#8B2323" />
						</TouchableOpacity>
					</KeyboardAvoidingView>
				)}

				{/* DM Turn Indicator */}
				{activeCharacter === 'dm' && (
					<View style={styles.dmTurnIndicator}>
						<Text style={styles.dmTurnText}>Waiting for Dungeon Master...</Text>
					</View>
				)}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		top: 80,
		zIndex: 300,
	},
	containerDesktop: {
		right: 16, // Fixed to right side
		width: 500, // Max width 500px
		maxWidth: 500,
	},
	containerMobile: {
		left: 16,
		right: 16,
	},
	chatContainer: {
		backgroundColor: 'rgba(249, 246, 239, 0.95)', // Parchment background
		borderRadius: 16,
		overflow: 'hidden',
		borderWidth: 2,
		borderColor: '#C9B037',
	},
	chatHeader: {
		backgroundColor: '#FFD700',
		padding: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	headerTitle: {
		color: '#000',
		fontSize: 16,
		fontWeight: 'bold',
		flex: 1,
		marginLeft: 8,
	},
	turnIndicatorText: {
		color: '#8B2323',
		fontSize: 12,
		fontWeight: '600',
		fontStyle: 'italic',
	},
	messagesContainer: {
		padding: 12,
	},
	messageContainer: {
		marginBottom: 12,
	},
	playerMessageContainer: {
		alignItems: 'flex-end',
	},
	dmMessageContainer: {
		alignItems: 'flex-start',
	},
	messageContent: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		maxWidth: '90%',
		gap: 8,
	},
	playerMessageContent: {
		flexDirection: 'row-reverse',
	},
	dmMessageContent: {
		flexDirection: 'row',
	},
	messageHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 4,
	},
	speakerAvatar: {
		width: 24,
		height: 24,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	speakerName: {
		fontSize: 11,
		fontWeight: 'bold',
		flex: 1,
	},
	playerSpeakerName: {
		color: '#8B2323',
	},
	dmSpeakerName: {
		color: '#8B2323',
	},
	timestamp: {
		color: Colors.light.textSecondary,
		fontSize: 9,
	},
	messageBubble: {
		padding: 10,
		borderRadius: 16,
		width: '100%',
	},
	playerBubble: {
		backgroundColor: Colors.light.backgroundSecondary,
		borderBottomRightRadius: 4,
	},
	dmBubble: {
		backgroundColor: Colors.light.backgroundHighlight,
		borderBottomLeftRadius: 4,
	},
	messageText: {
		fontSize: 14,
		lineHeight: 18,
	},
	playerMessageText: {
		color: '#3B2F1B',
	},
	dmMessageText: {
		color: '#3B2F1B',
	},
	inputContainer: {
		flexDirection: 'row',
		padding: 12,
		gap: 8,
		alignItems: 'flex-end',
		borderTopWidth: 1,
		borderTopColor: '#C9B037',
		backgroundColor: '#FFF8E1',
	},
	textInput: {
		flex: 1,
		backgroundColor: '#FFF',
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 10,
		color: '#3B2F1B',
		fontSize: 14,
		height: 40,
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	micButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#FFF',
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: '#C9B037',
		marginLeft: 8,
	},
	dmTurnIndicator: {
		padding: 16,
		backgroundColor: '#FFF8E1',
		borderTopWidth: 1,
		borderTopColor: '#C9B037',
		alignItems: 'center',
	},
	dmTurnText: {
		color: '#8B5C2A',
		fontSize: 14,
		fontStyle: 'italic',
	},
});
