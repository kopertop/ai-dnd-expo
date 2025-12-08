import { useAuth } from 'expo-auth-template/frontend';
import { Stack, router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppFooter } from '@/components/app-footer';
import { ExpoIconPicker } from '@/components/expo-icon-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
    useCreateCharacter,
    useDeleteCharacter,
    useMyCharacters,
    useUpdateCharacter,
} from '@/hooks/api/use-character-queries';
import { Character } from '@/types/character';

const DEFAULT_EQUIPPED = {
	helmet: null,
	chest: null,
	arms: null,
	legs: null,
	boots: null,
	mainHand: null,
	offHand: null,
	accessory: null,
};

const createDefaultCharacter = (overrides?: Partial<Character>): Character => ({
	id: overrides?.id ?? `character-${Date.now()}`,
	name: overrides?.name ?? 'Unnamed Hero',
	race: overrides?.race ?? 'Human',
	class: overrides?.class ?? 'Adventurer',
	icon: overrides?.icon ?? '',
	level: overrides?.level ?? 1,
	description: overrides?.description ?? '',
	stats: overrides?.stats ?? { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
	skills: overrides?.skills ?? [],
	inventory: overrides?.inventory ?? [],
	equipped: { ...DEFAULT_EQUIPPED, ...(overrides?.equipped ?? {}) },
	health: overrides?.health ?? 10,
	maxHealth: overrides?.maxHealth ?? 10,
	actionPoints: overrides?.actionPoints ?? 3,
	maxActionPoints: overrides?.maxActionPoints ?? 3,
	statusEffects: overrides?.statusEffects ?? [],
	preparedSpells: overrides?.preparedSpells ?? [],
	trait: overrides?.trait,
});

const CharacterManagerScreen: React.FC = () => {
	const { user } = useAuth();
	const insets = useSafeAreaInsets();

	const { data: charactersData, isLoading: loadingCharacters, refetch } = useMyCharacters();
	const characters = Array.isArray(charactersData) ? charactersData : (charactersData?.characters || []);

	const createMutation = useCreateCharacter();
	const updateMutation = useUpdateCharacter();
	const deleteMutation = useDeleteCharacter();

	const [editing, setEditing] = useState<Character | null>(null);
	const [form, setForm] = useState(createDefaultCharacter());

	const resetForm = () => {
		setEditing(null);
		setForm(createDefaultCharacter());
	};

	const loading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || loadingCharacters;

	const handleSave = async () => {
		if (!user) {
			return;
		}

		try {
			const payload = createDefaultCharacter({ ...form, id: editing?.id ?? form.id });
			if (editing) {
				await updateMutation.mutateAsync({
					path: `/characters/${payload.id}`,
					body: payload
				});
			} else {
				await createMutation.mutateAsync({
					path: '/characters',
					body: payload
				});
			}
			resetForm();
		} catch (error) {
			Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save character');
		}
	};

	const handleEdit = (character: Character) => {
		setEditing(character);
		setForm(createDefaultCharacter(character));
	};

	const deleteCharacter = async (character: Character) => {
		try {
			await deleteMutation.mutateAsync({
				path: `/characters/${character.id}`
			});
			if (editing?.id === character.id) {
				resetForm();
			}
		} catch (error) {
			Alert.alert('Error', error instanceof Error ? error.message : 'Delete failed');
		}
	};

	const handleDelete = (character: Character) => {
		if (Platform.OS === 'web') {
			const confirmed = window.confirm(`Delete ${character.name}?`);
			if (confirmed) {
				void deleteCharacter(character);
			}
			return;
		}

		Alert.alert('Delete Character', `Delete ${character.name}?`, [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Delete',
				style: 'destructive',
				onPress: () => {
					void deleteCharacter(character);
				},
			},
		]);
	};

	const isFormValid = useMemo(() => form.name.trim().length > 0, [form.name]);

	return (
		<ThemedView style={styles.container}>
			<Stack.Screen
				options={{
					title: 'My Characters',
					headerShown: true,
				}}
			/>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={[
					styles.content,
					{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
				]}
			>
				<ThemedText type="title" style={styles.title}>
					Your Adventuring Party
				</ThemedText>
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<ThemedText type="subtitle">Saved Characters</ThemedText>
						<TouchableOpacity style={styles.refreshBtn} onPress={() => refetch()}>
							<ThemedText style={styles.refreshLabel}>Refresh</ThemedText>
						</TouchableOpacity>
					</View>
					{loadingCharacters ? (
						<ThemedText style={styles.emptySubtitle}>Loading characters...</ThemedText>
					) : (
						<>
							{characters.map(character => (
								<View key={character.id} style={styles.card}>
									<View style={styles.cardHeader}>
										<ThemedText style={styles.characterName}>{character.name}</ThemedText>
										<ThemedText style={styles.characterMeta}>
											{character.race} {character.class} • Level {character.level}
										</ThemedText>
									</View>
									<View style={styles.cardActions}>
										<TouchableOpacity style={styles.secondaryBtn} onPress={() => handleEdit(character)}>
											<ThemedText style={styles.secondaryLabel}>Edit</ThemedText>
										</TouchableOpacity>
										<TouchableOpacity style={styles.dangerBtn} onPress={() => handleDelete(character)}>
											<ThemedText style={styles.dangerLabel}>Delete</ThemedText>
										</TouchableOpacity>
									</View>
								</View>
							))}
							{characters.length === 0 && (
								<View style={styles.emptyCard}>
									<ThemedText style={styles.emptyTitle}>No characters yet</ThemedText>
									<ThemedText style={styles.emptySubtitle}>
										Create a hero below to store reusable DM session characters.
									</ThemedText>
								</View>
							)}
						</>
					)}
				</View>
				<View style={styles.section}>
					{editing ? (
						<>
							<ThemedText type="subtitle">Edit Character</ThemedText>
							<View style={styles.form}>
								<TextInput
									style={styles.input}
									value={form.name}
									onChangeText={text => setForm(prev => ({ ...prev, name: text }))}
									placeholder="Character name"
									placeholderTextColor="#9B8B7A"
								/>
								<View style={{ marginTop: 12 }}>
									<ExpoIconPicker
										label="Icon (vector or URL)"
										value={form.icon || ''}
										onChange={icon => setForm(prev => ({ ...prev, icon }))}
									/>
								</View>
								<View style={styles.row}>
									<TextInput
										style={[styles.input, styles.rowInput]}
										value={form.race}
										onChangeText={text => setForm(prev => ({ ...prev, race: text }))}
										placeholder="Race"
										placeholderTextColor="#9B8B7A"
									/>
									<TextInput
										style={[styles.input, styles.rowInput]}
										value={form.class}
										onChangeText={text => setForm(prev => ({ ...prev, class: text }))}
										placeholder="Class"
										placeholderTextColor="#9B8B7A"
									/>
								</View>
								<TextInput
									style={[styles.input, styles.multiline]}
									value={form.description ?? ''}
									onChangeText={text => setForm(prev => ({ ...prev, description: text }))}
									placeholder="Backstory or description"
									placeholderTextColor="#9B8B7A"
									multiline
								/>
								<View style={styles.formActions}>
									<TouchableOpacity style={styles.secondaryBtn} onPress={resetForm}>
										<ThemedText style={styles.secondaryLabel}>Cancel</ThemedText>
									</TouchableOpacity>
									<TouchableOpacity
										style={[styles.primaryBtn, (!isFormValid || loading) && styles.primaryBtnDisabled]}
										disabled={!isFormValid || loading}
										onPress={handleSave}
									>
										<ThemedText style={styles.primaryLabel}>
											{loading ? 'Saving...' : 'Save Changes'}
										</ThemedText>
									</TouchableOpacity>
								</View>
							</View>
						</>
					) : (
						<TouchableOpacity
							style={[styles.primaryBtn, { alignSelf: 'flex-start' }]}
							onPress={() => router.push('/new-character?mode=character')}
						>
							<ThemedText style={styles.primaryLabel}>Add Character</ThemedText>
						</TouchableOpacity>
					)}
				</View>
				<TouchableOpacity style={styles.joinBtn} onPress={() => router.push('/join-game')}>
					<ThemedText style={styles.joinLabel}>Join a Game</ThemedText>
				</TouchableOpacity>
			</ScrollView>
			<AppFooter />
		</ThemedView>
	);
};

export default CharacterManagerScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scrollView: {
		flex: 1,
	},
	content: {
		paddingHorizontal: 20,
		gap: 24,
	},
	title: {
		textAlign: 'center',
	},
	section: {
		gap: 16,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	refreshBtn: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
		backgroundColor: 'rgba(0,0,0,0.05)',
	},
	refreshLabel: {
		color: '#3B2F1B',
		fontWeight: '600',
	},
	card: {
		padding: 16,
		borderRadius: 12,
		backgroundColor: 'rgba(0,0,0,0.04)',
		marginBottom: 12,
	},
	cardHeader: {
		marginBottom: 12,
	},
	characterName: {
		fontSize: 18,
		fontWeight: 'bold',
	},
	characterMeta: {
		color: '#6B5B3D',
	},
	cardActions: {
		flexDirection: 'row',
		gap: 10,
	},
	secondaryBtn: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#6B5B3D',
	},
	secondaryLabel: {
		color: '#6B5B3D',
		fontWeight: '600',
	},
	dangerBtn: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 6,
		backgroundColor: '#8B1A1A',
	},
	dangerLabel: {
		color: '#FEEFEF',
		fontWeight: '600',
	},
	emptyCard: {
		padding: 16,
		borderRadius: 12,
		backgroundColor: 'rgba(0,0,0,0.03)',
		alignItems: 'center',
	},
	emptyTitle: {
		fontWeight: '600',
		marginBottom: 4,
	},
	emptySubtitle: {
		textAlign: 'center',
		color: '#6B5B3D',
	},
	form: {
		gap: 12,
	},
	input: {
		borderWidth: 1,
		borderColor: '#C9B037',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		color: '#3B2F1B',
	},
	multiline: {
		minHeight: 100,
		textAlignVertical: 'top',
	},
	row: {
		flexDirection: 'row',
		gap: 12,
	},
	rowInput: {
		flex: 1,
	},
	formActions: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-end',
		gap: 12,
	},
	primaryBtn: {
		paddingHorizontal: 18,
		paddingVertical: 12,
		borderRadius: 8,
		backgroundColor: '#8B6914',
	},
	primaryBtnDisabled: {
		opacity: 0.5,
	},
	primaryLabel: {
		color: '#F5E6D3',
		fontWeight: '600',
	},
	joinBtn: {
		marginTop: 12,
		alignSelf: 'center',
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 999,
		backgroundColor: '#3B2F1B',
	},
	joinLabel: {
		color: '#F5E6D3',
		fontWeight: '600',
	},
});
