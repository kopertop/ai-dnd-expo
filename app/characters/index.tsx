import { Stack, router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppFooter } from '@/components/app-footer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { multiplayerClient } from '@/services/api/multiplayer-client';
import { useAuthStore } from '@/stores/use-auth-store';
import { Character } from '@/types/character';

const createDefaultCharacter = (overrides?: Partial<Character>): Character => ({
        id: overrides?.id ?? `character-${Date.now()}`,
        name: overrides?.name ?? 'Unnamed Hero',
        race: overrides?.race ?? 'Human',
        class: overrides?.class ?? 'Adventurer',
        level: overrides?.level ?? 1,
        description: overrides?.description ?? '',
        stats: overrides?.stats ?? { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
        skills: overrides?.skills ?? [],
        inventory: overrides?.inventory ?? [],
        equipped: overrides?.equipped ?? {},
        health: overrides?.health ?? 10,
        maxHealth: overrides?.maxHealth ?? 10,
        actionPoints: overrides?.actionPoints ?? 3,
        maxActionPoints: overrides?.maxActionPoints ?? 3,
        trait: overrides?.trait,
});

const CharacterManagerScreen: React.FC = () => {
        const { user } = useAuthStore();
        const insets = useSafeAreaInsets();
        const [characters, setCharacters] = useState<Character[]>([]);
        const [loading, setLoading] = useState(false);
        const [editing, setEditing] = useState<Character | null>(null);
        const [form, setForm] = useState(createDefaultCharacter());

        const resetForm = () => {
                setEditing(null);
                setForm(createDefaultCharacter());
        };

        const loadCharacters = useCallback(async () => {
                if (!user) return;
                setLoading(true);
                try {
                        const data = await multiplayerClient.getMyCharacters();
                        setCharacters(data);
                } catch (error) {
                        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to load characters');
                } finally {
                        setLoading(false);
                }
        }, [user]);

        useEffect(() => {
                if (user) {
                        loadCharacters().catch(() => undefined);
                }
        }, [user, loadCharacters]);

        const handleSave = async () => {
                try {
                        const payload = createDefaultCharacter({ ...form, id: editing?.id ?? form.id });
                        if (editing) {
                                await multiplayerClient.updateCharacter(payload.id, payload);
                        } else {
                                await multiplayerClient.createCharacter(payload);
                        }
                        resetForm();
                        await loadCharacters();
                } catch (error) {
                        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save character');
                }
        };

        const handleEdit = (character: Character) => {
                setEditing(character);
                setForm(character);
        };

        const handleDelete = async (character: Character) => {
                Alert.alert('Delete Character', `Delete ${character.name}?`, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: async () => {
                                        try {
                                                await multiplayerClient.deleteCharacter(character.id);
                                                if (editing?.id === character.id) {
                                                        resetForm();
                                                }
                                                await loadCharacters();
                                        } catch (error) {
                                                Alert.alert('Error', error instanceof Error ? error.message : 'Delete failed');
                                        }
                                },
                        },
                ]);
        };

        const sortedCharacters = useMemo(
                () => [...characters].sort((a, b) => a.name.localeCompare(b.name)),
                [characters],
        );

        if (!user) {
                        return (
                                <ThemedView style={styles.container}>
                                        <Stack.Screen options={{ title: 'My Characters', headerShown: true }} />
                                        <View style={styles.centered}>
                                                <ThemedText>Please sign in to manage your characters.</ThemedText>
                                        </View>
                                        <AppFooter />
                                </ThemedView>
                        );
        }

        return (
                <ThemedView style={styles.container}>
                        <Stack.Screen options={{ title: 'My Characters', headerShown: true }} />
                        <ScrollView
                                style={styles.scrollView}
                                contentContainerStyle={{ paddingBottom: 160, paddingTop: insets.top + 12 }}
                        >
                                <View style={styles.section}>
                                        <ThemedText type="title">Saved Heroes</ThemedText>
                                        {loading && <ThemedText>Loading characters...</ThemedText>}
                                        {!loading && sortedCharacters.length === 0 && (
                                                <ThemedText style={styles.placeholder}>No characters yet. Create one below.</ThemedText>
                                        )}
                                        {sortedCharacters.map(character => (
                                                <View key={character.id} style={styles.card}>
                                                        <View style={styles.cardHeader}>
                                                                <ThemedText style={styles.cardTitle}>{character.name}</ThemedText>
                                                                <View style={styles.cardChips}>
                                                                        <ThemedText style={styles.chip}>{character.race}</ThemedText>
                                                                        <ThemedText style={styles.chip}>{character.class}</ThemedText>
                                                                </View>
                                                        </View>
                                                        <ThemedText style={styles.cardMeta}>Level {character.level}</ThemedText>
                                                        <View style={styles.cardActions}>
                                                                <TouchableOpacity style={styles.linkBtn} onPress={() => handleEdit(character)}>
                                                                        <ThemedText style={styles.linkText}>Edit</ThemedText>
                                                                </TouchableOpacity>
                                                                <TouchableOpacity style={styles.linkBtn} onPress={() => handleDelete(character)}>
                                                                        <ThemedText style={styles.linkText}>Delete</ThemedText>
                                                                </TouchableOpacity>
                                                        </View>
                                                </View>
                                        ))}
                                </View>
                                <View style={styles.section}>
                                        <ThemedText type="title">{editing ? 'Edit Character' : 'Create Character'}</ThemedText>
                                        <View style={styles.formRow}>
                                                <TextInput
                                                        style={styles.input}
                                                        placeholder="Name"
                                                        value={form.name}
                                                        onChangeText={text => setForm(current => ({ ...current, name: text }))}
                                                        placeholderTextColor="#9B8B7A"
                                                />
                                        </View>
                                        <View style={styles.formRow}>
                                                <TextInput
                                                        style={styles.input}
                                                        placeholder="Race"
                                                        value={form.race}
                                                        onChangeText={text => setForm(current => ({ ...current, race: text }))}
                                                        placeholderTextColor="#9B8B7A"
                                                />
                                                <TextInput
                                                        style={styles.input}
                                                        placeholder="Class"
                                                        value={form.class}
                                                        onChangeText={text => setForm(current => ({ ...current, class: text }))}
                                                        placeholderTextColor="#9B8B7A"
                                                />
                                        </View>
                                        <TextInput
                                                style={[styles.input, styles.textArea]}
                                                placeholder="Backstory"
                                                value={form.description}
                                                onChangeText={text => setForm(current => ({ ...current, description: text }))}
                                                multiline
                                                placeholderTextColor="#9B8B7A"
                                        />
                                        <View style={styles.formActions}>
                                                {editing && (
                                                        <TouchableOpacity style={styles.secondaryBtn} onPress={resetForm}>
                                                                <ThemedText style={styles.secondaryText}>Cancel</ThemedText>
                                                        </TouchableOpacity>
                                                )}
                                                <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
                                                        <ThemedText style={styles.primaryText}>
                                                                {editing ? 'Update Character' : 'Create Character'}
                                                        </ThemedText>
                                                </TouchableOpacity>
                                        </View>
                                </View>
                                <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
                                        <ThemedText style={styles.linkText}>← Back to Dashboard</ThemedText>
                                </TouchableOpacity>
                        </ScrollView>
                        <AppFooter />
                </ThemedView>
        );
};

const styles = StyleSheet.create({
        container: {
                flex: 1,
        },
        scrollView: {
                flex: 1,
        },
        section: {
                paddingHorizontal: 20,
                paddingBottom: 24,
                gap: 12,
        },
        centered: {
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
        },
        placeholder: {
                color: '#6B5B3D',
        },
        card: {
                borderWidth: 1,
                borderColor: '#E2D3B3',
                borderRadius: 16,
                padding: 16,
                backgroundColor: '#FFF9EF',
                gap: 8,
        },
        cardHeader: {
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
        },
        cardTitle: {
                fontSize: 18,
                fontWeight: '600',
        },
        cardChips: {
                flexDirection: 'row',
                gap: 6,
        },
        chip: {
                backgroundColor: '#F5E6D3',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                fontSize: 12,
                color: '#3B2F1B',
        },
        cardMeta: {
                color: '#6B5B3D',
        },
        cardActions: {
                flexDirection: 'row',
                gap: 16,
        },
        linkBtn: {
                paddingVertical: 6,
        },
        linkText: {
                color: '#8B6914',
                fontWeight: '600',
        },
        formRow: {
                flexDirection: 'row',
                gap: 12,
        },
        input: {
                flex: 1,
                borderWidth: 1,
                borderColor: '#E2D3B3',
                borderRadius: 12,
                padding: 12,
                color: '#3B2F1B',
                backgroundColor: '#FFFFFF',
        },
        textArea: {
                minHeight: 90,
                textAlignVertical: 'top',
        },
        formActions: {
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: 12,
                marginTop: 8,
        },
        primaryBtn: {
                backgroundColor: '#8B6914',
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 10,
        },
        primaryText: {
                color: '#F5E6D3',
                fontWeight: '700',
        },
        secondaryBtn: {
                borderWidth: 1,
                borderColor: '#8B6914',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 10,
        },
        secondaryText: {
                color: '#8B6914',
                fontWeight: '600',
        },
        backLink: {
                alignItems: 'center',
                marginTop: 12,
        },
});

export default CharacterManagerScreen;
