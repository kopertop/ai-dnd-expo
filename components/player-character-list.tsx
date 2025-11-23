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
	// For players: use character.id as the key
	// For NPCs: we need to match by token.id (which is what initiative order uses for entityId)
	const entityMap = new Map<string, { type: 'player' | 'npc'; id: string; name: string; data: Character | MapToken }>();
	
	characters.forEach(char => {
		entityMap.set(char.id, { type: 'player', id: char.id, name: char.name, data: char });
	});
	
	npcTokens.forEach(token => {
		// For NPCs, initiative order uses token.id as entityId (see api/src/routes/games.ts line 1498)
		// So we use token.id as the key for matching initiative order
		entityMap.set(token.id, { type: 'npc', id: token.id, name: token.label || 'NPC', data: token });
		// Also store by token.entityId if different (for active turn matching, which might use entityId)
		if (token.entityId && token.entityId !== token.id) {
			entityMap.set(token.entityId, { type: 'npc', id: token.id, name: token.label || 'NPC', data: token });
		}
	});

	// Sort by initiative order if available, otherwise keep original order
	// Initiative order is already sorted highest to lowest from backend
	let allEntities: Array<{ type: 'player' | 'npc'; id: string; name: string; data: Character | MapToken; initiative?: number; initiativeIndex?: number }>;
	
	if (initiativeOrder && initiativeOrder.length > 0) {
		if (__DEV__) {
			console.log('[Initiative Debug] Initiative Order:', initiativeOrder);
			console.log('[Initiative Debug] Entity Map Keys:', Array.from(entityMap.keys()));
			console.log('[Initiative Debug] Characters:', characters.map(c => ({ id: c.id, name: c.name })));
			console.log('[Initiative Debug] NPC Tokens:', npcTokens.map(t => ({ id: t.id, entityId: t.entityId, label: t.label })));
		}
		
		// Map initiative order entries to entities (already sorted highest to lowest)
		// Only show entities that are in the initiative order - no duplicates
		allEntities = initiativeOrder
			.map((entry, index) => {
				const entity = entityMap.get(entry.entityId);
				if (__DEV__ && !entity) {
					console.warn('[Initiative Debug] No entity found for:', entry.entityId, 'Type:', entry.type);
				}
				if (!entity) return null;
				return {
					...entity,
					initiative: entry.initiative,
					initiativeIndex: index, // 0 = highest initiative, 1 = second highest, etc.
				};
			})
			.filter((e): e is NonNullable<typeof e> => e !== null);
		
		// Remove duplicates by entity id (in case an entity was stored with multiple keys)
		const seenIds = new Set<string>();
		allEntities = allEntities.filter(entity => {
			if (seenIds.has(entity.id)) {
				return false;
			}
			seenIds.add(entity.id);
			return true;
		});
		
		if (__DEV__) {
			console.log('[Initiative Debug] Final Entities:', allEntities.map(e => ({ 
				name: e.name, 
				initiative: e.initiative, 
				initiativeIndex: e.initiativeIndex 
			})));
		}
	} else {
		// No initiative order, use original order
		allEntities = Array.from(entityMap.values());
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

