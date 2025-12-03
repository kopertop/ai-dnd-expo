import React, { useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchableList, type SearchableListItem } from './searchable-list';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { useMyCharacters } from '@/hooks/api/use-character-queries';
import { useNpcDefinitions } from '@/hooks/api/use-map-queries';
import { Character } from '@/types/character';
import { NpcDefinition } from '@/types/multiplayer-map';

interface NpcSelectorProps {
	visible: boolean;
	onClose: () => void;
	inviteCode: string;
	onSelectNpc: (npcId: string, npcName: string) => void;
	onCreateCustomNpc: (customNpc: {
		name: string;
		role: string;
		alignment: string;
	disposition: string;
	description?: string;
	maxHealth?: number;
	armorClass?: number;
	color?: string;
	icon?: string;
	}) => void;
}

type SelectableItem = { type: 'npc'; data: NpcDefinition } | { type: 'character'; data: Character };

export const NpcSelector: React.FC<NpcSelectorProps> = ({
	visible,
	onClose,
	inviteCode,
	onSelectNpc,
	onCreateCustomNpc,
}) => {
	const insets = useSafeAreaInsets();
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [customNpc, setCustomNpc] = useState({
		name: '',
		role: 'commoner',
		alignment: 'neutral',
		disposition: 'neutral',
		description: '',
		maxHealth: 10,
		armorClass: 10,
		color: '#3B2F1B',
		icon: '',
	});

	// Fetch NPCs and Characters using React Query hooks
	const { data: npcData, isLoading: npcsLoading } = useNpcDefinitions(inviteCode);
	const { data: characterData, isLoading: charactersLoading } = useMyCharacters();

	const isLoading = npcsLoading || charactersLoading;

	const handleSelectNpc = (npc: NpcDefinition) => {
		onSelectNpc(npc.slug || npc.id, npc.name);
		// Don't call onClose here - let the parent handle closing after setting placement mode
	};

	const handleSelectCharacter = (character: Character) => {
		// Convert character to custom NPC format
		// Calculate AC: 10 + DEX modifier (simplified, doesn't account for armor)
		const dexModifier = Math.floor((character.stats.DEX - 10) / 2);
		const armorClass = 10 + dexModifier;

		onCreateCustomNpc({
			name: character.name,
			role: character.class,
			alignment: 'neutral neutral', // Default alignment for characters
			disposition: 'neutral', // Default disposition
			description: character.description || `Level ${character.level} ${character.race} ${character.class}`,
			maxHealth: character.maxHealth,
			armorClass: Math.max(armorClass, 10), // Ensure minimum AC of 10
			color: '#4A6741', // Default color
			icon: character.icon || character.image,
		});
		onClose();
	};

	// Convert NPCs and Characters to SearchableListItem format
	const searchableItems = useMemo<SearchableListItem<SelectableItem>[]>(() => {
		const npcs = npcData?.npcs || [];
		const characters = characterData?.characters || [];

		const npcItems: SearchableListItem<SelectableItem>[] = npcs.map(npc => ({
			id: `npc-${npc.id}`,
			data: { type: 'npc' as const, data: npc },
			searchText: `${npc.name} ${npc.role} ${npc.alignment} ${npc.disposition} ${npc.description || ''}`.trim(),
		}));

		const characterItems: SearchableListItem<SelectableItem>[] = characters.map(character => ({
			id: `character-${character.id}`,
			data: { type: 'character' as const, data: character },
			searchText: `${character.name} ${character.class} ${character.race} level ${character.level} ${character.description || ''}`.trim(),
		}));

		return [...npcItems, ...characterItems];
	}, [npcData?.npcs, characterData?.characters]);

	const renderItem = (item: SearchableListItem<SelectableItem>, isSelected: boolean) => {
		const selectableItem = item.data;

		if (selectableItem.type === 'npc') {
			const npc = selectableItem.data;
			return (
				<View style={[styles.npcItem, isSelected && styles.npcItemSelected]}>
					<View style={styles.itemHeader}>
						<ThemedText style={styles.npcName}>{npc.name}</ThemedText>
						<View style={styles.typeBadge}>
							<ThemedText style={styles.typeBadgeText}>NPC</ThemedText>
						</View>
					</View>
					<ThemedText style={styles.npcDetails}>
						{npc.role} • {npc.alignment} • {npc.disposition}
					</ThemedText>
					{npc.description && <ThemedText style={styles.npcDescription}>{npc.description}</ThemedText>}
				</View>
			);
		} else {
			const character = selectableItem.data;
			return (
				<View style={[styles.npcItem, isSelected && styles.npcItemSelected]}>
					<View style={styles.itemHeader}>
						<ThemedText style={styles.npcName}>{character.name}</ThemedText>
						<View style={[styles.typeBadge, styles.characterBadge]}>
							<ThemedText style={styles.typeBadgeText}>Character</ThemedText>
						</View>
					</View>
					<ThemedText style={styles.npcDetails}>
						Level {character.level} {character.race} {character.class}
					</ThemedText>
					{character.description && <ThemedText style={styles.npcDescription}>{character.description}</ThemedText>}
				</View>
			);
		}
	};

	const handleSelectItem = (item: SearchableListItem<SelectableItem>) => {
		const selectableItem = item.data;
		if (selectableItem.type === 'npc') {
			handleSelectNpc(selectableItem.data);
		} else {
			handleSelectCharacter(selectableItem.data);
		}
	};

	const handleCreateCustom = () => {
		if (!customNpc.name.trim()) {
			Alert.alert('Error', 'NPC name is required');
			return;
		}
		onCreateCustomNpc(customNpc);
		onClose();
	};

	if (showCreateForm) {
		return (
			<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
				<TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
					<ThemedView
						style={[
							styles.container,
							{
								marginTop: insets.top + 50,
								marginBottom: insets.bottom + 20,
							},
						]}
					>
						<ThemedText type="subtitle" style={styles.title}>
							Create Custom NPC
						</ThemedText>
						<ScrollView style={styles.form}>
							<ThemedText style={styles.label}>Name *</ThemedText>
							<TextInput
								style={styles.input}
								value={customNpc.name}
								onChangeText={(text) => setCustomNpc({ ...customNpc, name: text })}
								placeholder="NPC Name"
								placeholderTextColor="#999"
							/>

							<ThemedText style={styles.label}>Role</ThemedText>
							<TextInput
								style={styles.input}
								value={customNpc.role}
								onChangeText={(text) => setCustomNpc({ ...customNpc, role: text })}
								placeholder="e.g., guard, merchant, bandit"
								placeholderTextColor="#999"
							/>

							<ThemedText style={styles.label}>Icon (vector or URL)</ThemedText>
							<TextInput
								style={styles.input}
								value={customNpc.icon}
								onChangeText={(text) => setCustomNpc({ ...customNpc, icon: text })}
								placeholder="MaterialIcons:dragon or https://example.com/dragon.png"
								placeholderTextColor="#999"
								autoCapitalize="none"
								autoCorrect={false}
							/>

							<ThemedText style={styles.label}>Alignment</ThemedText>
							<View style={styles.alignmentRow}>
								{['lawful', 'neutral', 'chaotic'].map((align) => (
									<TouchableOpacity
										key={align}
										style={[
											styles.alignmentButton,
											customNpc.alignment.startsWith(align) && styles.alignmentButtonSelected,
										]}
										onPress={() => {
											const goodEvil = customNpc.alignment.split(' ')[1] || 'neutral';
											setCustomNpc({ ...customNpc, alignment: `${align} ${goodEvil}` });
										}}
									>
										<ThemedText style={styles.alignmentButtonText}>{align}</ThemedText>
									</TouchableOpacity>
								))}
							</View>
							<View style={styles.alignmentRow}>
								{['good', 'neutral', 'evil'].map((goodEvil) => (
									<TouchableOpacity
										key={goodEvil}
										style={[
											styles.alignmentButton,
											customNpc.alignment.endsWith(goodEvil) && styles.alignmentButtonSelected,
										]}
										onPress={() => {
											const lawChaos = customNpc.alignment.split(' ')[0] || 'neutral';
											setCustomNpc({ ...customNpc, alignment: `${lawChaos} ${goodEvil}` });
										}}
									>
										<ThemedText style={styles.alignmentButtonText}>{goodEvil}</ThemedText>
									</TouchableOpacity>
								))}
							</View>

							<ThemedText style={styles.label}>Disposition</ThemedText>
							<View style={styles.dispositionRow}>
								{['friendly', 'neutral', 'hostile'].map((disp) => (
									<TouchableOpacity
										key={disp}
										style={[
											styles.dispositionButton,
											customNpc.disposition === disp && styles.dispositionButtonSelected,
										]}
										onPress={() => setCustomNpc({ ...customNpc, disposition: disp })}
									>
										<ThemedText style={styles.dispositionButtonText}>{disp}</ThemedText>
									</TouchableOpacity>
								))}
							</View>

							<ThemedText style={styles.label}>Max Health</ThemedText>
							<TextInput
								style={styles.input}
								value={customNpc.maxHealth?.toString() || '10'}
								onChangeText={(text) => {
									const health = parseInt(text, 10);
									if (!isNaN(health) && health > 0) {
										setCustomNpc({ ...customNpc, maxHealth: health });
									}
								}}
								keyboardType="numeric"
								placeholder="10"
								placeholderTextColor="#999"
							/>

							<ThemedText style={styles.label}>Armor Class</ThemedText>
							<TextInput
								style={styles.input}
								value={customNpc.armorClass?.toString() || '10'}
								onChangeText={(text) => {
									const ac = parseInt(text, 10);
									if (!isNaN(ac) && ac >= 0) {
										setCustomNpc({ ...customNpc, armorClass: ac });
									}
								}}
								keyboardType="numeric"
								placeholder="10"
								placeholderTextColor="#999"
							/>

							<ThemedText style={styles.label}>Description (optional)</ThemedText>
							<TextInput
								style={[styles.input, styles.textArea]}
								value={customNpc.description}
								onChangeText={(text) => setCustomNpc({ ...customNpc, description: text })}
								placeholder="NPC description..."
								placeholderTextColor="#999"
								multiline
								numberOfLines={3}
							/>
						</ScrollView>
						<View style={styles.buttonRow}>
							<TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setShowCreateForm(false)}>
								<ThemedText style={styles.buttonText}>Cancel</ThemedText>
							</TouchableOpacity>
							<TouchableOpacity style={[styles.button, styles.createButton]} onPress={handleCreateCustom}>
								<ThemedText style={styles.buttonText}>Create</ThemedText>
							</TouchableOpacity>
						</View>
					</ThemedView>
				</TouchableOpacity>
			</Modal>
		);
	}

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
				<ThemedView
					style={[
						styles.container,
						{
							marginTop: insets.top + 100,
							marginBottom: insets.bottom + 20,
						},
					]}
				>
					<ThemedText type="subtitle" style={styles.title}>
						Select NPC or Character
					</ThemedText>
					{isLoading ? (
						<ThemedText style={styles.loadingText}>Loading...</ThemedText>
					) : (
						<SearchableList
							items={searchableItems}
							onSelect={handleSelectItem}
							renderItem={renderItem}
							placeholder="Search NPCs or characters by name, class, role..."
							emptyText="No NPCs or characters found. Create a custom one!"
							itemHeight={80}
						/>
					)}
					<View style={styles.buttonRow}>
						<TouchableOpacity style={[styles.button, styles.createButton]} onPress={() => setShowCreateForm(true)}>
							<ThemedText style={styles.buttonText}>Create Custom NPC</ThemedText>
						</TouchableOpacity>
					</View>
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
	container: {
		width: '90%',
		maxWidth: 500,
		maxHeight: '80%',
		backgroundColor: '#FFF9EF',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#C9B037',
		padding: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		marginBottom: 20,
		textAlign: 'center',
	},
	npcItem: {
		backgroundColor: '#FFFFFF',
		borderRadius: 8,
		padding: 12,
		marginBottom: 8,
		borderWidth: 1,
		borderColor: '#E2D3B3',
	},
	npcItemSelected: {
		backgroundColor: '#E9D8A6',
		borderColor: '#C9B037',
		borderWidth: 2,
	},
	itemHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 4,
	},
	typeBadge: {
		backgroundColor: '#E2D3B3',
		borderRadius: 4,
		paddingHorizontal: 8,
		paddingVertical: 2,
	},
	characterBadge: {
		backgroundColor: '#B8D4E3',
	},
	typeBadgeText: {
		fontSize: 10,
		color: '#3B2F1B',
		fontWeight: '600',
	},
	npcName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#3B2F1B',
		marginBottom: 4,
	},
	npcDetails: {
		fontSize: 14,
		color: '#6B5B3D',
		marginBottom: 4,
	},
	npcDescription: {
		fontSize: 12,
		color: '#8B7355',
		fontStyle: 'italic',
	},
	loadingText: {
		textAlign: 'center',
		color: '#6B5B3D',
		padding: 20,
	},
	emptyText: {
		textAlign: 'center',
		color: '#6B5B3D',
		fontStyle: 'italic',
		padding: 20,
	},
	buttonRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 20,
		gap: 10,
	},
	button: {
		flex: 1,
		padding: 12,
		borderRadius: 8,
		alignItems: 'center',
	},
	createButton: {
		backgroundColor: '#8B6914',
	},
	cancelButton: {
		backgroundColor: '#6B5B3D',
	},
	buttonText: {
		color: '#FFFFFF',
		fontWeight: '600',
		fontSize: 16,
	},
	form: {
		maxHeight: 400,
	},
	label: {
		fontSize: 14,
		fontWeight: '600',
		color: '#3B2F1B',
		marginTop: 12,
		marginBottom: 4,
	},
	input: {
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 8,
		padding: 10,
		fontSize: 16,
		color: '#3B2F1B',
	},
	textArea: {
		minHeight: 80,
		textAlignVertical: 'top',
	},
	alignmentRow: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 8,
	},
	alignmentButton: {
		flex: 1,
		padding: 8,
		borderRadius: 6,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		alignItems: 'center',
	},
	alignmentButtonSelected: {
		backgroundColor: '#8B6914',
		borderColor: '#8B6914',
	},
	alignmentButtonText: {
		fontSize: 12,
		color: '#3B2F1B',
		fontWeight: '600',
	},
	dispositionRow: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 8,
	},
	dispositionButton: {
		flex: 1,
		padding: 8,
		borderRadius: 6,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		alignItems: 'center',
	},
	dispositionButtonSelected: {
		backgroundColor: '#8B6914',
		borderColor: '#8B6914',
	},
	dispositionButtonText: {
		fontSize: 12,
		color: '#3B2F1B',
		fontWeight: '600',
	},
});
