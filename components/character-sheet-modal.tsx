import React, { useState } from 'react';
import { Image, ImageSourcePropType, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useGameState } from '../hooks/use-game-state';
import { useInventoryManager } from '../hooks/use-inventory-manager';
import { Item as InventoryItem } from '../types/items';
import { GearSlot } from '../types/stats';

import { ThemedView } from '@/components/themed-view';
import { SKILL_LIST } from '@/constants/skills';
import { STAT_KEYS } from '@/constants/stats';

interface CharacterSheetModalProps {
	visible: boolean;
	onClose: () => void;
}

export const CharacterSheetModal: React.FC<CharacterSheetModalProps> = ({
	visible,
	onClose,
}) => {
	const [tooltipSkill, setTooltipSkill] = useState<string | null>(null);
	const [activeSlot, setActiveSlot] = useState<GearSlot | null>(null);
	const { playerCharacter, playerPortrait } = useGameState();
	const { loading, error, inventory, equipped, equipItem, unequipItem } = useInventoryManager();

	if (!playerCharacter) return null;
	
	const { name, description, stats, skills = [], race, class: characterClass, level, health, maxHealth, actionPoints, maxActionPoints } = playerCharacter;
	const portraitSource = playerPortrait;

	const handleSlotPress = (slot: GearSlot) => {
		setActiveSlot(activeSlot === slot ? null : slot);
	};

	const handleAssignItem = async (item: InventoryItem) => {
		if (!activeSlot) return;
		await equipItem(item.id);
		setActiveSlot(null);
	};

	const handleUnequipSlot = async (slot: GearSlot) => {
		await unequipItem(slot);
		setActiveSlot(null);
	};

	// Replace inventoryItems and equipped logic with values from the hook
	// Use loading/error to show loading or error states
	const inventoryItems = inventory.map(entry => entry.item);
	const equippedItems = Object.entries(equipped).map(([slot, item]) => item).filter(Boolean);

	return (
		<Modal visible={visible} animationType="slide" transparent>
			<View style={styles.overlay}>
				<ThemedView style={styles.modalBox}>
					<ScrollView contentContainerStyle={styles.contentWithPortrait}>
						<View style={styles.sheetRow}>
							{/* Left: Portrait & Stats */}
							<View style={styles.leftCol}>
								<View style={styles.portraitBox}>
									<Image source={portraitSource as ImageSourcePropType} style={styles.portraitLarge} />
								</View>
								<Text style={styles.label}>Stats</Text>
								<View style={styles.statGridBelowPortrait}>
									{STAT_KEYS.map((key) => (
										<View key={key} style={styles.statBox}>
											<Text style={styles.statLabel}>{key}</Text>
											<Text style={styles.statValue}>
												{stats[key]}
											</Text>
										</View>
									))}
								</View>
							</View>
							{/* Center: Info block above Inventory grid */}
							<View style={styles.centerCol}>
								{/* Info block */}
								<View style={styles.infoBlock}>
									<View style={styles.infoRow}>
										<Text style={styles.infoText}>{characterClass}</Text>
										<Text style={styles.infoText}>/ {race}</Text>
										<Text style={styles.infoText}>/ Level {level}</Text>
									</View>
									<Text style={styles.nameText}>{name}</Text>
									<Text style={styles.label}>Background</Text>
									<Text style={styles.value}>{description}</Text>
									<View style={styles.hpApRow}>
										<Text style={styles.statText}>HP: {health} / {maxHealth}</Text>
										<Text style={styles.statText}>AP: {actionPoints} / {maxActionPoints}</Text>
									</View>
								</View>
								<Text style={styles.label}>Inventory</Text>
								<View style={styles.inventoryGridCenter}>
									{loading ? (
										<Text style={styles.emptyInventory}>Loading inventory...</Text>
									) : error ? (
										<Text style={styles.emptyInventory}>Error loading inventory: {error}</Text>
									) : inventoryItems.length === 0 ? (
										<Text style={styles.emptyInventory}>No items</Text>
									) : (
										inventoryItems.map(item => (
											<Pressable
												key={String(item.id)}
												onPress={() => item.slot !== 'none' && setActiveSlot(item.slot as GearSlot)}
												onHoverIn={() => Platform.OS === 'web' && setTooltipSkill(item.id as string)}
												onHoverOut={() => Platform.OS === 'web' && setTooltipSkill(null)}
												style={styles.inventoryItemBox}
											>
												<Image source={item.icon as ImageSourcePropType} style={styles.inventoryIconLarge} />
												{tooltipSkill === item.id && (
													<View style={styles.tooltipOverlay} pointerEvents="none">
														<View style={styles.tooltipOverIconBg} />
														<View style={styles.tooltipOverIconLabel}>
															<Text style={styles.tooltipText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
																{item.name}
															</Text>
														</View>
													</View>
												)}
											</Pressable>
										))
									)}
								</View>
							</View>
							{/* Right: Gear & Skills (unchanged) */}
							<View style={styles.rightCol}>
								<Text style={styles.label}>Gear</Text>
								{/* Character-like gear layout */}
								<View style={styles.gearCharLayout}>
									{/* Helmet */}
									<View style={styles.gearRowCenter}>
										<TouchableOpacity
											style={[styles.gearSlot, activeSlot === 'helmet' && styles.gearSlotActive]}
											onPress={() => handleSlotPress('helmet')}
										>
											{equipped['helmet'] ? (
												<Image source={equipped['helmet']!.icon as ImageSourcePropType} style={styles.gearIcon} />
											) : (
												<Image source={require('../assets/images/gear-slot/helmet.png') as ImageSourcePropType} style={styles.gearIcon} />
											)}
											<Text style={styles.gearLabel}>Helmet</Text>
										</TouchableOpacity>
									</View>
									{/* Arms + Chest */}
									<View style={styles.gearRowArmsChest}>
										<View style={styles.gearColArmHand}>
											<TouchableOpacity
												style={[styles.gearSlot, styles.gearSlotArm, activeSlot === 'arms' && styles.gearSlotActive]}
												onPress={() => handleSlotPress('arms')}
											>
												{equipped['arms'] ? (
													<Image source={equipped['arms']!.icon as ImageSourcePropType} style={styles.gearIcon} />
												) : (
													<Image source={require('../assets/images/gear-slot/left-arm.png') as ImageSourcePropType} style={styles.gearIcon} />
												)}
												<Text style={styles.gearLabel}>Arms</Text>
											</TouchableOpacity>
										</View>
										<TouchableOpacity
											style={[styles.gearSlot, styles.gearSlotChest, activeSlot === 'chest' && styles.gearSlotActive]}
											onPress={() => handleSlotPress('chest')}
										>
											{equipped['chest'] ? (
												<Image source={equipped['chest']!.icon as ImageSourcePropType} style={styles.gearIcon} />
											) : (
												<Image source={require('../assets/images/gear-slot/chest.png') as ImageSourcePropType} style={styles.gearIcon} />
											)}
											<Text style={styles.gearLabel}>Chest</Text>
										</TouchableOpacity>
										<View style={styles.gearColArmHand}>
											<TouchableOpacity
												style={[styles.gearSlot, styles.gearSlotArm, activeSlot === 'arms' && styles.gearSlotActive]}
												onPress={() => handleSlotPress('arms')}
											>
												{equipped['arms'] ? (
													<Image source={equipped['arms']!.icon as ImageSourcePropType} style={styles.gearIcon} />
												) : (
													<Image source={require('../assets/images/gear-slot/right-arm.png') as ImageSourcePropType} style={styles.gearIcon} />
												)}
												<Text style={styles.gearLabel}>Arms</Text>
											</TouchableOpacity>
										</View>
									</View>
									{/* Legs */}
									<View style={styles.gearRowCenter}>
										{/* Main Hand below L-Arm */}
										<TouchableOpacity
											style={[styles.gearSlot, styles.gearSlotHand, activeSlot === 'mainHand' && styles.gearSlotActive]}
											onPress={() => handleSlotPress('mainHand')}
										>
											{equipped['mainHand'] ? (
												<Image source={equipped['mainHand']!.icon as ImageSourcePropType} style={styles.gearIcon} />
											) : (
												<Image source={require('../assets/images/gear-slot/main-hand.png') as ImageSourcePropType} style={styles.gearIcon} />
											)}
											<Text style={styles.gearLabel}>Main Hand</Text>
										</TouchableOpacity>
										<TouchableOpacity
											style={[styles.gearSlot, activeSlot === 'legs' && styles.gearSlotActive]}
											onPress={() => handleSlotPress('legs')}
										>
											{equipped['legs'] ? (
												<Image source={equipped['legs']!.icon as ImageSourcePropType} style={styles.gearIcon} />
											) : (
												<Image source={require('../assets/images/gear-slot/legs.png') as ImageSourcePropType} style={styles.gearIcon} />
											)}
											<Text style={styles.gearLabel}>Legs</Text>
										</TouchableOpacity>
										{/* Off Hand below R-Arm */}
										<TouchableOpacity
											style={[styles.gearSlot, styles.gearSlotHand, activeSlot === 'offHand' && styles.gearSlotActive]}
											onPress={() => handleSlotPress('offHand')}
										>
											{equipped['offHand'] ? (
												<Image source={equipped['offHand']!.icon as ImageSourcePropType} style={styles.gearIcon} />
											) : (
												<Image source={require('../assets/images/gear-slot/off-hand.png') as ImageSourcePropType} style={styles.gearIcon} />
											)}
											<Text style={styles.gearLabel}>Off Hand</Text>
										</TouchableOpacity>

									</View>
									{/* Boots */}
									<View style={styles.gearRowCenter}>
										<TouchableOpacity
											style={[styles.gearSlot, activeSlot === 'boots' && styles.gearSlotActive]}
											onPress={() => handleSlotPress('boots')}
										>
											{equipped['boots'] ? (
												<Image source={equipped['boots']!.icon as ImageSourcePropType} style={styles.gearIcon} />
											) : (
												<Image source={require('../assets/images/gear-slot/boots.png') as ImageSourcePropType} style={styles.gearIcon} />
											)}
											<Text style={styles.gearLabel}>Boots</Text>
										</TouchableOpacity>
									</View>
								</View>
								{/* If a slot is active, show inventory items that can go in that slot */}
								{activeSlot && (
									<View style={styles.inventoryGrid}>
										{/* Show unequip button if something is equipped in this slot */}
										{equipped[activeSlot] && (
											<TouchableOpacity style={styles.unequipButton} onPress={() => handleUnequipSlot(activeSlot)}>
												<Text style={styles.unequipButtonText}>Unequip</Text>
											</TouchableOpacity>
										)}
										{inventoryItems.filter(i => i.slot === activeSlot).length === 0 ? (
											<Text style={styles.emptyInventory}>No items for this slot</Text>
										) : (
											inventoryItems.filter(i => i.slot === activeSlot).map(item => (
												<TouchableOpacity key={String(item.id)} style={styles.inventoryItem} onPress={() => handleAssignItem(item)}>
													<Image source={item.icon as ImageSourcePropType} style={styles.inventoryIcon} />
													<Text style={styles.inventoryName}>{item.name}</Text>
												</TouchableOpacity>
											))
										)}
									</View>
								)}
								{/* Skills grid below gear */}
								<Text style={styles.label}>Skills</Text>
								<View style={styles.skillsGrid}>
									{SKILL_LIST.filter(skill => skills.includes(skill.id)).map(skill => (
										<Pressable
											key={String(skill.id)}
											onPress={() => setTooltipSkill(tooltipSkill === skill.id ? null : skill.id)}
											onHoverIn={() => Platform.OS === 'web' && setTooltipSkill(skill.id as string)}
											onHoverOut={() => Platform.OS === 'web' && setTooltipSkill(null)}
											style={styles.skillIconCard}
										>
											<Image source={skill.image as ImageSourcePropType} style={styles.skillIconFlat} />
											{tooltipSkill === skill.id && (
												<View style={styles.tooltipOverlay} pointerEvents="none">
													<View style={styles.tooltipOverIconBg} />
													<View style={styles.tooltipOverIconLabel}>
														<Text style={styles.tooltipText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
															{skill.name}
														</Text>
													</View>
												</View>
											)}
										</Pressable>
									))}
								</View>
							</View>
						</View>
					</ScrollView>
					<TouchableOpacity style={styles.closeButton} onPress={onClose}>
						<Text style={styles.closeButtonText}>Close</Text>
					</TouchableOpacity>
				</ThemedView>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.4)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	modalBox: {
		width: '95%',
		maxWidth: 900,
		borderRadius: 18,
		backgroundColor: '#FFF8E1',
		padding: 24,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.18,
		shadowRadius: 10,
		elevation: 8,
		maxHeight: '90%',
	},
	content: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		width: '100%',
		gap: 32,
	},
	title: {
		alignSelf: 'center',
		marginBottom: 18,
		fontSize: 28,
		fontWeight: 'bold',
		color: '#8B2323',
	},
	sheetRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		width: '100%',
		gap: 32,
	},
	leftCol: {
		flex: 1,
		minWidth: 260,
		maxWidth: 340,
		alignItems: 'center',
	},
	portraitBox: {
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 8,
	},
	portrait: {
		width: 120,
		height: 120,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: '#C9B037',
		backgroundColor: '#F9F6EF',
		marginBottom: 8,
	},
	infoRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 8,
	},
	infoText: {
		fontSize: 16,
		color: '#8B5C2A',
		marginRight: 8,
	},
	nameText: {
		fontSize: 22,
		fontWeight: 'bold',
		color: '#8B2323',
		marginBottom: 8,
		alignSelf: 'center',
	},
	label: {
		fontWeight: 'bold',
		marginTop: 10,
		color: '#8B2323',
		fontSize: 16,
	},
	value: {
		marginLeft: 0,
		marginBottom: 4,
		color: '#3B2F1B',
		fontSize: 15,
	},
	hpApRow: {
		flexDirection: 'row',
		gap: 18,
		marginTop: 8,
		marginBottom: 8,
	},
	statText: {
		fontSize: 15,
		color: '#8B2323',
		fontWeight: 'bold',
	},
	inventoryGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
		marginTop: 8,
		marginBottom: 8,
		minHeight: 48,
		alignItems: 'center',
		justifyContent: 'flex-start',
	},
	inventoryItem: {
		alignItems: 'center',
		marginRight: 12,
		marginBottom: 8,
	},
	inventoryIcon: {
		width: 36,
		height: 36,
		marginBottom: 2,
	},
	inventoryName: {
		fontSize: 12,
		color: '#3B2F1B',
		textAlign: 'center',
		maxWidth: 60,
	},
	emptyInventory: {
		color: '#aaa',
		fontStyle: 'italic',
		fontSize: 14,
	},
	rightCol: {
		flex: 1,
		minWidth: 260,
		maxWidth: 340,
		alignItems: 'center',
	},
	statGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
		marginTop: 8,
		marginBottom: 8,
		alignItems: 'center',
		justifyContent: 'flex-start',
	},
	statBox: {
		alignItems: 'center',
		marginVertical: 0,
		padding: 8,
		borderWidth: 2,
		borderColor: '#8B5C2A',
		borderRadius: 10,
		backgroundColor: '#F9F6EF',
		width: 90,
		marginRight: 8,
		marginBottom: 8,
	},
	statLabel: {
		fontWeight: 'bold',
		fontSize: 15,
		color: '#8B2323',
		marginBottom: 2,
	},
	statValue: {
		fontSize: 18,
		color: '#3B2F1B',
		fontWeight: 'bold',
	},
	skillsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 16,
		marginTop: 8,
		marginBottom: 8,
		alignItems: 'center',
		justifyContent: 'flex-start',
	},
	skillIconCard: {
		width: 60,
		height: 60,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#F9F6EF',
		margin: 0,
		padding: 0,
	},
	skillIconFlat: {
		width: 60,
		height: 60,
		resizeMode: 'contain',
	},
	skillName: {
		fontSize: 12,
		color: '#3B2F1B',
		textAlign: 'center',
		marginTop: 2,
		maxWidth: 60,
	},
	emptySkills: {
		color: '#aaa',
		fontStyle: 'italic',
		fontSize: 14,
	},
	closeButton: {
		marginTop: 24,
		alignSelf: 'center',
		backgroundColor: '#C9B037',
		paddingVertical: 10,
		paddingHorizontal: 32,
		borderRadius: 8,
	},
	closeButtonText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 16,
	},
	portraitPinned: {
		position: 'absolute',
		top: 24,
		left: 24,
		zIndex: 20,
	},
	portraitLarge: {
		width: 180,
		height: 180,
		borderRadius: 24,
		borderWidth: 3,
		borderColor: '#C9B037',
		backgroundColor: '#F9F6EF',
	},
	contentWithPortrait: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		width: '100%',
	},
	skillIconWrapper: {
		width: 72,
		height: 72,
		alignItems: 'center',
		justifyContent: 'center',
		margin: 0,
		padding: 0,
		position: 'relative',
	},
	skillIconLarge: {
		width: 64,
		height: 64,
		resizeMode: 'contain',
	},
	tooltip: {
		position: 'absolute',
		bottom: 76,
		left: '50%',
		transform: [{ translateX: -50 }],
		backgroundColor: '#3B2F1B',
		paddingVertical: 4,
		paddingHorizontal: 12,
		borderRadius: 8,
		zIndex: 100,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.18,
		shadowRadius: 6,
		elevation: 4,
	},
	tooltipText: {
		color: '#FFF8E1',
		fontSize: 12,
		fontWeight: 'bold',
		textAlign: 'center',
		maxWidth: 60,
	},
	statGridBelowPortrait: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
		marginTop: 8,
		marginBottom: 8,
		alignItems: 'center',
		justifyContent: 'flex-start',
	},
	gearGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 16,
		marginTop: 8,
		marginBottom: 8,
		alignItems: 'center',
		justifyContent: 'flex-start',
	},
	gearSlot: {
		alignItems: 'center',
		marginRight: 12,
		marginBottom: 8,
	},
	gearSlotActive: {
		borderWidth: 3,
		borderColor: '#C9B037',
	},
	gearIcon: {
		width: 48,
		height: 48,
		marginBottom: 4,
	},
	gearLabel: {
		fontSize: 12,
		color: '#3B2F1B',
		textAlign: 'center',
		maxWidth: 80,
	},
	gearCharLayout: {
		width: '100%',
		alignItems: 'center',
		marginTop: 8,
		marginBottom: 8,
	},
	gearRowCenter: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	gearRowArmsChest: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	gearSlotArm: {
		width: 60,
		height: 60,
	},
	gearSlotChest: {
		width: 60,
		height: 60,
	},
	gearColArmHand: {
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	gearSlotHand: {
		width: 60,
		height: 60,
	},
	unequipButton: {
		backgroundColor: '#C9B037',
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 8,
		marginBottom: 8,
	},
	unequipButtonText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 14,
	},
	centerCol: {
		flex: 1,
		minWidth: 260,
		maxWidth: 340,
		alignItems: 'center',
	},
	inventoryGridCenter: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
		marginTop: 8,
		marginBottom: 8,
		minHeight: 48,
		alignItems: 'center',
		justifyContent: 'flex-start',
	},
	inventoryItemBox: {
		alignItems: 'center',
		marginRight: 12,
		marginBottom: 8,
		borderWidth: 1,
		borderColor: '#8B5C2A',
		borderStyle: 'dashed',
		borderRadius: 8,
		padding: 8,
	},
	inventoryIconLarge: {
		width: 48,
		height: 48,
		marginBottom: 2,
	},
	infoBlock: {
		backgroundColor: '#F9F6EF',
		borderRadius: 10,
		padding: 12,
		marginBottom: 16,
		width: '100%',
		alignItems: 'center',
	},
	tooltipOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 1,
	},
	tooltipOverIconBg: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0,0,0,0.5)',
		borderRadius: 8,
	},
	tooltipOverIconLabel: {
		position: 'relative',
		zIndex: 2,
	},
});
