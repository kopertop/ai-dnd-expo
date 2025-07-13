// @ts-nocheck
/**
 * Companion List - Manage party companions and recruitment
 * Shows available companions and allows party management
 */

import React, { useState } from 'react';
import {
	View,
	ScrollView,
	TouchableOpacity,
	StyleSheet,
	Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CharacterSheetModal } from '@/components/character-sheet-v2/character-sheet-modal';
import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCompanions } from '@/hooks/use-companions';
import type { CompanionNPC } from '@/types/characters';

interface CompanionListProps {
	onCompanionUpdate?: (companion: CompanionNPC) => void;
}

export const CompanionList: React.FC<CompanionListProps> = ({
	onCompanionUpdate,
}) => {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme ?? 'light'];
	const styles = createStyles(colors);

	const companions = useCompanions();
	const [selectedCompanion, setSelectedCompanion] = useState<CompanionNPC | null>(null);
	const [showCharacterSheet, setShowCharacterSheet] = useState(false);

	/**
	 * Handle companion selection
	 */
	const handleCompanionPress = (companion: CompanionNPC) => {
		setSelectedCompanion(companion);
		setShowCharacterSheet(true);
	};

	/**
	 * Handle adding companion to party
	 */
	const handleAddToParty = async (companion: CompanionNPC) => {
		const { canAdd, reason } = companions.canAddToParty(companion.id);
		
		if (!canAdd) {
			Alert.alert('Cannot Add to Party', reason || 'Unknown error');
			return;
		}

		try {
			await companions.addToParty(companion.id);
			Alert.alert('Success', `${companion.name} has joined your party!`);
		} catch (error) {
			Alert.alert('Error', 'Failed to add companion to party');
		}
	};

	/**
	 * Handle removing companion from party
	 */
	const handleRemoveFromParty = async (companion: CompanionNPC) => {
		Alert.alert(
			'Remove from Party',
			`Are you sure you want to remove ${companion.name} from your party?`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Remove',
					style: 'destructive',
					onPress: async () => {
						try {
							await companions.removeFromParty(companion.id);
						} catch (error) {
							Alert.alert('Error', 'Failed to remove companion from party');
						}
					},
				},
			]
		);
	};

	/**
	 * Handle character updates from character sheet
	 */
	const handleCharacterUpdate = async (updates: Partial<CompanionNPC>) => {
		if (!selectedCompanion) return;
		
		try {
			await companions.updateCompanion(selectedCompanion.id, updates);
			onCompanionUpdate?.(updates as CompanionNPC);
		} catch (error) {
			Alert.alert('Error', 'Failed to update companion');
		}
	};

	/**
	 * Generate a new random companion
	 */
	const handleGenerateCompanion = async () => {
		try {
			const newCompanion = await companions.generateRandomCompanion();
			Alert.alert('New Companion', `${newCompanion.name} is now available for recruitment!`);
		} catch (error) {
			Alert.alert('Error', 'Failed to generate new companion');
		}
	};

	/**
	 * Render companion card
	 */
	const renderCompanionCard = (companion: CompanionNPC) => {
		const { canAdd } = companions.canAddToParty(companion.id);
		
		return (
			<TouchableOpacity
				key={companion.id}
				style={[
					styles.companionCard,
					companion.isActive && styles.companionCardActive,
				]}
				onPress={() => handleCompanionPress(companion)}
			>
				{/* Companion Info */}
				<View style={styles.companionInfo}>
					<View style={styles.companionHeader}>
						<ThemedText style={styles.companionName}>{companion.name}</ThemedText>
						<View style={styles.companionBadges}>
							{companion.isActive && (
								<View style={styles.activeBadge}>
									<ThemedText style={styles.activeBadgeText}>In Party</ThemedText>
								</View>
							)}
							<View style={styles.levelBadge}>
								<ThemedText style={styles.levelBadgeText}>Lv {companion.level}</ThemedText>
							</View>
						</View>
					</View>
					
					<ThemedText style={styles.companionClass}>
						{companion.race} {companion.characterClass}
					</ThemedText>
					
					{/* Loyalty Bar */}
					<View style={styles.loyaltyContainer}>
						<ThemedText style={styles.loyaltyLabel}>Loyalty</ThemedText>
						<View style={styles.loyaltyBar}>
							<View 
								style={[
									styles.loyaltyFill,
									{ 
										width: `${companion.loyalty}%`,
										backgroundColor: companion.loyalty > 75 ? colors.success : 
														 companion.loyalty > 50 ? colors.warning : 
														 companion.loyalty > 25 ? colors.error : colors.error
									}
								]} 
							/>
						</View>
						<ThemedText style={styles.loyaltyText}>{companion.loyalty}%</ThemedText>
					</View>

					{/* Stats Preview */}
					<View style={styles.statsPreview}>
						<View style={styles.statItem}>
							<ThemedText style={styles.statLabel}>HP</ThemedText>
							<ThemedText style={styles.statValue}>
								{companion.vitals.hitPoints.current}/{companion.vitals.hitPoints.maximum}
							</ThemedText>
						</View>
						<View style={styles.statItem}>
							<ThemedText style={styles.statLabel}>AC</ThemedText>
							<ThemedText style={styles.statValue}>
								{companion.vitals.armorClass.total}
							</ThemedText>
						</View>
						<View style={styles.statItem}>
							<ThemedText style={styles.statLabel}>Type</ThemedText>
							<ThemedText style={styles.statValue}>
								{companion.companionType}
							</ThemedText>
						</View>
					</View>
				</View>

				{/* Action Buttons */}
				<View style={styles.companionActions}>
					{companion.isActive ? (
						<TouchableOpacity
							style={[styles.actionButton, styles.removeButton]}
							onPress={() => handleRemoveFromParty(companion)}
						>
							<Feather name="user-minus" size={16} color={colors.error} />
							<ThemedText style={[styles.actionButtonText, { color: colors.error }]}>
								Remove
							</ThemedText>
						</TouchableOpacity>
					) : (
						<TouchableOpacity
							style={[
								styles.actionButton, 
								styles.addButton,
								!canAdd && styles.actionButtonDisabled,
							]}
							onPress={() => handleAddToParty(companion)}
							disabled={!canAdd}
						>
							<Feather name="user-plus" size={16} color={canAdd ? colors.success : colors.textSecondary} />
							<ThemedText style={[
								styles.actionButtonText, 
								{ color: canAdd ? colors.success : colors.textSecondary }
							]}>
								Add
							</ThemedText>
						</TouchableOpacity>
					)}
					
					<TouchableOpacity
						style={[styles.actionButton, styles.viewButton]}
						onPress={() => handleCompanionPress(companion)}
					>
						<Feather name="eye" size={16} color={colors.primary} />
						<ThemedText style={[styles.actionButtonText, { color: colors.primary }]}>
							View
						</ThemedText>
					</TouchableOpacity>
				</View>
			</TouchableOpacity>
		);
	};

	if (companions.isLoading) {
		return (
			<View style={styles.loadingContainer}>
				<ThemedText style={styles.loadingText}>Loading companions...</ThemedText>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<ThemedText style={styles.title}>Companions</ThemedText>
				<TouchableOpacity 
					style={styles.generateButton}
					onPress={handleGenerateCompanion}
				>
					<Feather name="plus" size={20} color={colors.primary} />
					<ThemedText style={styles.generateButtonText}>Generate</ThemedText>
				</TouchableOpacity>
			</View>

			{/* Party Summary */}
			<ThemedView style={styles.partySummary}>
				<ThemedText style={styles.partySummaryTitle}>
					Active Party ({companions.currentPartySize}/{companions.maxPartySize - 1})
				</ThemedText>
				<ThemedText style={styles.partySummaryText}>
					{companions.activeParty.length > 0
						? companions.activeParty.map(c => c.name).join(', ')
						: 'No companions in party'
					}
				</ThemedText>
			</ThemedView>

			{/* Companions List */}
			<ScrollView style={styles.companionsList} showsVerticalScrollIndicator={false}>
				{companions.allCompanions.length > 0 ? (
					companions.allCompanions.map(renderCompanionCard)
				) : (
					<View style={styles.emptyState}>
						<Feather name="users" size={48} color={colors.textSecondary} />
						<ThemedText style={styles.emptyStateText}>No companions available</ThemedText>
						<ThemedText style={styles.emptyStateSubtext}>
							Generate your first companion to get started!
						</ThemedText>
					</View>
				)}
			</ScrollView>

			{/* Character Sheet Modal */}
			<CharacterSheetModal
				character={selectedCompanion}
				visible={showCharacterSheet}
				onClose={() => {
					setShowCharacterSheet(false);
					setSelectedCompanion(null);
				}}
				onCharacterUpdate={handleCharacterUpdate}
				isEditable={true}
			/>

			{/* Error Display */}
			{companions.error && (
				<View style={styles.errorContainer}>
					<ThemedText style={styles.errorText}>{companions.error}</ThemedText>
				</View>
			)}
		</View>
	);
};

const createStyles = (colors: any) => StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.background,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		fontSize: 16,
		color: colors.textSecondary,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: colors.text,
	},
	generateButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 8,
		backgroundColor: colors.primaryTranslucent,
		gap: 8,
	},
	generateButtonText: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.primary,
	},
	partySummary: {
		margin: 16,
		padding: 16,
		borderRadius: 12,
		backgroundColor: colors.backgroundSecondary,
	},
	partySummaryTitle: {
		fontSize: 16,
		fontWeight: 'bold',
		color: colors.text,
		marginBottom: 8,
	},
	partySummaryText: {
		fontSize: 14,
		color: colors.textSecondary,
	},
	companionsList: {
		flex: 1,
		paddingHorizontal: 16,
	},
	companionCard: {
		backgroundColor: colors.backgroundSecondary,
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: colors.border,
	},
	companionCardActive: {
		borderColor: colors.primary,
		backgroundColor: colors.primaryTranslucent,
	},
	companionInfo: {
		marginBottom: 16,
	},
	companionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	companionName: {
		fontSize: 18,
		fontWeight: 'bold',
		color: colors.text,
		flex: 1,
	},
	companionBadges: {
		flexDirection: 'row',
		gap: 8,
	},
	activeBadge: {
		backgroundColor: colors.success,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
	},
	activeBadgeText: {
		fontSize: 10,
		fontWeight: 'bold',
		color: colors.primaryText,
	},
	levelBadge: {
		backgroundColor: colors.primary,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
	},
	levelBadgeText: {
		fontSize: 10,
		fontWeight: 'bold',
		color: colors.primaryText,
	},
	companionClass: {
		fontSize: 14,
		color: colors.textSecondary,
		marginBottom: 12,
		textTransform: 'capitalize',
	},
	loyaltyContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
		gap: 8,
	},
	loyaltyLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.text,
		width: 50,
	},
	loyaltyBar: {
		flex: 1,
		height: 6,
		backgroundColor: colors.border,
		borderRadius: 3,
		overflow: 'hidden',
	},
	loyaltyFill: {
		height: '100%',
		borderRadius: 3,
	},
	loyaltyText: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.text,
		width: 35,
		textAlign: 'right',
	},
	statsPreview: {
		flexDirection: 'row',
		gap: 16,
	},
	statItem: {
		alignItems: 'center',
	},
	statLabel: {
		fontSize: 10,
		fontWeight: '600',
		color: colors.textSecondary,
		marginBottom: 2,
	},
	statValue: {
		fontSize: 12,
		fontWeight: 'bold',
		color: colors.text,
	},
	companionActions: {
		flexDirection: 'row',
		gap: 12,
	},
	actionButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 6,
		backgroundColor: colors.background,
		gap: 6,
	},
	actionButtonDisabled: {
		opacity: 0.5,
	},
	addButton: {
		borderWidth: 1,
		borderColor: colors.success,
	},
	removeButton: {
		borderWidth: 1,
		borderColor: colors.error,
	},
	viewButton: {
		borderWidth: 1,
		borderColor: colors.primary,
	},
	actionButtonText: {
		fontSize: 12,
		fontWeight: '600',
	},
	emptyState: {
		alignItems: 'center',
		padding: 48,
		gap: 12,
	},
	emptyStateText: {
		fontSize: 18,
		fontWeight: 'bold',
		color: colors.textSecondary,
		textAlign: 'center',
	},
	emptyStateSubtext: {
		fontSize: 14,
		color: colors.textSecondary,
		textAlign: 'center',
	},
	errorContainer: {
		position: 'absolute',
		bottom: 16,
		left: 16,
		right: 16,
		backgroundColor: colors.error,
		padding: 12,
		borderRadius: 8,
	},
	errorText: {
		fontSize: 14,
		color: colors.primaryText,
		textAlign: 'center',
	},
});