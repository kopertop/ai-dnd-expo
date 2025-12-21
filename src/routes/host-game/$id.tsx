import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import * as React from 'react';

import { CampaignSelector } from '~/components/campaign-selector';
import { InviteCodeDisplay } from '~/components/invite-code-display';
import { LocationChooser } from '~/components/location-chooser';
import { PlayerList } from '~/components/player-list';
import RouteShell from '~/components/route-shell';
import { WorldChooser } from '~/components/world-chooser';
import { useWebSocketBrowser } from '~/hooks/use-websocket-browser';
import { currentUserQueryOptions } from '~/utils/auth';
import { createGame, deleteGame, gameSessionQueryOptions, startGame } from '~/utils/games';

import type { LocationOption } from '@/types/location-option';
import type { Quest } from '@/types/quest';
import type { WorldOption } from '@/types/world-option';

// World name lookup (web-compatible, no require())
const WORLD_NAMES: Record<string, string> = {
	faerun: 'Faerûn',
	eberron: 'Eberron',
	underdark: 'Underdark',
	custom: 'Custom',
};

// Location name lookup (web-compatible, no require())
const LOCATION_NAMES: Record<string, string> = {
	tavern: 'Tavern',
	cave: 'Cave',
	camp: 'Camp',
	palace: 'Palace',
	bedroom: 'Bedroom',
	ship: 'Ship',
	marketplace: 'Marketplace',
	temple: 'Temple',
	dungeon: 'Dungeon',
	forest: 'Forest',
	tower: 'Tower',
	arena: 'Arena',
	library: 'Library',
	smithy: 'Smithy',
	trail: 'Trail',
	farm: 'Farm',
	graveyard: 'Graveyard',
	portal: 'Portal',
	custom: 'Custom',
};

type HostStep = 'world' | 'campaign' | 'location' | 'ready';

const HostGameDetail: React.FC = () => {
	const { id } = Route.useParams();
	const search = useSearch({ strict: false });
	const navigate = useNavigate();
	const userQuery = useSuspenseQuery(currentUserQueryOptions());
	const user = userQuery.data;

	// Determine if this is a new game or existing game
	const isNewGame = id === 'new';
	const inviteCode = isNewGame ? null : id;

	// Fetch game session if it's an existing game
	const sessionQuery = useQuery({
		...gameSessionQueryOptions(inviteCode || ''),
		enabled: !isNewGame && !!inviteCode,
		refetchInterval: 15000, // Poll every 15 seconds
	});
	const session = sessionQuery.data;

	// Get step and selections from URL, but maintain local state for instant updates
	const stepFromUrl = (search as { step?: HostStep; worldId?: string; campaignId?: string; locationId?: string })?.step || 'world';
	const worldIdFromUrl = (search as { worldId?: string })?.worldId;
	const campaignIdFromUrl = (search as { campaignId?: string })?.campaignId;
	const locationIdFromUrl = (search as { locationId?: string })?.locationId;

	const [currentStep, setCurrentStep] = React.useState<HostStep>(stepFromUrl);
	const [selectedWorld, setSelectedWorld] = React.useState<WorldOption | null>(null);
	const [selectedCampaign, setSelectedCampaign] = React.useState<Quest | null>(null);
	const [selectedLocation, setSelectedLocation] = React.useState<LocationOption | null>(null);
	const [loading, setLoading] = React.useState(false);

	// Restore selections from URL on mount or when URL changes
	React.useEffect(() => {
		if (id === 'new') {
			// Restore world from URL
			if (worldIdFromUrl && !selectedWorld) {
				// For web, we'll reconstruct the world object from the ID
				const worldName = WORLD_NAMES[worldIdFromUrl.toLowerCase()] || worldIdFromUrl;
				setSelectedWorld({
					id: worldIdFromUrl,
					name: worldName,
					description: '',
					image: `/assets/images/worlds/${worldIdFromUrl}.png`,
				});
			}

			// Restore campaign from URL
			if (campaignIdFromUrl && !selectedCampaign) {
				import('@/constants/quests').then(({ predefinedQuests }) => {
					const campaign = predefinedQuests.find(q => q.id === campaignIdFromUrl);
					if (campaign) {
						setSelectedCampaign(campaign);
					}
				});
			}

			// Restore location from URL
			if (locationIdFromUrl && !selectedLocation) {
				// Location IDs match the pattern, we'll reconstruct from ID
				const locationId = locationIdFromUrl;
				setSelectedLocation({
					id: locationId,
					name: locationId.charAt(0).toUpperCase() + locationId.slice(1),
					description: '',
					image: `/assets/images/locations/${locationId}.png`,
				});
			}

			// Sync step from URL
			if (stepFromUrl !== currentStep) {
				setCurrentStep(stepFromUrl);
			}
		}
	}, [id, worldIdFromUrl, campaignIdFromUrl, locationIdFromUrl, stepFromUrl, currentStep, selectedWorld, selectedCampaign, selectedLocation]);

	// Update URL when step or selections change (for browser back button support)
	const updateStepInUrl = React.useCallback((step: HostStep, replace = false, updates?: { worldId?: string; campaignId?: string; locationId?: string }) => {
		if (id === 'new') {
			const searchParams: { step: HostStep; worldId?: string; campaignId?: string; locationId?: string } = { step };
			if (updates?.worldId) searchParams.worldId = updates.worldId;
			if (updates?.campaignId) searchParams.campaignId = updates.campaignId;
			if (updates?.locationId) searchParams.locationId = updates.locationId;
			// Preserve existing params if not updating
			if (!updates?.worldId && selectedWorld?.id) searchParams.worldId = selectedWorld.id;
			if (!updates?.campaignId && selectedCampaign?.id) searchParams.campaignId = selectedCampaign.id;
			if (!updates?.locationId && selectedLocation?.id) searchParams.locationId = selectedLocation.id;

			navigate({
				to: '/host-game/$id',
				params: { id: 'new' },
				search: searchParams,
				replace,
			});
		}
	}, [id, navigate, selectedWorld, selectedCampaign, selectedLocation]);

	const handleWorldSelect = (world: WorldOption) => {
		setSelectedWorld(world);
		const nextStep = 'campaign';
		// Update state immediately for instant UI update
		setCurrentStep(nextStep);
		// Then update URL (non-blocking) with world ID
		updateStepInUrl(nextStep, false, { worldId: world.id }); // Push new history entry
	};

	const handleCampaignSelect = (quest: Quest) => {
		setSelectedCampaign(quest);
		const nextStep = 'location';
		// Update state immediately for instant UI update
		setCurrentStep(nextStep);
		// Then update URL (non-blocking) with campaign ID
		updateStepInUrl(nextStep, false, { campaignId: quest.id }); // Push new history entry
	};

	const handleLocationSelect = (location: LocationOption) => {
		setSelectedLocation(location);
		const nextStep = 'ready';
		// Update state immediately for instant UI update
		setCurrentStep(nextStep);
		// Then update URL (non-blocking) with location ID
		updateStepInUrl(nextStep, false, { locationId: location.id }); // Push new history entry
	};

	const handleBack = () => {
		if (currentStep === 'world') {
			// If on first step, go back to host game index
			navigate({ to: '/host-game' });
		} else if (currentStep === 'campaign') {
			// Go back to world selection - use browser back to maintain history
			window.history.back();
		} else if (currentStep === 'location') {
			// Go back to campaign selection - use browser back to maintain history
			window.history.back();
		} else if (currentStep === 'ready') {
			// Go back to location selection - use browser back to maintain history
			window.history.back();
		}
	};

	const queryClient = useQueryClient();

	// WebSocket connection for real-time updates (host view)
	const { isConnected: wsConnected } = useWebSocketBrowser({
		inviteCode: inviteCode || '',
		playerId: user?.id || '',
		characterId: '', // Host doesn't need characterId
		playerEmail: user?.email,
		autoConnect: !isNewGame && !!inviteCode && !!user?.id,
		onGameStateUpdate: (gameState) => {
			// Update session query data when we receive state updates
			if (inviteCode) {
				queryClient.setQueryData(['games', inviteCode], (old: any) => {
					if (!old) return old;
					return {
						...old,
						gameState,
						players: gameState.players || old.players,
					};
				});
			}
		},
	});

	const createGameMutation = useMutation({
		mutationFn: createGame,
		onSuccess: (gameSession) => {
			// Navigate to the game lobby, replacing current history entry
			navigate({ to: `/host-game/${gameSession.inviteCode}`, replace: true });
		},
		onError: (error) => {
			alert(error instanceof Error ? error.message : 'Failed to create game');
		},
	});

	const deleteGameMutation = useMutation({
		mutationFn: deleteGame,
		onSuccess: () => {
			// Invalidate games list and navigate back
			queryClient.invalidateQueries({ queryKey: ['games', 'me'] });
			navigate({ to: '/host-game' });
		},
		onError: (error) => {
			alert(error instanceof Error ? error.message : 'Failed to delete game');
		},
	});

	const startGameMutation = useMutation({
		mutationFn: startGame,
		onSuccess: () => {
			// Invalidate game session and state queries
			queryClient.invalidateQueries({ queryKey: ['games', inviteCode] });
			queryClient.invalidateQueries({ queryKey: ['games', 'me'] });
		},
		onError: (error) => {
			alert(error instanceof Error ? error.message : 'Failed to start game');
		},
	});

	const handleDeleteGame = () => {
		if (!inviteCode) return;
		if (!confirm('Are you sure you want to delete this game? This action cannot be undone.')) {
			return;
		}
		deleteGameMutation.mutate({ data: { inviteCode } });
	};

	const handleStartGame = async () => {
		if (!session || !user) {
			alert('Session or user information missing');
			return;
		}

		if (session.status === 'active') {
			// Game is already active, just navigate to it
			navigate({
				to: '/multiplayer-game',
				search: { inviteCode: session.inviteCode, hostId: session.hostId },
			});
			return;
		}

		setLoading(true);
		try {
			// Build initial game state with DM mode
			const characters = session.characters && session.characters.length > 0
				? session.characters
				: [];

			const initialGameState = {
				sessionId: session.sessionId,
				inviteCode: session.inviteCode,
				hostId: session.hostId,
				quest: session.quest,
				players: session.players || [],
				characters,
				playerCharacterId: session.players?.[0]?.characterId || '',
				gameWorld: session.world || '',
				startingArea: session.startingArea || '',
				status: 'active' as const,
				createdAt: session.createdAt || Date.now(),
				lastUpdated: Date.now(),
				messages: [],
				// mapState is omitted - will be built by API's buildMapState method
				activityLog: [],
				// Start in DM Mode so players see a paused indicator until the DM resumes
				activeTurn: {
					type: 'dm' as const,
					entityId: session.hostId,
					turnNumber: 1,
					startedAt: Date.now(),
					movementUsed: 0,
					majorActionUsed: false,
					minorActionUsed: false,
				},
				pausedTurn: {
					type: 'dm' as const,
					entityId: session.hostId,
					turnNumber: 1,
					startedAt: Date.now(),
				},
			};

			await startGameMutation.mutateAsync({
				data: {
					inviteCode: session.inviteCode,
					hostId: session.hostId,
					gameState: initialGameState,
				},
			});

			// Navigate to multiplayer game screen
			navigate({
				to: '/multiplayer-game',
				search: { inviteCode: session.inviteCode, hostId: session.hostId },
			});
		} catch (error) {
			// Error is handled by mutation onError
			console.error('Failed to start game:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleCreateGame = async () => {
		if (!selectedCampaign || !selectedWorld || !selectedLocation || !user) {
			alert('Please complete all steps');
			return;
		}

		setLoading(true);
		try {
			await createGameMutation.mutateAsync({
				data: {
					questId: selectedCampaign.id,
					quest: selectedCampaign,
					world: selectedWorld.id, // Use id field directly
					startingArea: selectedLocation.id, // Use id field directly
					hostId: user.id,
					hostEmail: user.email || undefined,
				},
			});
		} catch (error) {
			// Error is handled by mutation onError
		} finally {
			setLoading(false);
		}
	};

	// If this is an existing game, show the lobby
	if (!isNewGame && inviteCode) {
		if (sessionQuery.isLoading) {
			return (
				<RouteShell
					title="Host Game Lobby"
					description="Loading game session..."
				>
					<div className="flex items-center justify-center py-12">
						<div className="text-slate-600 dark:text-slate-400">Loading...</div>
					</div>
				</RouteShell>
			);
		}

		if (sessionQuery.error || !session) {
			return (
				<RouteShell
					title="Host Game Lobby"
					description="Game not found"
				>
					<div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
						<p className="text-red-700 dark:text-red-400">
							{sessionQuery.error instanceof Error
								? sessionQuery.error.message
								: 'Game not found or you do not have access'}
						</p>
						<button
							type="button"
							onClick={() => navigate({ to: '/host-game' })}
							className="mt-4 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-500"
						>
							Back to Host Games
						</button>
					</div>
				</RouteShell>
			);
		}

		// Show game lobby
		return (
			<RouteShell
				title="Host Game Lobby"
				description="Manage your game session"
			>
				<div className="space-y-6">
					<InviteCodeDisplay inviteCode={session.inviteCode} />
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
						<div className="lg:col-span-1">
							<PlayerList
								players={session.players || []}
								characters={session.characters || []}
							/>
						</div>
						<div className="lg:col-span-2">
							<div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
								<h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
									Game Details
								</h3>
								<div className="space-y-2 text-sm">
									<p>
										<span className="font-medium text-slate-700 dark:text-slate-300">Campaign:</span>{' '}
										<span className="text-slate-900 dark:text-slate-100">{session.quest.name}</span>
									</p>
								<p>
									<span className="font-medium text-slate-700 dark:text-slate-300">World:</span>{' '}
									<span className="text-slate-900 dark:text-slate-100">
										{session.world
											? WORLD_NAMES[session.world.toLowerCase()] || session.world
											: 'Unknown'}
									</span>
								</p>
									<p>
										<span className="font-medium text-slate-700 dark:text-slate-300">Starting Location:</span>{' '}
										<span className="text-slate-900 dark:text-slate-100">
											{session.startingArea
												? LOCATION_NAMES[session.startingArea.toLowerCase()] || session.startingArea
												: 'Unknown'}
										</span>
									</p>
									<p>
										<span className="font-medium text-slate-700 dark:text-slate-300">Status:</span>{' '}
										<span className={`inline-block rounded px-2 py-1 text-xs font-medium ${
											session.status === 'active'
												? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
												: session.status === 'waiting'
													? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
													: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
										}`}>
											{session.status}
										</span>
									</p>
								</div>
								<div className="mt-6 space-y-3">
									{session.status === 'waiting' && (
										<button
											type="button"
											onClick={handleStartGame}
											disabled={loading || startGameMutation.isPending}
											className="w-full rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{loading || startGameMutation.isPending ? 'Starting...' : 'Start Game'}
										</button>
									)}
									{session.status === 'active' && (
										<button
											type="button"
											onClick={() => {
												navigate({
													to: '/multiplayer-game',
													search: { inviteCode: session.inviteCode, hostId: session.hostId },
												});
											}}
											className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
										>
											Rejoin Game
										</button>
									)}
									{(session.hostId === user?.id || user?.is_admin) && (
										<button
											type="button"
											onClick={handleDeleteGame}
											disabled={deleteGameMutation.isPending}
											className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50"
										>
											{deleteGameMutation.isPending ? 'Deleting...' : 'Delete Game'}
										</button>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			</RouteShell>
		);
	}

	// New game creation flow
	const renderStepContent = () => {
		const renderBackButton = () => {
			return (
				<button
					type="button"
					onClick={handleBack}
					className="mb-4 flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
				>
					<svg
						className="h-4 w-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M15 19l-7-7 7-7"
						/>
					</svg>
					Back
				</button>
			);
		};

		switch (currentStep) {
			case 'world':
				return (
					<RouteShell
						title="Select World"
						description="Choose Your World"
					>
						{renderBackButton()}
						<WorldChooser onSelect={handleWorldSelect} selectedWorld={selectedWorld} />
					</RouteShell>
				);
			case 'campaign':
				return (
					<RouteShell
						title="Select a Campaign"
						description="Choose your campaign"
					>
						{renderBackButton()}
						<CampaignSelector onSelect={handleCampaignSelect} selectedCampaign={selectedCampaign} />
					</RouteShell>
				);
			case 'location':
				return (
					<RouteShell
						title="Select Starting Location"
						description="Choose Your Starting Location"
					>
						{renderBackButton()}
						<LocationChooser onSelect={handleLocationSelect} selectedLocation={selectedLocation} />
					</RouteShell>
				);
			case 'ready':
				return (
					<RouteShell
						title="Ready to Host"
						description="Review your game settings"
					>
						{renderBackButton()}
						<div className="space-y-4">
							<div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
								<p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
									Campaign: {selectedCampaign?.name}
								</p>
								<p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
									World: {selectedWorld?.name}
								</p>
								<p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
									Location: {selectedLocation?.name}
								</p>
							</div>
							<button
								type="button"
								onClick={handleCreateGame}
								disabled={loading}
								className="w-full rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-500 disabled:opacity-50"
							>
								{loading ? 'Creating...' : 'Create Game'}
							</button>
						</div>
					</RouteShell>
				);
			default:
				return null;
		}
	};

	return renderStepContent();
};

export const Route = createFileRoute('/host-game/$id')({
	component: HostGameDetail,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			step: (search.step as HostStep | undefined) || 'world',
			worldId: search.worldId as string | undefined,
			campaignId: search.campaignId as string | undefined,
			locationId: search.locationId as string | undefined,
		};
	},
});
