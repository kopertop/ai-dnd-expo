/**
 * Enhanced Chat UI - iPad-optimized chat bubble interface
 * Features centered layout, proper voice integration, and responsive design
 */

import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
	Dimensions,
	Image,
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
	Animated,
} from 'react-native';

import { Colors } from '@/constants/colors';
import { RaceByID } from '@/constants/races';
import { SKILL_LIST } from '@/constants/skills';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSimpleCompanions } from '@/hooks/use-simple-companions';
import { useVoiceRecognition } from '@/hooks/use-voice-recognition';
import { useDMVoice } from '@/hooks/use-text-to-speech';
import { DMMessage } from '@/services/ai/agents/dungeon-master-agent';
import type { Character } from '@/types/character';

interface ChatMessage {
	id: string;
	speakerId: 'dm' | 'player' | string;
	speakerName: string;
	content: string;
	timestamp: number;
	type: 'action' | 'dialogue' | 'system';
}

interface EnhancedChatUIProps {
	playerCharacter: Character | null;
	dmMessages: DMMessage[];
	onSendMessage: (message: string, speakerId: string) => Promise<void>;
	onVoiceMessage: (transcript: string) => Promise<void>;
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
		const skillPattern = skill.name.toLowerCase().replace(/ /g, '\\s*');
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

export const EnhancedChatUI: React.FC<EnhancedChatUIProps> = ({
	playerCharacter,
	dmMessages,
	onSendMessage,
	onVoiceMessage,
	activeCharacter,
	isLoading = false,
}) => {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme ?? 'light'];
	const [inputText, setInputText] = useState('');
	const [voiceTranscript, setVoiceTranscript] = useState('');
	const [isVoiceActive, setIsVoiceActive] = useState(false);
	const companions = useSimpleCompanions();
	const scrollViewRef = useRef<ScrollView>(null);
	const { width: screenWidth, height: screenHeight } = useWindowDimensions();
	const [keyboardOpen, setKeyboardOpen] = useState(false);
	const [pulseAnim] = useState(new Animated.Value(1));
	const dmVoice = useDMVoice();

	// Responsive design breakpoints
	const isTablet = screenWidth >= 768;
	const isMobile = screenWidth < 768;
	const isLargeTablet = screenWidth >= 1024;

	// Calculate dimensions for centered layout
	const chatWidth = isLargeTablet ? 800 : isTablet ? 600 : screenWidth - 32;
	const chatHeight = screenHeight - 200; // Account for header and bottom bars

	useEffect(() => {
		const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
		const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
		return () => {
			showSub.remove();
			hideSub.remove();
		};
	}, []);

	// Voice recognition setup
	const voiceRecognition = useVoiceRecognition({
		language: 'en-US',
		maxDuration: 30000,
		onTranscription: (text, isFinal) => {
			setVoiceTranscript(text);
			if (isFinal && text.trim()) {
				handleVoiceInput(text);
			}
		},
		onError: error => {
			console.error('Voice recognition error:', error);
			setIsVoiceActive(false);
		},
	});

	// Voice input handler
	const handleVoiceInput = async (transcript: string) => {
		try {
			setIsVoiceActive(false);
			await onVoiceMessage(transcript);
		} catch (error) {
			console.error('Voice input error:', error);
		}
	};

	// Toggle voice recording
	const toggleVoiceRecording = async () => {
		if (voiceRecognition.isListening) {
			await voiceRecognition.stopListening();
			setIsVoiceActive(false);
		} else {
			if (!voiceRecognition.hasPermission) {
				const granted = await voiceRecognition.requestPermission();
				if (!granted) return;
			}

			if (dmVoice.isSpeaking) {
				dmVoice.stop();
			}

			await voiceRecognition.startListening();
			setIsVoiceActive(true);
		}
	};

	// Pulse animation for voice button
	useEffect(() => {
		if (isVoiceActive) {
			const pulseAnimation = Animated.loop(
				Animated.sequence([
					Animated.timing(pulseAnim, {
						toValue: 1.2,
						duration: 600,
						useNativeDriver: true,
					}),
					Animated.timing(pulseAnim, {
						toValue: 1,
						duration: 600,
						useNativeDriver: true,
					}),
				]),
			);
			pulseAnimation.start();
			return () => pulseAnimation.stop();
		}
	}, [isVoiceActive, pulseAnim]);

	// Convert DM messages to chat format
	const chatMessages: ChatMessage[] = dmMessages.map((msg, index) => {
		let speakerId = 'dm';
		let speakerName = 'Dungeon Master';
		let content = msg.content;

		const speakerMatch = content.match(/^(player|dm):\s*(.*)/i);
		if (speakerMatch) {
			const [, speaker, messageContent] = speakerMatch;
			speakerId = speaker.toLowerCase() === 'player' ? 'player' : 'dm';
			speakerName = speakerId === 'player' ? playerCharacter?.name || 'Player' : 'Dungeon Master';
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

	const getSpeakerImage = (speakerId: string) => {
		if (speakerId === 'dm') {
			return require('../assets/images/dungeon-master.png');
		}
		if (speakerId === 'player') {
			return playerCharacter?.image ? { uri: playerCharacter.image } : RaceByID.human.image;
		}
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
		const isPlayer = message.speakerId === 'player' || 
			companions.activeCompanions.some(c => c.id === message.speakerId);
		const isDM = message.speakerId === 'dm';

		return (
			<View
				key={message.id}
				style={[
					styles.messageContainer,
					isPlayer ? styles.playerMessageContainer : styles.dmMessageContainer,
				]}
			>
				<View
					style={[
						styles.messageContent,
						isPlayer ? styles.playerMessageContent : styles.dmMessageContent,
					]}
				>
					{isDM && (
						<Image
							source={getSpeakerImage(message.speakerId)}
							style={styles.speakerAvatar}
						/>
					)}
					<View
						style={[
							styles.messageBubble,
							isPlayer ? styles.playerBubble : styles.dmBubble,
							{ maxWidth: chatWidth * 0.8 },
						]}
					>
						<View style={styles.messageHeader}>
							<Text
								style={[
									styles.speakerName,
									isPlayer ? styles.playerSpeakerName : styles.dmSpeakerName,
								]}
							>
								{getSpeakerName(message.speakerId)}
							</Text>
							<Text style={styles.timestamp}>
								{new Date(message.timestamp).toLocaleTimeString([], {
									hour: '2-digit',
									minute: '2-digit',
								})}
							</Text>
						</View>
						<Text
							style={[
								styles.messageText,
								isPlayer ? styles.playerMessageText : styles.dmMessageText,
							]}
						>
							{message.content}
						</Text>
					</View>
					{isPlayer && (
						<Image
							source={getSpeakerImage(message.speakerId)}
							style={styles.speakerAvatar}
						/>
					)}
				</View>
			</View>
		);
	};

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		if (scrollViewRef.current) {
			scrollViewRef.current.scrollToEnd({ animated: true });
		}
	}, [chatMessages.length]);

	const lastDM = [...chatMessages].reverse().find(m => m.speakerId === 'dm');
	const suggestions = lastDM ? getSuggestionsFromMessage(lastDM.content) : [];

	const styles = createStyles(colors, isTablet, chatWidth, chatHeight);

	return (
		<SafeAreaView style={styles.container}>
			<KeyboardAvoidingView
				style={styles.keyboardAvoidingView}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			>
				<View style={styles.chatContainer}>
					{/* Chat Header */}
					<View style={styles.chatHeader}>
						<View style={styles.headerLeft}>
							<Feather name="message-circle" size={20} color={colors.text} />
							<Text style={styles.headerTitle}>D&D Adventure</Text>
						</View>
						<View style={styles.headerRight}>
							<Text style={styles.turnIndicator}>
								{getSpeakerName(activeCharacter)}'s Turn
							</Text>
						</View>
					</View>

					{/* Messages */}
					<ScrollView
						ref={scrollViewRef}
						style={styles.messagesContainer}
						contentContainerStyle={styles.messagesContent}
						showsVerticalScrollIndicator={false}
					>
						{chatMessages.map(renderMessage)}
						{isLoading && (
							<View style={styles.loadingContainer}>
								<Text style={styles.loadingText}>DM is thinking...</Text>
							</View>
						)}
					</ScrollView>

					{/* Quick Actions */}
					{suggestions.length > 0 && (
						<View style={styles.suggestionsContainer}>
							<ScrollView horizontal showsHorizontalScrollIndicator={false}>
								{suggestions.map(s => (
									<TouchableOpacity
										key={s.label}
										style={styles.suggestionButton}
										onPress={() => onSendMessage(s.action, activeCharacter)}
									>
										<Text style={styles.suggestionText}>{s.label}</Text>
									</TouchableOpacity>
								))}
							</ScrollView>
						</View>
					)}

					{/* Voice Transcript Display */}
					{isVoiceActive && voiceTranscript && (
						<View style={styles.voiceTranscriptContainer}>
							<Text style={styles.voiceTranscriptText}>
								"{voiceTranscript}"
							</Text>
						</View>
					)}

					{/* Input Area */}
					{(activeCharacter === 'player' ||
						companions.activeCompanions.some(c => c.id === activeCharacter)) && (
						<View style={styles.inputContainer}>
							<TextInput
								style={styles.textInput}
								value={inputText}
								onChangeText={setInputText}
								placeholder={`What does ${getSpeakerName(activeCharacter)} do?`}
								placeholderTextColor={colors.textSecondary}
								multiline
								maxLength={500}
								onSubmitEditing={handleSendMessage}
								returnKeyType="send"
								blurOnSubmit={false}
							/>
							<View style={styles.inputActions}>
								<Animated.View
									style={[
										styles.voiceButtonContainer,
										{ transform: [{ scale: isVoiceActive ? pulseAnim : 1 }] },
									]}
								>
									<TouchableOpacity
										style={[
											styles.voiceButton,
											{ backgroundColor: isVoiceActive ? '#ff4444' : colors.tint },
										]}
										onPress={toggleVoiceRecording}
										disabled={isLoading}
									>
										<Feather 
											name={isVoiceActive ? "mic" : "mic"} 
											size={20} 
											color="#FFFFFF" 
										/>
									</TouchableOpacity>
								</Animated.View>
								<TouchableOpacity
									style={[
										styles.sendButton,
										{ backgroundColor: inputText.trim() ? colors.tint : colors.textSecondary },
									]}
									onPress={handleSendMessage}
									disabled={!inputText.trim() || isLoading}
								>
									<Feather name="send" size={20} color="#FFFFFF" />
								</TouchableOpacity>
							</View>
						</View>
					)}

					{/* DM Turn Indicator */}
					{activeCharacter === 'dm' && (
						<View style={styles.dmTurnIndicator}>
							<Text style={styles.dmTurnText}>Waiting for Dungeon Master...</Text>
						</View>
					)}
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

const createStyles = (colors: any, isTablet: boolean, chatWidth: number, chatHeight: number) => {
	return StyleSheet.create({
		container: {
			flex: 1,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent overlay
		},
		keyboardAvoidingView: {
			width: chatWidth,
			height: chatHeight,
		},
		chatContainer: {
			flex: 1,
			backgroundColor: colors.background,
			borderRadius: isTablet ? 20 : 16,
			overflow: 'hidden',
			borderWidth: 2,
			borderColor: colors.tint + '40',
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 8 },
			shadowOpacity: 0.3,
			shadowRadius: 16,
			elevation: 16,
		},
		chatHeader: {
			backgroundColor: colors.tint,
			padding: 16,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
		},
		headerLeft: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 8,
		},
		headerTitle: {
			color: '#FFFFFF',
			fontSize: 18,
			fontWeight: 'bold',
		},
		headerRight: {
			alignItems: 'flex-end',
		},
		turnIndicator: {
			color: '#FFFFFF',
			fontSize: 12,
			fontWeight: '600',
			fontStyle: 'italic',
			opacity: 0.9,
		},
		messagesContainer: {
			flex: 1,
		},
		messagesContent: {
			padding: 16,
			paddingBottom: 8,
		},
		messageContainer: {
			marginBottom: 16,
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
			gap: 12,
		},
		playerMessageContent: {
			flexDirection: 'row-reverse',
		},
		dmMessageContent: {
			flexDirection: 'row',
		},
		speakerAvatar: {
			width: 36,
			height: 36,
			borderRadius: 18,
			borderWidth: 2,
			borderColor: colors.tint,
		},
		messageBubble: {
			padding: 12,
			borderRadius: 16,
			minWidth: 100,
		},
		playerBubble: {
			backgroundColor: colors.tint,
			borderBottomRightRadius: 4,
		},
		dmBubble: {
			backgroundColor: colors.backgroundSecondary,
			borderBottomLeftRadius: 4,
		},
		messageHeader: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			marginBottom: 4,
		},
		speakerName: {
			fontSize: 12,
			fontWeight: 'bold',
			flex: 1,
		},
		playerSpeakerName: {
			color: '#FFFFFF',
		},
		dmSpeakerName: {
			color: colors.text,
		},
		timestamp: {
			color: colors.textSecondary,
			fontSize: 10,
			opacity: 0.7,
		},
		messageText: {
			fontSize: 14,
			lineHeight: 18,
		},
		playerMessageText: {
			color: '#FFFFFF',
		},
		dmMessageText: {
			color: colors.text,
		},
		loadingContainer: {
			alignItems: 'center',
			padding: 16,
		},
		loadingText: {
			color: colors.textSecondary,
			fontSize: 14,
			fontStyle: 'italic',
		},
		suggestionsContainer: {
			paddingHorizontal: 16,
			paddingVertical: 8,
			borderTopWidth: 1,
			borderTopColor: colors.tint + '20',
		},
		suggestionButton: {
			backgroundColor: colors.tint + '20',
			borderRadius: 20,
			paddingHorizontal: 16,
			paddingVertical: 8,
			marginRight: 8,
		},
		suggestionText: {
			color: colors.tint,
			fontSize: 12,
			fontWeight: '600',
		},
		voiceTranscriptContainer: {
			margin: 16,
			padding: 12,
			backgroundColor: colors.backgroundSecondary,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: colors.tint + '40',
		},
		voiceTranscriptText: {
			color: colors.text,
			fontSize: 14,
			fontStyle: 'italic',
			textAlign: 'center',
		},
		inputContainer: {
			flexDirection: 'row',
			padding: 16,
			gap: 12,
			borderTopWidth: 1,
			borderTopColor: colors.tint + '20',
			backgroundColor: colors.backgroundSecondary,
		},
		textInput: {
			flex: 1,
			backgroundColor: colors.background,
			borderRadius: 20,
			paddingHorizontal: 16,
			paddingVertical: 12,
			color: colors.text,
			fontSize: 14,
			maxHeight: 100,
			borderWidth: 1,
			borderColor: colors.tint + '40',
		},
		inputActions: {
			flexDirection: 'row',
			gap: 8,
		},
		voiceButtonContainer: {
			alignItems: 'center',
			justifyContent: 'center',
		},
		voiceButton: {
			width: 44,
			height: 44,
			borderRadius: 22,
			alignItems: 'center',
			justifyContent: 'center',
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.2,
			shadowRadius: 4,
			elevation: 4,
		},
		sendButton: {
			width: 44,
			height: 44,
			borderRadius: 22,
			alignItems: 'center',
			justifyContent: 'center',
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.2,
			shadowRadius: 4,
			elevation: 4,
		},
		dmTurnIndicator: {
			padding: 16,
			backgroundColor: colors.backgroundSecondary,
			borderTopWidth: 1,
			borderTopColor: colors.tint + '20',
			alignItems: 'center',
		},
		dmTurnText: {
			color: colors.textSecondary,
			fontSize: 14,
			fontStyle: 'italic',
		},
	});
};