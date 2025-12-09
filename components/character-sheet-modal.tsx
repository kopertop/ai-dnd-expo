import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
	Alert,
	Image,
	ImageSourcePropType,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';

import { getEquipmentSpritesheet } from '@/components/equipment-spritesheet';
import { PortraitSelector } from '@/components/portrait-selector';
import { SpriteIcon } from '@/components/sprite-icon';
import { ThemedView } from '@/components/themed-view';
import { SKILL_DESCRIPTIONS, SKILL_LIST } from '@/constants/skills';
import { getSpellsForClass } from '@/constants/spells';
import { ATTRIBUTE_DESCRIPTIONS, STAT_KEYS } from '@/constants/stats';
import { useUpdateCharacter } from '@/hooks/api/use-character-queries';
import { useAudio } from '@/hooks/use-audio-player';
import { useGameState } from '@/hooks/use-game-state';
import { useScreenSize } from '@/hooks/use-screen-size';
import styles from '@/styles/character-sheet-modal.styles';
import { GearSlot, StatKey } from '@/types/stats';

interface CharacterSheetModalProps {
	visible: boolean;
	onClose: () => void;
	allowClose?: boolean; // If false, hide the close button (for long rest view)
}

export const CharacterSheetModal: React.FC<CharacterSheetModalProps> = ({ visible, onClose, allowClose = true }) => {
	const [infoSkill, setInfoSkill] = useState<string | null>(null);
	const [infoAttribute, setInfoAttribute] = useState<StatKey | null>(null);
	const [activeSlot, setActiveSlot] = useState<GearSlot | null>(null);
	const { isMobile } = useScreenSize();
	const { togglePlayPause, isPlaying } = useAudio();
	const { playerCharacter, playerPortrait } = useGameState();
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
			Alert.alert('Error', 'Failed to equip item');
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
			Alert.alert('Error', 'Failed to unequip item');
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
		preparedSpells = [],
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

	const handleMainMenu = () => {
		Alert.alert(
			'Return to Main Menu',
			'Are you sure you want to return to the main menu? Any unsaved progress will be lost.',
			[
				{
					text: 'Cancel',
					style: 'cancel',
				},
				{
					text: 'Return to Menu',
					style: 'destructive',
					onPress: () => {
						onClose();
						router.replace('/');
					},
				},
			],
		);
	};

	const handlePortraitChange = async (image: any) => {
		if (!playerCharacter) return;

		let iconValue = '';
		if (typeof image === 'string') {
			iconValue = image;
		} else if (typeof image === 'object' && image.uri) {
			iconValue = image.uri;
		}

		try {
			await updateCharacterMutation.mutateAsync({
				path: `/characters/${playerCharacter.id}`,
				body: { icon: iconValue },
			});
		} catch (error) {
			Alert.alert('Error', 'Failed to update character portrait');
		}
	};

	// Use inventory with equipped status for display
	// Map inventory items to include equipped status
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
	const equippedItems = {
		helmet: resolveEquippedItem('helmet'),
		arms: resolveEquippedItem('arms'),
		chest: resolveEquippedItem('chest'),
		legs: resolveEquippedItem('legs'),
		boots: resolveEquippedItem('boots'),
		mainHand: resolveEquippedItem('mainHand'),
		offHand: resolveEquippedItem('offHand'),
	};

	const filteredInventory = activeSlot
		? inventoryWithStatus.filter(entry => entry.item.slot === activeSlot)
		: inventoryWithStatus;

	return (
		<Modal visible={visible} animationType="slide" transparent>
			<View style={styles.overlay}>
				<ThemedView style={[styles.modalBox, isMobile && styles.modalBoxMobile]}>
					<ScrollView
						contentContainerStyle={
							isMobile ? styles.contentMobile : styles.contentWithPortrait
						}
					>
						<View style={isMobile ? styles.sheetColumn : styles.sheetRow}>
							{/* Portrait & Stats */}
							<View style={isMobile ? styles.mobileSection : styles.leftCol}>
								<View style={styles.portraitBox}>
									<PortraitSelector
										selectedImage={portraitSource as ImageSourcePropType}
										onSelect={handlePortraitChange}
									/>
								</View>
								<Text style={styles.label}>Stats</Text>
								<View
									style={
										isMobile
											? styles.statGridMobile
											: styles.statGridBelowPortrait
									}
								>
									{STAT_KEYS.map(key => (
										<View
											key={key}
											style={[
												isMobile ? styles.statBoxMobile : styles.statBox,
												{ position: 'relative' },
											]}
										>
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
							{/* Info block above Inventory grid */}
							<View style={isMobile ? styles.mobileSection : styles.centerCol}>
								{/* Info block */}
								<View style={styles.infoBlock}>
									<View style={styles.infoRow}>
										<Text style={styles.infoText}>{characterClass}</Text>
										<Text style={styles.infoText}>/ {race}</Text>
										{trait && <Text style={styles.infoText}>/ {trait}</Text>}
										<Text style={styles.infoText}>/ Level {level}</Text>
									</View>
									<Text style={styles.nameText}>{name}</Text>
									<Text style={styles.label}>Background</Text>
									<Text style={styles.value}>{description}</Text>
									<View style={styles.hpApRow}>
										<Text style={styles.statText}>
											HP: {health} / {maxHealth}
										</Text>
										<Text style={styles.statText}>
											AP: {actionPoints} / {maxActionPoints}
										</Text>
									</View>
								</View>
								<Text style={styles.label}>Inventory</Text>
								<View
									style={
										isMobile
											? styles.inventoryGridMobile
											: styles.inventoryGridCenter
									}
								>
									{loading ? (
										<Text style={styles.emptyInventory}>
											Loading inventory...
										</Text>
									) : errorMessage ? (
										<Text style={styles.emptyInventory}>
											Error loading inventory: {errorMessage}
										</Text>
									) : filteredInventory.length === 0 ? (
										<Text style={styles.emptyInventory}>No items</Text>
									) : (
										filteredInventory.map(entry => {
											const { item, isEquipped } = entry;
											const isCompatible =
												!activeSlot ||
												item.slot === activeSlot ||
												item.slot === 'none';
											const canEquip = item.slot !== 'none' && isCompatible;

											return (
												<Pressable
													key={String(item.id)}
													android_ripple={
														isMobile
															? {
																color: '#C9B037',
																borderless: false,
															}
															: undefined
													}
													onPress={() => {
														if (activeSlot && canEquip) {
															// If this item is already equipped in the active slot, unequip it
															if (
																isEquipped &&
																entry.equippedSlot === activeSlot
															) {
																handleUnequipSlot(activeSlot);
															} else {
																// Otherwise equip it
																handleAssignItem(item);
															}
														} else if (
															!activeSlot &&
															item.slot !== 'none'
														) {
															setActiveSlot(item.slot as GearSlot);
														}
													}}
													onHoverIn={() =>
														Platform.OS === 'web' &&
														!isMobile &&
														setTooltipSkill(item.id as string)
													}
													onHoverOut={() =>
														Platform.OS === 'web' &&
														!isMobile &&
														setTooltipSkill(null)
													}
													style={[
														isMobile
															? styles.inventoryItemBoxMobile
															: styles.inventoryItemBox,
														isEquipped && styles.inventoryItemEquipped,
														!isCompatible &&
														styles.inventoryItemIncompatible,
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
																			size={48}
																		/>
																	) : null;
																})()
															) : (
																<Image
																	source={item.icon as ImageSourcePropType}
																	style={styles.inventoryIconLarge}
																/>
															)
													) : null}
													{isEquipped && (
														<View style={styles.equippedIndicator}>
															<Text style={styles.equippedText}>
																*
															</Text>
														</View>
													)}
													{tooltipSkill === item.id && (
														<View
															style={[styles.tooltipOverlay, { pointerEvents: 'none' }]}
														>
															<View
																style={styles.tooltipOverIconBg}
															/>
															<View
																style={styles.tooltipOverIconLabel}
															>
																<Text
																	style={styles.tooltipText}
																	numberOfLines={2}
																	adjustsFontSizeToFit
																	minimumFontScale={0.7}
																>
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
								{/* Spell Preparation Section */}
								<Text style={styles.label}>Prepared Spells</Text>
								<View style={styles.spellListContainer}>
									{getSpellsForClass(characterClass, level).map(spell => {
										const isPrepared = preparedSpells.includes(spell.id);
										return (
											<TouchableOpacity
												key={spell.id}
												style={[
													styles.spellItem,
													isPrepared && styles.spellItemPrepared,
												]}
												onPress={async () => {
													const newPreparedSpells = isPrepared
														? preparedSpells.filter(id => id !== spell.id)
														: [...preparedSpells, spell.id];
													try {
														await updateCharacterMutation.mutateAsync({
															path: `/characters/${playerCharacter.id}`,
															body: {
																preparedSpells: newPreparedSpells,
															},
														});
													} catch (error) {
														Alert.alert('Error', 'Failed to update prepared spells');
													}
												}}
											>
												<Text style={[styles.spellName, isPrepared && styles.spellNamePrepared]}>
													{spell.name}
												</Text>
												<Text style={styles.spellLevel}>Level {spell.level}</Text>
												{isPrepared && <Text style={styles.spellPreparedMark}>✓</Text>}
											</TouchableOpacity>
										);
									})}
									{getSpellsForClass(characterClass, level).length === 0 && (
										<Text style={styles.emptyInventory}>
											No spells available for {characterClass}
										</Text>
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
												style={[
													styles.gearSlot,
													activeSlot === 'helmet' &&
													styles.gearSlotActive,
												]}
												onPress={() => handleSlotPress('helmet')}
											>
												{equippedItems.helmet ? (
													<Image
														source={
															equippedItems.helmet
																.icon as ImageSourcePropType
														}
														style={styles.gearIcon}
													/>
												) : (
													<Image
														source={
															require('../assets/images/gear-slot/helmet.png') as ImageSourcePropType
														}
														style={styles.gearIcon}
													/>
												)}
												<Text style={styles.gearLabel}>Helmet</Text>
											</TouchableOpacity>
										</View>
										{/* Arms + Chest */}
										<View style={styles.gearRowArmsChest}>
											<View style={styles.gearColArmHand}>
												<TouchableOpacity
													style={[
														styles.gearSlot,
														styles.gearSlotArm,
														activeSlot === 'arms' &&
													styles.gearSlotActive,
													]}
													onPress={() => handleSlotPress('arms')}
												>
													{equippedItems.arms ? (
														<Image
															source={
															equippedItems.arms
																.icon as ImageSourcePropType
															}
															style={styles.gearIcon}
														/>
													) : (
														<Image
															source={
																require('../assets/images/gear-slot/left-arm.png') as ImageSourcePropType
															}
															style={styles.gearIcon}
														/>
													)}
													<Text style={styles.gearLabel}>Arms</Text>
												</TouchableOpacity>
											</View>
											<TouchableOpacity
												style={[
													styles.gearSlot,
													styles.gearSlotChest,
													activeSlot === 'chest' && styles.gearSlotActive,
												]}
												onPress={() => handleSlotPress('chest')}
											>
												{equippedItems.chest ? (
													<Image
														source={
															equippedItems.chest
																.icon as ImageSourcePropType
														}
														style={styles.gearIcon}
													/>
												) : (
													<Image
														source={
															require('../assets/images/gear-slot/chest.png') as ImageSourcePropType
														}
														style={styles.gearIcon}
													/>
												)}
												<Text style={styles.gearLabel}>Chest</Text>
											</TouchableOpacity>
											<View style={styles.gearColArmHand}>
												<TouchableOpacity
													style={[
														styles.gearSlot,
														styles.gearSlotArm,
														activeSlot === 'arms' &&
													styles.gearSlotActive,
													]}
													onPress={() => handleSlotPress('arms')}
												>
													{equippedItems.arms ? (
														<Image
															source={
															equippedItems.arms
																.icon as ImageSourcePropType
															}
															style={styles.gearIcon}
														/>
													) : (
														<Image
															source={
																require('../assets/images/gear-slot/right-arm.png') as ImageSourcePropType
															}
															style={styles.gearIcon}
														/>
													)}
													<Text style={styles.gearLabel}>Arms</Text>
												</TouchableOpacity>
											</View>
										</View>
										{/* Legs */}
										<View style={styles.gearRowCenter}>
											{/* Main Hand below L-Arm */}
											<TouchableOpacity
												style={[
													styles.gearSlot,
													styles.gearSlotHand,
													activeSlot === 'mainHand' &&
													styles.gearSlotActive,
												]}
												onPress={() => handleSlotPress('mainHand')}
											>
												{equippedItems.mainHand ? (
													<Image
														source={
															equippedItems.mainHand
																.icon as ImageSourcePropType
														}
														style={styles.gearIcon}
													/>
												) : (
													<Image
														source={
															require('../assets/images/gear-slot/main-hand.png') as ImageSourcePropType
														}
														style={styles.gearIcon}
													/>
												)}
												<Text style={styles.gearLabel}>Main Hand</Text>
											</TouchableOpacity>
											<TouchableOpacity
												style={[
													styles.gearSlot,
													activeSlot === 'legs' && styles.gearSlotActive,
												]}
												onPress={() => handleSlotPress('legs')}
											>
												{equippedItems.legs ? (
													<Image
														source={
															equippedItems.legs
																.icon as ImageSourcePropType
														}
														style={styles.gearIcon}
													/>
												) : (
													<Image
														source={
															require('../assets/images/gear-slot/legs.png') as ImageSourcePropType
														}
														style={styles.gearIcon}
													/>
												)}
												<Text style={styles.gearLabel}>Legs</Text>
											</TouchableOpacity>
											{/* Off Hand below R-Arm */}
											<TouchableOpacity
												style={[
													styles.gearSlot,
													styles.gearSlotHand,
													activeSlot === 'offHand' &&
													styles.gearSlotActive,
												]}
												onPress={() => handleSlotPress('offHand')}
											>
												{equippedItems.offHand ? (
													<Image
														source={
															equippedItems.offHand
																.icon as ImageSourcePropType
														}
														style={styles.gearIcon}
													/>
												) : (
													<Image
														source={
															require('../assets/images/gear-slot/off-hand.png') as ImageSourcePropType
														}
														style={styles.gearIcon}
													/>
												)}
												<Text style={styles.gearLabel}>Off Hand</Text>
											</TouchableOpacity>
										</View>
										{/* Boots */}
										<View style={styles.gearRowCenter}>
											<TouchableOpacity
												style={[
													styles.gearSlot,
													activeSlot === 'boots' && styles.gearSlotActive,
												]}
												onPress={() => handleSlotPress('boots')}
											>
												{equippedItems.boots ? (
													<Image
														source={
															equippedItems.boots
																.icon as ImageSourcePropType
														}
														style={styles.gearIcon}
													/>
												) : (
													<Image
														source={
															require('../assets/images/gear-slot/boots.png') as ImageSourcePropType
														}
														style={styles.gearIcon}
													/>
												)}
												<Text style={styles.gearLabel}>Boots</Text>
											</TouchableOpacity>
										</View>
									</View>
								</View>
								{/* Skills grid below gear */}
								<Text style={styles.label}>Skills</Text>
								<View style={styles.skillsGrid}>
									{SKILL_LIST.filter(skill => skills.includes(skill.id)).map(
										skill => (
											<View
												key={String(skill.id)}
												style={[styles.skillIconCard, { position: 'relative' }]}
											>
												<TouchableOpacity
													style={styles.skillInfoButton}
													onPress={() => setInfoSkill(infoSkill === skill.id ? null : skill.id)}
												>
													<Text style={styles.infoButtonText}>?</Text>
												</TouchableOpacity>
												<Image
													source={skill.image as ImageSourcePropType}
													style={styles.skillIconFlat}
												/>
											</View>
										),
									)}
								</View>
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
					{/* Button row - only show if allowClose is true (not in long rest mode) */}
					{allowClose && (
						<View style={isMobile ? styles.buttonRowMobile : styles.buttonRow}>
							{/* Music control button */}
							<TouchableOpacity
								style={isMobile ? styles.actionButtonMobile : styles.actionButton}
								onPress={togglePlayPause}
								accessibilityLabel={
									isPlaying ? 'Mute background music' : 'Unmute background music'
								}
							>
								<Feather
									name={isPlaying ? 'volume-2' : 'volume-x'}
									size={isMobile ? 16 : 18}
									color={isPlaying ? '#4caf50' : '#f44336'}
									style={{ marginRight: 6 }}
								/>
								<Text
									style={[
										styles.actionButtonText,
										{ color: isPlaying ? '#4caf50' : '#f44336' },
									]}
								>
									{isPlaying ? 'Mute' : 'Unmute'}
								</Text>
							</TouchableOpacity>

							{/* Main menu button */}
							<TouchableOpacity
								style={isMobile ? styles.actionButtonMobile : styles.actionButton}
								onPress={handleMainMenu}
							>
								<Feather
									name="home"
									size={isMobile ? 16 : 18}
									color="#3B2F1B"
									style={{ marginRight: 6 }}
								/>
								<Text style={styles.actionButtonText}>Main Menu</Text>
							</TouchableOpacity>

							{/* Close button */}
							<TouchableOpacity
								style={isMobile ? styles.closeButtonMobile : styles.closeButton}
								onPress={onClose}
							>
								<Text style={styles.closeButtonText}>Close</Text>
							</TouchableOpacity>
						</View>
					)}
				</ThemedView>
			</View>
		</Modal>
	);
};
