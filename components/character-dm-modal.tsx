import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Character } from '@/types/character';
import { MapToken } from '@/types/multiplayer-map';

interface CharacterDMModalProps {
	visible: boolean;
	character: Character | null;
	npcToken: MapToken | null;
	onClose: () => void;
	onDamage?: (entityId: string, amount: number) => void;
	onHeal?: (entityId: string, amount: number) => void;
	onUpdateCharacter?: (characterId: string, updates: Partial<Character>) => void;
}

export const CharacterDMModal: React.FC<CharacterDMModalProps> = ({
	visible,
	character,
	npcToken,
	onClose,
	onDamage,
	onHeal,
	onUpdateCharacter,
}) => {
	const [damageAmount, setDamageAmount] = useState('');
	const [healAmount, setHealAmount] = useState('');

	const entityId = character?.id || npcToken?.id;
	const entityName = character?.name || npcToken?.label || 'Unknown';
	const isNPC = !!npcToken;

	if (!visible || (!character && !npcToken)) {
		return null;
	}

	const handleDamage = () => {
		const amount = parseInt(damageAmount, 10);
		if (!isNaN(amount) && amount > 0 && entityId && onDamage) {
			onDamage(entityId, amount);
			setDamageAmount('');
		}
	};

	const handleHeal = () => {
		const amount = parseInt(healAmount, 10);
		if (!isNaN(amount) && amount > 0 && entityId && onHeal) {
			onHeal(entityId, amount);
			setHealAmount('');
		}
	};

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
				<ThemedView style={styles.modalContainer} onStartShouldSetResponder={() => true}>
					<View style={styles.header}>
						<ThemedText type="subtitle">DM Controls: {entityName}</ThemedText>
						<TouchableOpacity style={styles.closeButton} onPress={onClose}>
							<ThemedText style={styles.closeButtonText}>✕</ThemedText>
						</TouchableOpacity>
					</View>

					<ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
						{character && (
							<>
								<View style={styles.section}>
									<ThemedText style={styles.sectionTitle}>Character Stats</ThemedText>
									<View style={styles.statRow}>
										<ThemedText style={styles.statLabel}>Health:</ThemedText>
										<TextInput
											style={styles.statInput}
											value={character.health.toString()}
											onChangeText={(text) => {
												const value = parseInt(text, 10);
												if (!isNaN(value) && onUpdateCharacter) {
													onUpdateCharacter(character.id, { health: value });
												}
											}}
											keyboardType="numeric"
										/>
										<ThemedText style={styles.statLabel}>/</ThemedText>
										<TextInput
											style={styles.statInput}
											value={character.maxHealth.toString()}
											onChangeText={(text) => {
												const value = parseInt(text, 10);
												if (!isNaN(value) && onUpdateCharacter) {
													onUpdateCharacter(character.id, { maxHealth: value });
												}
											}}
											keyboardType="numeric"
										/>
									</View>
									<View style={styles.statRow}>
										<ThemedText style={styles.statLabel}>Action Points:</ThemedText>
										<TextInput
											style={styles.statInput}
											value={character.actionPoints.toString()}
											onChangeText={(text) => {
												const value = parseInt(text, 10);
												if (!isNaN(value) && onUpdateCharacter) {
													onUpdateCharacter(character.id, { actionPoints: value });
												}
											}}
											keyboardType="numeric"
										/>
									</View>
								</View>
							</>
						)}

						{(onDamage || onHeal) && (
							<View style={styles.section}>
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
												onPress={handleDamage}
												disabled={!damageAmount || isNaN(parseInt(damageAmount, 10)) || !entityId}
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
												onPress={handleHeal}
												disabled={!healAmount || isNaN(parseInt(healAmount, 10)) || !entityId}
											>
												<ThemedText style={styles.damageHealButtonText}>Heal</ThemedText>
											</TouchableOpacity>
										</View>
									)}
								</View>
							</View>
						)}
					</ScrollView>
				</ThemedView>
			</TouchableOpacity>
		</Modal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContainer: {
		backgroundColor: '#FFF9EF',
		borderRadius: 12,
		padding: 20,
		minWidth: 400,
		maxWidth: 500,
		maxHeight: '80%',
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	closeButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#D4BC8B',
		justifyContent: 'center',
		alignItems: 'center',
	},
	closeButtonText: {
		fontSize: 18,
		color: '#3B2F1B',
		fontWeight: 'bold',
	},
	content: {
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

