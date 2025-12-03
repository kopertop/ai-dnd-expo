import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ExpoIconPicker } from './expo-icon-picker';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { STATUS_EFFECT_LIST, type StatusEffect } from '@/constants/status-effects';
import { useUpdateNpcInstance } from '@/hooks/api/use-npc-queries';
import { Character } from '@/types/character';
import { MapToken } from '@/types/multiplayer-map';
import { STAT_KEYS } from '@/types/stats';
import { calculateAC } from '@/utils/combat-utils';

interface CharacterDMModalProps {
	gameId: string;
	visible: boolean;
	character: Character | null;
	npcToken: MapToken | null;
	onClose: () => void;
	onDamage?: (entityId: string, amount: number) => void;
	onHeal?: (entityId: string, amount: number) => void;
	onUpdateCharacter?: (characterId: string, updates: Partial<Character>) => void;
	onDeleteToken?: () => void;
	initiativeOrder?: Array<{ entityId: string; initiative: number; type: 'player' | 'npc' }>;
	npcStats?: { STR: number; DEX: number; CON: number; INT: number; WIS: number; CHA: number };
}

export const CharacterDMModal: React.FC<CharacterDMModalProps> = ({
	gameId,
	visible,
	character,
	npcToken,
	onClose,
	onDamage,
	onHeal,
	onUpdateCharacter,
	onDeleteToken,
	initiativeOrder,
	npcStats,
}) => {
	const updateNpcInstanceMutation = useUpdateNpcInstance(gameId);
	const [actionAmount, setActionAmount] = useState('');
	const [isProcessing, setIsProcessing] = useState(false);
	const [effectType, setEffectType] = useState<'damage' | 'heal' | null>(null);
	const currentIcon = character?.icon || (npcToken?.metadata?.icon as string) || '';

	// Get current status effects from character or NPC
	const currentStatusEffects = character?.statusEffects || npcToken?.statusEffects || [];

	// Animation values for visual effects
	const shimmerAnim = useRef(new Animated.Value(0)).current;
	const pulseAnim = useRef(new Animated.Value(1)).current;
	const colorAnim = useRef(new Animated.Value(0)).current;

	const entityId = character?.id || npcToken?.entityId || npcToken?.id;
	const entityName = character?.name || npcToken?.label || 'Unknown';

	// Get initiative value from initiative order
	const initiativeEntry = entityId ? initiativeOrder?.find(entry => entry.entityId === entityId) : null;
	const initiativeValue = initiativeEntry?.initiative;

	// Get stats - from character or NPC
	const stats = character?.stats || npcStats || { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
	const npcMetadata = npcToken?.metadata as { armorClass?: number } | undefined;
	const armorClass = character ? calculateAC(character) : npcMetadata?.armorClass;

	// Trigger visual effect animation
	useEffect(() => {
		if (effectType) {
			// Reset animations
			shimmerAnim.setValue(0);
			pulseAnim.setValue(1);
			colorAnim.setValue(0);

			// Shimmer effect
			Animated.sequence([
				Animated.timing(shimmerAnim, {
					toValue: 1,
					duration: 600,
					useNativeDriver: true,
				}),
				Animated.timing(shimmerAnim, {
					toValue: 0,
					duration: 300,
					useNativeDriver: true,
				}),
			]).start();

			// Pulse effect
			Animated.sequence([
				Animated.timing(pulseAnim, {
					toValue: 1.15,
					duration: 200,
					useNativeDriver: true,
				}),
				Animated.timing(pulseAnim, {
					toValue: 1,
					duration: 400,
					useNativeDriver: true,
				}),
			]).start();

			// Color flash effect
			Animated.sequence([
				Animated.timing(colorAnim, {
					toValue: 1,
					duration: 200,
					useNativeDriver: false,
				}),
				Animated.timing(colorAnim, {
					toValue: 0,
					duration: 400,
					useNativeDriver: false,
				}),
			]).start(() => {
				setEffectType(null);
			});
		}
	}, [effectType, shimmerAnim, pulseAnim, colorAnim]);

	// Reset state when modal closes
	useEffect(() => {
		if (!visible) {
			setActionAmount('');
			setIsProcessing(false);
			setEffectType(null);
		}
	}, [visible]);

	if (!visible || (!character && !npcToken)) {
		return null;
	}

	// Debug: Log character health values
	if (character) {
		console.log('[Modal] Character health values:', {
			characterId: character.id,
			health: character.health,
			maxHealth: character.maxHealth,
			healthType: typeof character.health,
			character: character,
		});
	}

	const handleDamage = async () => {
		const amount = parseInt(actionAmount, 10);
		if (!isNaN(amount) && amount > 0 && entityId && onDamage) {
			console.log('[Modal] Handling damage:', { entityId, amount, characterId: character?.id, npcTokenId: npcToken?.id, npcEntityId: npcToken?.entityId });
			setIsProcessing(true);
			setEffectType('damage');
			try {
				await onDamage(entityId, amount);
				setActionAmount('');
				// Wait a bit longer to ensure the UI updates with the new health value
				// The optimistic update should make the character prop update immediately
				setTimeout(() => {
					onClose();
				}, 800);
			} catch (error) {
				console.error('[Modal] Failed to deal damage:', error);
				setIsProcessing(false);
				setEffectType(null);
				// Don't close modal on error
			}
		} else {
			console.warn('[Modal] Invalid damage request:', { amount, entityId, hasOnDamage: !!onDamage });
		}
	};

	const handleHeal = async () => {
		const amount = parseInt(actionAmount, 10);
		if (!isNaN(amount) && amount > 0 && entityId && onHeal) {
			console.log('[Modal] Handling heal:', { entityId, amount, characterId: character?.id, npcTokenId: npcToken?.id, npcEntityId: npcToken?.entityId });
			setIsProcessing(true);
			setEffectType('heal');
			try {
				await onHeal(entityId, amount);
				setActionAmount('');
				// Wait a bit longer to ensure the UI updates with the new health value
				// The optimistic update should make the character prop update immediately
				setTimeout(() => {
					onClose();
				}, 800);
			} catch (error) {
				console.error('[Modal] Failed to heal:', error);
				setIsProcessing(false);
				setEffectType(null);
				// Don't close modal on error
			}
		} else {
			console.warn('[Modal] Invalid heal request:', { amount, entityId, hasOnHeal: !!onHeal });
		}
	};

	const handleToggleStatusEffect = (effectId: StatusEffect) => {
		const hasEffect = currentStatusEffects.includes(effectId);
		const newEffects = hasEffect
			? currentStatusEffects.filter(e => e !== effectId)
			: [...currentStatusEffects, effectId];

		console.log('[Status Effects] Toggling:', {
			effectId,
			hasEffect,
			currentEffects: currentStatusEffects,
			newEffects,
			characterId: character?.id,
			npcTokenId: npcToken?.id,
			hasOnUpdateCharacter: !!onUpdateCharacter,
		});

		if (character && onUpdateCharacter) {
			console.log('[Status Effects] Updating character:', character.id, { statusEffects: newEffects });
			onUpdateCharacter(character.id, { statusEffects: newEffects });
		} else if (npcToken) {
			console.log('[Status Effects] Updating NPC:', npcToken.id, { statusEffects: newEffects });
			updateNpcInstanceMutation.mutateAsync({
				path: `/games/${gameId}/npcs/${npcToken.id}`,
				body: JSON.stringify({
					statusEffects: newEffects,
				}),
			}).then(() => {
				// Wait a bit longer to ensure the UI updates with the new health value
				// The optimistic update should make the character prop update immediately
				setTimeout(() => {
					onClose();
				}, 800);

			});
		}
	};

	const handleIconChange = (nextIcon: string) => {
		if (character && onUpdateCharacter) {
			onUpdateCharacter(character.id, { icon: nextIcon });
		} else if (npcToken) {
			updateNpcInstanceMutation.mutateAsync({
				path: `/games/${gameId}/npcs/${npcToken.id}`,
				body: JSON.stringify({
					metadata: {
						...(npcToken.metadata || {}),
						icon: nextIcon,
					},
				}),
			});
		}
	};

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<View style={styles.overlay}>
				<ThemedView style={styles.modalContainer}>
					<View style={styles.header}>
						<ThemedText type="subtitle">DM Controls: {entityName}</ThemedText>
						<TouchableOpacity style={styles.closeButton} onPress={onClose}>
							<ThemedText style={styles.closeButtonText}>✕</ThemedText>
						</TouchableOpacity>
					</View>

					<ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
						{/* Top Row: 2 Columns */}
						<View style={styles.topRow}>
							{/* Column 1: General Info + Health & Resources */}
							<Animated.View
								style={[
									styles.topColumn,
									{
										transform: [{ scale: pulseAnim }],
										backgroundColor: colorAnim.interpolate({
											inputRange: [0, 1],
											outputRange: effectType === 'damage'
												? ['#F5E6D3', '#FFE6E6']
												: effectType === 'heal'
													? ['#F5E6D3', '#E6FFE6']
													: ['#F5E6D3', '#F5E6D3'],
										}),
									},
								]}
							>
								{character && (
									<>
										<View style={styles.statRow}>
											<ThemedText style={styles.statLabel}>Name:</ThemedText>
											<ThemedText style={styles.statValue}>{character.name}</ThemedText>
										</View>
										<View style={{ width: '100%', marginBottom: 12 }}>
											<ExpoIconPicker
												label="Icon (vector or URL)"
												value={currentIcon}
												onChange={handleIconChange}
											/>
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
										{initiativeValue !== undefined && (
											<View style={styles.statRow}>
												<ThemedText style={styles.statLabel}>Initiative:</ThemedText>
												<ThemedText style={styles.statValue}>{initiativeValue}</ThemedText>
											</View>
										)}
										{armorClass !== undefined && (
											<View style={styles.infoRow}>
												<ThemedText style={styles.infoLabel}>AC:</ThemedText>
												<ThemedText style={styles.infoValue}>{armorClass}</ThemedText>
											</View>
										)}
										<View style={styles.statRow}>
											<ThemedText style={styles.statLabel}>Health:</ThemedText>
											<Animated.View
												style={[
													{ position: 'relative' },
													effectType && {
														opacity: shimmerAnim.interpolate({
															inputRange: [0, 0.5, 1],
															outputRange: [1, 0.3, 1],
														}),
													},
												]}
											>
												<TextInput
													style={styles.statInput}
													value={(character.health ?? character.maxHealth ?? 10).toString()}
													onChangeText={(text) => {
														const value = parseInt(text, 10);
														if (!isNaN(value) && onUpdateCharacter) {
															onUpdateCharacter(character.id, { health: value });
														}
													}}
													keyboardType="numeric"
												/>
											</Animated.View>
											<ThemedText style={styles.statLabel}>/</ThemedText>
											<TextInput
												style={styles.statInput}
												value={(character.maxHealth ?? 10).toString()}
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
											<ThemedText style={styles.statLabel}>Name:</ThemedText>
											<ThemedText style={styles.statValue}>{npcToken.label}</ThemedText>
										</View>
										<View style={{ width: '100%', marginBottom: 12 }}>
											<ExpoIconPicker
												label="Icon (vector or URL)"
												value={currentIcon}
												onChange={handleIconChange}
											/>
										</View>
										<View style={styles.statRow}>
											<ThemedText style={styles.statLabel}>Type:</ThemedText>
											<ThemedText style={styles.statValue}>NPC</ThemedText>
										</View>
										{initiativeValue !== undefined && (
											<View style={styles.statRow}>
												<ThemedText style={styles.statLabel}>Initiative:</ThemedText>
												<ThemedText style={styles.statValue}>{initiativeValue}</ThemedText>
											</View>
										)}
										{armorClass !== undefined && (
											<View style={styles.infoRow}>
												<ThemedText style={styles.infoLabel}>AC:</ThemedText>
												<ThemedText style={styles.infoValue}>{armorClass}</ThemedText>
											</View>
										)}
										<View style={styles.statRow}>
											<ThemedText style={styles.statLabel}>Health:</ThemedText>
											<Animated.View
												style={[
													effectType && {
														opacity: shimmerAnim.interpolate({
															inputRange: [0, 0.5, 1],
															outputRange: [1, 0.3, 1],
														}),
													},
												]}
											>
												<ThemedText style={styles.statValue}>
													{npcToken.hitPoints ?? 10} / {npcToken.maxHitPoints ?? 10}
												</ThemedText>
											</Animated.View>
										</View>
										<View style={styles.statRow}>
											<ThemedText style={styles.statLabel}>Action Points:</ThemedText>
											<ThemedText style={styles.statValue}>
												{(npcToken.metadata?.actionPoints as number) ?? 3} / {(npcToken.metadata?.maxActionPoints as number) ?? 3}
											</ThemedText>
										</View>
									</>
								)}
							</Animated.View>

							{/* Column 2: Ability Scores */}
							<View style={styles.topColumn}>
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
						</View>

						{/* Status Effects */}
						{(character || npcToken) && (
							<View style={styles.section}>
								<ThemedText style={styles.sectionTitle}>Status Effects</ThemedText>
								<View style={styles.statusEffectsContainer}>
									{STATUS_EFFECT_LIST.map(effect => {
										const isActive = currentStatusEffects.includes(effect.id);
										return (
											<TouchableOpacity
												key={effect.id}
												style={[
													styles.statusEffectChip,
													isActive && styles.statusEffectChipActive,
													{ backgroundColor: isActive ? effect.color : '#E2D3B3' },
												]}
												onPress={() => handleToggleStatusEffect(effect.id)}
											>
												<ThemedText style={styles.statusEffectIcon}>
													{effect.icon}
												</ThemedText>
												<ThemedText
													style={[
														styles.statusEffectText,
														isActive && styles.statusEffectTextActive,
													]}
												>
													{effect.name}
												</ThemedText>
											</TouchableOpacity>
										);
									})}
								</View>
								{currentStatusEffects.length > 0 && (
									<View style={styles.activeEffectsContainer}>
										<ThemedText style={styles.activeEffectsLabel}>Active:</ThemedText>
										<View style={styles.activeEffectsList}>
											{currentStatusEffects.map(effectId => {
												const effect = STATUS_EFFECT_LIST.find(e => e.id === effectId);
												if (!effect) return null;
												return (
													<View key={effectId} style={[styles.activeEffectBadge, { backgroundColor: effect.color }]}>
														<ThemedText style={styles.activeEffectText}>
															{effect.icon} {effect.name}
														</ThemedText>
													</View>
												);
											})}
										</View>
									</View>
								)}
							</View>
						)}

						{(onDamage || onHeal) && (
							<View style={styles.section}>
								<ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
								<View style={styles.damageHealRow}>
									<TextInput
										style={styles.amountInput}
										value={actionAmount}
										onChangeText={setActionAmount}
										placeholder="Amount"
										placeholderTextColor="#9B8B7A"
										keyboardType="numeric"
										editable={!isProcessing}
									/>
									{onDamage && (
										<TouchableOpacity
											style={[
												styles.damageHealButton,
												styles.damageButton,
												isProcessing && styles.buttonDisabled,
											]}
											onPress={handleDamage}
											disabled={!actionAmount || isNaN(parseInt(actionAmount, 10)) || !entityId || isProcessing}
										>
											<ThemedText style={styles.damageHealButtonText}>
												{isProcessing ? 'Processing...' : 'Damage'}
											</ThemedText>
										</TouchableOpacity>
									)}
									{onHeal && (
										<TouchableOpacity
											style={[
												styles.damageHealButton,
												styles.healButton,
												isProcessing && styles.buttonDisabled,
											]}
											onPress={handleHeal}
											disabled={!actionAmount || isNaN(parseInt(actionAmount, 10)) || !entityId || isProcessing}
										>
											<ThemedText style={styles.damageHealButtonText}>
												{isProcessing ? 'Processing...' : 'Heal'}
											</ThemedText>
										</TouchableOpacity>
									)}
								</View>
							</View>
						)}
					</ScrollView>
				</ThemedView>
			</View>
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
		width: '95%',
		maxWidth: 1200,
		maxHeight: '90%',
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
		marginBottom: 16,
		padding: 14,
		backgroundColor: '#F5E6D3',
		borderRadius: 10,
	},
	sectionTitle: {
		fontSize: 15,
		fontWeight: 'bold',
		color: '#3B2F1B',
		marginBottom: 10,
	},
	statRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
		gap: 6,
		flexWrap: 'wrap',
	},
	statLabel: {
		fontSize: 14,
		color: '#3B2F1B',
		fontWeight: 'bold',
	},
	statInput: {
		backgroundColor: '#E2D3B3',
		borderRadius: 6,
		padding: 6,
		width: 55,
		textAlign: 'center',
		color: '#3B2F1B',
		fontSize: 13,
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	damageHealRow: {
		flexDirection: 'row',
		gap: 8,
		alignItems: 'center',
	},
	amountInput: {
		flex: 1,
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
	buttonDisabled: {
		opacity: 0.5,
	},
	topRow: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 16,
	},
	topColumn: {
		flex: 1,
		padding: 14,
		backgroundColor: '#F5E6D3',
		borderRadius: 10,
	},
	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 6,
		paddingVertical: 3,
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
		gap: 6,
		justifyContent: 'center',
	},
	statBox: {
		width: 65,
		height: 65,
		backgroundColor: '#E2D3B3',
		borderRadius: 6,
		padding: 3,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	statBoxLabel: {
		fontSize: 10,
		color: '#6B5B3D',
		fontWeight: '600',
		marginBottom: 2,
		lineHeight: 12,
	},
	statBoxValue: {
		fontSize: 20,
		color: '#3B2F1B',
		fontWeight: 'bold',
		marginVertical: 1,
		lineHeight: 22,
	},
	statBoxModifier: {
		fontSize: 9,
		color: '#6B5B3D',
		marginTop: 1,
		lineHeight: 11,
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
	statusEffectsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 10,
	},
	statusEffectChip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#C9B037',
		gap: 5,
		minWidth: 110,
	},
	statusEffectChipActive: {
		borderWidth: 2,
		borderColor: '#3B2F1B',
	},
	statusEffectIcon: {
		fontSize: 16,
	},
	statusEffectText: {
		fontSize: 12,
		color: '#3B2F1B',
		fontWeight: '600',
	},
	statusEffectTextActive: {
		color: '#FFFFFF',
		fontWeight: 'bold',
	},
	activeEffectsContainer: {
		marginTop: 12,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#C9B037',
	},
	activeEffectsLabel: {
		fontSize: 14,
		color: '#6B5B3D',
		fontWeight: '600',
		marginBottom: 8,
	},
	activeEffectsList: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
	},
	activeEffectBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 6,
		gap: 4,
	},
	activeEffectText: {
		fontSize: 11,
		color: '#FFFFFF',
		fontWeight: '600',
	},
});
