import { Feather } from '@expo/vector-icons';
import React, { useState, useRef, useEffect } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ScrollView,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
} from 'react-native';

import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DMMessage } from '@/services/ai/agents/dungeon-master-agent';

interface DMChatInterfaceProps {
	messages: DMMessage[];
	onSendMessage: (message: string) => Promise<void>;
	isLoading?: boolean;
	placeholder?: string;
}

export const DMChatInterface: React.FC<DMChatInterfaceProps> = ({
	messages,
	onSendMessage,
	isLoading = false,
	placeholder = 'What do you do?',
}) => {
	const [inputText, setInputText] = useState('');
	const [isExpanded, setIsExpanded] = useState(false);
	const scrollViewRef = useRef<ScrollView>(null);
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme ?? 'light'];

	const styles = createStyles(colors);

	// Scroll to bottom when new messages arrive
	useEffect(() => {
		if (scrollViewRef.current && messages.length > 0) {
			scrollViewRef.current.scrollToEnd({ animated: true });
		}
	}, [messages]);

	const handleSendMessage = async () => {
		if (inputText.trim() && !isLoading) {
			const message = inputText.trim();
			setInputText('');
			await onSendMessage(message);
		}
	};

	const renderMessage = (message: DMMessage, index: number) => {
		const isPlayer = message.type === 'system' && message.content.startsWith('Player:');
		const isSystem = message.type === 'system';
		
		return (
			<View key={message.id || index} style={[
				styles.messageContainer,
				isPlayer ? styles.playerMessage : styles.dmMessage,
			]}>
				{/* Message Header */}
				{message.speaker && (
					<Text style={styles.speaker}>{message.speaker}</Text>
				)}
				
				{/* Message Content */}
				<Text style={[
					styles.messageText,
					isSystem && styles.systemText,
				]}>
					{message.content}
				</Text>

				{/* Tool Results */}
				{message.toolCalls && message.toolCalls.length > 0 && (
					<View style={styles.toolResults}>
						{message.toolCalls.map((toolCall, toolIndex) => (
							<View key={toolIndex} style={styles.toolCall}>
								{toolCall.type === 'dice_roll' && toolCall.result && (
									<Text style={styles.diceRoll}>
										🎲 {toolCall.result.notation}: {toolCall.result.breakdown}
									</Text>
								)}
								{toolCall.type === 'character_update' && (
									<Text style={styles.characterUpdate}>
										📊 Character Updated: {toolCall.parameters.target}
									</Text>
								)}
								{toolCall.type === 'rule_lookup' && (
									<Text style={styles.ruleLookup}>
										📚 Rule: {toolCall.parameters.rule}
									</Text>
								)}
							</View>
						))}
					</View>
				)}

				{/* Timestamp */}
				<Text style={styles.timestamp}>
					{new Date(message.timestamp).toLocaleTimeString([], { 
						hour: '2-digit', 
						minute: '2-digit', 
					})}
				</Text>
			</View>
		);
	};

	const quickActions = [
		{ label: 'Attack', action: 'I attack with my weapon' },
		{ label: 'Look Around', action: 'I look around carefully' },
		{ label: 'Cast Spell', action: 'I cast a spell' },
		{ label: 'Check', action: 'I make a perception check' },
	];

	return (
		<KeyboardAvoidingView 
			style={styles.container}
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
		>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity 
					onPress={() => setIsExpanded(!isExpanded)}
					style={styles.headerButton}
				>
					<Feather name="message-square" size={20} color={colors.text} />
					<Text style={styles.headerTitle}>Dungeon Master</Text>
					<Feather 
						name={isExpanded ? 'chevron-down' : 'chevron-up'} 
						size={20} 
						color={colors.text} 
					/>
				</TouchableOpacity>
			</View>

			{/* Chat Content */}
			{isExpanded && (
				<>
					{/* Messages */}
					<ScrollView
						ref={scrollViewRef}
						style={styles.messagesContainer}
						contentContainerStyle={styles.messagesContent}
						showsVerticalScrollIndicator={false}
					>
						{messages.length === 0 ? (
							<View style={styles.emptyState}>
								<Text style={styles.emptyText}>
									Welcome, adventurer! What would you like to do?
								</Text>
							</View>
						) : (
							messages.map(renderMessage)
						)}
						
						{/* Loading indicator */}
						{isLoading && (
							<View style={styles.loadingContainer}>
								<ActivityIndicator size="small" color={colors.tint} />
								<Text style={styles.loadingText}>The DM is thinking...</Text>
							</View>
						)}
					</ScrollView>

					{/* Quick Actions */}
					<View style={styles.quickActions}>
						<ScrollView horizontal showsHorizontalScrollIndicator={false}>
							{quickActions.map((action, index) => (
								<TouchableOpacity
									key={index}
									style={styles.quickActionButton}
									onPress={() => setInputText(action.action)}
								>
									<Text style={styles.quickActionText}>{action.label}</Text>
								</TouchableOpacity>
							))}
						</ScrollView>
					</View>

					{/* Input */}
					<View style={styles.inputContainer}>
						<TextInput
							style={styles.textInput}
							value={inputText}
							onChangeText={setInputText}
							placeholder={placeholder}
							placeholderTextColor={colors.text + '80'}
							multiline
							maxLength={500}
							onSubmitEditing={handleSendMessage}
							blurOnSubmit={false}
						/>
						<TouchableOpacity
							style={[
								styles.sendButton,
								(!inputText.trim() || isLoading) && styles.sendButtonDisabled,
							]}
							onPress={handleSendMessage}
							disabled={!inputText.trim() || isLoading}
						>
							<Feather 
								name="send" 
								size={20} 
								color={(!inputText.trim() || isLoading) ? colors.text + '50' : colors.background} 
							/>
						</TouchableOpacity>
					</View>
				</>
			)}
		</KeyboardAvoidingView>
	);
};

const createStyles = (colors: any) => StyleSheet.create({
	container: {
		backgroundColor: colors.background,
		borderTopWidth: 1,
		borderTopColor: colors.text + '20',
	},
	header: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: colors.text + '20',
	},
	headerButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	headerTitle: {
		flex: 1,
		fontSize: 16,
		fontWeight: '600',
		color: colors.text,
	},
	messagesContainer: {
		maxHeight: 300,
		backgroundColor: colors.background,
	},
	messagesContent: {
		padding: 16,
		gap: 12,
	},
	emptyState: {
		alignItems: 'center',
		padding: 20,
	},
	emptyText: {
		fontSize: 16,
		color: colors.text + 'CC',
		textAlign: 'center',
		fontStyle: 'italic',
	},
	messageContainer: {
		padding: 12,
		borderRadius: 12,
		maxWidth: '85%',
	},
	playerMessage: {
		alignSelf: 'flex-end',
		backgroundColor: colors.tint + '20',
		borderBottomRightRadius: 4,
	},
	dmMessage: {
		alignSelf: 'flex-start',
		backgroundColor: colors.text + '10',
		borderBottomLeftRadius: 4,
	},
	speaker: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.tint,
		marginBottom: 4,
	},
	messageText: {
		fontSize: 15,
		lineHeight: 20,
		color: colors.text,
	},
	systemText: {
		fontStyle: 'italic',
		color: colors.text + 'CC',
	},
	toolResults: {
		marginTop: 8,
		gap: 4,
	},
	toolCall: {
		padding: 6,
		backgroundColor: colors.background,
		borderRadius: 6,
		borderLeftWidth: 3,
		borderLeftColor: colors.tint,
	},
	diceRoll: {
		fontSize: 13,
		color: colors.text,
		fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
	},
	characterUpdate: {
		fontSize: 13,
		color: colors.tint,
	},
	ruleLookup: {
		fontSize: 13,
		color: colors.text + 'CC',
	},
	timestamp: {
		fontSize: 11,
		color: colors.text + '80',
		marginTop: 4,
		textAlign: 'right',
	},
	loadingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		padding: 12,
	},
	loadingText: {
		fontSize: 14,
		color: colors.text + 'CC',
		fontStyle: 'italic',
	},
	quickActions: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: colors.text + '20',
	},
	quickActionButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		marginRight: 8,
		backgroundColor: colors.tint + '20',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: colors.tint + '40',
	},
	quickActionText: {
		fontSize: 12,
		color: colors.tint,
		fontWeight: '500',
	},
	inputContainer: {
		flexDirection: 'row',
		padding: 16,
		gap: 12,
		alignItems: 'flex-end',
	},
	textInput: {
		flex: 1,
		borderWidth: 1,
		borderColor: colors.text + '30',
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 16,
		color: colors.text,
		backgroundColor: colors.background,
		maxHeight: 100,
	},
	sendButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: colors.tint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	sendButtonDisabled: {
		backgroundColor: colors.text + '20',
	},
});