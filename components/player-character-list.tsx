import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { useScreenSize } from '@/hooks/use-screen-size';
import { Character } from '@/types/character';

interface PlayerCharacterListProps {
	characters: Character[];
	currentPlayerId?: string;
}

export const PlayerCharacterList: React.FC<PlayerCharacterListProps> = ({
	characters,
	currentPlayerId,
}) => {
	const { isMobile } = useScreenSize();

	return (
		<ThemedView style={styles.container}>
			<ThemedText type="subtitle" style={styles.title}>
				Party ({characters.length})
			</ThemedText>
			<ScrollView style={styles.scrollView} showsVerticalScrollIndicator={true}>
				{characters.map((character, index) => {
					const isCurrentPlayer = character.id === currentPlayerId;
					const displayName = character.name || character.race || character.class || 'Unknown';
					return (
						<View
							key={character.id}
							style={[
								styles.characterCard,
								isMobile && styles.characterCardMobile,
								isCurrentPlayer && styles.characterCardCurrent,
							]}
						>
							<View style={styles.characterHeader}>
								<ThemedText style={styles.characterName}>
									{displayName}
									{isCurrentPlayer && ' (You)'}
								</ThemedText>
								<ThemedText style={styles.characterLevel}>
									Level {character.level}
								</ThemedText>
							</View>
							<ThemedText style={styles.characterDetails}>
								{character.race} {character.class}
							</ThemedText>
							<View style={styles.statsRow}>
								<View style={styles.stat}>
									<ThemedText style={styles.statLabel}>HP</ThemedText>
									<ThemedText style={styles.statValue}>
										{character.health}/{character.maxHealth}
									</ThemedText>
								</View>
								<View style={styles.stat}>
									<ThemedText style={styles.statLabel}>AP</ThemedText>
									<ThemedText style={styles.statValue}>
										{character.actionPoints}/{character.maxActionPoints}
									</ThemedText>
								</View>
							</View>
						</View>
					);
				})}
			</ScrollView>
		</ThemedView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
	},
	title: {
		marginBottom: 12,
		fontSize: 18,
		color: '#3B2F1B',
	},
	scrollView: {
		flex: 1,
	},
	characterCard: {
		backgroundColor: '#E2D3B3',
		borderRadius: 12,
		padding: 12,
		marginBottom: 10,
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	characterCardMobile: {
		padding: 10,
		marginBottom: 8,
	},
	characterCardCurrent: {
		borderColor: '#8B6914',
		borderWidth: 2,
		backgroundColor: '#F5E6D3',
	},
	characterHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 6,
	},
	characterName: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#3B2F1B',
		flex: 1,
	},
	characterLevel: {
		fontSize: 14,
		color: '#6B5B3D',
	},
	characterDetails: {
		fontSize: 14,
		color: '#6B5B3D',
		marginBottom: 8,
	},
	statsRow: {
		flexDirection: 'row',
		gap: 16,
	},
	stat: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	statLabel: {
		fontSize: 12,
		color: '#6B5B3D',
		fontWeight: 'bold',
	},
	statValue: {
		fontSize: 14,
		color: '#3B2F1B',
		fontWeight: 'bold',
	},
});

