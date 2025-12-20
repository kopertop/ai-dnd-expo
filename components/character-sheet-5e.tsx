import { useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Image,
    ImageSourcePropType,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { getEquipmentSpritesheet } from '@/components/equipment-spritesheet';
import { PortraitSelector } from '@/components/portrait-selector';
import { SpriteIcon } from '@/components/sprite-icon';
import { CLASSES } from '@/constants/classes';
import { SKILL_DESCRIPTIONS, SKILL_LIST } from '@/constants/skills';
import { ATTRIBUTE_DESCRIPTIONS, STAT_KEYS } from '@/constants/stats';
import { useUpdateCharacter } from '@/hooks/api/use-character-queries';
import { Character } from '@/types/character';
import { CHARACTER_IMAGE_OPTIONS } from '@/types/character-figure';
import { GEAR_SLOTS, GearSlot, StatKey } from '@/types/stats';
import {
    calculateAC,
    calculatePassivePerception,
    calculateProficiencyBonus,
} from '@/utils/combat-utils';

interface CharacterSheet5eProps {
	character: Character;
	onCharacterUpdated?: (character: Character) => void;
	// Optional props for character creation mode
	editableName?: boolean;
	onNameChange?: (name: string) => void;
	onRandomizeName?: () => void;
	editableBackground?: boolean;
	onBackgroundChange?: (description: string) => void;
	onRandomizeBackground?: () => void;
	// Read-only mode for viewing other players' characters
	readOnly?: boolean;
	isAdminViewingOther?: boolean;
}

type InventoryEntry = {
	id: string;
	name?: string;
	slot?: GearSlot | string;
	description?: string;
	damage?: string;
	damageType?: string;
	[key: string]: any;
};

const abilityModifier = (score: number) => Math.floor((score - 10) / 2);

const resolveCharacterImage = (icon?: string) => {
	if (!icon) return undefined;
	// Check if it's a preset key
	const match = CHARACTER_IMAGE_OPTIONS.find(option => option.key === icon);
	if (match) return match.source;
	// Otherwise assume it's a URI or already a resolved source
	return { uri: icon };
};

export const CharacterSheet5e: React.FC<CharacterSheet5eProps> = ({
	character,
	onCharacterUpdated,
	editableName = false,
	onNameChange,
	onRandomizeName,
	editableBackground = false,
	onBackgroundChange,
	onRandomizeBackground,
	readOnly = false,
	isAdminViewingOther = false,
}) => {
	const [sheetCharacter, setSheetCharacter] = useState<Character>(character);
	const [infoAttribute, setInfoAttribute] = useState<StatKey | null>(null);
	const [infoSkill, setInfoSkill] = useState<string | null>(null);
	const [activeSlot, setActiveSlot] = useState<GearSlot | null>(null);
	const [notesDraft, setNotesDraft] = useState(character.description ?? '');

	const queryClient = useQueryClient();
	const updateCharacter = useUpdateCharacter();

	useEffect(() => {
		setSheetCharacter(character);
		setNotesDraft(character.description ?? '');
	}, [character]);

	const abilityMods = useMemo(
		() =>
			STAT_KEYS.reduce(
				(acc, key) => ({
					...acc,
					[key]: abilityModifier(sheetCharacter.stats?.[key] ?? 10),
				}),
				{} as Record<string, number>,
			),
		[sheetCharacter.stats],
	);

	const proficiency = calculateProficiencyBonus(sheetCharacter.level);
	const armorClass = useMemo(() => calculateAC(sheetCharacter), [sheetCharacter]);

	const initiative = abilityMods.DEX ?? 0;
	const passivePerception = calculatePassivePerception(sheetCharacter);

	const skillEntries = useMemo(
		() =>
			SKILL_LIST.map(skill => {
				const isProficient = sheetCharacter.skills?.includes(skill.id);
				const baseMod = abilityMods[skill.ability] ?? 0;
				const total = baseMod + (isProficient ? proficiency : 0);
				return {
					...skill,
					isProficient,
					modifier: total,
				};
			}),
		[sheetCharacter.skills, abilityMods, proficiency],
	);

	const equippedLookup = sheetCharacter.equipped || {};
	const inventory = (sheetCharacter.inventory || []) as InventoryEntry[];

	// Debug: Log equipment data
	useEffect(() => {
		if (__DEV__) {
			console.log('[Character Sheet] Equipment Debug:', {
				equipped: equippedLookup,
				inventoryCount: inventory.length,
				inventoryItems: inventory.map(item => ({ id: item.id, name: item.name, slot: item.slot })),
				equippedSlots: Object.entries(equippedLookup)
					.filter(([_, value]) => value !== null)
					.map(([slot, itemId]) => ({
						slot,
						itemId,
						foundInInventory: inventory.find(item => item.id === itemId) !== undefined,
					})),
			});
		}
	}, [equippedLookup, inventory]);

	const resolveEquippedItem = (slot: GearSlot) => {
		const equippedEntry = (equippedLookup as Record<GearSlot, any>)[slot];
		if (!equippedEntry) {
			return undefined;
		}
		return typeof equippedEntry === 'string'
			? inventory.find(item => item.id === equippedEntry)
			: equippedEntry;
	};

	const updateSheetState = (updated: Character) => {
		setSheetCharacter(updated);
		setNotesDraft(updated.description ?? '');
		onCharacterUpdated?.(updated);
	};

	const persistUpdate = async (updates: Partial<Character>) => {
		if (readOnly) {
			Alert.alert('Read-only', 'You cannot modify this character.');
			return;
		}

		const previous = sheetCharacter;
		const optimistic = { ...sheetCharacter, ...updates };
		setSheetCharacter(optimistic);

		try {
			const response = await updateCharacter.mutateAsync({
				path: `/characters/${sheetCharacter.id}`,
				body: updates,
			});

			const updated = (response as any)?.character
				? ((response as any).character as Character)
				: optimistic;

			updateSheetState(updated);
			queryClient.setQueryData(['api', `/characters/${sheetCharacter.id}`], {
				character: updated,
			});
			queryClient.invalidateQueries({ queryKey: ['/characters'] });
		} catch (error) {
			setSheetCharacter(previous);
			Alert.alert(
				'Update failed',
				error instanceof Error ? error.message : 'Unable to save changes right now.',
			);
		}
	};

	const handleEquip = async (slot: GearSlot, item: InventoryEntry) => {
		if (readOnly) return;
		const updatedEquipped = { ...equippedLookup, [slot]: item.id };
		await persistUpdate({ equipped: updatedEquipped as Character['equipped'] });
		setActiveSlot(null);
	};

	const handleUnequip = async (slot: GearSlot) => {
		if (readOnly) return;
		const updatedEquipped = { ...equippedLookup, [slot]: null };
		await persistUpdate({ equipped: updatedEquipped as Character['equipped'] });
		setActiveSlot(null);
	};

	const saveNotes = async () => {
		await persistUpdate({ description: notesDraft });
	};

	const equippedItems = useMemo(
		() =>
			GEAR_SLOTS.filter(slot => slot !== 'none').map(slot => ({
				slot,
				item: resolveEquippedItem(slot as GearSlot),
			})),
		[sheetCharacter.equipped, inventory],
	);

	const slotOptions = activeSlot
		? inventory.filter(entry => entry.slot === activeSlot)
		: [];

	const renderEquipmentTile = (
		slot: GearSlot,
		wide: boolean = false,
		uniqueKey?: string,
		labelOverride?: string,
	) => {
		const equippedItem = resolveEquippedItem(slot);
		const displayLabel = labelOverride || slot;

		return (
			<Pressable
				key={uniqueKey || slot}
				style={[
					styles.equipTile,
					wide ? styles.equipTileWide : styles.equipTileSquare,
					activeSlot === slot && styles.equipmentSlotActive,
					readOnly && styles.readOnlyTile,
				]}
				onPress={readOnly ? undefined : () => setActiveSlot(prev => (prev === slot ? null : slot))}
				disabled={readOnly}
			>
				<Text style={styles.slotLabel}>{displayLabel}</Text>
				{equippedItem?.icon ? (
					(() => {
						const icon = equippedItem.icon;
						// Check if it's a spritesheet reference object
						if (
							typeof icon === 'object' &&
						'spritesheet' in icon &&
						'x' in icon &&
						'y' in icon &&
						typeof icon.spritesheet === 'string'
						) {
							const spritesheet = getEquipmentSpritesheet();
							if (spritesheet) {
								return (
									<SpriteIcon
										spritesheet={spritesheet}
										coordinates={{ x: icon.x, y: icon.y }}
										size={32}
									/>
								);
							}
						}
						// Otherwise treat as regular image source
						return (
							<Image
								source={icon as ImageSourcePropType}
								style={styles.equipIcon}
								resizeMode="contain"
							/>
						);
					})()
				) : (
					<Text style={styles.slotItem} numberOfLines={1}>
						{equippedItem?.name || '—'}
					</Text>
				)}
				{!readOnly && (
					equippedItem ? (
						<Pressable
							style={styles.slotActionPill}
							onPress={() => handleUnequip(slot)}
						>
							<Text style={styles.slotActionText}>Unequip</Text>
						</Pressable>
					) : (
						<Pressable
							style={[styles.slotActionPill, styles.assignPill]}
							onPress={() => setActiveSlot(slot)}
						>
							<Text style={styles.slotActionText}>Assign</Text>
						</Pressable>
					)
				)}
			</Pressable>
		);
	};

	const headerImage = resolveCharacterImage(sheetCharacter.icon);
	const portraitFallback = sheetCharacter.name?.charAt(0)?.toUpperCase() || '?';
	const storyBlockHeight = Math.max(20 * 18, 320);

	// Find class details for icon prompt generation
	const classDetails = useMemo(() => {
		const classOption = CLASSES.find(c => c.name === sheetCharacter.class);
		return classOption ? {
			name: classOption.name,
			description: classOption.description,
			primaryStats: classOption.primaryStats,
		} : { name: sheetCharacter.class };
	}, [sheetCharacter.class]);

	const handlePortraitSelect = async (image: any, label?: string) => {
		if (readOnly) return;
		// image can be ImageSourcePropType (number) or { uri: string }
		let iconValue = '';
		if (typeof image === 'object' && image.uri) {
			iconValue = image.uri;
		} else if (typeof image === 'number') {
			// It's a required asset (preset)
			// Find the key from options
			const match = CHARACTER_IMAGE_OPTIONS.find(opt => opt.source === image);
			if (match) {
				iconValue = match.key;
			}
		}

		if (iconValue) {
			await persistUpdate({ icon: iconValue });
		}
	};

	return (
		<>
			<ScrollView contentContainerStyle={styles.sheet} showsVerticalScrollIndicator={false}>
				<View style={styles.banner}>
					<View style={styles.portraitFrame}>
						<PortraitSelector
							selectedImage={headerImage as any}
							onSelect={readOnly ? undefined : handlePortraitSelect}
							race={{ name: sheetCharacter.race }}
							classOption={classDetails}
							skills={sheetCharacter.skills || []}
						/>
					</View>
					<View style={styles.bannerInfo}>
						{editableName ? (
							<View style={styles.nameInputRow}>
								<TextInput
									style={styles.nameInput}
									value={sheetCharacter.name}
									onChangeText={(text) => {
										const updated = { ...sheetCharacter, name: text };
										setSheetCharacter(updated);
										onNameChange?.(text);
										onCharacterUpdated?.(updated);
									}}
									placeholder="Character Name"
									placeholderTextColor="#8a6c5a"
								/>
								{onRandomizeName && (
									<TouchableOpacity
										style={styles.randomizeButton}
										onPress={onRandomizeName}
									>
										<Text style={styles.randomizeButtonText}>🎲</Text>
									</TouchableOpacity>
								)}
							</View>
						) : (
							<Text style={styles.sheetTitle}>{sheetCharacter.name}</Text>
						)}
						<Text style={styles.sheetSubtitle}>
							{sheetCharacter.class} • {sheetCharacter.race} • Level {sheetCharacter.level}
						</Text>
						{sheetCharacter.trait ? (
							<View style={styles.traitPill}>
								<Text style={styles.traitIcon}>
									{sheetCharacter.trait.charAt(0).toUpperCase()}
								</Text>
								<Text style={styles.traitText}>{sheetCharacter.trait}</Text>
							</View>
						) : null}
					</View>
					<View style={styles.bannerStats}>
						<View style={styles.bannerStat}>
							<Text style={styles.bannerStatLabel}>AC</Text>
							<Text style={styles.bannerStatValue}>{armorClass ?? '--'}</Text>
						</View>
						<View style={styles.bannerStat}>
							<Text style={styles.bannerStatLabel}>Initiative</Text>
							<Text style={styles.bannerStatValue}>
								{initiative >= 0 ? '+' : ''}
								{initiative}
							</Text>
						</View>
						<View style={styles.bannerStat}>
							<Text style={styles.bannerStatLabel}>Passive Perception</Text>
							<Text style={styles.bannerStatValue}>{passivePerception}</Text>
						</View>
					</View>
				</View>

				<View style={styles.columns}>
					<View style={styles.leftColumn}>
						<View style={styles.block}>
							<Text style={styles.blockHeading}>Abilities</Text>
							<View style={styles.abilitiesGrid}>
								{STAT_KEYS.map(key => (
									<View key={key} style={[styles.abilityCircle, { position: 'relative' }]}>
										<TouchableOpacity
											style={styles.infoButton}
											onPress={() => setInfoAttribute(infoAttribute === key ? null : key)}
										>
											<Text style={styles.infoButtonText}>?</Text>
										</TouchableOpacity>
										<Text style={styles.abilityKey}>{key}</Text>
										<Text style={styles.abilityScore}>
											{sheetCharacter.stats?.[key] ?? 10}
										</Text>
										<Text style={styles.abilityMod}>
											{abilityMods[key] >= 0 ? '+' : ''}
											{abilityMods[key]}
										</Text>
									</View>
								))}
							</View>
						</View>

						<View style={styles.block}>
							<Text style={styles.blockHeading}>Skills & Proficiencies</Text>
							<View style={styles.skillIconGrid}>
								{skillEntries.map(skill => (
									<View
										key={skill.id}
										style={[
											styles.skillIconTile,
											skill.isProficient && styles.skillIconTileActive,
											{ position: 'relative' },
										]}
									>
										<TouchableOpacity
											style={styles.skillInfoButton}
											onPress={() => setInfoSkill(infoSkill === skill.id ? null : skill.id)}
										>
											<Text style={styles.infoButtonText}>?</Text>
										</TouchableOpacity>
										{skill.image ? (
											<Image
												source={skill.image as ImageSourcePropType}
												style={styles.skillIcon}
												resizeMode="contain"
											/>
										) : (
											<View style={styles.skillIconFallback}>
												<Text style={styles.skillIconFallbackText}>
													{skill.name.charAt(0)}
												</Text>
											</View>
										)}
										<Text style={styles.skillIconLabel} numberOfLines={1}>
											{skill.name}
										</Text>
										<Text style={styles.skillIconMod}>
											{skill.modifier >= 0 ? '+' : ''}
											{skill.modifier}
										</Text>
									</View>
								))}
							</View>
						</View>

						<View style={styles.storyBlock}>
							<Text style={styles.blockHeading}>Background / Goals / Notes</Text>
							<TextInput
								style={[
									styles.textArea,
									styles.fullWidthInput,
									{ minHeight: storyBlockHeight },
									readOnly && styles.readOnlyInput,
								]}
								multiline
								placeholder="Tell this hero's story, goals, and notes..."
								placeholderTextColor="#8a6c5a"
								value={editableBackground ? (sheetCharacter.description ?? '') : notesDraft}
								onChangeText={(text) => {
									if (readOnly) return;
									if (editableBackground) {
										const updated = { ...sheetCharacter, description: text };
										setSheetCharacter(updated);
										onBackgroundChange?.(text);
										onCharacterUpdated?.(updated);
									} else {
										setNotesDraft(text);
									}
								}}
								textAlignVertical="top"
								editable={!readOnly}
							/>
							{!readOnly && (
								<View style={styles.actionButtonsRow}>
									{editableBackground && onRandomizeBackground ? (
										<>
											<Pressable
												style={[styles.randomizeBackgroundButton, styles.actionButtonHalf]}
												onPress={onRandomizeBackground}
											>
												<Text style={styles.randomizeBackgroundButtonText}>🎲 Randomize</Text>
											</Pressable>
											<Pressable
												style={[styles.saveBackgroundButton, styles.actionButtonHalf, updateCharacter.isPending && styles.buttonDisabled]}
												onPress={saveNotes}
												disabled={updateCharacter.isPending}
											>
												<Text style={styles.saveBackgroundButtonText}>
													{updateCharacter.isPending ? 'Saving...' : 'Save'}
												</Text>
											</Pressable>
										</>
									) : (
										<Pressable
											style={[styles.saveBackgroundButton, updateCharacter.isPending && styles.buttonDisabled]}
											onPress={saveNotes}
											disabled={updateCharacter.isPending}
										>
											<Text style={styles.saveBackgroundButtonText}>
												{updateCharacter.isPending ? 'Saving...' : 'Save'}
											</Text>
										</Pressable>
									)}
								</View>
							)}
						</View>
					</View>

					<View style={styles.rightColumn}>
						<View style={styles.block}>
							<Text style={styles.blockHeading}>Combat</Text>
							<View style={styles.combatRow}>
								<View style={styles.combatBox}>
									<Text style={styles.combatLabel}>Hit Points</Text>
									<Text style={styles.combatValue}>
										{sheetCharacter.health} / {sheetCharacter.maxHealth}
									</Text>
								</View>
								<View style={styles.combatBox}>
									<Text style={styles.combatLabel}>Action Points</Text>
									<Text style={styles.combatValue}>
										{sheetCharacter.actionPoints} / {sheetCharacter.maxActionPoints}
									</Text>
								</View>
							</View>
						</View>

						<View style={styles.block}>
							<Text style={styles.blockHeading}>Equipment</Text>
							<View style={styles.paperDoll}>
								<View style={styles.dollRow}>
									<View style={styles.dollSpacer} />
									{renderEquipmentTile('helmet')}
									<View style={styles.dollSpacer} />
								</View>
								<View style={styles.dollRow}>
									{renderEquipmentTile('mainHand')}
									{renderEquipmentTile('chest', true)}
									{renderEquipmentTile('offHand')}
								</View>
								<View style={styles.dollRow}>
									{renderEquipmentTile('arms', false, 'arms-left')}
									{renderEquipmentTile('legs')}
									{renderEquipmentTile('arms', false, 'arms-right')}
								</View>
								<View style={styles.dollRow}>
									<View style={styles.dollSpacer} />
									{renderEquipmentTile('boots')}
									<View style={styles.dollSpacer} />
								</View>
								<View style={styles.ringRow}>
									{renderEquipmentTile('accessory', true, 'ring-1', 'Ring 1')}
									{renderEquipmentTile('accessory', true, 'ring-2', 'Ring 2')}
								</View>
							</View>
							<Modal visible={!!activeSlot} transparent animationType="fade">
								<View style={styles.modalOverlay}>
									<View style={styles.modalContent}>
										<Text style={styles.modalTitle}>Choose {activeSlot}</Text>
										<ScrollView style={styles.modalList}>
											{slotOptions.length === 0 ? (
												<Text style={styles.helperText}>No compatible gear in inventory.</Text>
											) : (
												slotOptions.map(item => (
													<Pressable
														key={item.id}
														style={styles.modalItem}
														onPress={() => activeSlot && handleEquip(activeSlot, item)}
													>
														<Text style={styles.modalItemName}>{item.name || 'Item'}</Text>
														<Text style={styles.modalItemDetail}>{item.slot}</Text>
														{item.damage && (
															<Text style={styles.modalItemDetail}>
																{item.damage} {item.damageType || ''}
															</Text>
														)}
													</Pressable>
												))
											)}
										</ScrollView>
										<Pressable
											style={[styles.actionButton, styles.secondaryButton]}
											onPress={() => setActiveSlot(null)}
										>
											<Text style={styles.secondaryButtonText}>Close</Text>
										</Pressable>
									</View>
								</View>
							</Modal>
						</View>

						<View style={styles.block}>
							<Text style={styles.blockHeading}>Attacks & Spells</Text>
							{sheetCharacter.preparedSpells?.length ? (
								<View style={styles.tagGrid}>
									{sheetCharacter.preparedSpells.map(spell => (
										<Text key={spell} style={styles.tag}>
											{spell}
										</Text>
									))}
								</View>
							) : (
								<Text style={styles.helperText}>No prepared spells yet.</Text>
							)}
						</View>

						<View style={styles.block}>
							<Text style={styles.blockHeading}>Inventory</Text>
							{inventory.length === 0 ? (
								<Text style={styles.helperText}>Pack is empty.</Text>
							) : (
								<View style={styles.inventoryList}>
									{inventory.map(item => {
										const equippedSlot = Object.entries(equippedLookup).find(
											([, value]) => (typeof value === 'string' ? value : (value as any)?.id) === item.id,
										)?.[0] as GearSlot | undefined;
										const canEquip =
										item.slot && item.slot !== 'none' && GEAR_SLOTS.includes(item.slot as GearSlot);
										return (
											<View key={item.id} style={styles.inventoryRow}>
												<View style={{ flex: 1 }}>
													<Text style={styles.inventoryName}>{item.name || 'Item'}</Text>
													<Text style={styles.inventoryMeta}>
														{item.slot || 'loot'}
														{item.damage ? ` • ${item.damage}` : ''}
													</Text>
													{item.description ? (
														<Text style={styles.inventoryDescription} numberOfLines={2}>
															{item.description}
														</Text>
													) : null}
												</View>
												{canEquip ? (
													<Pressable
														style={[
															styles.actionButton,
															styles.smallButton,
															updateCharacter.isPending && styles.buttonDisabled,
														]}
														disabled={updateCharacter.isPending}
														onPress={() =>
															equippedSlot
																? handleUnequip(equippedSlot)
																: handleEquip(item.slot as GearSlot, item)
														}
													>
														<Text style={styles.actionButtonText}>
															{equippedSlot ? 'Unequip' : 'Equip'}
														</Text>
													</Pressable>
												) : (
													<Text style={styles.helperText}>Not equippable</Text>
												)}
											</View>
										);
									})}
								</View>
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
		</>
	);
};

const baseFont = 'Georgia';

const styles = StyleSheet.create({
	sheet: {
		padding: 16,
		backgroundColor: '#f5ecdb',
		gap: 14,
	},
	banner: {
		backgroundColor: '#f2e4cb',
		borderWidth: 1,
		borderColor: '#cbb08a',
		borderRadius: 14,
		padding: 16,
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 12,
	},
	portraitFrame: {
		width: 80,
		height: 80,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: '#cbb08a',
		overflow: 'visible',
		backgroundColor: '#fffaf0',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 2,
	},
	portraitImage: { width: '100%', height: '100%' },
	portraitFallback: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	portraitFallbackText: {
		fontSize: 28,
		color: '#2a160e',
		fontWeight: '800',
		fontFamily: baseFont,
	},
	bannerInfo: { flex: 1, gap: 6 },
	nameInputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	nameInput: {
		flex: 1,
		fontSize: 26,
		fontWeight: '700',
		color: '#2a160e',
		fontFamily: baseFont,
		backgroundColor: '#fffaf0',
		borderWidth: 1,
		borderColor: '#d4b58e',
		borderRadius: 8,
		padding: 8,
	},
	randomizeButton: {
		width: 44,
		height: 44,
		backgroundColor: '#C9B037',
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},
	randomizeButtonText: {
		fontSize: 20,
	},
	sheetTitle: {
		fontSize: 26,
		fontWeight: '700',
		color: '#2a160e',
		fontFamily: baseFont,
	},
	sheetSubtitle: {
		fontSize: 15,
		color: '#6b4c35',
		fontFamily: baseFont,
	},
	traitPill: {
		marginTop: 6,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		backgroundColor: '#f7efe0',
		borderWidth: 1,
		borderColor: '#d4b58e',
		alignSelf: 'flex-start',
	},
	traitIcon: {
		width: 24,
		height: 24,
		borderRadius: 12,
		textAlign: 'center',
		textAlignVertical: 'center',
		color: '#fffaf0',
		backgroundColor: '#8b1a1a',
		fontWeight: '800',
	},
	traitText: {
		color: '#2a160e',
		fontWeight: '700',
		fontFamily: baseFont,
	},
	bannerStats: {
		flexDirection: 'row',
		gap: 10,
		alignItems: 'center',
	},
	bannerStat: {
		minWidth: 86,
		paddingVertical: 8,
		paddingHorizontal: 10,
		borderWidth: 1,
		borderColor: '#cbb08a',
		borderRadius: 10,
		backgroundColor: '#fff7ea',
	},
	bannerStatLabel: {
		fontSize: 11,
		color: '#7b5a3a',
		textTransform: 'uppercase',
		fontFamily: baseFont,
	},
	bannerStatValue: {
		fontSize: 16,
		fontWeight: '700',
		color: '#2a160e',
		fontFamily: baseFont,
		marginTop: 2,
	},
	columns: {
		flexDirection: 'row',
		gap: 16,
	},
	storyBlock: {
		backgroundColor: '#fffaf0',
		borderWidth: 1,
		borderColor: '#cbb08a',
		borderRadius: 12,
		padding: 14,
		gap: 10,
	},
	leftColumn: { flex: 1, gap: 12 },
	rightColumn: { flex: 1, gap: 12 },
	block: {
		backgroundColor: '#fffaf0',
		borderWidth: 1,
		borderColor: '#cbb08a',
		borderRadius: 12,
		padding: 12,
		gap: 10,
	},
	blockHeading: {
		fontSize: 17,
		color: '#2a160e',
		fontWeight: '700',
		fontFamily: baseFont,
		borderBottomWidth: 1,
		borderBottomColor: '#d4b58e',
		paddingBottom: 6,
	},
	abilitiesGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	abilityCircle: {
		width: 90,
		height: 110,
		borderWidth: 1,
		borderColor: '#b08d64',
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f8f0dd',
	},
	abilityKey: {
		color: '#6b4c35',
		fontWeight: '700',
		fontFamily: baseFont,
	},
	abilityScore: {
		fontSize: 28,
		fontWeight: '800',
		color: '#2a160e',
		fontFamily: baseFont,
	},
	abilityMod: {
		color: '#8b1a1a',
		fontWeight: '700',
		fontFamily: baseFont,
		marginTop: 4,
	},
	skillList: { gap: 8 },
	skillIconGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	skillIconTile: {
		width: 90,
		alignItems: 'center',
		padding: 8,
		borderWidth: 1,
		borderColor: '#d4b58e',
		borderRadius: 10,
		backgroundColor: '#f7efe0',
		gap: 4,
	},
	skillIconTileActive: {
		borderColor: '#8b1a1a',
	},
	skillIcon: { width: 36, height: 36 },
	skillIconFallback: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: '#e8d7b8',
		alignItems: 'center',
		justifyContent: 'center',
	},
	skillIconFallbackText: {
		color: '#2a160e',
		fontWeight: '700',
		fontFamily: baseFont,
	},
	skillIconLabel: {
		color: '#2a160e',
		fontSize: 11,
		textAlign: 'center',
		fontFamily: baseFont,
	},
	skillIconMod: {
		color: '#8b1a1a',
		fontWeight: '700',
		fontFamily: baseFont,
	},
	textArea: {
		minHeight: 80,
		borderWidth: 1,
		borderColor: '#d4b58e',
		borderRadius: 8,
		padding: 10,
		color: '#2a160e',
		fontFamily: baseFont,
		backgroundColor: '#fff',
	},
	traitInput: { minHeight: 44 },
	fullWidthInput: {
		width: '100%',
	},
	largeTextArea: {
		minHeight: 140,
	},
	actionButtonsRow: {
		flexDirection: 'row',
		gap: 8,
		marginTop: 12,
	},
	actionButton: {
		backgroundColor: '#8b1a1a',
		borderRadius: 8,
		paddingVertical: 10,
		paddingHorizontal: 12,
		alignItems: 'center',
	},
	actionButtonHalf: {
		flex: 1,
	},
	randomizeBackgroundButton: {
		backgroundColor: '#C9B037',
		borderRadius: 8,
		paddingVertical: 10,
		paddingHorizontal: 12,
		alignItems: 'center',
	},
	randomizeBackgroundButtonText: {
		color: '#3B2F1B',
		fontWeight: '700',
		fontFamily: baseFont,
	},
	saveBackgroundButton: {
		backgroundColor: '#4caf50',
		borderRadius: 8,
		paddingVertical: 10,
		paddingHorizontal: 12,
		alignItems: 'center',
	},
	saveBackgroundButtonText: {
		color: '#FFFFFF',
		fontWeight: '700',
		fontFamily: baseFont,
	},
	secondaryButton: {
		backgroundColor: '#f2e4cb',
		borderWidth: 1,
		borderColor: '#cbb08a',
	},
	actionButtonText: {
		color: '#fffaf0',
		fontWeight: '700',
		fontFamily: baseFont,
	},
	secondaryButtonText: {
		color: '#2a160e',
		fontWeight: '700',
		fontFamily: baseFont,
	},
	buttonDisabled: { opacity: 0.6 },
	combatRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
	combatBox: {
		flex: 1,
		minWidth: 180,
		padding: 10,
		borderWidth: 1,
		borderColor: '#d4b58e',
		borderRadius: 10,
		backgroundColor: '#f7efe0',
		gap: 6,
	},
	combatLabel: { color: '#6b4c35', fontWeight: '700', fontFamily: baseFont },
	combatValue: {
		color: '#2a160e',
		fontWeight: '700',
		fontSize: 18,
		fontFamily: baseFont,
	},
	tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	tag: {
		backgroundColor: '#f2e4cb',
		borderRadius: 8,
		paddingHorizontal: 10,
		paddingVertical: 6,
		color: '#2a160e',
		fontWeight: '700',
		fontFamily: baseFont,
		borderWidth: 1,
		borderColor: '#cbb08a',
	},
	helperText: { color: '#7b5a3a', fontFamily: baseFont },
	paperDoll: { gap: 8, alignItems: 'center' },
	dollRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 10,
	},
	dollSpacer: { width: 80 },
	ringRow: {
		flexDirection: 'row',
		gap: 12,
		justifyContent: 'center',
	},
	equipTile: {
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#d4b58e',
		borderRadius: 12,
		backgroundColor: '#f7efe0',
		gap: 6,
		padding: 10,
	},
	equipTileSquare: { width: 96, height: 110 },
	equipTileWide: { width: 140, height: 60, justifyContent: 'center' },
	equipmentSlotActive: {
		borderColor: '#8b1a1a',
		shadowColor: '#8b1a1a',
		shadowOpacity: 0.15,
		shadowOffset: { width: 0, height: 3 },
		shadowRadius: 6,
	},
	slotLabel: { color: '#6b4c35', fontWeight: '700', fontFamily: baseFont },
	slotItem: { color: '#2a160e', fontFamily: baseFont },
	equipIcon: { width: 40, height: 40 },
	slotActionPill: {
		backgroundColor: '#2a160e',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 6,
	},
	assignPill: {
		backgroundColor: '#8b1a1a',
	},
	slotActionText: { color: '#fffaf0', fontWeight: '700', fontFamily: baseFont },
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.35)',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
	},
	modalContent: {
		width: '100%',
		maxWidth: 460,
		backgroundColor: '#fffaf0',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#cbb08a',
		padding: 16,
		gap: 10,
		maxHeight: '70%',
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#2a160e',
		fontFamily: baseFont,
	},
	modalList: { maxHeight: 260 },
	modalItem: {
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#e8d7b8',
	},
	modalItemActive: { backgroundColor: '#f2e4cb' },
	iconRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
	iconThumb: { width: 48, height: 48, borderRadius: 8 },
	modalItemName: {
		color: '#2a160e',
		fontWeight: '700',
		fontFamily: baseFont,
	},
	modalItemDetail: {
		color: '#7b5a3a',
		fontFamily: baseFont,
	},
	inventoryList: { gap: 12 },
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
		zIndex: 10,
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
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
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
	inventoryRow: {
		flexDirection: 'row',
		gap: 10,
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: '#e8d7b8',
		paddingBottom: 10,
	},
	inventoryName: { color: '#2a160e', fontWeight: '700', fontFamily: baseFont },
	inventoryMeta: { color: '#7b5a3a', fontFamily: baseFont },
	inventoryDescription: { color: '#6b4c35', fontFamily: baseFont },
	smallButton: { paddingVertical: 8, paddingHorizontal: 10, alignSelf: 'flex-start' },
	tagline: { color: '#7b5a3a', fontFamily: baseFont },
	readOnlyTile: {
		opacity: 0.6,
	},
	readOnlyInput: {
		backgroundColor: '#f5f5f5',
		color: '#666',
	},
});

export default CharacterSheet5e;
