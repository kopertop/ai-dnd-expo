/**
 * Transcript Overlay - Minimalist closed caption style chat
 * Shows DM messages as floating transcript bubbles at top center
 */

import React, { useEffect, useRef, useState } from 'react';
import {
	Animated,
	StyleSheet,
	Text,
	View,
	useWindowDimensions,
	Platform,
} from 'react-native';

import { DMMessage } from '@/services/ai/agents/dungeon-master-agent';
import type { Character } from '@/types/character';

interface TranscriptMessage {
	id: string;
	content: string;
	timestamp: number;
	speakerName: string;
}

interface TranscriptOverlayProps {
	playerCharacter: Character | null;
	dmMessages: DMMessage[];
	isLoading?: boolean;
	maxMessages?: number;
}

export const TranscriptOverlay: React.FC<TranscriptOverlayProps> = ({
	playerCharacter,
	dmMessages,
	isLoading = false,
	maxMessages = 3,
}) => {
	const { width: screenWidth } = useWindowDimensions();
	const [messages, setMessages] = useState<TranscriptMessage[]>([]);
	const fadeAnims = useRef<{ [key: string]: Animated.Value }>({});
	const slideAnims = useRef<{ [key: string]: Animated.Value }>({});

	// Convert DM messages to transcript format
	useEffect(() => {
		const transcriptMessages: TranscriptMessage[] = dmMessages
			.slice(-maxMessages) // Show only last few messages
			.map((msg, index) => {
				let content = msg.content;
				let speakerName = 'DM';

				// Check if message starts with a speaker prefix
				const speakerMatch = content.match(/^(player|dm):\s*(.*)/i);
				if (speakerMatch) {
					const [, speaker, messageContent] = speakerMatch;
					speakerName = speaker.toLowerCase() === 'player' 
						? playerCharacter?.name || 'Player' 
						: 'DM';
					content = messageContent;
				} else if (msg.speaker === 'Player') {
					speakerName = playerCharacter?.name || 'Player';
					content = content.replace(/^Player:\s*/, '');
				}

				return {
					id: msg.id || `msg-${index}`,
					content,
					timestamp: msg.timestamp,
					speakerName,
				};
			});

		setMessages(transcriptMessages);
	}, [dmMessages, maxMessages, playerCharacter]);

	// Animate new messages
	useEffect(() => {
		messages.forEach((message) => {
			if (!fadeAnims.current[message.id]) {
				fadeAnims.current[message.id] = new Animated.Value(0);
				slideAnims.current[message.id] = new Animated.Value(-50);

				// Animate in
				Animated.parallel([
					Animated.timing(fadeAnims.current[message.id], {
						toValue: 1,
						duration: 300,
						useNativeDriver: true,
					}),
					Animated.timing(slideAnims.current[message.id], {
						toValue: 0,
						duration: 300,
						useNativeDriver: true,
					}),
				]).start();
			}
		});

		// Clean up old animations
		const currentMessageIds = new Set(messages.map(m => m.id));
		Object.keys(fadeAnims.current).forEach(id => {
			if (!currentMessageIds.has(id)) {
				delete fadeAnims.current[id];
				delete slideAnims.current[id];
			}
		});
	}, [messages]);

	const formatMessageContent = (content: string): string => {
		// Truncate very long messages for transcript display
		if (content.length > 200) {
			return content.substring(0, 197) + '...';
		}
		return content;
	};

	const renderMessage = (message: TranscriptMessage, index: number) => {
		const fadeAnim = fadeAnims.current[message.id];
		const slideAnim = slideAnims.current[message.id];

		if (!fadeAnim || !slideAnim) return null;

		const isDM = message.speakerName === 'DM';
		
		return (
			<Animated.View
				key={message.id}
				style={[
					styles.messageContainer,
					{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						marginBottom: index === messages.length - 1 ? 0 : 8,
					},
				]}
			>
				<View style={[styles.messageBubble, isDM ? styles.dmBubble : styles.playerBubble]}>
					<View style={styles.messageHeader}>
						<Text style={[styles.speakerName, isDM ? styles.dmSpeaker : styles.playerSpeaker]}>
							{message.speakerName}
						</Text>
						<Text style={styles.timestamp}>
							{new Date(message.timestamp).toLocaleTimeString([], {
								hour: '2-digit',
								minute: '2-digit',
							})}
						</Text>
					</View>
					<Text style={styles.messageText}>
						{formatMessageContent(message.content)}
					</Text>
				</View>
			</Animated.View>
		);
	};

	// Don't render if no messages
	if (messages.length === 0 && !isLoading) {
		return null;
	}

	return (
		<View style={styles.containerWrapper}>
			<View style={[styles.container, { width: Math.min(screenWidth - 32, 500) }]}>
				{messages.map(renderMessage)}
				
				{isLoading && (
					<View style={styles.messageContainer}>
						<View style={[styles.messageBubble, styles.dmBubble]}>
							<View style={styles.messageHeader}>
								<Text style={[styles.speakerName, styles.dmSpeaker]}>DM</Text>
								<Text style={styles.timestamp}>
									{new Date().toLocaleTimeString([], {
										hour: '2-digit',
										minute: '2-digit',
									})}
								</Text>
							</View>
							<Text style={[styles.messageText, styles.loadingText]}>
								thinking...
							</Text>
						</View>
					</View>
				)}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	containerWrapper: {
		position: 'absolute',
		top: 60,
		left: 0,
		right: 0,
		zIndex: 1000,
		alignItems: 'center',
		pointerEvents: 'none', // Allow touches to pass through
	},
	container: {
		maxWidth: 500,
		pointerEvents: 'auto', // Re-enable touches for the actual content
	},
	messageContainer: {
		alignItems: 'flex-start',
		marginBottom: 8,
	},
	messageBubble: {
		borderRadius: 12,
		padding: 12,
		maxWidth: '100%',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 4,
	},
	dmBubble: {
		backgroundColor: '#1a1a1a',
		borderWidth: 1,
		borderColor: '#333',
	},
	playerBubble: {
		backgroundColor: '#2c3e50',
		borderWidth: 1,
		borderColor: '#34495e',
	},
	messageHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 4,
	},
	speakerName: {
		fontSize: 11,
		fontWeight: 'bold',
		fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
	},
	dmSpeaker: {
		color: '#ff6b6b',
	},
	playerSpeaker: {
		color: '#4ecdc4',
	},
	timestamp: {
		fontSize: 9,
		color: '#888',
		fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
	},
	messageText: {
		fontSize: 12,
		color: '#ffffff',
		lineHeight: 16,
		fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
	},
	loadingText: {
		fontStyle: 'italic',
		color: '#aaa',
	},
});