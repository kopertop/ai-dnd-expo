import React, { useState } from 'react';
import { Image, ImageSourcePropType, Modal, Platform, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { useGameState } from '../hooks/use-game-state';
import { useInventoryManager } from '../hooks/use-inventory-manager';
import { Item as InventoryItem } from '../types/items';
import { GearSlot } from '../types/stats';

import { ThemedView } from '@/components/themed-view';
import { SKILL_LIST } from '@/constants/skills';
import { STAT_KEYS } from '@/constants/stats';
import { useScreenSize } from '@/hooks/use-screen-size';
import styles from '@/styles/character-sheet-modal.styles';

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
	const { isMobile } = useScreenSize();
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

	// Use inventory with equipped status for display
	// Items are already sorted with equipped items first
	const filteredInventory = activeSlot
		? inventory.filter(entry => entry.item.slot === activeSlot)
		: inventory;

	return (
		<Modal visible={visible} animationType="slide" transparent>
			<View style={styles.overlay}>
				<ThemedView style={[styles.modalBox, isMobile && styles.modalBoxMobile]}>
					<ScrollView contentContainerStyle={isMobile ? styles.contentMobile : styles.contentWithPortrait}>
						<View style={isMobile ? styles.sheetColumn : styles.sheetRow}>
							{/* Portrait & Stats */}
							<View style={isMobile ? styles.mobileSection : styles.leftCol}>
								<View style={styles.portraitBox}>
									<Image source={portraitSource as ImageSourcePropType} style={isMobile ? styles.portraitMobile : styles.portraitLarge} />
								</View>
								<Text style={styles.label}>Stats</Text>
								<View style={isMobile ? styles.statGridMobile : styles.statGridBelowPortrait}>
									{STAT_KEYS.map((key) => (
										<View key={key} style={isMobile ? styles.statBoxMobile : styles.statBox}>
											<Text style={styles.statLabel}>{key}</Text>
											<Text style={styles.statValue}>
												{stats[key]}
											</Text>
										</View>
									))}
								</View>
							</View>
							{/* Info block above Inventory grid */}
							<View style={isMobile ? styles.mobileSection : styles.centerCol}>
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
								<View style={isMobile ? styles.inventoryGridMobile : styles.inventoryGridCenter}>
									{loading ? (
										<Text style={styles.emptyInventory}>Loading inventory...</Text>
									) : error ? (
										<Text style={styles.emptyInventory}>Error loading inventory: {error}</Text>
									) : filteredInventory.length === 0 ? (
										<Text style={styles.emptyInventory}>No items</Text>
									) : (
										filteredInventory.map(entry => {
											const { item, isEquipped } = entry;
											const isCompatible = !activeSlot || item.slot === activeSlot || item.slot === 'none';
											const canEquip = item.slot !== 'none' && isCompatible;

											return (
												<Pressable
													key={String(item.id)}
													android_ripple={isMobile ? { color: '#C9B037', borderless: false } : undefined}
													onPress={() => {
														if (activeSlot && canEquip) {
															// If this item is already equipped in the active slot, unequip it
															if (isEquipped && entry.equippedSlot === activeSlot) {
																handleUnequipSlot(activeSlot);
															} else {
																// Otherwise equip it
																handleAssignItem(item);
															}
														} else if (!activeSlot && item.slot !== 'none') {
															setActiveSlot(item.slot as GearSlot);
														}
													}}
													onHoverIn={() => Platform.OS === 'web' && !isMobile && setTooltipSkill(item.id as string)}
													onHoverOut={() => Platform.OS === 'web' && !isMobile && setTooltipSkill(null)}
													style={[
														isMobile ? styles.inventoryItemBoxMobile : styles.inventoryItemBox,
														isEquipped && styles.inventoryItemEquipped,
														!isCompatible && styles.inventoryItemIncompatible,
													]}
												>
													<Image source={item.icon as ImageSourcePropType} style={styles.inventoryIconLarge} />
													{isEquipped && (
														<View style={styles.equippedIndicator}>
															<Text style={styles.equippedText}>*</Text>
														</View>
													)}
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
											);
										})
									)}
								</View>
							</View>
							{/* Gear & Skills */}
							<View style={isMobile ? styles.mobileSection : styles.rightCol}>
								<View style={isMobile ? styles.mobileSection : undefined}>
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
								</View>
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
					<TouchableOpacity style={isMobile ? styles.closeButtonMobile : styles.closeButton} onPress={onClose}>
						<Text style={styles.closeButtonText}>Close</Text>
					</TouchableOpacity>
				</ThemedView>
			</View>
		</Modal>
	);
};
