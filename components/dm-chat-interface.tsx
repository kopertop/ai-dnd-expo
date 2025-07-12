import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';

import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DMMessage } from '@/services/ai/agents/dungeon-master-agent';
import styles from '@/styles/dm-chat-interface.styles';
import { DnDTheme } from '@/styles/dnd-theme';

interface DMChatInterfaceProps {
	messages: DMMessage[];
	onSendMessage: (message: string) => Promise<void>;
	isLoading?: boolean;
	placeholder?: string;
	isMobile?: boolean;
}

export const DMChatInterface: React.FC<DMChatInterfaceProps> = ({
	messages,
	onSendMessage,
	isLoading = false,
	placeholder = 'What do you do?',
	isMobile = false,
}) => {
	const [inputText, setInputText] = useState('');
	const [isExpanded, setIsExpanded] = useState(false);
	const scrollViewRef = useRef<ScrollView>(null);
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme ?? 'light'];

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
			style={[
				styles.container,
				{ opacity: isExpanded ? 1 : 0.7 },
			]}
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
		>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => setIsExpanded(!isExpanded)}
					style={styles.headerButton}
				>
					<Feather name="message-square" size={20} color={DnDTheme.textDark} />
					<Text style={styles.headerTitle}>Dungeon Master</Text>
					<Feather
						name={isMobile ? (isExpanded ? 'chevron-up' : 'chevron-down') : (isExpanded ? 'chevron-down' : 'chevron-up')}
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
								color={DnDTheme.textLight}
							/>
						</TouchableOpacity>
					</View>
				</>
			)}
		</KeyboardAvoidingView>
	);
};
