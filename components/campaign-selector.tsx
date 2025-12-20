import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { predefinedQuests } from '@/constants/quests';
import { useScreenSize } from '@/hooks/use-screen-size';
import { Quest } from '@/types/quest';

interface CampaignSelectorProps {
	onSelect: (quest: Quest) => void;
	selectedCampaign?: Quest | null;
}

export const CampaignSelector: React.FC<CampaignSelectorProps> = ({
	onSelect,
	selectedCampaign,
}) => {
	const { isMobile } = useScreenSize();

	return (
		<ThemedView style={styles.container}>
			<ThemedText type="title" style={styles.title}>
				Select a Campaign
			</ThemedText>
			<ScrollView style={styles.scrollView} showsVerticalScrollIndicator={true}>
				{predefinedQuests.map(quest => {
					const isSelected = selectedCampaign?.id === quest.id;
					return (
						<TouchableOpacity
							key={quest.id}
							style={[
								styles.campaignCard,
								isMobile && styles.campaignCardMobile,
								isSelected && styles.campaignCardSelected,
							]}
							onPress={() => onSelect(quest)}
							activeOpacity={0.7}
						>
							<View style={styles.campaignHeader}>
								<ThemedText
									type="subtitle"
									style={[
										styles.campaignName,
										isMobile && styles.campaignNameMobile,
									]}
								>
									{quest.name}
								</ThemedText>
								{quest.maxPlayers && (
									<ThemedText style={styles.campaignMeta}>
										Up to {quest.maxPlayers} players
									</ThemedText>
								)}
								{quest.estimatedDuration && (
									<ThemedText style={styles.campaignMeta}>
										~{quest.estimatedDuration} min
									</ThemedText>
								)}
							</View>
							<ThemedText style={styles.campaignDescription}>
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
	campaignCard: {
		backgroundColor: '#E2D3B3',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		borderWidth: 2,
		borderColor: '#C9B037',
	},
	campaignCardMobile: {
		padding: 12,
		marginBottom: 12,
	},
	campaignCardSelected: {
		borderColor: '#8B6914',
		backgroundColor: '#F5E6D3',
	},
	campaignHeader: {
		marginBottom: 12,
	},
	campaignName: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 4,
		color: '#3B2F1B',
	},
	campaignNameMobile: {
		fontSize: 18,
	},
	campaignMeta: {
		fontSize: 14,
		color: '#6B5B3D',
		marginTop: 4,
	},
	campaignDescription: {
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
