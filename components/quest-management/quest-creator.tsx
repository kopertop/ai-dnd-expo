// @ts-nocheck
/**
 * Quest Creator - Create sample quests for testing and demo
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useQuests } from '@/hooks/use-quests';
import type { Quest, QuestObjective, QuestReward } from '@/types/quests';

interface QuestCreatorProps {
	onQuestCreated?: (quest: Quest) => void;
}

export const QuestCreator: React.FC<QuestCreatorProps> = ({
	onQuestCreated,
}) => {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme ?? 'light'];
	const styles = createStyles(colors);

	const quests = useQuests();

	/**
	 * Sample quest templates
	 */
	const questTemplates = [
		{
			title: "The Lost Artifact",
			description: "A powerful magical artifact has been stolen from the town's temple. Track down the thieves and retrieve it before they can use its power for evil.",
			type: 'main' as const,
			difficulty: 'medium' as const,
			giver: "High Priestess Lyanna",
			location: "Temple District",
			objectives: [
				{
					id: 'obj_find_clues',
					type: 'collect' as const,
					title: "Find Clues",
					description: "Search for clues about the thieves",
					isCompleted: false,
					progress: { current: 0, target: 3, unit: "clues" },
					order: 1,
				},
				{
					id: 'obj_track_thieves',
					type: 'travel' as const,
					title: "Track Thieves",
					description: "Follow the trail to the thieves' hideout",
					isCompleted: false,
					progress: { current: 0, target: 1 },
					order: 2,
				},
				{
					id: 'obj_retrieve_artifact',
					type: 'interact' as const,
					title: "Recover Artifact",
					description: "Recover the stolen artifact",
					isCompleted: false,
					progress: { current: 0, target: 1 },
					order: 3,
				},
			] as QuestObjective[],
			rewards: [
				{ type: 'experience', amount: 500 },
				{ type: 'gold', amount: 250 },
				{ type: 'item', itemName: 'Blessed Amulet', itemId: 'amulet_blessed' },
			] as QuestReward[],
		},
		{
			title: "Goblin Troubles",
			description: "Goblins have been raiding merchant caravans on the trade route. Clear them out to restore safe passage.",
			type: 'side' as const,
			difficulty: 'easy' as const,
			giver: "Captain Marcus",
			location: "Trade Route",
			objectives: [
				{
					id: 'obj_defeat_goblins',
					type: 'kill' as const,
					description: "Defeat goblin raiders",
					targetValue: 8,
				},
				{
					id: 'obj_find_camp',
					type: 'discover' as const,
					description: "Locate the goblin camp",
					targetValue: 1,
				},
				{
					id: 'obj_clear_camp',
					type: 'interact' as const,
					description: "Clear out the goblin camp",
					targetValue: 1,
				},
			] as QuestObjective[],
			rewards: [
				{ type: 'experience', amount: 200 },
				{ type: 'gold', amount: 100 },
				{ type: 'reputation', amount: 50 },
			] as QuestReward[],
		},
		{
			title: "Daily Patrol",
			description: "Make your rounds through the city districts and report any suspicious activity to the guards.",
			type: 'daily' as const,
			difficulty: 'easy' as const,
			giver: "Guard Captain",
			location: "City Gates",
			timeLimit: "24 hours",
			objectives: [
				{
					id: 'obj_patrol_market',
					type: 'travel' as const,
					description: "Patrol the Market District",
					targetValue: 1,
				},
				{
					id: 'obj_patrol_docks',
					type: 'travel' as const,
					description: "Patrol the Docks District",
					targetValue: 1,
				},
				{
					id: 'obj_report_back',
					type: 'interact' as const,
					description: "Report back to the Captain",
					targetValue: 1,
				},
			] as QuestObjective[],
			rewards: [
				{ type: 'experience', amount: 50 },
				{ type: 'gold', amount: 25 },
			] as QuestReward[],
		},
		{
			title: "The Ancient Ruins",
			description: "Explore the recently discovered ruins north of town. What secrets do they hold?",
			type: 'exploration' as const,
			difficulty: 'hard' as const,
			giver: "Scholar Aldwin",
			location: "Northern Ruins",
			objectives: [
				{
					id: 'obj_enter_ruins',
					type: 'discover' as const,
					description: "Enter the ancient ruins",
					targetValue: 1,
				},
				{
					id: 'obj_find_chambers',
					type: 'discover' as const,
					description: "Discover hidden chambers",
					targetValue: 3,
				},
				{
					id: 'obj_collect_artifacts',
					type: 'collect' as const,
					description: "Collect ancient artifacts",
					targetValue: 5,
				},
				{
					id: 'obj_translate_text',
					type: 'interact' as const,
					description: "Decipher the ancient texts",
					targetValue: 1,
				},
			] as QuestObjective[],
			rewards: [
				{ type: 'experience', amount: 800 },
				{ type: 'gold', amount: 400 },
				{ type: 'item', itemName: 'Ancient Tome', itemId: 'tome_ancient' },
				{ type: 'item', itemName: 'Runic Staff', itemId: 'staff_runic' },
			] as QuestReward[],
		},
		{
			title: "Wanted: Bandit Leader",
			description: "A notorious bandit leader has been terrorizing the countryside. Bring them to justice for a hefty reward.",
			type: 'bounty' as const,
			difficulty: 'hard' as const,
			giver: "Sheriff Thomson",
			location: "Countryside",
			objectives: [
				{
					id: 'obj_track_leader',
					type: 'discover' as const,
					description: "Track down the bandit leader",
					targetValue: 1,
				},
				{
					id: 'obj_defeat_leader',
					type: 'kill' as const,
					description: "Defeat or capture the bandit leader",
					targetValue: 1,
				},
			] as QuestObjective[],
			rewards: [
				{ type: 'experience', amount: 600 },
				{ type: 'gold', amount: 500 },
				{ type: 'reputation', amount: 100 },
			] as QuestReward[],
		},
		{
			title: "The Merchant's Favor",
			description: "Help a struggling merchant by delivering important goods to their business partner in the next town.",
			type: 'social' as const,
			difficulty: 'easy' as const,
			giver: "Merchant Hanna",
			location: "Market Square",
			objectives: [
				{
					id: 'obj_collect_goods',
					type: 'collect' as const,
					description: "Collect the merchant's goods",
					targetValue: 1,
				},
				{
					id: 'obj_travel_town',
					type: 'travel' as const,
					description: "Travel to Millbrook Town",
					targetValue: 1,
				},
				{
					id: 'obj_deliver_goods',
					type: 'interact' as const,
					description: "Deliver goods to the business partner",
					targetValue: 1,
				},
			] as QuestObjective[],
			rewards: [
				{ type: 'experience', amount: 150 },
				{ type: 'gold', amount: 75 },
				{ type: 'reputation', amount: 25 },
			] as QuestReward[],
		},
	];

	/**
	 * Create a quest from template
	 */
	const createQuestFromTemplate = async (template: typeof questTemplates[0]) => {
		try {
			const quest = await quests.createQuest({
				...template,
				status: 'available',
			});
			
			Alert.alert('Quest Created', `"${quest.title}" has been added to available quests!`);
			onQuestCreated?.(quest);
		} catch (error) {
			Alert.alert('Error', 'Failed to create quest');
		}
	};

	/**
	 * Create all sample quests
	 */
	const createAllSampleQuests = async () => {
		try {
			Alert.alert(
				'Create Sample Quests',
				`This will create ${questTemplates.length} sample quests. Continue?`,
				[
					{ text: 'Cancel', style: 'cancel' },
					{
						text: 'Create All',
						onPress: async () => {
							for (const template of questTemplates) {
								await quests.createQuest({
									...template,
									status: 'available',
								});
							}
							Alert.alert('Success', `Created ${questTemplates.length} sample quests!`);
						},
					},
				]
			);
		} catch (error) {
			Alert.alert('Error', 'Failed to create sample quests');
		}
	};

	/**
	 * Clear all quests
	 */
	const clearAllQuests = async () => {
		Alert.alert(
			'Clear All Quests',
			'This will remove all quests. This action cannot be undone.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Clear All',
					style: 'destructive',
					onPress: async () => {
						try {
							const allQuests = [...quests.activeQuests, ...quests.availableQuests, ...quests.completedQuests];
							for (const quest of allQuests) {
								await quests.deleteQuest(quest.id);
							}
							Alert.alert('Success', 'All quests have been cleared');
						} catch (error) {
							Alert.alert('Error', 'Failed to clear quests');
						}
					},
				},
			]
		);
	};

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<ThemedText style={styles.title}>Quest Creator</ThemedText>
				<ThemedText style={styles.subtitle}>Create sample quests for testing</ThemedText>
			</View>

			{/* Quick Actions */}
			<View style={styles.quickActions}>
				<TouchableOpacity
					style={[styles.actionButton, styles.createAllButton]}
					onPress={createAllSampleQuests}
				>
					<Feather name="plus-circle" size={20} color={colors.success} />
					<ThemedText style={[styles.actionButtonText, { color: colors.success }]}>
						Create All Samples
					</ThemedText>
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.actionButton, styles.clearAllButton]}
					onPress={clearAllQuests}
				>
					<Feather name="trash-2" size={20} color={colors.error} />
					<ThemedText style={[styles.actionButtonText, { color: colors.error }]}>
						Clear All Quests
					</ThemedText>
				</TouchableOpacity>
			</View>

			{/* Quest Templates */}
			<View style={styles.templatesContainer}>
				<ThemedText style={styles.templatesTitle}>Individual Quest Templates</ThemedText>
				{questTemplates.map((template, index) => (
					<TouchableOpacity
						key={index}
						style={styles.templateCard}
						onPress={() => createQuestFromTemplate(template)}
					>
						<View style={styles.templateHeader}>
							<View style={styles.templateTitleRow}>
								<Feather 
									name={
										template.type === 'main' ? 'star' :
										template.type === 'side' ? 'circle' :
										template.type === 'daily' ? 'clock' :
										template.type === 'bounty' ? 'target' :
										template.type === 'exploration' ? 'map' :
										template.type === 'social' ? 'users' : 'help-circle'
									} 
									size={16} 
									color={colors.primary} 
								/>
								<ThemedText style={styles.templateTitle}>{template.title}</ThemedText>
								<View style={[
									styles.difficultyBadge,
									{
										backgroundColor: template.difficulty === 'easy' ? colors.success :
															template.difficulty === 'medium' ? colors.warning :
															colors.error
									}
								]}>
									<ThemedText style={styles.difficultyText}>
										{template.difficulty.toUpperCase()}
									</ThemedText>
								</View>
							</View>
							<ThemedText style={styles.templateType}>
								{template.type.replace('-', ' ').toUpperCase()}
							</ThemedText>
						</View>

						<ThemedText style={styles.templateDescription} numberOfLines={2}>
							{template.description}
						</ThemedText>

						<View style={styles.templateMeta}>
							<ThemedText style={styles.templateObjectives}>
								{template.objectives.length} objective{template.objectives.length !== 1 ? 's' : ''}
							</ThemedText>
							<ThemedText style={styles.templateRewards}>
								{template.rewards.length} reward{template.rewards.length !== 1 ? 's' : ''}
							</ThemedText>
						</View>
					</TouchableOpacity>
				))}
			</View>
		</View>
	);
};

const createStyles = (colors: any) => StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.background,
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
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 14,
		color: colors.textSecondary,
	},
	quickActions: {
		flexDirection: 'row',
		padding: 16,
		gap: 12,
	},
	actionButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 8,
		borderWidth: 1,
		gap: 8,
	},
	createAllButton: {
		borderColor: colors.success,
		backgroundColor: colors.background,
	},
	clearAllButton: {
		borderColor: colors.error,
		backgroundColor: colors.background,
	},
	actionButtonText: {
		fontSize: 14,
		fontWeight: '600',
	},
	templatesContainer: {
		flex: 1,
		padding: 16,
	},
	templatesTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: colors.text,
		marginBottom: 16,
	},
	templateCard: {
		backgroundColor: colors.backgroundSecondary,
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: colors.border,
	},
	templateHeader: {
		marginBottom: 12,
	},
	templateTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
		gap: 8,
	},
	templateTitle: {
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
	templateType: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.textSecondary,
	},
	templateDescription: {
		fontSize: 14,
		color: colors.textSecondary,
		lineHeight: 20,
		marginBottom: 12,
	},
	templateMeta: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	templateObjectives: {
		fontSize: 12,
		color: colors.primary,
		fontWeight: '600',
	},
	templateRewards: {
		fontSize: 12,
		color: colors.warning,
		fontWeight: '600',
	},
});