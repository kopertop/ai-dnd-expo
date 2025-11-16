import { Stack, router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppFooter } from '@/components/app-footer';
import { InviteCodeInput } from '@/components/invite-code-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { multiplayerClient } from '@/services/api/multiplayer-client';
import { GameSessionResponse } from '@/types/api/multiplayer-api';
import { Character } from '@/types/character';
import { StatBlock } from '@/types/stats';
import { useAuthStore } from '@/stores/use-auth-store';

type CharacterTemplate = {
	id: string;
	label: string;
	description: string;
	race: string;
	className: string;
	stats: StatBlock;
	trait?: string;
	skills: string[];
};

const CHARACTER_TEMPLATES: CharacterTemplate[] = [
	{
		id: 'fighter',
		label: 'Iron Vanguard',
		description: 'Resilient frontline fighter with unmatched grit.',
		race: 'Human',
		className: 'Fighter',
		stats: { STR: 14, DEX: 10, CON: 13, INT: 10, WIS: 11, CHA: 9 },
		trait: 'Stormtouched',
		skills: ['Athletics', 'Intimidation'],
	},
	{
		id: 'rogue',
		label: 'Nightblade',
		description: 'Silent trickster who strikes from the shadows.',
		race: 'Elf',
		className: 'Rogue',
		stats: { STR: 9, DEX: 14, CON: 11, INT: 12, WIS: 10, CHA: 12 },
		trait: 'Shadowbound',
		skills: ['Stealth', 'Acrobatics'],
	},
	{
		id: 'wizard',
		label: 'Arcane Scholar',
		description: 'Mystic who bends reality with ancient spells.',
		race: 'Tiefling',
		className: 'Wizard',
		stats: { STR: 8, DEX: 12, CON: 10, INT: 15, WIS: 13, CHA: 11 },
		trait: 'Arcane Tattooed',
		skills: ['Arcana', 'History'],
	},
];

const createCharacterFromTemplate = (template: CharacterTemplate, name: string): Character => ({
	id: `character-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
	level: 1,
	race: template.race,
	name: name.trim() || template.label,
	class: template.className,
	trait: template.trait,
	description: template.description,
	stats: { ...template.stats },
	skills: [...template.skills],
	inventory: [],
	equipped: {
		helmet: null,
		chest: null,
		arms: null,
		legs: null,
		boots: null,
		mainHand: null,
		offHand: null,
		accessory: null,
	},
	health: 10,
	maxHealth: 10,
	actionPoints: 3,
	maxActionPoints: 3,
});

const JoinGameScreen: React.FC = () => {
	const [step, setStep] = useState<'code' | 'character' | 'waiting'>('code');
	const [inviteCode, setInviteCode] = useState<string | null>(null);
	const [session, setSession] = useState<GameSessionResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [characters, setCharacters] = useState<Character[]>([]);
	const [charactersLoading, setCharactersLoading] = useState(true);
	const [charactersError, setCharactersError] = useState<string | null>(null);
	const [newCharacterName, setNewCharacterName] = useState('');
	const [selectedTemplateId, setSelectedTemplateId] = useState<string>(CHARACTER_TEMPLATES[0].id);
	const insets = useSafeAreaInsets();
	const { user } = useAuthStore();
	const playerId = user?.id ?? null;
	const playerEmail = user?.email ?? null;
	const selectedTemplate = useMemo(
		() => CHARACTER_TEMPLATES.find(template => template.id === selectedTemplateId) ?? CHARACTER_TEMPLATES[0],
		[selectedTemplateId],
	);

	const loadCharacters = useCallback(async () => {
		if (!user?.id && !user?.email) {
			setCharacters([]);
			setCharactersLoading(false);
			return;
		}

		setCharactersError(null);
		setCharactersLoading(true);
		try {
			const result = await multiplayerClient.getMyCharacters();
			setCharacters(result);
		} catch (error) {
			console.error('Failed to load characters:', error);
			setCharactersError(error instanceof Error ? error.message : 'Failed to load characters');
		} finally {
			setCharactersLoading(false);
		}
	}, [user?.id, user?.email]);

	useEffect(() => {
		if (user) {
			loadCharacters();
		}
	}, [user, loadCharacters]);

	// Poll for game start when waiting
	useEffect(() => {
		if (step === 'waiting' && inviteCode && playerId) {
			const interval = setInterval(async () => {
				try {
					const updatedSession = await multiplayerClient.getGameSession(inviteCode);
					setSession(updatedSession);

					// Check if game started
					if (updatedSession.status === 'active') {
						router.replace(
							`/multiplayer-game?inviteCode=${inviteCode}&playerId=${playerId}`,
						);
					}
				} catch (error) {
					console.error('Failed to poll session:', error);
				}
			}, 2000); // Poll every 2 seconds

			return () => clearInterval(interval);
		}
	}, [step, inviteCode, playerId]);

	const handleInviteCodeSubmit = async (code: string) => {
		setLoading(true);
		try {
			const sessionData = await multiplayerClient.getGameSession(code);
			setInviteCode(code);
			setSession(sessionData);

			if (sessionData.status === 'waiting') {
				setStep('character');
			} else if (sessionData.status === 'active') {
				if (!playerId) {
					Alert.alert('Error', 'Missing player identity. Please re-authenticate.');
					return;
				}
				router.replace(`/multiplayer-game?inviteCode=${code}&playerId=${playerId}`);
			} else {
				Alert.alert('Error', 'This game is no longer accepting players');
			}
		} catch (error) {
			Alert.alert(
				'Error',
				error instanceof Error ? error.message : 'Invalid invite code',
			);
		} finally {
			setLoading(false);
		}
	};

	const handleJoinWithCharacter = async (character: Character) => {
		if (!inviteCode) {
			Alert.alert('Error', 'Missing invite code. Please start over.');
			return;
		}

		if (!playerId) {
			Alert.alert('Error', 'Missing player identity. Please re-authenticate.');
			return;
		}

		setLoading(true);
		try {
			await multiplayerClient.joinGame({
				inviteCode,
				character,
				playerId,
				playerEmail: playerEmail ?? undefined,
			});

			loadCharacters().catch(() => undefined);

			const updatedSession = await multiplayerClient.getGameSession(inviteCode);
			setSession(updatedSession);
			if (updatedSession.status === 'active') {
				router.replace(`/multiplayer-game?inviteCode=${inviteCode}&playerId=${playerId}`);
			} else {
				setStep('waiting');
			}
		} catch (error) {
			Alert.alert(
				'Error',
				error instanceof Error ? error.message : 'Failed to join game',
			);
		} finally {
			setLoading(false);
		}
	};

	const handleCreateAndJoin = async () => {
		const template = selectedTemplate;
		const generatedName = newCharacterName.trim() || template.label;
		await handleJoinWithCharacter(createCharacterFromTemplate(template, generatedName));
	};

	const renderSavedCharacters = () => {
		if (charactersLoading) {
			return (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="small" color="#8B6914" />
					<ThemedText style={styles.loadingText}>Loading your characters...</ThemedText>
				</View>
			);
		}

		if (charactersError) {
			return (
				<View style={styles.errorBox}>
					<ThemedText style={styles.errorText}>{charactersError}</ThemedText>
					<TouchableOpacity
						style={[styles.button, styles.refreshButton]}
						onPress={() => loadCharacters().catch(() => undefined)}
					>
						<ThemedText style={styles.buttonText}>Retry</ThemedText>
					</TouchableOpacity>
				</View>
			);
		}

		if (characters.length === 0) {
			return (
				<View style={styles.emptyStateBox}>
					<ThemedText style={styles.emptyStateText}>No saved characters yet.</ThemedText>
					<ThemedText style={styles.emptyStateSubtext}>
						Create a quick character below to jump into the session.
					</ThemedText>
				</View>
			);
		}

		return characters.map(character => (
			<View key={character.id} style={styles.characterCard}>
				<ThemedText style={styles.characterName}>{character.name}</ThemedText>
				<ThemedText style={styles.characterMeta}>
					{character.race} {character.class} • Level {character.level}
				</ThemedText>
				<TouchableOpacity
					style={[styles.button, loading && styles.buttonDisabled]}
					onPress={() => handleJoinWithCharacter(character)}
					disabled={loading}
				>
					<ThemedText style={styles.buttonText}>
						{loading ? 'Joining...' : 'Use Character'}
					</ThemedText>
				</TouchableOpacity>
			</View>
		));
	};

	const renderTemplateForm = () => (
		<View style={styles.newCharacterCard}>
			<ThemedText style={styles.templateLabel}>Character Name</ThemedText>
			<TextInput
				style={styles.input}
				placeholder="Name your hero"
				value={newCharacterName}
				onChangeText={setNewCharacterName}
				placeholderTextColor="#9B8B7A"
			/>
			<ThemedText style={[styles.templateLabel, { marginTop: 16 }]}>
				Pick an Archetype
			</ThemedText>
			<View style={styles.templateList}>
				{CHARACTER_TEMPLATES.map(template => {
					const isSelected = template.id === selectedTemplateId;
					return (
						<TouchableOpacity
							key={template.id}
							style={[styles.templateCard, isSelected && styles.templateCardSelected]}
							onPress={() => setSelectedTemplateId(template.id)}
						>
							<ThemedText style={styles.templateTitle}>{template.label}</ThemedText>
							<ThemedText style={styles.templateMeta}>{template.description}</ThemedText>
							<ThemedText style={styles.templateStat}>
								{template.race} {template.className}
							</ThemedText>
						</TouchableOpacity>
					);
				})}
			</View>
			<TouchableOpacity
				style={[styles.button, styles.createButton, loading && styles.buttonDisabled]}
				onPress={handleCreateAndJoin}
				disabled={loading}
			>
				<ThemedText style={styles.buttonText}>
					{loading ? 'Joining...' : 'Create & Join'}
				</ThemedText>
			</TouchableOpacity>
		</View>
	);

	if (!user) {
		return (
			<ThemedView style={styles.container}>
				<Stack.Screen
					options={{
						title: 'Join Game',
						headerShown: true,
					}}
				/>
				<View style={styles.waitingContainer}>
					<ActivityIndicator size="large" color="#8B6914" />
					<ThemedText style={styles.hint}>Loading your profile...</ThemedText>
				</View>
				<AppFooter />
			</ThemedView>
		);
	}

	if (step === 'character') {
		return (
			<ThemedView style={styles.container}>
				<Stack.Screen
					options={{
						title: 'Choose Character',
						headerShown: true,
					}}
				/>
				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={[
						styles.scrollContent,
						{ paddingTop: insets.top + 20, paddingBottom: 160 },
					]}
				>
					<View style={styles.section}>
						<ThemedText type="title" style={styles.title}>
							{session?.quest.name || 'Join Game'}
						</ThemedText>
						{inviteCode && (
							<ThemedText style={styles.subtitle}>
								Invite Code: {inviteCode.toUpperCase()}
							</ThemedText>
						)}
					</View>
					<View style={styles.section}>
						<ThemedText type="subtitle" style={styles.sectionTitle}>
							Use a Saved Character
						</ThemedText>
						<View style={styles.characterList}>{renderSavedCharacters()}</View>
					</View>
					<View style={styles.section}>
						<ThemedText type="subtitle" style={styles.sectionTitle}>
							Create a Quick Character
						</ThemedText>
						{renderTemplateForm()}
					</View>
				</ScrollView>
				<AppFooter />
			</ThemedView>
		);
	}

	if (step === 'waiting') {
		return (
			<ThemedView style={styles.container}>
				<Stack.Screen
					options={{
						title: 'Waiting for Host',
						headerShown: true,
					}}
				/>
				<View style={styles.waitingContainer}>
					<ThemedText type="title" style={styles.title}>
						Waiting for Host to Start
					</ThemedText>
					<ThemedText style={styles.hint}>
						You've joined the game! The host will start the game soon.
					</ThemedText>
					{session && (
						<ThemedText style={styles.playerCount}>
							{session.players.length} player{session.players.length !== 1 ? 's' : ''} joined
						</ThemedText>
					)}
				</View>
				<AppFooter />
			</ThemedView>
		);
	}

	return (
		<ThemedView style={styles.container}>
			<Stack.Screen
				options={{
					title: 'Join Game',
					headerShown: true,
				}}
			/>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingTop: insets.top + 20, paddingBottom: 160 },
				]}
			>
				<InviteCodeInput onSubmit={handleInviteCodeSubmit} loading={loading} />
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
	scrollContent: {
		paddingBottom: 40,
		gap: 24,
	},
	section: {
		paddingHorizontal: 20,
		gap: 12,
	},
	title: {
		textAlign: 'center',
		marginBottom: 8,
	},
	subtitle: {
		textAlign: 'center',
		color: '#6B5B3D',
	},
	sectionTitle: {
		textAlign: 'left',
	},
	button: {
		backgroundColor: '#C9B037',
		paddingVertical: 16,
		paddingHorizontal: 32,
		borderRadius: 12,
		marginTop: 16,
		alignItems: 'center',
	},
	buttonDisabled: {
		opacity: 0.5,
	},
	buttonText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 16,
	},
	input: {
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 12,
		padding: 12,
		color: '#3B2F1B',
		backgroundColor: '#FFF9EF',
	},
	characterList: {
		gap: 16,
	},
	characterCard: {
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 16,
		padding: 16,
		backgroundColor: '#FFF9EF',
	},
	characterName: {
		fontSize: 18,
		fontWeight: '600',
		color: '#3B2F1B',
	},
	characterMeta: {
		fontSize: 14,
		color: '#6B5B3D',
		marginTop: 4,
	},
	newCharacterCard: {
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 16,
		padding: 16,
		backgroundColor: '#FBF4E3',
	},
	templateLabel: {
		color: '#6B5B3D',
		fontWeight: '600',
	},
	templateList: {
		marginTop: 12,
		gap: 12,
	},
	templateCard: {
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 12,
		padding: 12,
		backgroundColor: '#FFFFFF',
	},
	templateCardSelected: {
		borderColor: '#8B6914',
		backgroundColor: '#FDF0D5',
	},
	templateTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#3B2F1B',
	},
	templateMeta: {
		fontSize: 14,
		color: '#6B5B3D',
		marginTop: 4,
	},
	templateStat: {
		fontSize: 13,
		color: '#6B5B3D',
		marginTop: 2,
	},
	createButton: {
		marginTop: 20,
	},
	loadingContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 20,
		gap: 8,
	},
	loadingText: {
		color: '#6B5B3D',
	},
	errorBox: {
		padding: 20,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#F2C94C',
		backgroundColor: '#FFF7E1',
		alignItems: 'center',
		gap: 12,
	},
	errorText: {
		color: '#B91C1C',
		fontWeight: '600',
		textAlign: 'center',
	},
	refreshButton: {
		backgroundColor: '#8B6914',
	},
	emptyStateBox: {
		padding: 20,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		backgroundColor: '#FBF4E3',
		alignItems: 'center',
		gap: 8,
	},
	emptyStateText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#3B2F1B',
		textAlign: 'center',
	},
	emptyStateSubtext: {
		fontSize: 14,
		color: '#6B5B3D',
		textAlign: 'center',
	},
	waitingContainer: {
		flex: 1,
		padding: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	waitingTitle: {
		marginBottom: 12,
		color: '#3B2F1B',
		textAlign: 'center',
	},
	hint: {
		fontSize: 16,
		color: '#6B5B3D',
		textAlign: 'center',
		marginBottom: 24,
	},
	playerCount: {
		fontSize: 18,
		color: '#3B2F1B',
		marginTop: 20,
		fontWeight: 'bold',
	},
});

export default JoinGameScreen;

