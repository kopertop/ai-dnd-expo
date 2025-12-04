import React from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Character } from '@/types/character';
import { MapToken } from '@/types/multiplayer-map';
import { STAT_KEYS } from '@/types/stats';
import { calculateAC } from '@/utils/combat-utils';

interface CharacterViewModalProps {
	visible: boolean;
	character: Character | null;
	npcToken: MapToken | null;
	onClose: () => void;
	isNPC: boolean;
	showFullStats: boolean; // true for players, false for NPCs (unless perception check passed)
	initiativeOrder?: Array<{ entityId: string; initiative: number; type: 'player' | 'npc' }>;
}

export const CharacterViewModal: React.FC<CharacterViewModalProps> = ({
	visible,
	character,
	npcToken,
	onClose,
	isNPC,
	showFullStats,
	initiativeOrder,
}) => {
	if (!visible) return null;

	const entityId = character?.id || npcToken?.id;
	const entityName = character?.name || npcToken?.label || 'Unknown';

	// Get initiative value from initiative order
	const initiativeEntry = entityId ? initiativeOrder?.find(entry => entry.entityId === entityId) : null;
	const initiativeValue = initiativeEntry?.initiative;

	// Get stats - only show if showFullStats is true
	const stats = showFullStats && character?.stats ? character.stats : undefined;
	const npcMetadata = npcToken?.metadata as { armorClass?: number } | undefined;
	const armorClass = character ? calculateAC(character) : npcMetadata?.armorClass;

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
				<ThemedView style={styles.modalContainer} onStartShouldSetResponder={() => true}>
					<View style={styles.header}>
						<ThemedText type="subtitle">{entityName}</ThemedText>
						<TouchableOpacity style={styles.closeButton} onPress={onClose}>
							<ThemedText style={styles.closeButtonText}>✕</ThemedText>
						</TouchableOpacity>
					</View>

					<ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
						{/* Basic Information */}
						<View style={styles.section}>
							<ThemedText style={styles.sectionTitle}>Basic Information</ThemedText>
							{character && (
								<>
									<View style={styles.infoRow}>
										<ThemedText style={styles.infoLabel}>Name:</ThemedText>
										<ThemedText style={styles.infoValue}>{character.name}</ThemedText>
									</View>
									<View style={styles.infoRow}>
										<ThemedText style={styles.infoLabel}>Level:</ThemedText>
										<ThemedText style={styles.infoValue}>{character.level}</ThemedText>
									</View>
									<View style={styles.infoRow}>
										<ThemedText style={styles.infoLabel}>Race:</ThemedText>
										<ThemedText style={styles.infoValue}>{character.race}</ThemedText>
									</View>
									<View style={styles.infoRow}>
										<ThemedText style={styles.infoLabel}>Class:</ThemedText>
										<ThemedText style={styles.infoValue}>{character.class}</ThemedText>
									</View>
									{character.trait && (
										<View style={styles.infoRow}>
											<ThemedText style={styles.infoLabel}>Trait:</ThemedText>
											<ThemedText style={styles.infoValue}>{character.trait}</ThemedText>
										</View>
									)}
								</>
							)}
							{npcToken && (
								<>
									<View style={styles.infoRow}>
										<ThemedText style={styles.infoLabel}>Name:</ThemedText>
										<ThemedText style={styles.infoValue}>{npcToken.label}</ThemedText>
									</View>
									<View style={styles.infoRow}>
										<ThemedText style={styles.infoLabel}>Type:</ThemedText>
										<ThemedText style={styles.infoValue}>NPC</ThemedText>
									</View>
									{!showFullStats && (
										<View style={styles.infoRow}>
											<ThemedText style={styles.infoLabel}>Status:</ThemedText>
											<ThemedText style={styles.infoValue}>Unknown</ThemedText>
										</View>
									)}
								</>
							)}
							{initiativeValue !== undefined && (
								<View style={styles.infoRow}>
									<ThemedText style={styles.infoLabel}>Initiative:</ThemedText>
									<ThemedText style={styles.infoValue}>{initiativeValue}</ThemedText>
								</View>
							)}
							{armorClass !== undefined && (
								<View style={styles.infoRow}>
									<ThemedText style={styles.infoLabel}>Armor Class:</ThemedText>
									<ThemedText style={styles.infoValue}>{armorClass}</ThemedText>
								</View>
							)}
						</View>

						{/* Health & Action Points */}
						<View style={styles.section}>
							<ThemedText style={styles.sectionTitle}>Health & Resources</ThemedText>
							{character && (
								<>
									<View style={styles.statRow}>
										<ThemedText style={styles.statLabel}>Health:</ThemedText>
										<ThemedText style={styles.statValue}>
											{character.health} / {character.maxHealth}
										</ThemedText>
									</View>
									<View style={styles.statRow}>
										<ThemedText style={styles.statLabel}>Action Points:</ThemedText>
										<ThemedText style={styles.statValue}>
											{character.actionPoints} / {character.maxActionPoints}
										</ThemedText>
									</View>
								</>
							)}
							{npcToken && (
								<View style={styles.statRow}>
									<ThemedText style={styles.statLabel}>Health:</ThemedText>
									<ThemedText style={styles.statValue}>
										{showFullStats
											? `${npcToken.hitPoints ?? '?'} / ${npcToken.maxHitPoints ?? '?'}`
											: 'Unknown'
										}
									</ThemedText>
								</View>
							)}
						</View>

						{/* Ability Scores - Only show if showFullStats is true */}
						{showFullStats && stats && (
							<View style={styles.section}>
								<ThemedText style={styles.sectionTitle}>Ability Scores</ThemedText>
								<View style={styles.statsGrid}>
									{STAT_KEYS.map(statKey => (
										<View key={statKey} style={styles.statBox}>
											<ThemedText style={styles.statBoxLabel}>{statKey}</ThemedText>
											<ThemedText style={styles.statBoxValue}>{stats[statKey]}</ThemedText>
											<ThemedText style={styles.statBoxModifier}>
												({Math.floor((stats[statKey] - 10) / 2) >= 0 ? '+' : ''}
												{Math.floor((stats[statKey] - 10) / 2)})
											</ThemedText>
										</View>
									))}
								</View>
							</View>
						)}

						{/* Skills - Only show for players */}
						{showFullStats && character && character.skills && character.skills.length > 0 && (
							<View style={styles.section}>
								<ThemedText style={styles.sectionTitle}>Skills</ThemedText>
								<View style={styles.skillsContainer}>
									{character.skills.map((skill, index) => (
										<View key={index} style={styles.skillTag}>
											<ThemedText style={styles.skillText}>{skill}</ThemedText>
										</View>
									))}
								</View>
							</View>
						)}

						{/* NPC Limited Info Message */}
						{isNPC && !showFullStats && (
							<View style={styles.section}>
								<ThemedText style={styles.infoText}>
									Limited information available. Pass a perception check to see full stats.
								</ThemedText>
							</View>
						)}
					</ScrollView>
				</ThemedView>
			</TouchableOpacity>
		</Modal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContainer: {
		backgroundColor: '#FFF9EF',
		borderRadius: 12,
		padding: 20,
		minWidth: 400,
		maxWidth: 500,
		maxHeight: '80%',
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	closeButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#D4BC8B',
		justifyContent: 'center',
		alignItems: 'center',
	},
	closeButtonText: {
		fontSize: 18,
		color: '#3B2F1B',
		fontWeight: 'bold',
	},
	content: {
		flex: 1,
	},
	section: {
		marginBottom: 24,
		padding: 16,
		backgroundColor: '#F5E6D3',
		borderRadius: 12,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#3B2F1B',
		marginBottom: 12,
	},
	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
		paddingVertical: 4,
	},
	infoLabel: {
		fontSize: 14,
		color: '#6B5B3D',
		fontWeight: '600',
	},
	infoValue: {
		fontSize: 14,
		color: '#3B2F1B',
		flex: 1,
		textAlign: 'right',
	},
	statRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
		gap: 8,
	},
	statLabel: {
		fontSize: 14,
		color: '#3B2F1B',
		fontWeight: 'bold',
	},
	statValue: {
		fontSize: 14,
		color: '#3B2F1B',
		fontWeight: '600',
	},
	statsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	statBox: {
		width: '30%',
		backgroundColor: '#E2D3B3',
		borderRadius: 8,
		padding: 8,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	statBoxLabel: {
		fontSize: 12,
		color: '#6B5B3D',
		fontWeight: '600',
		marginBottom: 4,
	},
	statBoxValue: {
		fontSize: 18,
		color: '#3B2F1B',
		fontWeight: 'bold',
	},
	statBoxModifier: {
		fontSize: 11,
		color: '#6B5B3D',
		marginTop: 2,
	},
	skillsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
	},
	skillTag: {
		backgroundColor: '#E2D3B3',
		borderRadius: 6,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	skillText: {
		fontSize: 12,
		color: '#3B2F1B',
	},
	infoText: {
		fontSize: 12,
		color: '#6B5B3D',
		fontStyle: 'italic',
		textAlign: 'center',
	},
});

