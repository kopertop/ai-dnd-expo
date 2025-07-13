/**
 * Simple Companion List - Functional companion management
 * Works with existing Character system
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
import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSimpleCompanions } from '@/hooks/use-simple-companions';
import type { Companion } from '@/types/companion';

interface SimpleCompanionListProps {
	onCompanionSelect?: (companion: Companion) => void;
}

export const SimpleCompanionList: React.FC<SimpleCompanionListProps> = ({
	onCompanionSelect,
}) => {
	const colorScheme = useColorScheme();
	const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
	const styles = createStyles(colors);

	const companions = useSimpleCompanions();
	const [selectedTab, setSelectedTab] = useState<'available' | 'party'>('available');

	/**
	 * Handle adding companion to party
	 */
	const handleAddToParty = async (companion: Companion) => {
		const { canAdd, reason } = companions.canAddToParty(companion.id);
		
		if (!canAdd) {
			Alert.alert('Cannot Add to Party', reason || 'Unknown error');
			return;
		}

		try {
			const success = await companions.addToParty(companion.id);
			if (success) {
				Alert.alert('Success', `${companion.name} has joined your party!`);
			} else {
				Alert.alert('Error', 'Failed to add companion to party');
			}
		} catch (error) {
			Alert.alert('Error', 'Failed to add companion to party');
		}
	};

	/**
	 * Handle removing companion from party
	 */
	const handleRemoveFromParty = async (companion: Companion) => {
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
	const renderCompanionCard = (companion: Companion) => {
		const { canAdd } = companions.canAddToParty(companion.id);
		
		return (
			<TouchableOpacity
				key={companion.id}
				style={[
					styles.companionCard,
					companion.isActive && styles.companionCardActive,
				]}
				onPress={() => onCompanionSelect?.(companion)}
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
						{companion.race} {companion.class}
					</ThemedText>
					
					{companion.description && (
						<ThemedText style={styles.companionDescription} numberOfLines={2}>
							{companion.description}
						</ThemedText>
					)}

					{/* Stats Preview */}
					<View style={styles.statsPreview}>
						<View style={styles.statItem}>
							<ThemedText style={styles.statLabel}>HP</ThemedText>
							<ThemedText style={styles.statValue}>
								{companion.health}/{companion.maxHealth}
							</ThemedText>
						</View>
						<View style={styles.statItem}>
							<ThemedText style={styles.statLabel}>Type</ThemedText>
							<ThemedText style={styles.statValue}>
								{companion.companionType}
							</ThemedText>
						</View>
						<View style={styles.statItem}>
							<ThemedText style={styles.statLabel}>Loyalty</ThemedText>
							<ThemedText style={styles.statValue}>
								{companion.loyalty}%
							</ThemedText>
						</View>
					</View>

					{/* Cost */}
					{companion.cost && !companion.isActive && (
						<View style={styles.costContainer}>
							<ThemedText style={styles.costLabel}>Cost:</ThemedText>
							<ThemedText style={styles.costValue}>
								{companion.cost.type === 'gold' 
									? `${companion.cost.amount} GP`
									: companion.cost.description
								}
							</ThemedText>
						</View>
					)}
				</View>

				{/* Action Buttons */}
				<View style={styles.companionActions}>
					{companion.isActive ? (
						<TouchableOpacity
							style={[styles.actionButton, styles.removeButton]}
							onPress={() => handleRemoveFromParty(companion)}
						>
							<Feather name="user-minus" size={16} color="#ef4444" />
							<ThemedText style={[styles.actionButtonText, { color: '#ef4444' }]}>
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
							<Feather name="user-plus" size={16} color={canAdd ? '#22c55e' : colors.icon} />
							<ThemedText style={[
								styles.actionButtonText, 
								{ color: canAdd ? '#22c55e' : colors.icon }
							]}>
								Add
							</ThemedText>
						</TouchableOpacity>
					)}
					
					<TouchableOpacity
						style={[styles.actionButton, styles.viewButton]}
						onPress={() => onCompanionSelect?.(companion)}
					>
						<Feather name="eye" size={16} color={colors.tint} />
						<ThemedText style={[styles.actionButtonText, { color: colors.tint }]}>
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

	const availableCompanions = companions.companions.filter(c => !c.isActive);
	const activeCompanions = companions.activeCompanions;

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<ThemedText style={styles.title}>Companions</ThemedText>
				<TouchableOpacity 
					style={styles.generateButton}
					onPress={handleGenerateCompanion}
				>
					<Feather name="plus" size={20} color={colors.tint} />
					<ThemedText style={styles.generateButtonText}>Generate</ThemedText>
				</TouchableOpacity>
			</View>

			{/* Tab Navigation */}
			<View style={styles.tabNavigation}>
				<TouchableOpacity
					style={[
						styles.tab,
						selectedTab === 'available' && styles.tabActive,
					]}
					onPress={() => setSelectedTab('available')}
				>
					<ThemedText style={[
						styles.tabText,
						selectedTab === 'available' && styles.tabTextActive,
					]}>
						Available ({availableCompanions.length})
					</ThemedText>
				</TouchableOpacity>
				
				<TouchableOpacity
					style={[
						styles.tab,
						selectedTab === 'party' && styles.tabActive,
					]}
					onPress={() => setSelectedTab('party')}
				>
					<ThemedText style={[
						styles.tabText,
						selectedTab === 'party' && styles.tabTextActive,
					]}>
						Party ({activeCompanions.length}/{companions.partyConfig.maxSize - 1})
					</ThemedText>
				</TouchableOpacity>
			</View>

			{/* Companions List */}
			<ScrollView style={styles.companionsList} showsVerticalScrollIndicator={false}>
				{selectedTab === 'available' ? (
					availableCompanions.length > 0 ? (
						availableCompanions.map(renderCompanionCard)
					) : (
						<View style={styles.emptyState}>
							<Feather name="users" size={48} color={colors.icon} />
							<ThemedText style={styles.emptyStateText}>No companions available</ThemedText>
							<ThemedText style={styles.emptyStateSubtext}>
								Generate your first companion to get started!
							</ThemedText>
						</View>
					)
				) : (
					activeCompanions.length > 0 ? (
						activeCompanions.map(renderCompanionCard)
					) : (
						<View style={styles.emptyState}>
							<Feather name="user-x" size={48} color={colors.icon} />
							<ThemedText style={styles.emptyStateText}>No companions in party</ThemedText>
							<ThemedText style={styles.emptyStateSubtext}>
								Add companions to your party to begin your adventure!
							</ThemedText>
						</View>
					)
				)}
			</ScrollView>

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
		color: colors.icon,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
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
		backgroundColor: colors.background,
		borderWidth: 1,
		borderColor: colors.tint,
		gap: 8,
	},
	generateButtonText: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.tint,
	},
	tabNavigation: {
		flexDirection: 'row',
		backgroundColor: colors.background,
		borderBottomWidth: 1,
		borderBottomColor: colors.icon,
	},
	tab: {
		flex: 1,
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 16,
	},
	tabActive: {
		borderBottomWidth: 2,
		borderBottomColor: colors.tint,
	},
	tabText: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.icon,
	},
	tabTextActive: {
		color: colors.tint,
	},
	companionsList: {
		flex: 1,
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	companionCard: {
		backgroundColor: colors.background,
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: colors.icon,
	},
	companionCardActive: {
		borderColor: colors.tint,
		backgroundColor: colors.background,
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
		backgroundColor: '#22c55e',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
	},
	activeBadgeText: {
		fontSize: 10,
		fontWeight: 'bold',
		color: '#ffffff',
	},
	levelBadge: {
		backgroundColor: colors.tint,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
	},
	levelBadgeText: {
		fontSize: 10,
		fontWeight: 'bold',
		color: '#ffffff',
	},
	companionClass: {
		fontSize: 14,
		color: colors.icon,
		marginBottom: 8,
		textTransform: 'capitalize',
	},
	companionDescription: {
		fontSize: 14,
		color: colors.icon,
		lineHeight: 20,
		marginBottom: 12,
	},
	statsPreview: {
		flexDirection: 'row',
		gap: 16,
		marginBottom: 8,
	},
	statItem: {
		alignItems: 'center',
	},
	statLabel: {
		fontSize: 10,
		fontWeight: '600',
		color: colors.icon,
		marginBottom: 2,
	},
	statValue: {
		fontSize: 12,
		fontWeight: 'bold',
		color: colors.text,
	},
	costContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 8,
		gap: 8,
	},
	costLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.icon,
	},
	costValue: {
		fontSize: 12,
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
		borderWidth: 1,
		gap: 6,
	},
	actionButtonDisabled: {
		opacity: 0.5,
	},
	addButton: {
		borderColor: '#22c55e',
	},
	removeButton: {
		borderColor: '#ef4444',
	},
	viewButton: {
		borderColor: colors.tint,
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
		color: colors.icon,
		textAlign: 'center',
	},
	emptyStateSubtext: {
		fontSize: 14,
		color: colors.icon,
		textAlign: 'center',
	},
	errorContainer: {
		position: 'absolute',
		bottom: 16,
		left: 16,
		right: 16,
		backgroundColor: '#ef4444',
		padding: 12,
		borderRadius: 8,
	},
	errorText: {
		fontSize: 14,
		color: '#ffffff',
		textAlign: 'center',
	},
});