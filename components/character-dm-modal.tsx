import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Character } from '@/types/character';
import { MapToken } from '@/types/multiplayer-map';
import { STAT_KEYS } from '@/types/stats';

interface CharacterDMModalProps {
	visible: boolean;
	character: Character | null;
	npcToken: MapToken | null;
	onClose: () => void;
	onDamage?: (entityId: string, amount: number) => void;
	onHeal?: (entityId: string, amount: number) => void;
	onUpdateCharacter?: (characterId: string, updates: Partial<Character>) => void;
	initiativeOrder?: Array<{ entityId: string; initiative: number; type: 'player' | 'npc' }>;
	npcStats?: { STR: number; DEX: number; CON: number; INT: number; WIS: number; CHA: number };
}

export const CharacterDMModal: React.FC<CharacterDMModalProps> = ({
	visible,
	character,
	npcToken,
	onClose,
	onDamage,
	onHeal,
	onUpdateCharacter,
	initiativeOrder,
	npcStats,
}) => {
	const [damageAmount, setDamageAmount] = useState('');
	const [healAmount, setHealAmount] = useState('');

	const entityId = character?.id || npcToken?.id;
	const entityName = character?.name || npcToken?.label || 'Unknown';
	const isNPC = !!npcToken;
	
	// Get initiative value from initiative order
	const initiativeEntry = entityId ? initiativeOrder?.find(entry => entry.entityId === entityId) : null;
	const initiativeValue = initiativeEntry?.initiative;
	
	// Get stats - from character or NPC
	const stats = character?.stats || npcStats || { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };

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
						{/* Basic Information */}
						<View style={styles.section}>
							<ThemedText style={styles.sectionTitle}>Basic Information</ThemedText>
							{character && (
								<>
									<View style={styles.infoRow}>
										<ThemedText style={styles.infoLabel}>Name:</ThemedText>
										<ThemedText style={styles.infoValue}>{character.name}</ThemedText>
									</View>
									<View style={styles.infoRow}>
										<ThemedText style={styles.infoLabel}>Level:</ThemedText>
										<ThemedText style={styles.infoValue}>{character.level}</ThemedText>
									</View>
									<View style={styles.infoRow}>
										<ThemedText style={styles.infoLabel}>Race:</ThemedText>
										<ThemedText style={styles.infoValue}>{character.race}</ThemedText>
									</View>
									<View style={styles.infoRow}>
										<ThemedText style={styles.infoLabel}>Class:</ThemedText>
										<ThemedText style={styles.infoValue}>{character.class}</ThemedText>
									</View>
									{character.trait && (
										<View style={styles.infoRow}>
											<ThemedText style={styles.infoLabel}>Trait:</ThemedText>
											<ThemedText style={styles.infoValue}>{character.trait}</ThemedText>
										</View>
									)}
									{character.description && (
										<View style={styles.infoRow}>
											<ThemedText style={styles.infoLabel}>Description:</ThemedText>
											<ThemedText style={styles.infoValue}>{character.description}</ThemedText>
										</View>
									)}
								</>
							)}
							{npcToken && (
								<>
									<View style={styles.infoRow}>
										<ThemedText style={styles.infoLabel}>Name:</ThemedText>
										<ThemedText style={styles.infoValue}>{npcToken.label}</ThemedText>
									</View>
									<View style={styles.infoRow}>
										<ThemedText style={styles.infoLabel}>Type:</ThemedText>
										<ThemedText style={styles.infoValue}>NPC</ThemedText>
									</View>
								</>
							)}
							{initiativeValue !== undefined && (
								<View style={styles.infoRow}>
									<ThemedText style={styles.infoLabel}>Initiative:</ThemedText>
									<ThemedText style={styles.infoValue}>{initiativeValue}</ThemedText>
								</View>
							)}
						</View>

						{/* Ability Scores */}
						<View style={styles.section}>
							<ThemedText style={styles.sectionTitle}>Ability Scores</ThemedText>
							<View style={styles.statsGrid}>
								{STAT_KEYS.map(statKey => (
									<View key={statKey} style={styles.statBox}>
										<ThemedText style={styles.statBoxLabel}>{statKey}</ThemedText>
										<ThemedText style={styles.statBoxValue}>{stats[statKey]}</ThemedText>
										<ThemedText style={styles.statBoxModifier}>
											({Math.floor((stats[statKey] - 10) / 2) >= 0 ? '+' : ''}
											{Math.floor((stats[statKey] - 10) / 2)})
										</ThemedText>
									</View>
								))}
							</View>
						</View>

						{/* Health & Action Points */}
						<View style={styles.section}>
							<ThemedText style={styles.sectionTitle}>Health & Resources</ThemedText>
							{character && (
								<>
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
										<ThemedText style={styles.statLabel}>/</ThemedText>
										<TextInput
											style={styles.statInput}
											value={character.maxActionPoints.toString()}
											onChangeText={(text) => {
												const value = parseInt(text, 10);
												if (!isNaN(value) && onUpdateCharacter) {
													onUpdateCharacter(character.id, { maxActionPoints: value });
												}
											}}
											keyboardType="numeric"
										/>
									</View>
								</>
							)}
							{npcToken && (
								<>
									<View style={styles.statRow}>
										<ThemedText style={styles.statLabel}>Health:</ThemedText>
										<ThemedText style={styles.statValue}>
											{npcToken.hitPoints ?? 10} / {npcToken.maxHitPoints ?? 10}
										</ThemedText>
									</View>
									<View style={styles.statRow}>
										<ThemedText style={styles.statLabel}>Action Points:</ThemedText>
										<ThemedText style={styles.statValue}>
											{(npcToken.metadata?.actionPoints as number) ?? 3} / {(npcToken.metadata?.maxActionPoints as number) ?? 3}
										</ThemedText>
									</View>
								</>
							)}
						</View>

						{/* Skills */}
						{character && character.skills && character.skills.length > 0 && (
							<View style={styles.section}>
								<ThemedText style={styles.sectionTitle}>Skills</ThemedText>
								<View style={styles.skillsContainer}>
									{character.skills.map((skill, index) => (
										<View key={index} style={styles.skillTag}>
											<ThemedText style={styles.skillText}>{skill}</ThemedText>
										</View>
									))}
								</View>
							</View>
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
	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
		paddingVertical: 4,
	},
	infoLabel: {
		fontSize: 14,
		color: '#6B5B3D',
		fontWeight: '600',
	},
	infoValue: {
		fontSize: 14,
		color: '#3B2F1B',
		flex: 1,
		textAlign: 'right',
	},
	statsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	statBox: {
		width: '30%',
		backgroundColor: '#E2D3B3',
		borderRadius: 8,
		padding: 8,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	statBoxLabel: {
		fontSize: 12,
		color: '#6B5B3D',
		fontWeight: '600',
		marginBottom: 4,
	},
	statBoxValue: {
		fontSize: 18,
		color: '#3B2F1B',
		fontWeight: 'bold',
	},
	statBoxModifier: {
		fontSize: 11,
		color: '#6B5B3D',
		marginTop: 2,
	},
	statValue: {
		fontSize: 14,
		color: '#3B2F1B',
		fontWeight: '600',
	},
	skillsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
	},
	skillTag: {
		backgroundColor: '#E2D3B3',
		borderRadius: 6,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	skillText: {
		fontSize: 12,
		color: '#3B2F1B',
	},
});

