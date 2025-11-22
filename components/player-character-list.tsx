import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { useScreenSize } from '@/hooks/use-screen-size';
import { Character } from '@/types/character';
import { MapToken } from '@/types/multiplayer-map';

interface PlayerCharacterListProps {
	characters: Character[];
	currentPlayerId?: string;
	npcTokens?: MapToken[];
	activeTurnEntityId?: string;
}

export const PlayerCharacterList: React.FC<PlayerCharacterListProps> = ({
	characters,
	currentPlayerId,
	npcTokens = [],
	activeTurnEntityId,
}) => {
	const { isMobile } = useScreenSize();

	const allEntities = [
		...characters.map(char => ({ type: 'player' as const, id: char.id, name: char.name, data: char })),
		...npcTokens.map(token => ({ type: 'npc' as const, id: token.id, name: token.label || 'NPC', data: token })),
	];

	return (
		<ThemedView style={styles.container}>
			<ThemedText type="subtitle" style={styles.title}>
				Characters ({allEntities.length})
			</ThemedText>
			<ScrollView style={styles.scrollView} showsVerticalScrollIndicator={true}>
				{allEntities.map((entity) => {
					const isCurrentPlayer = entity.type === 'player' && entity.id === currentPlayerId;
					const isActiveTurn = entity.id === activeTurnEntityId;
					
					if (entity.type === 'player') {
						const character = entity.data as Character;
						const displayName = character.name || character.race || character.class || 'Unknown';
						return (
							<View
								key={character.id}
								style={[
									styles.characterCard,
									isMobile && styles.characterCardMobile,
									isCurrentPlayer && styles.characterCardCurrent,
									isActiveTurn && styles.characterCardActiveTurn,
								]}
							>
								<View style={styles.characterHeader}>
									<ThemedText style={styles.characterName}>
										{displayName}
										{isCurrentPlayer && ' (You)'}
										{isActiveTurn && ' 🟢'}
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
					} else {
						const npcToken = entity.data as MapToken;
						return (
							<View
								key={npcToken.id}
								style={[
									styles.characterCard,
									styles.npcCard,
									isMobile && styles.characterCardMobile,
									isActiveTurn && styles.characterCardActiveTurn,
								]}
							>
								<View style={styles.characterHeader}>
									<ThemedText style={styles.characterName}>
										{npcToken.label || 'NPC'}
										{isActiveTurn && ' 🟢'}
									</ThemedText>
									<ThemedText style={styles.characterLevel}>
										NPC
									</ThemedText>
								</View>
								{npcToken.hitPoints !== undefined && (
									<View style={styles.statsRow}>
										<View style={styles.stat}>
											<ThemedText style={styles.statLabel}>HP</ThemedText>
											<ThemedText style={styles.statValue}>
												{npcToken.hitPoints}/{npcToken.maxHitPoints || npcToken.hitPoints}
											</ThemedText>
										</View>
									</View>
								)}
							</View>
						);
					}
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
	characterCardActiveTurn: {
		borderColor: '#4A6741',
		borderWidth: 2,
		backgroundColor: '#E8F5E9',
	},
	npcCard: {
		backgroundColor: '#E8E4D8',
		borderColor: '#A89B7D',
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

