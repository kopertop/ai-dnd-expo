import React, { useState } from 'react';
import {
	Image,
	ImageSourcePropType,
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';

import { getEquipmentSpritesheet } from '@/components/equipment-spritesheet';
import { SpriteIcon } from '@/components/sprite-icon';
import { ThemedView } from '@/components/themed-view';
import { SKILL_DESCRIPTIONS, SKILL_LIST } from '@/constants/skills';
import { ATTRIBUTE_DESCRIPTIONS, STAT_KEYS } from '@/constants/stats';
import { useUpdateCharacter } from '@/hooks/api/use-character-queries';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGameState } from '@/hooks/use-game-state';
import { GearSlot, StatKey } from '@/types/stats';

export const CharacterSheetView: React.FC = () => {
	const [infoAttribute, setInfoAttribute] = useState<StatKey | null>(null);
	const [infoSkill, setInfoSkill] = useState<string | null>(null);
	const [activeSlot, setActiveSlot] = useState<GearSlot | null>(null);
	const { playerCharacter, playerPortrait } = useGameState();
	const colorScheme = useColorScheme();
	const updateCharacterMutation = useUpdateCharacter();

	// Inventory management - use character's inventory and equipped fields
	const inventory = playerCharacter?.inventory || [];
	const equipped = playerCharacter?.equipped || {};
	const loading = updateCharacterMutation.isPending;
	const error = updateCharacterMutation.error;
	const errorMessage = error ? (error instanceof Error ? error.message : String(error)) : null;

	const equipItem = async (item: any, slot: GearSlot) => {
		if (!playerCharacter) return;
		const newEquipped = { ...equipped, [slot]: item.id };
		try {
			await updateCharacterMutation.mutateAsync({
				path: `/characters/${playerCharacter.id}`,
				body: { equipped: newEquipped },
			});
		} catch (error) {
			// Error handling - could show alert if needed
		}
	};

	const unequipItem = async (slot: GearSlot) => {
		if (!playerCharacter) return;
		const newEquipped = { ...equipped };
		delete newEquipped[slot];
		try {
			await updateCharacterMutation.mutateAsync({
				path: `/characters/${playerCharacter.id}`,
				body: { equipped: newEquipped },
			});
		} catch (error) {
			// Error handling - could show alert if needed
		}
	};

	if (!playerCharacter) return null;

	const {
		name,
		description,
		stats,
		skills = [],
		race,
		class: characterClass,
		trait,
		level,
		health,
		maxHealth,
		actionPoints,
		maxActionPoints,
	} = playerCharacter;
	const portraitSource = playerPortrait;

	const handleSlotPress = (slot: GearSlot) => {
		setActiveSlot(activeSlot === slot ? null : slot);
	};

	const handleAssignItem = async (item: any) => {
		if (!activeSlot) return;
		await equipItem(item, activeSlot);
		setActiveSlot(null);
	};

	const handleUnequipSlot = async (slot: GearSlot) => {
		await unequipItem(slot);
		setActiveSlot(null);
	};

	// Use inventory with equipped status for display
	const inventoryWithStatus = inventory.map((item: any) => {
		const equippedSlot = Object.entries(equipped).find(([_, itemValue]) => {
			const equippedId = typeof itemValue === 'string' ? itemValue : (itemValue as any)?.id;
			return equippedId === item.id;
		})?.[0] as GearSlot | undefined;
		return {
			item,
			isEquipped: !!equippedSlot,
			equippedSlot,
		};
	});
	const resolveEquippedItem = (slot: GearSlot) => {
		const equippedEntry = (equipped as Record<GearSlot, any>)[slot];
		if (!equippedEntry) return undefined;
		return typeof equippedEntry === 'string'
			? inventory.find((item: any) => item.id === equippedEntry)
			: equippedEntry;
	};

	const filteredInventory = activeSlot
		? inventoryWithStatus.filter(entry => entry.item.slot === activeSlot)
		: inventoryWithStatus;

	const backgroundColor = colorScheme === 'dark' ? '#2C1810' : '#F9F6EF';

	return (
		<ThemedView style={[styles.container, { backgroundColor }]}>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				{/* Character Header */}
				<View style={styles.header}>
					<View style={styles.portraitContainer}>
						<Image
							source={portraitSource as ImageSourcePropType}
							style={styles.portrait}
							resizeMode="contain"
						/>
					</View>
					<View style={styles.characterInfo}>
						<Text style={styles.characterName}>{name}</Text>
						<Text style={styles.characterDetails}>
							{characterClass} / {race}
							{trait && ` / ${trait}`} / Level {level}
						</Text>
						<View style={styles.healthRow}>
							<Text style={styles.healthText}>
								HP: {health} / {maxHealth}
							</Text>
							<Text style={styles.healthText}>
								AP: {actionPoints} / {maxActionPoints}
							</Text>
						</View>
					</View>
				</View>

				{/* Stats Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Stats</Text>
					<View style={styles.statsGrid}>
						{STAT_KEYS.map(key => (
							<View key={key} style={[styles.statBox, { position: 'relative' }]}>
								<TouchableOpacity
									style={styles.infoButton}
									onPress={() => setInfoAttribute(infoAttribute === key ? null : key)}
								>
									<Text style={styles.infoButtonText}>?</Text>
								</TouchableOpacity>
								<Text style={styles.statLabel}>{key}</Text>
								<Text style={styles.statValue}>{stats[key]}</Text>
							</View>
						))}
					</View>
				</View>

				{/* Background Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Background</Text>
					<Text style={styles.backgroundText}>{description}</Text>
				</View>

				{/* Skills Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Skills</Text>
					<View style={styles.skillsGrid}>
						{SKILL_LIST.filter(skill => skills.includes(skill.id)).map(skill => (
							<View key={String(skill.id)} style={[styles.skillItem, { position: 'relative' }]}>
								<TouchableOpacity
									style={styles.skillInfoButton}
									onPress={() => setInfoSkill(infoSkill === skill.id ? null : skill.id)}
								>
									<Text style={styles.infoButtonText}>?</Text>
								</TouchableOpacity>
								<Image
									source={skill.image as ImageSourcePropType}
									style={styles.skillIcon}
								/>
								<Text style={styles.skillName}>{skill.name}</Text>
							</View>
						))}
					</View>
				</View>

				{/* Gear Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Equipment</Text>
					<View style={styles.gearGrid}>
						{(
							[
								'helmet',
								'chest',
								'arms',
								'legs',
								'boots',
								'mainHand',
								'offHand',
							] as GearSlot[]
						).map(slot => {
							const equippedItem = resolveEquippedItem(slot);
							return (
								<TouchableOpacity
									key={slot}
									style={[
										styles.gearSlot,
										activeSlot === slot && styles.gearSlotActive,
									]}
									onPress={() => handleSlotPress(slot)}
								>
									{equippedItem ? (
										<Image
											source={equippedItem.icon as ImageSourcePropType}
											style={styles.gearIcon}
										/>
									) : (
										<View style={styles.emptyGearSlot}>
											<Text style={styles.gearSlotLabel}>
												{slot.charAt(0).toUpperCase() + slot.slice(1)}
											</Text>
										</View>
									)}
								</TouchableOpacity>
							);
						})}
					</View>
				</View>

				{/* Inventory Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Inventory</Text>
					<View style={styles.inventoryGrid}>
						{loading ? (
							<Text style={styles.emptyText}>Loading inventory...</Text>
						) : errorMessage ? (
							<Text style={styles.emptyText}>Error loading inventory: {errorMessage}</Text>
						) : filteredInventory.length === 0 ? (
							<Text style={styles.emptyText}>No items</Text>
						) : (
							filteredInventory.map(entry => {
								const { item, isEquipped } = entry;
								const isCompatible =
									!activeSlot || item.slot === activeSlot || item.slot === 'none';
								const canEquip = item.slot !== 'none' && isCompatible;

								return (
									<Pressable
										key={String(item.id)}
										onPress={() => {
											if (activeSlot && canEquip) {
												if (
													isEquipped &&
													entry.equippedSlot === activeSlot
												) {
													handleUnequipSlot(activeSlot);
												} else {
													handleAssignItem(item);
												}
											} else if (!activeSlot && item.slot !== 'none') {
												setActiveSlot(item.slot as GearSlot);
											}
										}}
										style={[
											styles.inventoryItem,
											isEquipped && styles.inventoryItemEquipped,
											!isCompatible && styles.inventoryItemIncompatible,
										]}
									>
										{item.icon ? (
											typeof item.icon === 'object' &&
											'spritesheet' in item.icon &&
											'x' in item.icon &&
											'y' in item.icon ? (
													(() => {
														const spritesheet = getEquipmentSpritesheet();
														return spritesheet ? (
															<SpriteIcon
																spritesheet={spritesheet}
																coordinates={{ x: item.icon.x, y: item.icon.y }}
																size={40}
															/>
														) : null;
													})()
												) : (
													<Image
														source={item.icon as ImageSourcePropType}
														style={styles.inventoryIcon}
													/>
												)
										) : null}
										{isEquipped && (
											<View style={styles.equippedIndicator}>
												<Text style={styles.equippedText}>E</Text>
											</View>
										)}
									</Pressable>
								);
							})
						)}
					</View>
				</View>
			</ScrollView>
			{/* Attribute Info Modal */}
			<Modal
				visible={infoAttribute !== null}
				transparent
				animationType="fade"
				onRequestClose={() => setInfoAttribute(null)}
			>
				<TouchableOpacity
					style={styles.modalOverlay}
					activeOpacity={1}
					onPress={() => setInfoAttribute(null)}
				>
					<View style={styles.modalContent} onStartShouldSetResponder={() => true}>
						{infoAttribute && (
							<>
								<View style={styles.modalHeader}>
									<Text style={styles.modalTitle}>{infoAttribute}</Text>
									<TouchableOpacity
										style={styles.modalCloseButton}
										onPress={() => setInfoAttribute(null)}
									>
										<Text style={styles.modalCloseText}>✕</Text>
									</TouchableOpacity>
								</View>
								<Text style={styles.modalDescription}>
									{ATTRIBUTE_DESCRIPTIONS[infoAttribute]}
								</Text>
							</>
						)}
					</View>
				</TouchableOpacity>
			</Modal>
			{/* Skill Info Modal */}
			<Modal
				visible={infoSkill !== null}
				transparent
				animationType="fade"
				onRequestClose={() => setInfoSkill(null)}
			>
				<TouchableOpacity
					style={styles.modalOverlay}
					activeOpacity={1}
					onPress={() => setInfoSkill(null)}
				>
					<View style={styles.modalContent} onStartShouldSetResponder={() => true}>
						{infoSkill && (() => {
							const skill = SKILL_LIST.find(s => s.id === infoSkill);
							if (!skill) return null;
							return (
								<>
									<View style={styles.modalHeader}>
										<Text style={styles.modalTitle}>{skill.name}</Text>
										<TouchableOpacity
											style={styles.modalCloseButton}
											onPress={() => setInfoSkill(null)}
										>
											<Text style={styles.modalCloseText}>✕</Text>
										</TouchableOpacity>
									</View>
									<Text style={styles.modalDescription}>
										{SKILL_DESCRIPTIONS[skill.id] || 'No description available.'}
									</Text>
									<Text style={styles.modalSubtext}>Uses: {skill.ability}</Text>
								</>
							);
						})()}
					</View>
				</TouchableOpacity>
			</Modal>
		</ThemedView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		padding: 16,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 24,
		padding: 16,
		backgroundColor: 'rgba(201, 176, 55, 0.1)',
		borderRadius: 12,
	},
	portraitContainer: {
		marginRight: 16,
		width: 80,
		height: 80,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'transparent',
	},
	portrait: {
		width: 80,
		height: 80,
		borderRadius: 40,
		borderWidth: 2,
		borderColor: '#C9B037',
		backgroundColor: 'transparent',
	},
	characterInfo: {
		flex: 1,
	},
	characterName: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#3B2F1B',
		marginBottom: 4,
	},
	characterDetails: {
		fontSize: 16,
		color: '#8B7355',
		marginBottom: 8,
	},
	healthRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	healthText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#C9B037',
	},
	section: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#3B2F1B',
		marginBottom: 12,
		borderBottomWidth: 2,
		borderBottomColor: '#C9B037',
		paddingBottom: 4,
	},
	statsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	statBox: {
		flex: 1,
		minWidth: 80,
		backgroundColor: 'rgba(201, 176, 55, 0.1)',
		padding: 12,
		borderRadius: 8,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	statLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: '#8B7355',
		textTransform: 'uppercase',
	},
	statValue: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#3B2F1B',
		marginTop: 4,
	},
	backgroundText: {
		fontSize: 16,
		color: '#3B2F1B',
		lineHeight: 24,
	},
	skillsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
	},
	skillItem: {
		alignItems: 'center',
		backgroundColor: 'rgba(201, 176, 55, 0.1)',
		padding: 12,
		borderRadius: 8,
		minWidth: 80,
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	skillIcon: {
		width: 32,
		height: 32,
		marginBottom: 8,
	},
	skillName: {
		fontSize: 12,
		color: '#3B2F1B',
		textAlign: 'center',
		fontWeight: '500',
	},
	gearGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
	},
	gearSlot: {
		width: 80,
		height: 80,
		backgroundColor: 'rgba(201, 176, 55, 0.1)',
		borderRadius: 8,
		borderWidth: 2,
		borderColor: '#C9B037',
		justifyContent: 'center',
		alignItems: 'center',
	},
	gearSlotActive: {
		borderColor: '#4caf50',
		backgroundColor: 'rgba(76, 175, 80, 0.1)',
	},
	gearIcon: {
		width: 48,
		height: 48,
	},
	emptyGearSlot: {
		justifyContent: 'center',
		alignItems: 'center',
	},
	gearSlotLabel: {
		fontSize: 10,
		color: '#8B7355',
		textAlign: 'center',
		fontWeight: '500',
	},
	inventoryGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	inventoryItem: {
		width: 60,
		height: 60,
		backgroundColor: 'rgba(201, 176, 55, 0.1)',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#C9B037',
		justifyContent: 'center',
		alignItems: 'center',
		position: 'relative',
	},
	inventoryItemEquipped: {
		borderColor: '#4caf50',
		backgroundColor: 'rgba(76, 175, 80, 0.1)',
	},
	inventoryItemIncompatible: {
		opacity: 0.5,
	},
	inventoryIcon: {
		width: 40,
		height: 40,
	},
	equippedIndicator: {
		position: 'absolute',
		top: 2,
		right: 2,
		backgroundColor: '#4caf50',
		borderRadius: 8,
		width: 16,
		height: 16,
		justifyContent: 'center',
		alignItems: 'center',
	},
	equippedText: {
		fontSize: 10,
		color: 'white',
		fontWeight: 'bold',
	},
	emptyText: {
		color: '#8B7355',
		fontStyle: 'italic',
		textAlign: 'center',
		padding: 20,
	},
	infoButton: {
		position: 'absolute',
		top: 4,
		right: 4,
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: 'rgba(59, 47, 27, 0.2)',
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#3B2F1B',
	},
	infoButtonText: {
		color: '#3B2F1B',
		fontSize: 14,
		fontWeight: 'bold',
	},
	skillInfoButton: {
		position: 'absolute',
		top: 4,
		right: 4,
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: 'rgba(59, 47, 27, 0.2)',
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#3B2F1B',
		zIndex: 10,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContent: {
		backgroundColor: '#F9F6EF',
		borderRadius: 12,
		padding: 20,
		margin: 20,
		maxWidth: 400,
		borderWidth: 2,
		borderColor: '#C9B037',
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	modalTitle: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#3B2F1B',
	},
	modalCloseButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#D4BC8B',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalCloseText: {
		fontSize: 18,
		color: '#3B2F1B',
		fontWeight: 'bold',
	},
	modalDescription: {
		fontSize: 16,
		color: '#3B2F1B',
		lineHeight: 24,
	},
	modalSubtext: {
		fontSize: 14,
		color: '#8B7355',
		marginTop: 8,
		fontStyle: 'italic',
	},
});
