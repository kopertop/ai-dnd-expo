import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Modal,
	Platform,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';

import { TavernCompanionRecruitment } from '@/components/tavern-companion-recruitment';
import { VoiceChatButton } from '@/components/voice-chat-button';
import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useInputMode } from '@/hooks/use-input-mode';
import { useSimpleCompanions } from '@/hooks/use-simple-companions';
import { DMMessage } from '@/services/ai/agents/dungeon-master-agent';
import styles from '@/styles/dm-chat-interface.styles';
import { DnDTheme } from '@/styles/dnd-theme';
import type { Companion } from '@/types/companion';

interface DMChatInterfaceProps {
	messages: DMMessage[];
	onSendMessage: (message: string) => Promise<void>;
	isLoading?: boolean;
	placeholder?: string;
	isMobile?: boolean;
	currentLocation?: string; // For location-aware actions
}

export const DMChatInterface: React.FC<DMChatInterfaceProps> = ({
	messages,
	onSendMessage,
	isLoading = false,
	placeholder = 'What do you do?',
	isMobile = false,
	currentLocation = '',
}) => {
	const [inputText, setInputText] = useState('');
	const [isExpanded, setIsExpanded] = useState(false);
	const [showTavernRecruitment, setShowTavernRecruitment] = useState(false);
	const scrollViewRef = useRef<ScrollView>(null);
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme ?? 'light'];
	const companions = useSimpleCompanions();
	const { inputMode, setInputMode } = useInputMode();
	const [settingsVisible, setSettingsVisible] = useState(false);
	const [liveTranscript, setLiveTranscript] = useState('');
	const [isListening, setIsListening] = useState(false);

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
			// Command parsing for input mode switching
			if (message.toLowerCase() === 'switch to text') {
				setInputMode('text');
				return;
			}
			if (message.toLowerCase() === 'switch to voice') {
				setInputMode('voice');
				return;
			}
			await onSendMessage(message);
		}
	};

	const handleCompanionRecruited = async (companion: Companion) => {
		// Send a message to the DM about the new companion
		const recruitmentMessage = `I have recruited ${companion.name}, a ${companion.race} ${companion.class}, to join my party.`;
		await onSendMessage(recruitmentMessage);
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

	// Generate quick actions based on context and location
	const getQuickActions = () => {
		const baseActions: Array<{ label: string; action: string; isSpecial?: boolean }> = [
			{ label: 'Attack', action: 'I attack with my weapon' },
			{ label: 'Look Around', action: 'I look around carefully' },
			{ label: 'Cast Spell', action: 'I cast a spell' },
			{ label: 'Check', action: 'I make a perception check' },
		];

		// Add location-specific actions
		const isTavernLocation = currentLocation.toLowerCase().includes('tavern') ||
			currentLocation.toLowerCase().includes('inn') ||
			currentLocation.toLowerCase().includes('bar');

		if (isTavernLocation) {
			return [
				...baseActions,
				{
					label: 'Find Companions',
					action: 'tavern-recruitment',
					isSpecial: true,
				},
				{ label: 'Order Drink', action: 'I order a drink from the barkeep' },
				{ label: 'Listen for Rumors', action: 'I listen for interesting rumors and gossip' },
			];
		}

		return baseActions;
	};

	const quickActions = getQuickActions();

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
				<TouchableOpacity onPress={() => setSettingsVisible(true)} style={{ marginLeft: 12 }}>
					<Feather name="settings" size={20} color={DnDTheme.textDark} />
				</TouchableOpacity>
			</View>

			{/* Settings Modal (custom) */}
			<Modal
				visible={settingsVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setSettingsVisible(false)}
			>
				<View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' }}>
					<View style={{ backgroundColor: '#F9F6EF', borderRadius: 16, padding: 28, minWidth: 300, maxWidth: 400, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 }}>
						<Text style={{ fontSize: 20, fontWeight: 'bold', color: '#8B2323', marginBottom: 12, textAlign: 'center' }}>Input Mode</Text>
						<Text style={{ fontSize: 16, color: '#3B2F1B', marginBottom: 24, textAlign: 'center' }}>Choose your preferred input mode for the Dungeon Master.</Text>
						<TouchableOpacity onPress={() => { setInputMode('text'); setSettingsVisible(false); }} style={{ padding: 12, backgroundColor: inputMode === 'text' ? colors.primary : colors.background, borderRadius: 8, marginBottom: 8, minWidth: 180, alignItems: 'center' }}>
							<Text style={{ color: inputMode === 'text' ? colors.primaryText : colors.text }}>Text Input</Text>
						</TouchableOpacity>
						<TouchableOpacity onPress={() => { setInputMode('voice'); setSettingsVisible(false); }} style={{ padding: 12, backgroundColor: inputMode === 'voice' ? colors.primary : colors.background, borderRadius: 8, minWidth: 180, alignItems: 'center' }}>
							<Text style={{ color: inputMode === 'voice' ? colors.primaryText : colors.text }}>Voice Input</Text>
						</TouchableOpacity>
						<TouchableOpacity onPress={() => setSettingsVisible(false)} style={{ marginTop: 16, padding: 10, borderRadius: 8, backgroundColor: '#E2D3B3', minWidth: 100, alignItems: 'center' }}>
							<Text style={{ color: '#3B2F1B', fontWeight: 'bold', fontSize: 16 }}>Close</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

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
									style={[
										styles.quickActionButton,
										action.isSpecial && { backgroundColor: colors.primary },
									]}
									onPress={() => {
										if (action.action === 'tavern-recruitment') {
											setShowTavernRecruitment(true);
										} else {
											setInputText(action.action);
										}
									}}
								>
									<Text style={[
										styles.quickActionText,
										action.isSpecial && { color: colors.primaryText },
									]}>
										{action.label}
									</Text>
								</TouchableOpacity>
							))}
						</ScrollView>
					</View>

					{/* Input Area: Toggle between text and voice input */}
					<View style={styles.inputContainer}>
						{inputMode === 'text' ? (
							<>
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
							</>
						) : (
							<VoiceChatButton
								onVoiceInput={onSendMessage}
								isDisabled={isLoading}
								position={isMobile ? 'bottom-right' : 'top-right'}
								onTranscriptChange={(transcript, listening) => {
									setLiveTranscript(transcript);
									setIsListening(listening);
								}}
							/>
						)}
						{/* Toggle icon */}
						<TouchableOpacity
							style={{ marginLeft: 8, alignSelf: 'center' }}
							onPress={() => setInputMode(inputMode === 'text' ? 'voice' : 'text')}
						>
							<Feather name={inputMode === 'text' ? 'mic' : 'message-square'} size={20} color={DnDTheme.textDark} />
						</TouchableOpacity>
					</View>
				</>
			)}

			{/* Tavern Companion Recruitment Modal */}
			<TavernCompanionRecruitment
				visible={showTavernRecruitment}
				onClose={() => setShowTavernRecruitment(false)}
				onCompanionRecruited={handleCompanionRecruited}
				tavernName={currentLocation || 'The Prancing Pony'}
				locationDescription="A cozy tavern filled with the warm glow of firelight and the murmur of conversation."
			/>
		</KeyboardAvoidingView>
	);
};
