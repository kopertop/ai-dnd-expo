// @ts-nocheck
/**
 * Quest List - Display and manage character quests
 * Shows active, available, and completed quests with progress tracking
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
import { useQuests } from '@/hooks/use-quests';
import type { Quest, QuestObjective, QuestStatus } from '@/types/quests';

interface QuestListProps {
	onQuestUpdate?: (quest: Quest) => void;
}

export const QuestList: React.FC<QuestListProps> = ({
	onQuestUpdate,
}) => {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme ?? 'light'];
	const styles = createStyles(colors);

	const quests = useQuests();
	const [selectedTab, setSelectedTab] = useState<'active' | 'available' | 'completed'>('active');
	const [expandedQuests, setExpandedQuests] = useState<Set<string>>(new Set());

	/**
	 * Toggle quest expansion
	 */
	const toggleQuestExpansion = (questId: string) => {
		const newExpanded = new Set(expandedQuests);
		if (newExpanded.has(questId)) {
			newExpanded.delete(questId);
		} else {
			newExpanded.add(questId);
		}
		setExpandedQuests(newExpanded);
	};

	/**
	 * Handle quest action (start, complete, abandon)
	 */
	const handleQuestAction = async (action: string, quest: Quest) => {
		try {
			let success = false;
			let message = '';

			switch (action) {
				case 'start':
					const { canStart, reason } = quests.canStartQuest(quest.id);
					if (!canStart) {
						Alert.alert('Cannot Start Quest', reason || 'Unknown error');
						return;
					}
					success = await quests.startQuest(quest.id);
					message = success ? `Started quest: ${quest.title}` : 'Failed to start quest';
					break;

				case 'complete':
					success = await quests.completeQuest(quest.id);
					message = success ? `Completed quest: ${quest.title}` : 'Quest objectives not complete';
					break;

				case 'abandon':
					Alert.alert(
						'Abandon Quest',
						`Are you sure you want to abandon "${quest.title}"? Your progress will be lost.`,
						[
							{ text: 'Cancel', style: 'cancel' },
							{
								text: 'Abandon',
								style: 'destructive',
								onPress: async () => {
									const success = await quests.abandonQuest(quest.id);
									const message = success ? `Abandoned quest: ${quest.title}` : 'Failed to abandon quest';
									if (success) {
										Alert.alert('Quest Abandoned', message);
									} else {
										Alert.alert('Error', message);
									}
								},
							},
						]
					);
					return;
			}

			if (success) {
				Alert.alert('Success', message);
				onQuestUpdate?.(quest);
			} else {
				Alert.alert('Error', message);
			}
		} catch (error) {
			Alert.alert('Error', 'An unexpected error occurred');
		}
	};

	/**
	 * Get quest progress percentage
	 */
	const getQuestProgressPercentage = (quest: Quest): number => {
		return quests.getQuestProgress(quest.id);
	};

	/**
	 * Get difficulty color
	 */
	const getDifficultyColor = (difficulty: Quest['difficulty']) => {
		switch (difficulty) {
			case 'easy': return colors.success;
			case 'medium': return colors.warning;
			case 'hard': return colors.error;
			default: return colors.textSecondary;
		}
	};

	/**
	 * Get type icon
	 */
	const getTypeIcon = (type: Quest['type']) => {
		switch (type) {
			case 'main': return 'star';
			case 'side': return 'circle';
			case 'daily': return 'clock';
			case 'bounty': return 'target';
			case 'exploration': return 'map';
			case 'social': return 'users';
			default: return 'help-circle';
		}
	};

	/**
	 * Render objective item
	 */
	const renderObjective = (objective: QuestObjective, questId: string) => {
		const progress = quests.questProgress.get(questId)?.get(objective.id) || 0;
		const isComplete = progress >= (objective.targetValue || 1);
		
		return (
			<View key={objective.id} style={styles.objectiveItem}>
				<View style={styles.objectiveHeader}>
					<Feather 
						name={isComplete ? "check-circle" : "circle"} 
						size={16} 
						color={isComplete ? colors.success : colors.textSecondary} 
					/>
					<ThemedText style={[
						styles.objectiveText,
						isComplete && styles.objectiveTextComplete
					]}>
						{objective.description}
					</ThemedText>
				</View>
				
				{objective.targetValue && objective.targetValue > 1 && (
					<ThemedText style={styles.objectiveProgress}>
						{Math.min(progress, objective.targetValue)}/{objective.targetValue}
					</ThemedText>
				)}
			</View>
		);
	};

	/**
	 * Render quest card
	 */
	const renderQuestCard = (quest: Quest) => {
		const isExpanded = expandedQuests.has(quest.id);
		const progressPercentage = getQuestProgressPercentage(quest);
		const difficultyColor = getDifficultyColor(quest.difficulty);
		const typeIcon = getTypeIcon(quest.type);

		return (
			<TouchableOpacity
				key={quest.id}
				style={[
					styles.questCard,
					quest.status === 'active' && styles.questCardActive,
				]}
				onPress={() => toggleQuestExpansion(quest.id)}
			>
				{/* Quest Header */}
				<View style={styles.questHeader}>
					<View style={styles.questTitleRow}>
						<Feather name={typeIcon} size={16} color={colors.primary} />
						<ThemedText style={styles.questTitle}>{quest.title}</ThemedText>
						<View style={[styles.difficultyBadge, { backgroundColor: difficultyColor }]}>
							<ThemedText style={styles.difficultyText}>
								{quest.difficulty?.toUpperCase()}
							</ThemedText>
						</View>
					</View>
					
					<View style={styles.questMeta}>
						<ThemedText style={styles.questType}>
							{quest.type.replace('-', ' ').toUpperCase()}
						</ThemedText>
						{quest.status === 'active' && (
							<ThemedText style={styles.questProgress}>
								{progressPercentage}% Complete
							</ThemedText>
						)}
					</View>
				</View>

				{/* Progress Bar for Active Quests */}
				{quest.status === 'active' && (
					<View style={styles.progressContainer}>
						<View style={styles.progressBar}>
							<View 
								style={[
									styles.progressFill,
									{ 
										width: `${progressPercentage}%`,
										backgroundColor: progressPercentage === 100 ? colors.success : colors.primary
									}
								]} 
							/>
						</View>
					</View>
				)}

				{/* Quest Description */}
				<ThemedText style={styles.questDescription} numberOfLines={isExpanded ? undefined : 2}>
					{quest.description}
				</ThemedText>

				{/* Expanded Content */}
				{isExpanded && (
					<View style={styles.expandedContent}>
						{/* Objectives */}
						<View style={styles.objectivesSection}>
							<ThemedText style={styles.objectivesTitle}>Objectives</ThemedText>
							{quest.objectives.map(objective => renderObjective(objective, quest.id))}
						</View>

						{/* Rewards */}
						{quest.rewards && quest.rewards.length > 0 && (
							<View style={styles.rewardsSection}>
								<ThemedText style={styles.rewardsTitle}>Rewards</ThemedText>
								<View style={styles.rewardsList}>
									{quest.rewards.map((reward, index) => (
										<View key={index} style={styles.rewardItem}>
											<Feather name="gift" size={14} color={colors.warning} />
											<ThemedText style={styles.rewardText}>
												{reward.type === 'experience' && `${reward.amount} XP`}
												{reward.type === 'gold' && `${reward.amount} GP`}
												{reward.type === 'item' && reward.itemName}
												{reward.type === 'reputation' && `${reward.amount} Reputation`}
											</ThemedText>
										</View>
									))}
								</View>
							</View>
						)}

						{/* Quest Info */}
						<View style={styles.questInfo}>
							{quest.giver && (
								<View style={styles.infoItem}>
									<ThemedText style={styles.infoLabel}>Quest Giver:</ThemedText>
									<ThemedText style={styles.infoValue}>{quest.giver}</ThemedText>
								</View>
							)}
							{quest.location && (
								<View style={styles.infoItem}>
									<ThemedText style={styles.infoLabel}>Location:</ThemedText>
									<ThemedText style={styles.infoValue}>{quest.location}</ThemedText>
								</View>
							)}
							{quest.timeLimit && (
								<View style={styles.infoItem}>
									<ThemedText style={styles.infoLabel}>Time Limit:</ThemedText>
									<ThemedText style={styles.infoValue}>{quest.timeLimit}</ThemedText>
								</View>
							)}
						</View>
					</View>
				)}

				{/* Action Buttons */}
				<View style={styles.actionButtons}>
					{quest.status === 'available' && (
						<TouchableOpacity
							style={[styles.actionButton, styles.startButton]}
							onPress={() => handleQuestAction('start', quest)}
						>
							<Feather name="play" size={16} color={colors.success} />
							<ThemedText style={[styles.actionButtonText, { color: colors.success }]}>
								Start Quest
							</ThemedText>
						</TouchableOpacity>
					)}

					{quest.status === 'active' && (
						<>
							{progressPercentage === 100 && (
								<TouchableOpacity
									style={[styles.actionButton, styles.completeButton]}
									onPress={() => handleQuestAction('complete', quest)}
								>
									<Feather name="check" size={16} color={colors.success} />
									<ThemedText style={[styles.actionButtonText, { color: colors.success }]}>
										Complete
									</ThemedText>
								</TouchableOpacity>
							)}
							
							<TouchableOpacity
								style={[styles.actionButton, styles.abandonButton]}
								onPress={() => handleQuestAction('abandon', quest)}
							>
								<Feather name="x" size={16} color={colors.error} />
								<ThemedText style={[styles.actionButtonText, { color: colors.error }]}>
									Abandon
								</ThemedText>
							</TouchableOpacity>
						</>
					)}

					<TouchableOpacity
						style={[styles.actionButton, styles.expandButton]}
						onPress={() => toggleQuestExpansion(quest.id)}
					>
						<Feather 
							name={isExpanded ? "chevron-up" : "chevron-down"} 
							size={16} 
							color={colors.primary} 
						/>
						<ThemedText style={[styles.actionButtonText, { color: colors.primary }]}>
							{isExpanded ? 'Less' : 'More'}
						</ThemedText>
					</TouchableOpacity>
				</View>
			</TouchableOpacity>
		);
	};

	/**
	 * Get quests for current tab
	 */
	const getCurrentQuests = () => {
		switch (selectedTab) {
			case 'active': return quests.activeQuests;
			case 'available': return quests.availableQuests;
			case 'completed': return quests.completedQuests;
			default: return [];
		}
	};

	if (quests.isLoading) {
		return (
			<View style={styles.loadingContainer}>
				<ThemedText style={styles.loadingText}>Loading quests...</ThemedText>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<ThemedText style={styles.title}>Quests</ThemedText>
			</View>

			{/* Tab Navigation */}
			<View style={styles.tabNavigation}>
				{[
					{ key: 'active', label: 'Active', count: quests.activeQuests.length },
					{ key: 'available', label: 'Available', count: quests.availableQuests.length },
					{ key: 'completed', label: 'Completed', count: quests.completedQuests.length },
				].map((tab) => (
					<TouchableOpacity
						key={tab.key}
						style={[
							styles.tab,
							selectedTab === tab.key && styles.tabActive,
						]}
						onPress={() => setSelectedTab(tab.key as any)}
					>
						<ThemedText style={[
							styles.tabText,
							selectedTab === tab.key && styles.tabTextActive,
						]}>
							{tab.label}
						</ThemedText>
						<ThemedText style={[
							styles.tabCount,
							selectedTab === tab.key && styles.tabCountActive,
						]}>
							{tab.count}
						</ThemedText>
					</TouchableOpacity>
				))}
			</View>

			{/* Quest List */}
			<ScrollView style={styles.questsList} showsVerticalScrollIndicator={false}>
				{getCurrentQuests().length > 0 ? (
					getCurrentQuests().map(renderQuestCard)
				) : (
					<View style={styles.emptyState}>
						<Feather name="clipboard" size={48} color={colors.textSecondary} />
						<ThemedText style={styles.emptyStateText}>
							No {selectedTab} quests
						</ThemedText>
						<ThemedText style={styles.emptyStateSubtext}>
							{selectedTab === 'available' && 'Check back later for new quests!'}
							{selectedTab === 'active' && 'Start a quest to track your progress!'}
							{selectedTab === 'completed' && 'Complete quests to see them here!'}
						</ThemedText>
					</View>
				)}
			</ScrollView>

			{/* Error Display */}
			{quests.error && (
				<View style={styles.errorContainer}>
					<ThemedText style={styles.errorText}>{quests.error}</ThemedText>
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
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: colors.text,
	},
	tabNavigation: {
		flexDirection: 'row',
		backgroundColor: colors.backgroundSecondary,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	tab: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		paddingHorizontal: 16,
		gap: 8,
	},
	tabActive: {
		backgroundColor: colors.primaryTranslucent,
		borderBottomWidth: 2,
		borderBottomColor: colors.primary,
	},
	tabText: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.textSecondary,
	},
	tabTextActive: {
		color: colors.primary,
	},
	tabCount: {
		fontSize: 12,
		fontWeight: 'bold',
		color: colors.textSecondary,
		backgroundColor: colors.border,
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 10,
		minWidth: 20,
		textAlign: 'center',
	},
	tabCountActive: {
		color: colors.primaryText,
		backgroundColor: colors.primary,
	},
	questsList: {
		flex: 1,
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	questCard: {
		backgroundColor: colors.backgroundSecondary,
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: colors.border,
	},
	questCardActive: {
		borderColor: colors.primary,
		backgroundColor: colors.primaryTranslucent,
	},
	questHeader: {
		marginBottom: 12,
	},
	questTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
		gap: 8,
	},
	questTitle: {
		fontSize: 16,
		fontWeight: 'bold',
		color: colors.text,
		flex: 1,
	},
	difficultyBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
	},
	difficultyText: {
		fontSize: 10,
		fontWeight: 'bold',
		color: colors.primaryText,
	},
	questMeta: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	questType: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.textSecondary,
	},
	questProgress: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.primary,
	},
	progressContainer: {
		marginBottom: 12,
	},
	progressBar: {
		height: 6,
		backgroundColor: colors.border,
		borderRadius: 3,
		overflow: 'hidden',
	},
	progressFill: {
		height: '100%',
		borderRadius: 3,
	},
	questDescription: {
		fontSize: 14,
		color: colors.textSecondary,
		lineHeight: 20,
		marginBottom: 12,
	},
	expandedContent: {
		gap: 16,
	},
	objectivesSection: {
		gap: 8,
	},
	objectivesTitle: {
		fontSize: 14,
		fontWeight: 'bold',
		color: colors.text,
	},
	objectiveItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 4,
	},
	objectiveHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		flex: 1,
	},
	objectiveText: {
		fontSize: 14,
		color: colors.textSecondary,
		flex: 1,
	},
	objectiveTextComplete: {
		textDecorationLine: 'line-through',
		color: colors.success,
	},
	objectiveProgress: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.primary,
	},
	rewardsSection: {
		gap: 8,
	},
	rewardsTitle: {
		fontSize: 14,
		fontWeight: 'bold',
		color: colors.text,
	},
	rewardsList: {
		gap: 4,
	},
	rewardItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	rewardText: {
		fontSize: 14,
		color: colors.textSecondary,
	},
	questInfo: {
		gap: 8,
	},
	infoItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	infoLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.text,
		width: 80,
	},
	infoValue: {
		fontSize: 12,
		color: colors.textSecondary,
		flex: 1,
	},
	actionButtons: {
		flexDirection: 'row',
		gap: 8,
		marginTop: 12,
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
	startButton: {
		borderColor: colors.success,
	},
	completeButton: {
		borderColor: colors.success,
	},
	abandonButton: {
		borderColor: colors.error,
	},
	expandButton: {
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