import React, { useState } from 'react';
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
import { Character } from '@/types/character';
import { MultiplayerGameState } from '@/types/multiplayer-game';

interface DMControlsPanelProps {
	gameState: MultiplayerGameState;
	onDMAction: (type: string, data: any) => void;
	onAIRequest?: (prompt: string) => Promise<string>;
	onDamage?: (characterId: string, amount: number) => void;
	onHeal?: (characterId: string, amount: number) => void;
}

export const DMControlsPanel: React.FC<DMControlsPanelProps> = ({
	gameState,
	onDMAction,
	onAIRequest,
	onDamage,
	onHeal,
}) => {
	const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
	const [aiPrompt, setAiPrompt] = useState('');
	const [aiResponse, setAiResponse] = useState<string | null>(null);
	const [aiLoading, setAiLoading] = useState(false);
	const [damageAmount, setDamageAmount] = useState('');
	const [healAmount, setHealAmount] = useState('');
	const { isMobile } = useScreenSize();

	const selectedCharacter = selectedCharacterId
		? gameState.characters.find(c => c.id === selectedCharacterId)
		: null;

	const handleNarrate = () => {
		if (aiPrompt.trim()) {
			onDMAction('narrate', { content: aiPrompt });
			setAiPrompt('');
		}
	};

	const handleAIRequest = async () => {
		if (!onAIRequest || !aiPrompt.trim()) return;

		setAiLoading(true);
		try {
			const response = await onAIRequest(aiPrompt);
			setAiResponse(response);
		} catch (error) {
			console.error('AI request failed:', error);
			setAiResponse('Failed to get AI response');
		} finally {
			setAiLoading(false);
		}
	};

	const handleUpdateCharacter = (updates: Partial<Character>) => {
		if (!selectedCharacterId) return;
		onDMAction('update_character', {
			characterId: selectedCharacterId,
			updates,
		});
	};

	return (
		<ThemedView style={styles.container}>
			<ThemedText type="subtitle" style={styles.title}>
				DM Controls
			</ThemedText>

			<ScrollView style={styles.scrollView} showsVerticalScrollIndicator={true}>
				{/* Character Selection */}
				<View style={styles.section}>
					<ThemedText style={styles.sectionTitle}>Select Character</ThemedText>
					{gameState.characters.map((char) => (
						<TouchableOpacity
							key={char.id}
							style={[
								styles.characterButton,
								selectedCharacterId === char.id && styles.characterButtonSelected,
							]}
							onPress={() => setSelectedCharacterId(char.id)}
						>
							<ThemedText style={styles.characterButtonText}>
								{char.name} ({char.race} {char.class})
							</ThemedText>
						</TouchableOpacity>
					))}
				</View>

				{/* Character Stats Editor */}
				{selectedCharacter && (
					<View style={styles.section}>
						<ThemedText style={styles.sectionTitle}>
							Edit: {selectedCharacter.name}
						</ThemedText>
						<View style={styles.statRow}>
							<ThemedText style={styles.statLabel}>Health:</ThemedText>
							<TextInput
								style={styles.statInput}
								value={selectedCharacter.health.toString()}
								onChangeText={(text) => {
									const value = parseInt(text, 10);
									if (!isNaN(value)) {
										handleUpdateCharacter({ health: value });
									}
								}}
								keyboardType="numeric"
							/>
							<ThemedText style={styles.statLabel}>/</ThemedText>
							<TextInput
								style={styles.statInput}
								value={selectedCharacter.maxHealth.toString()}
								onChangeText={(text) => {
									const value = parseInt(text, 10);
									if (!isNaN(value)) {
										handleUpdateCharacter({ maxHealth: value });
									}
								}}
								keyboardType="numeric"
							/>
						</View>
						<View style={styles.statRow}>
							<ThemedText style={styles.statLabel}>Action Points:</ThemedText>
							<TextInput
								style={styles.statInput}
								value={selectedCharacter.actionPoints.toString()}
								onChangeText={(text) => {
									const value = parseInt(text, 10);
									if (!isNaN(value)) {
										handleUpdateCharacter({ actionPoints: value });
									}
								}}
								keyboardType="numeric"
							/>
						</View>
						{(onDamage || onHeal) && (
							<View style={styles.damageHealSection}>
								<ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
								<View style={styles.damageHealRow}>
									{onDamage && (
										<View style={styles.damageHealInput}>
											<TextInput
												style={styles.amountInput}
												value={damageAmount}
												onChangeText={setDamageAmount}
												placeholder="Damage"
												placeholderTextColor="#9B8B7A"
												keyboardType="numeric"
											/>
											<TouchableOpacity
												style={[styles.damageHealButton, styles.damageButton]}
												onPress={() => {
													const amount = parseInt(damageAmount, 10);
													if (!isNaN(amount) && amount > 0 && selectedCharacterId) {
														onDamage(selectedCharacterId, amount);
														setDamageAmount('');
													}
												}}
												disabled={!damageAmount || isNaN(parseInt(damageAmount, 10)) || !selectedCharacterId}
											>
												<ThemedText style={styles.damageHealButtonText}>Deal Damage</ThemedText>
											</TouchableOpacity>
										</View>
									)}
									{onHeal && (
										<View style={styles.damageHealInput}>
											<TextInput
												style={styles.amountInput}
												value={healAmount}
												onChangeText={setHealAmount}
												placeholder="Heal"
												placeholderTextColor="#9B8B7A"
												keyboardType="numeric"
											/>
											<TouchableOpacity
												style={[styles.damageHealButton, styles.healButton]}
												onPress={() => {
													const amount = parseInt(healAmount, 10);
													if (!isNaN(amount) && amount > 0 && selectedCharacterId) {
														onHeal(selectedCharacterId, amount);
														setHealAmount('');
													}
												}}
												disabled={!healAmount || isNaN(parseInt(healAmount, 10)) || !selectedCharacterId}
											>
												<ThemedText style={styles.damageHealButtonText}>Heal</ThemedText>
											</TouchableOpacity>
										</View>
									)}
								</View>
							</View>
						)}
					</View>
				)}

				{/* Narration */}
				<View style={styles.section}>
					<ThemedText style={styles.sectionTitle}>Narrate</ThemedText>
					<TextInput
						style={[styles.textInput, isMobile && styles.textInputMobile]}
						value={aiPrompt}
						onChangeText={setAiPrompt}
						placeholder="Describe what happens..."
						placeholderTextColor="#9B8B7A"
						multiline
					/>
					<TouchableOpacity
						style={[styles.button, !aiPrompt.trim() && styles.buttonDisabled]}
						onPress={handleNarrate}
						disabled={!aiPrompt.trim()}
					>
						<ThemedText style={styles.buttonText}>Send Narration</ThemedText>
					</TouchableOpacity>
				</View>

				{/* AI Assistance */}
				{onAIRequest && (
					<View style={styles.section}>
						<ThemedText style={styles.sectionTitle}>AI Assistance</ThemedText>
						<TextInput
							style={[styles.textInput, isMobile && styles.textInputMobile]}
							value={aiPrompt}
							onChangeText={setAiPrompt}
							placeholder="Ask the AI for help..."
							placeholderTextColor="#9B8B7A"
							multiline
						/>
						<TouchableOpacity
							style={[
								styles.button,
								styles.aiButton,
								(!aiPrompt.trim() || aiLoading) && styles.buttonDisabled,
							]}
							onPress={handleAIRequest}
							disabled={!aiPrompt.trim() || aiLoading}
						>
							<ThemedText style={styles.buttonText}>
								{aiLoading ? 'Thinking...' : 'Ask AI'}
							</ThemedText>
						</TouchableOpacity>
						{aiResponse && (
							<View style={styles.aiResponse}>
								<ThemedText style={styles.aiResponseText}>{aiResponse}</ThemedText>
							</View>
						)}
					</View>
				)}
			</ScrollView>
		</ThemedView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
	},
	title: {
		marginBottom: 16,
		fontSize: 20,
		color: '#3B2F1B',
	},
	scrollView: {
		flex: 1,
	},
	section: {
		marginBottom: 24,
		padding: 16,
		backgroundColor: '#F5E6D3',
		borderRadius: 12,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#3B2F1B',
		marginBottom: 12,
	},
	characterButton: {
		backgroundColor: '#E2D3B3',
		padding: 12,
		borderRadius: 8,
		marginBottom: 8,
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	characterButtonSelected: {
		borderColor: '#8B6914',
		borderWidth: 2,
		backgroundColor: '#C9B037',
	},
	characterButtonText: {
		color: '#3B2F1B',
		fontSize: 14,
	},
	statRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
		gap: 8,
	},
	statLabel: {
		fontSize: 14,
		color: '#3B2F1B',
		fontWeight: 'bold',
	},
	statInput: {
		backgroundColor: '#E2D3B3',
		borderRadius: 8,
		padding: 8,
		width: 60,
		textAlign: 'center',
		color: '#3B2F1B',
		fontSize: 14,
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	textInput: {
		backgroundColor: '#E2D3B3',
		borderRadius: 8,
		padding: 12,
		minHeight: 80,
		color: '#3B2F1B',
		fontSize: 14,
		borderWidth: 1,
		borderColor: '#C9B037',
		marginBottom: 12,
		textAlignVertical: 'top',
	},
	textInputMobile: {
		minHeight: 60,
		fontSize: 14,
	},
	button: {
		backgroundColor: '#C9B037',
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
		alignItems: 'center',
	},
	buttonDisabled: {
		opacity: 0.5,
	},
	aiButton: {
		backgroundColor: '#8B6914',
		marginTop: 8,
	},
	buttonText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 16,
	},
	aiResponse: {
		marginTop: 12,
		padding: 12,
		backgroundColor: '#E2D3B3',
		borderRadius: 8,
		borderLeftWidth: 4,
		borderLeftColor: '#8B6914',
	},
	aiResponseText: {
		color: '#3B2F1B',
		fontSize: 14,
		lineHeight: 20,
	},
	damageHealSection: {
		marginTop: 12,
		padding: 12,
		backgroundColor: '#E2D3B3',
		borderRadius: 8,
	},
	damageHealRow: {
		flexDirection: 'row',
		gap: 8,
	},
	damageHealInput: {
		flex: 1,
		gap: 4,
	},
	amountInput: {
		backgroundColor: '#F5E6D3',
		borderRadius: 6,
		padding: 8,
		borderWidth: 1,
		borderColor: '#C9B037',
		color: '#3B2F1B',
		fontSize: 14,
		textAlign: 'center',
	},
	damageHealButton: {
		padding: 8,
		borderRadius: 6,
		alignItems: 'center',
	},
	damageButton: {
		backgroundColor: '#DC2626',
	},
	healButton: {
		backgroundColor: '#059669',
	},
	damageHealButtonText: {
		color: '#FFFFFF',
		fontWeight: '600',
		fontSize: 12,
	},
});

