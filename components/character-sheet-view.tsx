import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
	Alert,
	Image,
	ImageSourcePropType,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';


import { ThemedView } from '@/components/themed-view';
import { SKILL_LIST } from '@/constants/skills';
import { STAT_KEYS } from '@/constants/stats';
import { useAudio } from '@/hooks/use-audio-player';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGameState } from '@/hooks/use-game-state';
import { GearSlot } from '@/types/stats';

export const CharacterSheetView: React.FC = () => {
	const [tooltipSkill, setTooltipSkill] = useState<string | null>(null);
	const [activeSlot, setActiveSlot] = useState<GearSlot | null>(null);
	const { togglePlayPause, isPlaying } = useAudio();
	const { playerCharacter, playerPortrait } = useGameState();
	const colorScheme = useColorScheme();
	
	// TODO: Restore inventory manager
	const loading = false;
	const error = null;
	const inventory: any[] = [];
	const equipped: Record<string, any> = {};
	const equipItem = async () => {};
	const unequipItem = async () => {};

	if (!playerCharacter) return null;

	const {
		name,
		description,
		stats,
		skills = [],
		race,
		class: characterClass,
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
		await equipItem();
		setActiveSlot(null);
	};

	const handleUnequipSlot = async (slot: GearSlot) => {
		await unequipItem();
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
						router.replace('/');
					},
				},
			],
		);
	};

	// Use inventory with equipped status for display
	const filteredInventory = activeSlot
		? inventory.filter(entry => entry.item.slot === activeSlot)
		: inventory;

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
						/>
					</View>
					<View style={styles.characterInfo}>
						<Text style={styles.characterName}>{name}</Text>
						<Text style={styles.characterDetails}>
							{characterClass} / {race} / Level {level}
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
							<View key={key} style={styles.statBox}>
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
							<Pressable
								key={String(skill.id)}
								onPress={() =>
									setTooltipSkill(
										tooltipSkill === skill.id ? null : skill.id,
									)
								}
								style={styles.skillItem}
							>
								<Image
									source={skill.image as ImageSourcePropType}
									style={styles.skillIcon}
								/>
								<Text style={styles.skillName}>{skill.name}</Text>
							</Pressable>
						))}
					</View>
				</View>

				{/* Gear Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Equipment</Text>
					<View style={styles.gearGrid}>
						{(['helmet', 'chest', 'arms', 'legs', 'boots', 'mainHand', 'offHand'] as GearSlot[]).map(slot => (
							<TouchableOpacity
								key={slot}
								style={[
									styles.gearSlot,
									activeSlot === slot && styles.gearSlotActive,
								]}
								onPress={() => handleSlotPress(slot)}
							>
								{equipped[slot] ? (
									<Image
										source={equipped[slot]!.icon as ImageSourcePropType}
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
						))}
					</View>
				</View>

				{/* Inventory Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Inventory</Text>
					<View style={styles.inventoryGrid}>
						{loading ? (
							<Text style={styles.emptyText}>Loading inventory...</Text>
						) : error ? (
							<Text style={styles.emptyText}>Error loading inventory: {error}</Text>
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
												if (isEquipped && entry.equippedSlot === activeSlot) {
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
										<Image
											source={item.icon as ImageSourcePropType}
											style={styles.inventoryIcon}
										/>
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

			{/* Action Buttons */}
			<View style={styles.actionBar}>
				<TouchableOpacity
					style={styles.actionButton}
					onPress={togglePlayPause}
					accessibilityLabel={
						isPlaying ? 'Mute background music' : 'Unmute background music'
					}
				>
					<Feather
						name={isPlaying ? 'volume-2' : 'volume-x'}
						size={16}
						color={isPlaying ? '#4caf50' : '#f44336'}
					/>
					<Text style={[styles.actionButtonText, { color: isPlaying ? '#4caf50' : '#f44336' }]}>
						{isPlaying ? 'Mute' : 'Music'}
					</Text>
				</TouchableOpacity>

				<TouchableOpacity style={styles.actionButton} onPress={handleMainMenu}>
					<Feather name="home" size={16} color="#C9B037" />
					<Text style={styles.actionButtonText}>Menu</Text>
				</TouchableOpacity>
			</View>
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
		paddingBottom: 80, // Space for action bar
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
	},
	portrait: {
		width: 80,
		height: 80,
		borderRadius: 40,
		borderWidth: 2,
		borderColor: '#C9B037',
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
	actionBar: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		flexDirection: 'row',
		justifyContent: 'space-around',
		paddingVertical: 12,
		paddingHorizontal: 16,
		backgroundColor: 'rgba(201, 176, 55, 0.1)',
		borderTopWidth: 1,
		borderTopColor: '#C9B037',
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 8,
		borderRadius: 8,
		backgroundColor: 'rgba(201, 176, 55, 0.2)',
		gap: 4,
	},
	actionButtonText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#C9B037',
	},
});