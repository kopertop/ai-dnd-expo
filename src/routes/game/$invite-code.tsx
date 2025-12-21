import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate, useRouteContext } from '@tanstack/react-router';
import * as React from 'react';

import { CharacterPortrait } from '~/components/character-portrait';
import RouteShell from '~/components/route-shell';
import { useWebSocketBrowser } from '~/hooks/use-websocket-browser';
import { charactersQueryOptions } from '~/utils/characters';
import { gameSessionQueryOptions, joinGame } from '~/utils/games';

import type { GameSessionResponse } from '@/types/api/multiplayer-api';
import type { Character } from '@/types/character';

// Character templates - same as RN version
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

// Character Card Component
const CharacterCard: React.FC<{
	character: Character;
	iconUrl: string | null;
	onClick: () => void;
	loading: boolean;
}> = ({ character, iconUrl, onClick, loading }) => {
	const [traitImageError, setTraitImageError] = React.useState(false);

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={loading}
			className="group relative rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 text-left transition-all hover:border-amber-500 hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200 dark:disabled:hover:border-slate-700 disabled:hover:scale-100"
		>
			{/* Trait Background */}
			{character.trait && !traitImageError && (
				<div className="absolute inset-0 overflow-hidden rounded-lg opacity-20 group-hover:opacity-30 transition-opacity">
					<img
						src={`/assets/images/traits/${character.trait.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.png`}
						alt={character.trait}
						className="h-full w-full object-cover blur-sm"
						onError={() => setTraitImageError(true)}
					/>
				</div>
			)}

			{/* Content */}
			<div className="relative z-10 flex flex-col items-center">
				{/* Character Portrait */}
				<div className="mb-4 flex justify-center">
					<CharacterPortrait
						character={character}
						iconUrl={iconUrl}
						size="lg"
						className="group-hover:border-amber-500 transition-colors"
					/>
				</div>

				{/* Character Info */}
				<h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 text-center">
					{character.name}
				</h4>
				<p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-1">
					{character.race} {character.class}
				</p>
				<p className="text-xs text-slate-500 dark:text-slate-500 text-center">
					Level {character.level}
					{character.trait && (
						<span className="block mt-1 text-amber-600 dark:text-amber-400 font-medium">
							{character.trait}
						</span>
					)}
				</p>
			</div>
		</button>
	);
};

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

type GameStep = 'loading' | 'character' | 'waiting' | 'active';

const GameInvite: React.FC = () => {
	const params = Route.useParams();
	const inviteCode = params['invite-code'];
	const { user } = useRouteContext({ from: '__root__' });
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const playerId = user?.id ?? '';
	const playerEmail = user?.email ?? undefined;

	const [step, setStep] = React.useState<GameStep>('loading');
	const [newCharacterName, setNewCharacterName] = React.useState('');
	const [selectedTemplateId, setSelectedTemplateId] = React.useState<string>(CHARACTER_TEMPLATES[0].id);
	const [loading, setLoading] = React.useState(false);

	// Fetch game session with 15 second polling
	const { data: session, isLoading: sessionLoading, refetch: refetchSession } = useQuery({
		...gameSessionQueryOptions(inviteCode),
		enabled: !!inviteCode,
		refetchInterval: 15000, // Poll every 15 seconds
	});

	// Fetch user's characters
	const { data: characters, isLoading: charactersLoading } = useSuspenseQuery(charactersQueryOptions());

	// Get character ID from session after joining
	const joinedCharacterId = React.useMemo(() => {
		if (!session || !playerId) return '';
		const player = session.players.find(p => p.playerId === playerId);
		return player?.characterId || '';
	}, [session, playerId]);

	// WebSocket connection for Partykit - only connect when we have characterId and are in waiting/active
	const shouldConnectWs = (step === 'waiting' || step === 'active') && joinedCharacterId && playerId;
	const { isConnected: wsConnected, send: sendWsMessage } = useWebSocketBrowser({
		inviteCode,
		playerId,
		characterId: joinedCharacterId,
		playerEmail,
		autoConnect: shouldConnectWs,
		onGameStateUpdate: (gameState) => {
			// Update session query data when we receive state updates
			queryClient.setQueryData(['games', inviteCode], (old: GameSessionResponse | undefined) => {
				if (!old) return old;
				return {
					...old,
					gameState,
					players: gameState.players || old.players,
				};
			});
		},
	});

	const joinGameMutation = useMutation({
		mutationFn: joinGame,
		onSuccess: async (data) => {
			// Invalidate queries
			queryClient.invalidateQueries({ queryKey: ['games', inviteCode] });
			queryClient.invalidateQueries({ queryKey: ['games', 'me'] });
			queryClient.invalidateQueries({ queryKey: ['characters'] });

			// Refetch session to get updated player info
			const updatedSession = await refetchSession();

			// The WebSocket will auto-connect when shouldConnectWs becomes true
			// The join message will be sent in the useEffect below when wsConnected is true

			// Update step based on game status
			if (data.status === 'active') {
				setStep('active');
				// Navigate to multiplayer game
				navigate({ to: '/multiplayer-game', search: { inviteCode, hostId: data.hostId } });
			} else {
				setStep('waiting');
			}
		},
	});

	const selectedTemplate = React.useMemo(
		() => CHARACTER_TEMPLATES.find(template => template.id === selectedTemplateId) ?? CHARACTER_TEMPLATES[0],
		[selectedTemplateId],
	);

	// Check if player is already in the game
	const isPlayerInGame = React.useMemo(() => {
		if (!session || !playerId) return false;
		return session.players?.some(p => p.playerId === playerId) ?? false;
	}, [session, playerId]);

	// Determine what step to show based on game state and player status
	React.useEffect(() => {
		if (sessionLoading) {
			setStep('loading');
			return;
		}

		if (!session) {
			// Game not found - redirect back to join game
			navigate({ to: '/join-game' });
			return;
		}

		// If player is already in game
		if (isPlayerInGame) {
			if (session.status === 'active') {
				// Navigate to multiplayer game
				setStep('active');
				navigate({ to: '/multiplayer-game', search: { inviteCode, hostId: session.hostId } });
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
			// Game is not accepting players
			alert('This game is no longer accepting players');
			navigate({ to: '/join-game' });
		}
	}, [session, sessionLoading, isPlayerInGame, inviteCode, playerId, navigate]);

	// Poll for game start when waiting - transition to active game UI
	React.useEffect(() => {
		if (step === 'waiting' && session?.status === 'active' && inviteCode && playerId) {
			setStep('active');
			navigate({ to: '/multiplayer-game', search: { inviteCode, hostId: session.hostId } });
		}
	}, [step, session?.status, inviteCode, playerId, navigate, session?.hostId]);

	// Send join message to Partykit when WebSocket connects
	React.useEffect(() => {
		if (wsConnected && joinedCharacterId && step === 'waiting') {
			const player = session?.players.find(p => p.playerId === playerId);
			if (player) {
				sendWsMessage({
					type: 'join',
					characterId: player.characterId,
					characterName: player.name,
					playerEmail: playerEmail,
				});
			}
		}
	}, [wsConnected, joinedCharacterId, step, session, playerId, sendWsMessage, playerEmail]);

	const handleJoinWithCharacter = async (character: Character) => {
		if (!inviteCode || !playerId) {
			alert('Missing invite code or player identity');
			return;
		}

		if (loading) {
			console.log('Already joining, ignoring duplicate request');
			return;
		}

		setLoading(true);
		try {
			console.log('Joining game with character:', character.name);
			await joinGameMutation.mutateAsync({
				data: {
					inviteCode,
					character,
					playerId,
					playerEmail,
				},
			});

			console.log('Join game mutation successful');
		} catch (error) {
			console.error('Error joining game:', error);
			alert(error instanceof Error ? error.message : 'Failed to join game');
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
			// Error is already handled in handleJoinWithCharacter
			console.error('Error in handleCreateAndJoin:', error);
		}
	};

	if (step === 'loading' || sessionLoading) {
		return (
			<RouteShell
				title="Loading Game"
				description="Fetching game information..."
			>
				<div className="flex items-center justify-center min-h-[400px]">
					<div className="text-center">
						<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mb-4"></div>
						<p className="text-slate-600 dark:text-slate-400">Loading game...</p>
					</div>
				</div>
			</RouteShell>
		);
	}

	if (step === 'waiting') {
		return (
			<RouteShell
				title="Waiting for Host to Start"
				description="You've joined the game! The host will start the game soon."
			>
				<div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
					<div className="text-center">
						<h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
							Waiting for Host to Start
						</h2>
						<p className="text-slate-600 dark:text-slate-400 mb-4">
							You've joined the game! The host will start the game soon.
						</p>
						{session && (
							<p className="text-lg text-slate-700 dark:text-slate-300">
								{session.players.length} player{session.players.length !== 1 ? 's' : ''} joined
							</p>
						)}
					</div>
					<button
						type="button"
						onClick={() => !sessionLoading && refetchSession()}
						disabled={sessionLoading}
						className="bg-amber-600 hover:bg-amber-500 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
					>
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						Refresh
					</button>
				</div>
			</RouteShell>
		);
	}

	if (step === 'character') {
		return (
			<RouteShell
				title="Choose Character"
				description={`Join ${session?.quest.name || 'the game'}`}
			>
				<div className="max-w-4xl mx-auto space-y-8">
					{/* Game Info */}
					<div className="text-center">
						<h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
							{session?.quest.name || 'Join Game'}
						</h2>
						{inviteCode && (
							<p className="text-slate-600 dark:text-slate-400">
								Invite Code: <span className="font-mono font-semibold">{inviteCode.toUpperCase()}</span>
							</p>
						)}
					</div>

					{/* Saved Characters */}
					<div>
						<h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
							Use a Saved Character
						</h3>
						{charactersLoading ? (
							<div className="text-center py-8">
								<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mb-2"></div>
								<p className="text-slate-600 dark:text-slate-400">Loading your characters...</p>
							</div>
						) : characters && characters.length === 0 ? (
							<div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 p-6 text-center">
								<p className="text-slate-600 dark:text-slate-400 mb-2">No saved characters yet.</p>
								<p className="text-sm text-slate-500 dark:text-slate-500">
									Create a quick character below to jump into the session.
								</p>
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{characters?.map(character => {
									// Resolve character icon
									const characterIcon = character.icon || character.image;
									let iconUrl: string | null = null;
									if (characterIcon) {
										if (typeof characterIcon === 'string') {
											if (characterIcon.startsWith('http') || characterIcon.startsWith('/')) {
												iconUrl = characterIcon;
											} else {
												iconUrl = `/assets/images/characters/${characterIcon}`;
											}
										} else if (typeof characterIcon === 'object' && 'uri' in characterIcon) {
											iconUrl = characterIcon.uri;
										}
									}

									return <CharacterCard
										key={character.id}
										character={character}
										iconUrl={iconUrl}
										onClick={() => handleJoinWithCharacter(character)}
										loading={loading}
									/>;
								})}
							</div>
						)}
					</div>

					{/* Quick Character Creation */}
					<div>
						<h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
							Create a Quick Character
						</h3>
						<div className="space-y-4">
							<div>
								<label htmlFor="character-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
									Character Name
								</label>
								<input
									id="character-name"
									type="text"
									value={newCharacterName}
									onChange={(e) => setNewCharacterName(e.target.value)}
									placeholder="Name your hero"
									className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
									Pick an Archetype
								</label>
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									{CHARACTER_TEMPLATES.map(template => {
										const isSelected = template.id === selectedTemplateId;
										return (
											<button
												key={template.id}
												type="button"
												onClick={() => setSelectedTemplateId(template.id)}
												className={`rounded-lg border-2 p-4 text-left transition-colors ${
													isSelected
														? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
														: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-300'
												}`}
											>
												<h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
													{template.label}
												</h4>
												<p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
													{template.description}
												</p>
												<p className="text-xs text-slate-500 dark:text-slate-500 font-medium">
													{template.race} {template.className}
												</p>
											</button>
										);
									})}
								</div>
							</div>
							<button
								type="button"
								onClick={handleCreateAndJoin}
								disabled={loading}
								className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
							>
								{loading ? 'Joining...' : 'Create & Join'}
							</button>
						</div>
					</div>
				</div>
			</RouteShell>
		);
	}

	return null;
};

export const Route = createFileRoute('/game/$invite-code')({
	component: GameInvite,
});
