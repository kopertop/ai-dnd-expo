import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

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
	onCharacterSelect?: (characterId: string, type: 'player' | 'npc') => void;
	canSelect?: boolean;
	initiativeOrder?: Array<{
		entityId: string;
		initiative: number;
		type: 'player' | 'npc';
	}>;
}

export const PlayerCharacterList: React.FC<PlayerCharacterListProps> = ({
	characters,
	currentPlayerId,
	npcTokens = [],
	activeTurnEntityId,
	onCharacterSelect,
	canSelect = false,
	initiativeOrder,
}) => {
	const { isMobile } = useScreenSize();

	// Create entity map for quick lookup
	// For players: use character.id as the key (matches initiative order entityId)
	// For NPCs: use token.id as the key (which equals token.entityId and matches initiative order entityId)
	const entityMap = new Map<string, { type: 'player' | 'npc'; id: string; name: string; data: Character | MapToken }>();
	
	characters.forEach(char => {
		entityMap.set(char.id, { type: 'player', id: char.id, name: char.name, data: char });
	});
	
	npcTokens.forEach(token => {
		// For NPCs, token.id equals token.entityId (set in schema-adapters.ts)
		// Initiative order uses token.id as entityId, so we use token.id as the key
		const entityId = token.entityId || token.id;
		entityMap.set(entityId, { type: 'npc', id: token.id, name: token.label || 'NPC', data: token });
	});

	// Build list of all entities, prioritizing initiative order but including all entities
	// Initiative order is already sorted highest to lowest from backend
	let allEntities: Array<{ type: 'player' | 'npc'; id: string; name: string; data: Character | MapToken; initiative?: number; initiativeIndex?: number }>;
	
	if (initiativeOrder && initiativeOrder.length > 0) {
		// Create a map of entities in initiative order with their initiative data
		const initiativeMap = new Map<string, { initiative: number; initiativeIndex: number }>();
		initiativeOrder.forEach((entry, index) => {
			initiativeMap.set(entry.entityId, {
				initiative: entry.initiative,
				initiativeIndex: index,
			});
		});
		
		// Get all entities from entityMap, add initiative data if available
		const seen = new Set<string>();
		const entitiesWithInitiative: typeof allEntities = [];
		const entitiesWithoutInitiative: typeof allEntities = [];
		
		entityMap.forEach((entity, entityId) => {
			if (seen.has(entity.id)) {
				return; // Skip duplicates
			}
			seen.add(entity.id);
			
			const initiativeData = initiativeMap.get(entityId);
			const entityWithData = {
				...entity,
				initiative: initiativeData?.initiative,
				initiativeIndex: initiativeData?.initiativeIndex,
			};
			
			if (initiativeData) {
				entitiesWithInitiative.push(entityWithData);
			} else {
				entitiesWithoutInitiative.push(entityWithData);
			}
		});
		
		// Sort entities with initiative by their initiative index (already sorted)
		entitiesWithInitiative.sort((a, b) => (a.initiativeIndex ?? 0) - (b.initiativeIndex ?? 0));
		
		// Combine: entities with initiative first, then entities without
		allEntities = [...entitiesWithInitiative, ...entitiesWithoutInitiative];
	} else {
		// No initiative order, use original order with deduplication
		const seen = new Set<string>();
		allEntities = Array.from(entityMap.values()).filter(entity => {
			if (seen.has(entity.id)) {
				return false;
			}
			seen.add(entity.id);
			return true;
		});
	}

	return (
		<ThemedView style={styles.container}>
			<ThemedText type="subtitle" style={styles.title}>
				Characters ({allEntities.length})
			</ThemedText>
			<ScrollView style={styles.scrollView} showsVerticalScrollIndicator={true}>
				{allEntities.map((entity) => {
					const isCurrentPlayer = entity.type === 'player' && entity.id === currentPlayerId;
					// For active turn check: use entity.id for both players and NPCs
					// For NPCs, entity.id is token.id (which matches initiative order entityId)
					// For players, entity.id is character.id (which matches initiative order entityId)
					const entityIdForTurnCheck = entity.id;
					const isActiveTurn = entityIdForTurnCheck === activeTurnEntityId;
					
					if (entity.type === 'player') {
						const character = entity.data as Character;
						const displayName = character.name || character.race || character.class || 'Unknown';
						const CardComponent = canSelect && onCharacterSelect ? TouchableOpacity : View;
						return (
							<CardComponent
								key={character.id}
								style={[
									styles.characterCard,
									isMobile && styles.characterCardMobile,
									isCurrentPlayer && styles.characterCardCurrent,
									isActiveTurn && styles.characterCardActiveTurn,
									canSelect && styles.characterCardSelectable,
								]}
								onPress={canSelect && onCharacterSelect ? () => onCharacterSelect(character.id, 'player') : undefined}
								activeOpacity={canSelect ? 0.7 : 1}
							>
								<View style={styles.characterHeader}>
									<View style={styles.characterNameContainer}>
										{initiativeOrder && initiativeOrder.length > 0 && entity.initiativeIndex !== undefined && (
											<ThemedText style={styles.initiativeNumber}>
												{entity.initiativeIndex + 1}.
											</ThemedText>
										)}
										<ThemedText style={styles.characterName}>
											{displayName}
											{isCurrentPlayer && ' (You)'}
											{isActiveTurn && ' 🟢'}
										</ThemedText>
									</View>
									<View style={styles.characterHeaderRight}>
										{initiativeOrder && initiativeOrder.length > 0 && entity.initiative !== undefined && (
											<ThemedText style={styles.initiativeValue}>
												Init: {entity.initiative}
											</ThemedText>
										)}
										<ThemedText style={styles.characterLevel}>
											Level {character.level}
										</ThemedText>
									</View>
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
							</CardComponent>
						);
					} else {
						const npcToken = entity.data as MapToken;
						const CardComponent = canSelect && onCharacterSelect ? TouchableOpacity : View;
						return (
							<CardComponent
								key={npcToken.id}
								style={[
									styles.characterCard,
									styles.npcCard,
									isMobile && styles.characterCardMobile,
									isActiveTurn && styles.characterCardActiveTurn,
									canSelect && styles.characterCardSelectable,
								]}
								onPress={canSelect && onCharacterSelect ? () => onCharacterSelect(npcToken.id, 'npc') : undefined}
								activeOpacity={canSelect ? 0.7 : 1}
							>
								<View style={styles.characterHeader}>
									<View style={styles.characterNameContainer}>
										{initiativeOrder && initiativeOrder.length > 0 && entity.initiativeIndex !== undefined && (
											<ThemedText style={styles.initiativeNumber}>
												{entity.initiativeIndex + 1}.
											</ThemedText>
										)}
										<ThemedText style={styles.characterName}>
											{npcToken.label || 'NPC'}
											{isActiveTurn && ' 🟢'}
										</ThemedText>
									</View>
									<View style={styles.characterHeaderRight}>
										{initiativeOrder && initiativeOrder.length > 0 && entity.initiative !== undefined && (
											<ThemedText style={styles.initiativeValue}>
												Init: {entity.initiative}
											</ThemedText>
										)}
										<ThemedText style={styles.characterLevel}>
											NPC
										</ThemedText>
									</View>
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
							</CardComponent>
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
	characterNameContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		gap: 6,
	},
	initiativeNumber: {
		fontSize: 14,
		fontWeight: 'bold',
		color: '#8B6914',
		minWidth: 24,
	},
	characterName: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#3B2F1B',
		flex: 1,
	},
	characterHeaderRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	initiativeValue: {
		fontSize: 12,
		fontWeight: '600',
		color: '#8B6914',
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
	characterCardSelectable: {
		cursor: 'pointer',
	},
});

