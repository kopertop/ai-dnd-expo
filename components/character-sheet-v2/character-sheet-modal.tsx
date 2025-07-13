// @ts-nocheck
/**
 * Enhanced Character Sheet Modal - Dynamic, Modular Character Display
 * Supports both player characters and companion NPCs with adaptive UI
 */

import React, { useState, useCallback } from 'react';
import {
	Modal,
	View,
	ScrollView,
	TouchableOpacity,
	StyleSheet,
	Dimensions,
	Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { AnyCharacter } from '@/types/characters';

import { CharacterStatsTab } from './tabs/character-stats-tab';
import { CharacterSkillsTab } from './tabs/character-skills-tab';
import { CharacterEquipmentTab } from './tabs/character-equipment-tab';
import { CharacterSpellsTab } from './tabs/character-spells-tab';
import { CharacterFeaturesTab } from './tabs/character-features-tab';
import { CompanionBehaviorTab } from './tabs/companion-behavior-tab';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type TabType = 'stats' | 'skills' | 'equipment' | 'spells' | 'features' | 'behavior';

interface CharacterSheetModalProps {
	character: AnyCharacter | null;
	visible: boolean;
	onClose: () => void;
	onCharacterUpdate?: (character: AnyCharacter) => void;
	isEditable?: boolean;
}

export const CharacterSheetModal: React.FC<CharacterSheetModalProps> = ({
	character,
	visible,
	onClose,
	onCharacterUpdate,
	isEditable = false,
}) => {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme ?? 'light'];
	const styles = createStyles(colors);

	const [activeTab, setActiveTab] = useState<TabType>('stats');
	const [isEditing, setIsEditing] = useState(false);

	/**
	 * Handle character updates from child components
	 */
	const handleCharacterUpdate = useCallback((updates: Partial<AnyCharacter>) => {
		if (!character || !onCharacterUpdate) return;
		
		const updatedCharacter = {
			...character,
			...updates,
			updatedAt: Date.now(),
		};
		
		onCharacterUpdate(updatedCharacter);
	}, [character, onCharacterUpdate]);

	/**
	 * Toggle edit mode
	 */
	const toggleEditMode = useCallback(() => {
		setIsEditing(prev => !prev);
	}, []);

	/**
	 * Get available tabs based on character type
	 */
	const getAvailableTabs = useCallback((): { key: TabType; label: string; icon: string }[] => {
		if (!character) return [];

		const baseTabs = [
			{ key: 'stats' as TabType, label: 'Stats', icon: 'bar-chart-2' },
			{ key: 'skills' as TabType, label: 'Skills', icon: 'target' },
			{ key: 'equipment' as TabType, label: 'Equipment', icon: 'shield' },
			{ key: 'features' as TabType, label: 'Features', icon: 'star' },
		];

		// Add spells tab for spellcasters
		if (character.progression.spellcasting) {
			baseTabs.splice(3, 0, { key: 'spells' as TabType, label: 'Spells', icon: 'zap' });
		}

		// Add behavior tab for companions
		if (character.type === 'companion') {
			baseTabs.push({ key: 'behavior' as TabType, label: 'Behavior', icon: 'settings' });
		}

		return baseTabs;
	}, [character]);

	/**
	 * Render tab content based on active tab
	 */
	const renderTabContent = useCallback(() => {
		if (!character) return null;

		const commonProps = {
			character,
			isEditable: isEditable && isEditing,
			onUpdate: handleCharacterUpdate,
		};

		switch (activeTab) {
			case 'stats':
				return <CharacterStatsTab {...commonProps} />;
			case 'skills':
				return <CharacterSkillsTab {...commonProps} />;
			case 'equipment':
				return <CharacterEquipmentTab {...commonProps} />;
			case 'spells':
				return character.progression.spellcasting ? 
					<CharacterSpellsTab {...commonProps} /> : null;
			case 'features':
				return <CharacterFeaturesTab {...commonProps} />;
			case 'behavior':
				return character.type === 'companion' ? 
					<CompanionBehaviorTab 
						companion={character}
						isEditable={isEditable && isEditing}
						onUpdate={handleCharacterUpdate}
					/> : null;
			default:
				return null;
		}
	}, [character, activeTab, isEditable, isEditing, handleCharacterUpdate]);

	if (!character) return null;

	const availableTabs = getAvailableTabs();

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={onClose}
		>
			<ThemedView style={styles.container}>
				{/* Header */}
				<View style={styles.header}>
					<View style={styles.headerLeft}>
						<TouchableOpacity onPress={onClose} style={styles.closeButton}>
							<Feather name="x" size={24} color={colors.text} />
						</TouchableOpacity>
					</View>
					
					<View style={styles.headerCenter}>
						<ThemedText style={styles.characterName}>{character.name}</ThemedText>
						<ThemedText style={styles.characterSubtitle}>
							Level {character.level} {character.race} {character.characterClass}
							{character.type === 'companion' && ' (Companion)'}
						</ThemedText>
					</View>
					
					<View style={styles.headerRight}>
						{isEditable && (
							<TouchableOpacity onPress={toggleEditMode} style={styles.editButton}>
								<Feather 
									name={isEditing ? "check" : "edit-2"} 
									size={20} 
									color={isEditing ? colors.primary : colors.text} 
								/>
							</TouchableOpacity>
						)}
					</View>
				</View>

				{/* Tab Navigation */}
				<View style={styles.tabBar}>
					<ScrollView 
						horizontal 
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.tabBarContent}
					>
						{availableTabs.map((tab) => (
							<TouchableOpacity
								key={tab.key}
								style={[
									styles.tab,
									activeTab === tab.key && styles.activeTab,
								]}
								onPress={() => setActiveTab(tab.key)}
							>
								<Feather 
									name={tab.icon as any} 
									size={16} 
									color={activeTab === tab.key ? colors.primary : colors.textSecondary} 
								/>
								<ThemedText 
									style={[
										styles.tabText,
										activeTab === tab.key && styles.activeTabText,
									]}
								>
									{tab.label}
								</ThemedText>
							</TouchableOpacity>
						))}
					</ScrollView>
				</View>

				{/* Tab Content */}
				<View style={styles.content}>
					{renderTabContent()}
				</View>
			</ThemedView>
		</Modal>
	);
};

const createStyles = (colors: any) => StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.background,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingTop: Platform.OS === 'ios' ? 50 : 20,
		paddingBottom: 16,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	headerLeft: {
		width: 40,
	},
	headerCenter: {
		flex: 1,
		alignItems: 'center',
	},
	headerRight: {
		width: 40,
		alignItems: 'flex-end',
	},
	closeButton: {
		padding: 8,
	},
	editButton: {
		padding: 8,
	},
	characterName: {
		fontSize: 18,
		fontWeight: 'bold',
		color: colors.text,
	},
	characterSubtitle: {
		fontSize: 14,
		color: colors.textSecondary,
		marginTop: 2,
	},
	tabBar: {
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	tabBarContent: {
		paddingHorizontal: 16,
	},
	tab: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		marginRight: 8,
		borderRadius: 8,
	},
	activeTab: {
		backgroundColor: colors.primaryTranslucent,
	},
	tabText: {
		fontSize: 14,
		marginLeft: 6,
		color: colors.textSecondary,
	},
	activeTabText: {
		color: colors.primary,
		fontWeight: '600',
	},
	content: {
		flex: 1,
	},
});