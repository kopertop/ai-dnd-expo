import { useAuth } from 'expo-auth-template/frontend';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MultiplayerGameScreen from '../multiplayer-game';

import { AppFooter } from '@/components/app-footer';
import { RefreshButton } from '@/components/refresh-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useMyCharacters } from '@/hooks/api/use-character-queries';
import { useGameSession, useJoinGame } from '@/hooks/api/use-game-queries';
import { Character } from '@/types/character';

// Character templates - same as in join-game.tsx
type CharacterTemplate = {
	id: string;
	label: string;
	description: string;
	race: string;
	className: string;
	stats: { STR: number; DEX: number; CON: number; INT: number; WIS: number; CHA: number };
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
	statusEffects: [],
	preparedSpells: [],
});

/**
 * Route handler for /game/:inviteCode
 * Handles game lookup, character selection, and redirects to multiplayer game
 */
const GameRoute: React.FC = () => {
	// Get inviteCode from path parameter (not query parameter)
	const params = useLocalSearchParams<{ inviteCode: string; playerId?: string; hostId?: string }>();
	const { inviteCode } = params;
	const insets = useSafeAreaInsets();
	const { user } = useAuth();
	const playerId = user?.id ?? null;
	const playerEmail = user?.email ?? null;

	// Update URL to include playerId when we have it (but don't redirect)
	useEffect(() => {
		if (playerId && !params.playerId) {
			router.setParams({ playerId });
		}
	}, [playerId, params.playerId]);

	const [step, setStep] = useState<'loading' | 'character' | 'waiting' | 'active'>('loading');
	const [newCharacterName, setNewCharacterName] = useState('');
	const [selectedTemplateId, setSelectedTemplateId] = useState<string>(CHARACTER_TEMPLATES[0].id);
	const [loading, setLoading] = useState(false);

	// Fetch game session with 15 second polling
	const { data: session, isLoading: sessionLoading, refetch: refetchSession } = useGameSession(
		inviteCode || null,
		{
			refetchInterval: 15000, // Poll every 15 seconds
		},
	);

	// Fetch user's characters
	const { data: charactersData, isLoading: charactersLoading } = useMyCharacters();
	const characters = Array.isArray(charactersData) ? charactersData : (charactersData?.characters || []);
	const joinGameMutation = useJoinGame();

	const selectedTemplate = useMemo(
		() => CHARACTER_TEMPLATES.find(template => template.id === selectedTemplateId) ?? CHARACTER_TEMPLATES[0],
		[selectedTemplateId],
	);

	// Check if player is already in the game
	const isPlayerInGame = useMemo(() => {
		if (!session || !playerId) return false;
		return session.players?.some(p => p.playerId === playerId) ?? false;
	}, [session, playerId]);

	// Determine what step to show based on game state and player status
	useEffect(() => {
		if (sessionLoading) {
			setStep('loading');
			return;
		}

		if (!session) {
			Alert.alert('Error', 'Game not found');
			router.replace('/join-game');
			return;
		}

		// If player is already in game
		if (isPlayerInGame) {
			if (session.status === 'active') {
				// Show multiplayer game UI
				setStep('active');
			} else {
				// Show waiting screen
				setStep('waiting');
			}
			return;
		}

		// Player not in game - show character selection
		if (session.status === 'waiting' || session.status === 'active') {
			setStep('character');
		} else {
			Alert.alert('Error', 'This game is no longer accepting players');
			router.replace('/join-game');
		}
	}, [session, sessionLoading, isPlayerInGame, inviteCode, playerId]);

	// Poll for game start when waiting - transition to active game UI
	useEffect(() => {
		if (step === 'waiting' && session?.status === 'active' && inviteCode && playerId) {
			setStep('active');
		}
	}, [step, session?.status, inviteCode, playerId]);

	const handleJoinWithCharacter = async (character: Character) => {
		if (!inviteCode || !playerId) {
			Alert.alert('Error', 'Missing invite code or player identity');
			return;
		}

		if (loading) {
			console.log('Already joining, ignoring duplicate request');
			return;
		}

		setLoading(true);
		try {
			console.log('Joining game with character:', character.name);
			const result = await joinGameMutation.mutateAsync({
				path: `/games/${inviteCode}/join`,
				body: {
					inviteCode,
					character,
					playerId,
					playerEmail: playerEmail ?? undefined,
				},
			});

			console.log('Join game mutation successful:', result);

			// Refetch session after joining
			const sessionResult = await refetchSession();
			const updatedSession = sessionResult.data;
			console.log('Refetched session:', updatedSession);

			if (updatedSession?.status === 'active') {
				console.log('Game is active, showing multiplayer game UI');
				setStep('active');
			} else {
				console.log('Game is waiting, showing waiting screen');
				setStep('waiting');
			}
		} catch (error) {
			console.error('Error joining game:', error);
			Alert.alert(
				'Error',
				error instanceof Error ? error.message : 'Failed to join game',
			);
		} finally {
			setLoading(false);
		}
	};

	const handleCreateAndJoin = async () => {
		if (loading) return; // Prevent double-clicks

		const template = selectedTemplate;
		const generatedName = newCharacterName.trim() || template.label;
		try {
			await handleJoinWithCharacter(createCharacterFromTemplate(template, generatedName));
		} catch (error) {
			// Error is already handled in handleJoinWithCharacter, but ensure we don't refresh
			console.error('Error in handleCreateAndJoin:', error);
		}
	};

	if (step === 'loading' || sessionLoading) {
		return (
			<ThemedView style={styles.container}>
				<ThemedText style={styles.loadingText}>Loading game...</ThemedText>
			</ThemedView>
		);
	}

	if (step === 'active') {
		// Render multiplayer game UI directly in this route
		return <MultiplayerGameScreen />;
	}

	if (step === 'waiting') {
		return (
			<ThemedView style={styles.container}>
				<Stack.Screen
					options={{
						title: 'Waiting for Host',
						headerShown: true,
						headerRight: () => (
							<RefreshButton onPress={() => refetchSession()} variant="small" showLabel />
						),
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
					<RefreshButton
						disabled={sessionLoading}
						onPress={() => !sessionLoading && refetchSession()}
						variant="large"
						showLabel
					/>
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
						<View style={styles.characterList}>
							{charactersLoading ? (
								<View style={styles.loadingContainer}>
									<ActivityIndicator size="small" color="#8B6914" />
									<ThemedText style={styles.loadingText}>Loading your characters...</ThemedText>
								</View>
							) : characters.length === 0 ? (
								<View style={styles.emptyStateBox}>
									<ThemedText style={styles.emptyStateText}>No saved characters yet.</ThemedText>
									<ThemedText style={styles.emptyStateSubtext}>
										Create a quick character below to jump into the session.
									</ThemedText>
								</View>
							) : (
								characters.map(character => (
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
								))
							)}
						</View>
					</View>
					<View style={styles.section}>
						<ThemedText type="subtitle" style={styles.sectionTitle}>
							Create a Quick Character
						</ThemedText>
						<View style={styles.templateForm}>
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
								onPress={(e) => {
									e?.preventDefault?.();
									handleCreateAndJoin();
								}}
								disabled={loading}
							>
								<ThemedText style={styles.buttonText}>
									{loading ? 'Joining...' : 'Create & Join'}
								</ThemedText>
							</TouchableOpacity>
						</View>
					</View>
				</ScrollView>
				<AppFooter />
			</ThemedView>
		);
	}

	return null;
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	loadingText: {
		textAlign: 'center',
		marginTop: 100,
		fontSize: 18,
	},
	loadingContainer: {
		alignItems: 'center',
		padding: 20,
	},
	waitingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	title: {
		marginBottom: 10,
		textAlign: 'center',
	},
	hint: {
		marginTop: 20,
		textAlign: 'center',
	},
	playerCount: {
		marginTop: 20,
		fontSize: 16,
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
	subtitle: {
		marginTop: 10,
		fontSize: 16,
		textAlign: 'center',
		color: '#6B5B3D',
	},
	sectionTitle: {
		marginBottom: 15,
		textAlign: 'left',
	},
	characterList: {
		gap: 10,
	},
	characterCard: {
		padding: 15,
		borderRadius: 8,
		backgroundColor: '#F9F6EF',
		marginBottom: 10,
	},
	characterName: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 5,
	},
	characterMeta: {
		fontSize: 14,
		color: '#666',
		marginBottom: 10,
	},
	characterDetails: {
		fontSize: 14,
		color: '#666',
	},
	emptyText: {
		textAlign: 'center',
		color: '#999',
		marginTop: 20,
	},
	emptyStateBox: {
		padding: 20,
		alignItems: 'center',
	},
	emptyStateText: {
		fontSize: 16,
		color: '#666',
		marginBottom: 8,
	},
	emptyStateSubtext: {
		fontSize: 14,
		color: '#999',
		textAlign: 'center',
	},
	templateForm: {
		marginTop: 10,
	},
	templateLabel: {
		marginBottom: 10,
		fontSize: 16,
		fontWeight: 'bold',
	},
	label: {
		marginBottom: 10,
		fontSize: 16,
	},
	input: {
		backgroundColor: '#F9F6EF',
		borderRadius: 8,
		padding: 12,
		fontSize: 16,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#8B5C2A',
	},
	templateList: {
		gap: 12,
		marginBottom: 16,
	},
	templateCard: {
		padding: 16,
		borderRadius: 8,
		backgroundColor: '#F9F6EF',
		borderWidth: 2,
		borderColor: '#8B5C2A',
	},
	templateCardSelected: {
		borderColor: '#C9B037',
		backgroundColor: '#FFF8E1',
	},
	templateTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 4,
	},
	templateMeta: {
		fontSize: 14,
		color: '#666',
		marginBottom: 4,
	},
	templateStat: {
		fontSize: 12,
		color: '#8B5C2A',
		fontWeight: 'bold',
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
	createButton: {
		backgroundColor: '#C9B037',
		padding: 15,
		borderRadius: 8,
		alignItems: 'center',
		marginTop: 20,
	},
	createButtonText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 16,
	},
});

export default GameRoute;
