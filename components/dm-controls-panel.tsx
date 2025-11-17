import React, { useMemo, useState } from 'react';
import {
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { useScreenSize } from '@/hooks/use-screen-size';
import { Character } from '@/types/character';
import { MultiplayerGameState } from '@/types/multiplayer-game';
import { NpcState } from '@/types/multiplayer-map';

type PlacementSelection = {
        type: 'character' | 'npc' | null;
        id?: string;
};

const TERRAIN_TYPES = ['stone', 'grass', 'water', 'lava'];

interface DMControlsPanelProps {
        gameState: MultiplayerGameState;
        onDMAction: (type: string, data: Record<string, unknown>) => void;
        onAIRequest?: (prompt: string) => Promise<string>;
        mapState?: MultiplayerGameState['mapState'];
        isMapEditable?: boolean;
        selectedTerrain?: string;
        placementSelection?: PlacementSelection;
        onToggleMapEdit?: (enabled: boolean) => void;
        onSelectTerrain?: (terrain: string) => void;
        onPlacementChange?: (selection: PlacementSelection) => void;
}

export const DMControlsPanel: React.FC<DMControlsPanelProps> = ({
	gameState,
	onDMAction,
	onAIRequest,
	mapState,
	isMapEditable = false,
	selectedTerrain = 'stone',
	placementSelection,
	onToggleMapEdit,
	onSelectTerrain,
	onPlacementChange,
}) => {
	const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
	const [aiPrompt, setAiPrompt] = useState('');
	const [aiResponse, setAiResponse] = useState<string | null>(null);
	const [aiLoading, setAiLoading] = useState(false);
	const { isMobile } = useScreenSize();

	const selectedCharacter = selectedCharacterId
		? gameState.characters.find(c => c.id === selectedCharacterId)
		: null;

	const npcStates: NpcState[] = useMemo(() => gameState.npcStates ?? [], [gameState.npcStates]);

	const handleNarrate = () => {
		if (aiPrompt.trim()) {
			onDMAction('narrate', { content: aiPrompt });
			setAiPrompt('');
		}
	};

	const handleAIRequest = async () => {
		if (!onAIRequest || !aiPrompt.trim()) return;

		setAiLoading(true);
		try {
			const response = await onAIRequest(aiPrompt);
			setAiResponse(response);
		} catch (error) {
			console.error('AI request failed:', error);
			setAiResponse('Failed to get AI response');
		} finally {
			setAiLoading(false);
		}
	};

	const handleUpdateCharacter = (updates: Partial<Character>) => {
		if (!selectedCharacterId) return;
		onDMAction('update_character', {
			characterId: selectedCharacterId,
			updates,
		});
	};

	return (
		<ThemedView style={styles.container}>
			<ThemedText type="subtitle" style={styles.title}>
				DM Controls
			</ThemedText>

			<ScrollView style={styles.scrollView} showsVerticalScrollIndicator={true}>
				{/* Character Selection */}
				<View style={styles.section}>
					<ThemedText style={styles.sectionTitle}>Select Character</ThemedText>
					{gameState.characters.map((char) => (
						<TouchableOpacity
							key={char.id}
							style={[
								styles.characterButton,
								selectedCharacterId === char.id && styles.characterButtonSelected,
							]}
							onPress={() => setSelectedCharacterId(char.id)}
						>
							<ThemedText style={styles.characterButtonText}>
								{char.name} ({char.race} {char.class})
							</ThemedText>
						</TouchableOpacity>
					))}
				</View>

				{/* Character Stats Editor */}
				{selectedCharacter && (
					<View style={styles.section}>
						<ThemedText style={styles.sectionTitle}>
							Edit: {selectedCharacter.name}
						</ThemedText>
						<View style={styles.statRow}>
							<ThemedText style={styles.statLabel}>Health:</ThemedText>
							<TextInput
								style={styles.statInput}
								value={selectedCharacter.health.toString()}
								onChangeText={(text) => {
									const value = parseInt(text, 10);
									if (!isNaN(value)) {
										handleUpdateCharacter({ health: value });
									}
								}}
								keyboardType="numeric"
							/>
							<ThemedText style={styles.statLabel}>/</ThemedText>
							<TextInput
								style={styles.statInput}
								value={selectedCharacter.maxHealth.toString()}
								onChangeText={(text) => {
									const value = parseInt(text, 10);
									if (!isNaN(value)) {
										handleUpdateCharacter({ maxHealth: value });
									}
								}}
								keyboardType="numeric"
							/>
						</View>
						<View style={styles.statRow}>
							<ThemedText style={styles.statLabel}>Action Points:</ThemedText>
							<TextInput
								style={styles.statInput}
								value={selectedCharacter.actionPoints.toString()}
								onChangeText={(text) => {
									const value = parseInt(text, 10);
									if (!isNaN(value)) {
										handleUpdateCharacter({ actionPoints: value });
									}
								}}
								keyboardType="numeric"
							/>
						</View>
					</View>
				)}

				{/* Narration */}
				<View style={styles.section}>
					<ThemedText style={styles.sectionTitle}>Narrate</ThemedText>
					<TextInput
						style={[styles.textInput, isMobile && styles.textInputMobile]}
						value={aiPrompt}
						onChangeText={setAiPrompt}
						placeholder="Describe what happens..."
						placeholderTextColor="#9B8B7A"
						multiline
					/>
					<TouchableOpacity
						style={[styles.button, !aiPrompt.trim() && styles.buttonDisabled]}
						onPress={handleNarrate}
						disabled={!aiPrompt.trim()}
					>
						<ThemedText style={styles.buttonText}>Send Narration</ThemedText>
					</TouchableOpacity>
				</View>

				{/* AI Assistance */}
				{onAIRequest && (
					<View style={styles.section}>
						<ThemedText style={styles.sectionTitle}>AI Assistance</ThemedText>
						<TextInput
							style={[styles.textInput, isMobile && styles.textInputMobile]}
							value={aiPrompt}
							onChangeText={setAiPrompt}
							placeholder="Ask the AI for help..."
							placeholderTextColor="#9B8B7A"
							multiline
						/>
						<TouchableOpacity
							style={[
								styles.button,
								styles.aiButton,
								(!aiPrompt.trim() || aiLoading) && styles.buttonDisabled,
							]}
							onPress={handleAIRequest}
							disabled={!aiPrompt.trim() || aiLoading}
						>
							<ThemedText style={styles.buttonText}>
								{aiLoading ? 'Thinking...' : 'Ask AI'}
							</ThemedText>
						</TouchableOpacity>
						{aiResponse && (
							<View style={styles.aiResponse}>
								<ThemedText style={styles.aiResponseText}>{aiResponse}</ThemedText>
							</View>
						)}
					</View>
				)}

				{onToggleMapEdit && (
					<View style={styles.section}>
						<ThemedText style={styles.sectionTitle}>Map Editor</ThemedText>
						<View style={styles.toggleRow}>
							<ThemedText style={styles.mapHint}>
								{isMapEditable
									? 'Tap a tile to paint terrain or place a token.'
									: 'Enable edit mode to update the shared map.'}
							</ThemedText>
							<TouchableOpacity
								style={[styles.button, isMapEditable && styles.buttonActive]}
								onPress={() => onToggleMapEdit(!isMapEditable)}
							>
								<ThemedText style={styles.buttonText}>
									{isMapEditable ? 'Editing Enabled' : 'Enable Edit Mode'}
								</ThemedText>
							</TouchableOpacity>
						</View>
						<ThemedText style={styles.paletteLabel}>Terrain Palette</ThemedText>
						<View style={styles.paletteRow}>
							{TERRAIN_TYPES.map(terrain => {
								const active = selectedTerrain === terrain;
								return (
									<TouchableOpacity
										key={terrain}
										style={[
											styles.terrainSwatch,
											active && styles.terrainSwatchActive,
										]}
										onPress={() => onSelectTerrain?.(terrain)}
									>
										<View
											style={[
												styles.terrainColor,
												{ backgroundColor: terrainColorLookup(terrain) },
											]}
										/>
										<ThemedText
											style={[
												styles.terrainLabel,
												active && styles.terrainLabelActive,
											]}
										>
											{terrain}
										</ThemedText>
									</TouchableOpacity>
								);
							})}
						</View>

						<ThemedText style={[styles.paletteLabel, styles.placementHeader]}>
                                                Token Placement
						</ThemedText>
						<ThemedText style={styles.mapHint}>
                                                Choose a character or NPC, then tap the map to place their token.
						</ThemedText>
						<View style={styles.placementGrid}>
							{gameState.characters.map(char => {
								const active = placementSelection?.type === 'character'
                                                                && placementSelection?.id === char.id;
								return (
									<TouchableOpacity
										key={char.id}
										style={[
											styles.placementCard,
											active && styles.placementCardActive,
										]}
										onPress={() =>
											onPlacementChange?.(
												active
													? { type: null }
													: { type: 'character', id: char.id },
											)
										}
									>
										<ThemedText style={styles.placementTitle}>
											{char.name}
										</ThemedText>
										<ThemedText style={styles.placementMeta}>
											{char.race} {char.class}
										</ThemedText>
									</TouchableOpacity>
								);
							})}
						</View>

						<ThemedText style={styles.paletteLabel}>NPCs</ThemedText>
						{npcStates.length === 0 ? (
							<ThemedText style={styles.mapHint}>No NPCs available yet.</ThemedText>
						) : (
							<View style={styles.placementGrid}>
								{npcStates.map(npc => {
									const active = placementSelection?.type === 'npc'
                                                                        && placementSelection?.id === npc.id;
									return (
										<TouchableOpacity
											key={npc.id}
											style={[
												styles.placementCard,
												active && styles.placementCardActive,
											]}
											onPress={() =>
												onPlacementChange?.(
													active
														? { type: null }
														: { type: 'npc', id: npc.id },
												)
											}
										>
											<ThemedText style={styles.placementTitle}>
												{npc.name}
											</ThemedText>
											<ThemedText style={styles.placementMeta}>
												{npc.role} • {npc.disposition ?? 'neutral'}
											</ThemedText>
										</TouchableOpacity>
									);
								})}
							</View>
						)}

						<View style={styles.mapStatusRow}>
							<ThemedText style={styles.mapHint}>
								{placementSelection?.type
									? 'Placement armed: tap a tile to drop this token.'
									: 'No token selected for placement.'}
							</ThemedText>
							{mapState?.name && (
								<ThemedText style={styles.mapHint}>
                                                                Active map: {mapState.name}
								</ThemedText>
							)}
						</View>
					</View>
				)}
			</ScrollView>
		</ThemedView>
	);
};

const terrainColorLookup = (terrain?: string) => {
	switch (terrain) {
		case 'water':
			return '#7FD1F7';
		case 'grass':
			return '#7FB77E';
		case 'stone':
			return '#B0A8B9';
		case 'lava':
			return '#F05D23';
		default:
			return '#D9D4C5';
	}
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
	},
	title: {
		marginBottom: 16,
		fontSize: 20,
		color: '#3B2F1B',
	},
	scrollView: {
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
	characterButton: {
		backgroundColor: '#E2D3B3',
		padding: 12,
		borderRadius: 8,
		marginBottom: 8,
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	characterButtonSelected: {
		borderColor: '#8B6914',
		borderWidth: 2,
		backgroundColor: '#C9B037',
	},
	characterButtonText: {
		color: '#3B2F1B',
		fontSize: 14,
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
	statInput: {
		backgroundColor: '#E2D3B3',
		borderRadius: 8,
		padding: 8,
		width: 60,
		textAlign: 'center',
		color: '#3B2F1B',
		fontSize: 14,
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	textInput: {
		backgroundColor: '#E2D3B3',
		borderRadius: 8,
		padding: 12,
		minHeight: 80,
		color: '#3B2F1B',
		fontSize: 14,
		borderWidth: 1,
		borderColor: '#C9B037',
		marginBottom: 12,
		textAlignVertical: 'top',
	},
	textInputMobile: {
		minHeight: 60,
		fontSize: 14,
	},
	button: {
		backgroundColor: '#C9B037',
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
		alignItems: 'center',
	},
	buttonDisabled: {
		opacity: 0.5,
	},
	aiButton: {
		backgroundColor: '#8B6914',
		marginTop: 8,
	},
	buttonText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 16,
	},
	aiResponse: {
		marginTop: 12,
		padding: 12,
		backgroundColor: '#E2D3B3',
		borderRadius: 8,
		borderLeftWidth: 4,
		borderLeftColor: '#8B6914',
	},
	aiResponseText: {
		color: '#3B2F1B',
		fontSize: 14,
		lineHeight: 20,
	},
	toggleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
		marginBottom: 12,
	},
	mapHint: {
		color: '#6B5B3D',
		flex: 1,
	},
	buttonActive: {
		backgroundColor: '#8B6914',
	},
	paletteLabel: {
		fontWeight: 'bold',
		color: '#3B2F1B',
		marginBottom: 8,
	},
	paletteRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 12,
	},
	terrainSwatch: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingVertical: 8,
		paddingHorizontal: 10,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#C9B037',
		backgroundColor: '#E2D3B3',
	},
	terrainSwatchActive: {
		backgroundColor: '#C9B037',
		borderColor: '#8B6914',
	},
	terrainColor: {
		width: 18,
		height: 18,
		borderRadius: 4,
		borderWidth: 1,
		borderColor: '#3B2F1B',
	},
	terrainLabel: {
		color: '#3B2F1B',
		textTransform: 'capitalize',
	},
	terrainLabelActive: {
		fontWeight: 'bold',
	},
	placementHeader: {
		marginTop: 4,
	},
	placementGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 12,
	},
	placementCard: {
		padding: 10,
		borderRadius: 10,
		backgroundColor: '#E2D3B3',
		borderWidth: 1,
		borderColor: '#C9B037',
		minWidth: '45%',
	},
	placementCardActive: {
		borderColor: '#8B6914',
		backgroundColor: '#C9B037',
	},
	placementTitle: {
		fontWeight: 'bold',
		color: '#3B2F1B',
	},
	placementMeta: {
		color: '#6B5B3D',
	},
	mapStatusRow: {
		marginTop: 4,
		gap: 4,
	},
});

