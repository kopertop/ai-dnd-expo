import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { predefinedQuests } from '@/constants/quests';
import { Quest } from '@/types/quest';
import { useScreenSize } from '@/hooks/use-screen-size';

interface QuestSelectorProps {
	onSelect: (quest: Quest) => void;
	selectedQuest?: Quest | null;
}

export const QuestSelector: React.FC<QuestSelectorProps> = ({
	onSelect,
	selectedQuest,
}) => {
	const { isMobile } = useScreenSize();

	return (
		<ThemedView style={styles.container}>
			<ThemedText type="title" style={styles.title}>
				Select a Quest
			</ThemedText>
			<ScrollView style={styles.scrollView} showsVerticalScrollIndicator={true}>
				{predefinedQuests.map(quest => {
					const isSelected = selectedQuest?.id === quest.id;
					return (
						<TouchableOpacity
							key={quest.id}
							style={[
								styles.questCard,
								isMobile && styles.questCardMobile,
								isSelected && styles.questCardSelected,
							]}
							onPress={() => onSelect(quest)}
							activeOpacity={0.7}
						>
							<View style={styles.questHeader}>
								<ThemedText
									type="subtitle"
									style={[
										styles.questName,
										isMobile && styles.questNameMobile,
									]}
								>
									{quest.name}
								</ThemedText>
								{quest.maxPlayers && (
									<ThemedText style={styles.questMeta}>
										Up to {quest.maxPlayers} players
									</ThemedText>
								)}
								{quest.estimatedDuration && (
									<ThemedText style={styles.questMeta}>
										~{quest.estimatedDuration} min
									</ThemedText>
								)}
							</View>
							<ThemedText style={styles.questDescription}>
								{quest.description}
							</ThemedText>
							<View style={styles.objectivesContainer}>
								<ThemedText style={styles.objectivesTitle}>Objectives:</ThemedText>
								{quest.objectives.map((obj, index) => (
									<ThemedText key={obj.id} style={styles.objective}>
										{index + 1}. {obj.description}
									</ThemedText>
								))}
							</View>
						</TouchableOpacity>
					);
				})}
			</ScrollView>
		</ThemedView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
	},
	title: {
		marginBottom: 20,
		textAlign: 'center',
	},
	scrollView: {
		flex: 1,
	},
	questCard: {
		backgroundColor: '#E2D3B3',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		borderWidth: 2,
		borderColor: '#C9B037',
	},
	questCardMobile: {
		padding: 12,
		marginBottom: 12,
	},
	questCardSelected: {
		borderColor: '#8B6914',
		backgroundColor: '#F5E6D3',
	},
	questHeader: {
		marginBottom: 12,
	},
	questName: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 4,
		color: '#3B2F1B',
	},
	questNameMobile: {
		fontSize: 18,
	},
	questMeta: {
		fontSize: 14,
		color: '#6B5B3D',
		marginTop: 4,
	},
	questDescription: {
		fontSize: 16,
		color: '#3B2F1B',
		marginBottom: 12,
		lineHeight: 22,
	},
	objectivesContainer: {
		marginTop: 8,
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: '#C9B037',
	},
	objectivesTitle: {
		fontSize: 14,
		fontWeight: 'bold',
		color: '#3B2F1B',
		marginBottom: 6,
	},
	objective: {
		fontSize: 14,
		color: '#5A4A3A',
		marginLeft: 8,
		marginBottom: 4,
	},
});

