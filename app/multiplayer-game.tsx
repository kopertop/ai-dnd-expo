import { useQueryClient } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CharacterDMModal } from '@/components/character-dm-modal';
import { CharacterSheetModal } from '@/components/character-sheet-modal';
import { CharacterViewModal } from '@/components/character-view-modal';
import { CombatResultModal } from '@/components/combat-result-modal';
import { CommandPalette, type Command } from '@/components/command-palette';
import { ConnectionStatusIndicator } from '@/components/connection-status-indicator';
import { MapElementPicker, type MapElementType } from '@/components/map-element-picker';
import { InteractiveMap } from '@/components/map/interactive-map';
import { TileActionMenu, type TileAction } from '@/components/map/tile-action-menu';
import { TileDetailsModal } from '@/components/map/tile-details-modal';
import { NotificationsPanel } from '@/components/notifications-panel';
import { NpcSelector } from '@/components/npc-selector';
import { PlayerActionMenu, type PlayerAction } from '@/components/player-action-menu';
import { PlayerCharacterList } from '@/components/player-character-list';
import { SpellActionSelector } from '@/components/spell-action-selector';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TokenDetailModal } from '@/components/token-detail-modal';
import { DEFAULT_RACE_SPEED } from '@/constants/race-speed';
import { useCastSpell, useDealDamage, useHealCharacter, usePerformAction, useRollPerceptionCheck } from '@/hooks/api/use-character-queries';
import {
	useStopGame,
	useSubmitDMAction,
} from '@/hooks/api/use-game-queries';
import {
	useAllMaps,
	useDeleteMapToken,
	useMapState,
	useMoveToken,
	useMutateTerrain,
	usePlaceNpc,
	usePlacePlayerToken,
	useSaveMapToken,
	useSwitchMap,
} from '@/hooks/api/use-map-queries';
import { useEndTurn, useInterruptTurn, useNextTurn, useResumeTurn, useStartTurn, useUpdateTurnState } from '@/hooks/api/use-turn-queries';
import { usePollingGameState } from '@/hooks/use-polling-game-state';
import { useScreenSize } from '@/hooks/use-screen-size';
import { useWebSocket } from '@/hooks/use-websocket';
import { PlayerActionMessage } from '@/types/api/websocket-messages';
import { Character } from '@/types/character';
import type { CharacterActionResult } from '@/types/combat';
import { MultiplayerGameState } from '@/types/multiplayer-game';
import { MapState, MapToken, NpcDefinition } from '@/types/multiplayer-map';
import { getCharacterSpeed } from '@/utils/character-utils';
import { calculateMovementRange, isInMeleeRange, isInRangedRange } from '@/utils/movement-calculator';

const MultiplayerGameScreen: React.FC = () => {
	const params = useLocalSearchParams<{ inviteCode: string; hostId?: string; playerId?: string }>();
	const { inviteCode, hostId, playerId } = params;
	const [gameState, setGameState] = useState<MultiplayerGameState | null>(null);
	const [movementRange, setMovementRange] = useState<Array<{ x: number; y: number; cost: number }>>([]);
	const [pathPreview, setPathPreview] = useState<{ path: Array<{ x: number; y: number }>; cost: number } | null>(
		null,
	);
	const [movementInFlight, setMovementInFlight] = useState(false);
	const [playerActionMenu, setPlayerActionMenu] = useState<{ x: number; y: number; actions: PlayerAction[]; targetLabel?: string } | null>(null);
	const [wsConnected, setWsConnected] = useState(false);
	const [showMapSwitcher, setShowMapSwitcher] = useState(false);
	const [switchingMap, setSwitchingMap] = useState(false);
	const [showNotifications, setShowNotifications] = useState(false);
	const [showCommandPalette, setShowCommandPalette] = useState(false);
	const [unreadMessageCount, setUnreadMessageCount] = useState(0);
	const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
	const [selectedTokenMovementRange, setSelectedTokenMovementRange] = useState<Array<{ x: number; y: number; cost: number }>>([]);
	const [isMapEditMode, setIsMapEditMode] = useState(false);
	const [selectedToken, setSelectedToken] = useState<MapToken | null>(null);
	const [showTokenModal, setShowTokenModal] = useState(false);
	const [tileActionMenu, setTileActionMenu] = useState<{ x: number; y: number } | null>(null);
	const [selectedItemType, setSelectedItemType] = useState<'fire' | 'trap' | 'obstacle' | null>(null);
	const [selectedCharacterForDM, setSelectedCharacterForDM] = useState<{ id: string; type: 'player' | 'npc' } | null>(null);
	const [showCharacterDMModal, setShowCharacterDMModal] = useState(false);
	const [npcStats, setNpcStats] = useState<{ STR: number; DEX: number; CON: number; INT: number; WIS: number; CHA: number } | undefined>(undefined);
	const [selectedCharacterForView, setSelectedCharacterForView] = useState<{ id: string; type: 'player' | 'npc' } | null>(null);
	const [showCharacterViewModal, setShowCharacterViewModal] = useState(false);
	const [showCharacterSheetModal, setShowCharacterSheetModal] = useState(false);
	const [tileDetails, setTileDetails] = useState<{ x: number; y: number } | null>(null);
	const [showMapElementPicker, setShowMapElementPicker] = useState(false);
	const [showSpellActionSelector, setShowSpellActionSelector] = useState(false);
	const [selectedCharacterForAction, setSelectedCharacterForAction] = useState<string | null>(null);
	const [pendingActionTarget, setPendingActionTarget] = useState<{ targetId: string; label: string } | null>(null);
	const [combatResult, setCombatResult] = useState<CharacterActionResult | null>(null);
	const [showCombatResult, setShowCombatResult] = useState(false);
	const [elementPlacementMode, setElementPlacementMode] = useState<MapElementType | null>(null);
	const [showCharacterTurnSelector, setShowCharacterTurnSelector] = useState(false);
	const [showNpcSelector, setShowNpcSelector] = useState(false);
	const [npcPlacementMode, setNpcPlacementMode] = useState<{ npcId: string; npcName: string } | null>(null);
	const placingCharactersRef = useRef<Set<string>>(new Set());
	const isPlacingRef = useRef(false);
	const [isPlacing, setIsPlacing] = useState(false);
	const { isMobile } = useScreenSize();
	const insets = useSafeAreaInsets();

	// Get character ID from gameState (memoized to prevent re-renders)
	// Used for WebSocket connection - needs to be defined early
	const characterId = useMemo(() => {
		if (!gameState || !playerId) return '';
		const player = gameState.players.find(p => p.playerId === playerId);
		return player?.characterId || '';
	}, [gameState, playerId]);

	// Stable callback for game state updates
	const handleGameStateUpdate = useCallback((newState: MultiplayerGameState) => {
		setGameState(newState);
		setWsConnected(true);
	}, []);

	// WebSocket connection - only connect when we have characterId
	const { isConnected: wsIsConnected } = useWebSocket({
		inviteCode: inviteCode || '',
		playerId: playerId || '',
		characterId: characterId,
		onGameStateUpdate: handleGameStateUpdate,
		onPlayerAction: (message: PlayerActionMessage) => {
			// Handle player action updates
			console.log('Player action:', message);
		},
		autoConnect: !!inviteCode && !!playerId && !!characterId,
	});

	// Stable callback for polling updates
	const handlePollingUpdate = useCallback((newState: MultiplayerGameState) => {
		setGameState(newState);
		setWsConnected(false);
	}, []);

	// Polling fallback when WebSocket is not connected OR when we need initial state
	const { gameState: polledState, refresh: refreshGameState } = usePollingGameState({
		inviteCode: inviteCode || '',
		enabled: (!wsIsConnected && !!inviteCode) || !gameState, // Poll if WS not connected OR no gameState yet
		pollInterval: 15000,
		onGameStateUpdate: handlePollingUpdate,
	});

	// Prefer locally updated state (includes optimistic updates) and fall back to polled data
	// This keeps movementUsed/movement budgeting cumulative across sequential moves
	const effectiveGameState = useMemo(() => gameState || polledState, [gameState, polledState]);

	// Map state and helpers (must be initialized before map-dependent selectors)
	const { data: mapStateData } = useMapState(inviteCode || null);
	// Prefer locally updated gameState map first (freshest after moves), then query data
	const mapState = useMemo(
		() => effectiveGameState?.mapState || mapStateData || null,
		[effectiveGameState?.mapState, mapStateData],
	);
	const queryClient = useQueryClient();
	const mapQueryKey = useMemo(() => inviteCode ? [`/games/${inviteCode}/map`] : null, [inviteCode]);

	const updateCachedMap = useCallback(
		(updater: (map: MapState) => MapState) => {
			if (!mapQueryKey) return;
			queryClient.setQueryData<MapState | undefined>(mapQueryKey, current => {
				if (!current) return current;
				return updater(current);
			});
		},
		[mapQueryKey, queryClient],
	);

	const updateCachedTokens = useCallback(
		(updater: (tokens: MapToken[]) => MapToken[]) => {
			updateCachedMap(map => ({
				...map,
				tokens: updater(map.tokens || []),
			}));
		},
		[updateCachedMap],
	);

	const applyTokenPositionUpdates = useCallback(
		(updates: Array<{ id: string; x: number; y: number }>) => {
			if (!updates.length) return;
			updateCachedTokens(tokens =>
				tokens.map(t => {
					const update = updates.find(u => u.id === t.id);
					return update ? { ...t, x: update.x, y: update.y } : t;
				}),
			);
		},
		[updateCachedTokens],
	);

	// Get current character ID from effectiveGameState (prefer query data)
	const currentCharacterId = useMemo(
		() => effectiveGameState?.players.find(p => p.playerId === playerId)?.characterId,
		[effectiveGameState?.players, playerId],
	);

	// Determine if this is the host - computed from query data
	const isHost = useMemo(() => {
		if (!hostId || !effectiveGameState) {
			return false;
		}
		return effectiveGameState.hostId === hostId;
	}, [hostId, effectiveGameState?.hostId]);

	// Update gameState from polling if we don't have it yet
	useEffect(() => {
		if (!gameState && polledState) {
			setGameState(polledState);
		}
	}, [gameState, polledState]);

	// Get the active character ID - for DM, use the active turn's entity, for players use their own
	const activeCharacterIdForMovement = useMemo(() => {
		if (isHost && effectiveGameState?.activeTurn && !effectiveGameState.pausedTurn) {
			// DM acting as the active character
			return effectiveGameState.activeTurn.entityId;
		}
		return currentCharacterId;
	}, [isHost, effectiveGameState?.activeTurn, effectiveGameState?.pausedTurn, currentCharacterId]);

	const activeCharacter = useMemo(() => {
		if (!activeCharacterIdForMovement) {
			return null;
		}
		return effectiveGameState?.characters.find(c => c.id === activeCharacterIdForMovement) ?? null;
	}, [effectiveGameState?.characters, activeCharacterIdForMovement]);

	const playerToken = useMemo(() => {
		if (!mapState) {
			return null;
		}

		// For DM: use active turn's character/NPC token
		// For players: use their own token
		const entityId = activeCharacterIdForMovement;
		if (!entityId) {
			return null;
		}

		return (
			mapState.tokens?.find(token =>
				(token.type === 'player' || token.type === 'npc') &&
				(token.entityId === entityId || token.id === entityId),
			) ?? null
		);
	}, [mapState, activeCharacterIdForMovement]);

	// Token ID for the entity whose turn it is (players match by characterId, NPCs by token.id)
	const activeTurnTokenId = useMemo(() => {
		const turn = effectiveGameState?.activeTurn;
		if (!turn || effectiveGameState?.pausedTurn) {
			return null;
		}
		if (turn.type !== 'player' && turn.type !== 'npc') {
			return null;
		}
		const tokenMatch = mapState?.tokens?.find(token => {
			if (token.type !== 'player' && token.type !== 'npc') {
				return false;
			}
			// Player turns: entityId is character id; NPC turns: entityId is token id
			if (turn.type === 'player') {
				return token.entityId === turn.entityId || token.id === turn.entityId;
			}
			return token.id === turn.entityId || token.entityId === turn.entityId;
		});
		return tokenMatch?.id ?? null;
	}, [effectiveGameState?.activeTurn, effectiveGameState?.pausedTurn, mapState?.tokens]);

	const activeTurnForMovement = useMemo(() => {
		if (!effectiveGameState?.activeTurn) {
			return null;
		}
		return effectiveGameState.activeTurn.entityId === activeCharacterIdForMovement ? effectiveGameState.activeTurn : null;
	}, [effectiveGameState, activeCharacterIdForMovement]);

	const totalMovementSpeedForActive = useMemo(() => {
		if (typeof activeTurnForMovement?.speed === 'number') {
			return activeTurnForMovement.speed;
		}
		if (activeCharacter) {
			return getCharacterSpeed(activeCharacter);
		}
		return DEFAULT_RACE_SPEED;
	}, [activeTurnForMovement?.speed, activeCharacter]);

	const movementBudget = useMemo(() => {
		const used = activeTurnForMovement?.movementUsed ?? 0;
		return Math.max(0, totalMovementSpeedForActive - used);
	}, [totalMovementSpeedForActive, activeTurnForMovement?.movementUsed]);

	const isPlayerTurn = useMemo(() => {
		// If no active turn, no one's turn
		if (!effectiveGameState?.activeTurn) {
			return false;
		}

		// If turn is paused, DM is in "DM Action" mode - no one can act
		if (effectiveGameState.pausedTurn) {
			return false;
		}

		// For DM: if there's an active turn (player or NPC), DM acts as that character
		// unless the turn is paused (DM Action mode)
		if (isHost && effectiveGameState.activeTurn.entityId) {
			return (
				effectiveGameState.activeTurn.type === 'player' ||
				effectiveGameState.activeTurn.type === 'npc'
			);
		}

		// For players: only their own turn
		if (!currentCharacterId) {
			return false;
		}

		return (
			effectiveGameState.activeTurn.type === 'player' &&
			effectiveGameState.activeTurn.entityId === currentCharacterId
		);
	}, [effectiveGameState, currentCharacterId, isHost]);

	const currentTurnName = useMemo(() => {
		if (!effectiveGameState?.activeTurn) {
			return null;
		}
		if (effectiveGameState.activeTurn.type === 'player') {
			const character = effectiveGameState.characters.find(
				c => c.id === effectiveGameState.activeTurn?.entityId,
			);
			return character?.name || 'Player';
		}
		if (effectiveGameState.activeTurn.type === 'npc') {
			return 'NPC';
		}
		return 'DM';
	}, [effectiveGameState?.activeTurn, effectiveGameState?.characters]);

	const hostActingAsActiveCharacter = useMemo(() => {
		return Boolean(
			isHost && !effectiveGameState?.pausedTurn && effectiveGameState?.activeTurn?.entityId,
		);
	}, [isHost, effectiveGameState?.pausedTurn, effectiveGameState?.activeTurn?.entityId]);

	// Use query hooks
	const { data: availableMapsData } = useAllMaps();
	const switchMapMutation = useSwitchMap(inviteCode || '');
	const moveTokenMutation = useMoveToken(inviteCode || '');

	// Derive availableMaps from query data
	const availableMaps = useMemo(() => availableMapsData?.maps || [], [availableMapsData?.maps]);

	const placePlayerTokenMutation = usePlacePlayerToken(inviteCode || '');
	const submitDMActionMutation = useSubmitDMAction(inviteCode || '');
	const nextTurnMutation = useNextTurn(inviteCode || '');
	const stopGameMutation = useStopGame(inviteCode || '');
	const performActionMutation = usePerformAction(inviteCode || '');
	const endTurnMutation = useEndTurn(inviteCode || '');
	const rollPerceptionCheckMutation = useRollPerceptionCheck(inviteCode || '');
	const saveMapTokenMutation = useSaveMapToken(inviteCode || '');
	const dealDamageMutation = useDealDamage(inviteCode || '');
	const healCharacterMutation = useHealCharacter(inviteCode || '');
	const mutateTerrainMutation = useMutateTerrain(inviteCode || '');
	const updateTurnStateMutation = useUpdateTurnState(inviteCode || '');
	const placeNpcMutation = usePlaceNpc(inviteCode || '');
	const resumeTurnMutation = useResumeTurn(inviteCode || '');
	const interruptTurnMutation = useInterruptTurn(inviteCode || '');
	const deleteMapTokenMutation = useDeleteMapToken(inviteCode || '');
	const startTurnMutation = useStartTurn(inviteCode || '');
	const castSpellMutation = useCastSpell(inviteCode || '');

	const handleSwitchMap = useCallback(
		async (mapId: string) => {
			if (!inviteCode) return;

			setSwitchingMap(true);
			try {
				await switchMapMutation.mutateAsync({
					path: `/games/${inviteCode}/map`,
					body: JSON.stringify({ mapId }),
				});
				setShowMapSwitcher(false);
				Alert.alert('Success', 'Map switched successfully');
			} catch (error) {
				console.error('Failed to switch map:', error);
				Alert.alert('Error', error instanceof Error ? error.message : 'Failed to switch map');
			} finally {
				setSwitchingMap(false);
			}
		},
		[inviteCode, switchMapMutation],
	);


	// loadGameState is no longer needed - usePollingGameState handles it

	// Check for characters without tokens on the map
	const charactersWithoutTokens = useMemo(() => {
		if (!effectiveGameState?.characters || !mapState?.tokens) return [];
		return effectiveGameState.characters.filter(char => {
			const hasToken = mapState.tokens.some(token => token.type === 'player' && token.entityId === char.id);
			return !hasToken;
		});
	}, [effectiveGameState?.characters, mapState?.tokens]);

	// Auto-place missing characters function
	const handleAutoPlaceCharacters = useCallback(async () => {
		if (!isHost || !mapState || !inviteCode || charactersWithoutTokens.length === 0) {
			return;
		}

		// Prevent concurrent runs
		if (isPlacingRef.current) return;
		isPlacingRef.current = true;
		setIsPlacing(true);

		try {
			// Filter out characters that are already being placed or already have tokens
			const charactersToPlace = charactersWithoutTokens.filter(char => {
				// Skip if already being placed
				if (placingCharactersRef.current.has(char.id)) {
					return false;
				}
				// Double-check: verify character doesn't already have a token
				const hasToken = mapState.tokens?.some(
					token => token.type === 'player' && token.entityId === char.id,
				);
				return !hasToken;
			});

			if (charactersToPlace.length === 0) {
				isPlacingRef.current = false;
				return; // All characters already placed or being placed
			}

			// Find open tiles (not blocked, not occupied, preferring roads/gravel)
			const occupiedTiles = new Set(
				(mapState.tokens || []).map(t => `${t.x},${t.y}`),
			);

			const openTiles: Array<{ x: number; y: number; priority: number }> = [];

			// Iterate through map to find open tiles
			for (let y = 0; y < mapState.height; y++) {
				for (let x = 0; x < mapState.width; x++) {
					const key = `${x},${y}`;
					if (occupiedTiles.has(key)) continue;

					// Check if tile is blocked
					const cell = mapState.terrain?.[y]?.[x];
					if (cell?.difficult) continue; // Skip blocked/difficult terrain

					// Prefer roads/gravel over other terrain
					const terrain = cell?.terrain || mapState.defaultTerrain || 'stone';
					const isRoad = terrain === 'road' || terrain === 'gravel';
					const priority = isRoad ? 1 : 2; // Lower number = higher priority

					openTiles.push({ x, y, priority });
				}
			}

			// Sort by priority (roads first), then randomize within same priority
			openTiles.sort((a, b) => {
				if (a.priority !== b.priority) return a.priority - b.priority;
				return Math.random() - 0.5; // Randomize
			});

			// Place each missing character
			let placedCount = 0;
			for (let i = 0; i < charactersToPlace.length && i < openTiles.length; i++) {
				const character = charactersToPlace[i];
				const tile = openTiles[i];

				// Mark as being placed
				placingCharactersRef.current.add(character.id);

				try {
					await placePlayerTokenMutation.mutateAsync({
						path: `/games/${inviteCode}/map/tokens`,
						body: {
							characterId: character.id,
							x: tile.x,
							y: tile.y,
							label: character.name || 'Unknown',
							icon: character.icon,
							tokenType: 'player',
						},
					});
					placedCount++;
					// Remove from placing set after successful placement
					placingCharactersRef.current.delete(character.id);
				} catch (error) {
					console.error(`Failed to auto-place character ${character.id}:`, error);
					// Remove from placing set on error so it can be retried
					placingCharactersRef.current.delete(character.id);
				}
			}

			if (placedCount > 0) {
				Alert.alert('Success', `Placed ${placedCount} character${placedCount > 1 ? 's' : ''} on the map`);
			}
		} catch (error) {
			console.error('Failed to auto-place characters:', error);
			Alert.alert('Error', 'Failed to place some characters. Please try again.');
		} finally {
			isPlacingRef.current = false;
			setIsPlacing(false);
		}
	}, [isHost, mapState, charactersWithoutTokens, inviteCode, placePlayerTokenMutation]);

	// Auto-place missing characters on the map (automatic when game becomes active)
	useEffect(() => {
		if (
			isHost &&
			mapState &&
			charactersWithoutTokens.length > 0 &&
			inviteCode &&
			effectiveGameState?.status === 'active' &&
			!isPlacingRef.current
		) {
			handleAutoPlaceCharacters();
		}
	}, [isHost, mapState, charactersWithoutTokens.length, inviteCode, effectiveGameState?.status, handleAutoPlaceCharacters]);

	// Track unread messages
	useEffect(() => {
		if (effectiveGameState?.messages) {
			// Count messages that are newer than when notifications were last opened
			// For now, just show total count if panel is closed
			if (!showNotifications && effectiveGameState.messages.length > 0) {
				setUnreadMessageCount(effectiveGameState.messages.length);
			} else {
				setUnreadMessageCount(0);
			}
		}
	}, [effectiveGameState?.messages, showNotifications]);

	// Calculate movement range when it's player's turn or DM's turn (for movement preview)
	useEffect(() => {
		if (!mapState || !playerToken || movementBudget <= 0 || (!isPlayerTurn && !isHost)) {
			setMovementRange([]);
			setPathPreview(null);
			return;
		}

		// Only show movement range for players on their turn, or DM on any turn
		if (isPlayerTurn || isHost) {
			const reachable = calculateMovementRange(mapState, { x: playerToken.x, y: playerToken.y }, movementBudget);
			setMovementRange(reachable);
		}
	}, [mapState, playerToken, movementBudget, isPlayerTurn, isHost]);

	// Initial game state is loaded via usePollingGameState hook
	// Map state is loaded via useMapState hook

	// Handle CMD+K / CTRL+K keyboard shortcut for command palette
	// Use a ref to prevent double-firing in React StrictMode (development)
	const lastKeyPressTimeRef = useRef<number>(0);

	useEffect(() => {
		if (Platform.OS !== 'web') return;

		const handleKeyDown = (e: KeyboardEvent) => {
			// CMD+K on Mac, CTRL+K on Windows/Linux
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				e.stopPropagation();

				// Prevent double-firing: ignore if the same keypress happened within 100ms
				const now = Date.now();
				if (now - lastKeyPressTimeRef.current < 100) {
					return;
				}
				lastKeyPressTimeRef.current = now;

				setShowCommandPalette(prev => !prev);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, []);

	const handleDMAction = useCallback(
		async (type: string, data: Record<string, unknown>) => {
			if (!inviteCode || !hostId || !gameState) return;

			try {
				await submitDMActionMutation.mutateAsync({
					path: `/games/${inviteCode}/dm-action`,
					body: {
						actionType: type as 'narrate' | 'update_character' | 'update_npc' | 'advance_story' | 'roll_dice',
						...data,
					},
				});
			} catch (error) {
				Alert.alert('Error', 'Failed to perform DM action');
				console.error(error);
			}
		},
		[inviteCode, hostId, gameState, submitDMActionMutation],
	);

	const handleAIRequest = useCallback(async (prompt: string): Promise<string> => {
		if (!inviteCode || !hostId) {
			return 'AI assistance requires host privileges';
		}

		// TODO: Implement AI request - for now return placeholder
		// This should call the AI service to generate DM responses
		return `AI assistance is not yet implemented. Your prompt: "${prompt}". This will generate DM narration and suggestions based on your prompt.`;
	}, [inviteCode, hostId]);

	// Build command palette commands
	const commandPaletteCommands = useMemo<Command[]>(() => {
		const commands: Command[] = [];

		if (isHost) {
			commands.push(
				{
					id: 'add-character-npc',
					label: 'Add Character/NPC',
					description: 'Add a new NPC or character to the game',
					keywords: ['add', 'npc', 'character', 'create', 'spawn'],
					category: 'DM',
					action: () => {
						setShowNpcSelector(true);
						setShowCommandPalette(false);
					},
				},
				{
					id: 'skip-next-turn',
					label: 'Skip to Next Turn',
					description: 'Advance to the next character\'s turn',
					keywords: ['skip', 'next', 'turn', 'advance'],
					category: 'DM',
					action: async () => {
						if (inviteCode) {
							try {
								const response = await nextTurnMutation.mutateAsync({
									path: `/games/${inviteCode}/turn/next`,
								});
								if (response) {
									setGameState(response);
								}
								setShowCommandPalette(false);
							} catch (error) {
								console.error('Failed to skip turn:', error);
								Alert.alert('Error', error instanceof Error ? error.message : 'Failed to skip turn');
							}
						}
					},
				},
				{
					id: 'add-map-element',
					label: 'Add Map Element',
					description: 'Place environmental elements (fire, water, chest, etc.)',
					keywords: ['element', 'fire', 'water', 'chest', 'barrel', 'object'],
					category: 'Map',
					action: () => {
						setShowMapElementPicker(true);
						setShowCommandPalette(false);
					},
				},
				{
					id: 'cast-spell-action',
					label: 'Cast Spell/Action',
					description: 'Cast a spell or perform an action for any character',
					keywords: ['cast', 'spell', 'action', 'ability'],
					category: 'DM',
					action: () => {
						setShowSpellActionSelector(true);
						setShowCommandPalette(false);
					},
				},
				{
					id: 'start-character-turn',
					label: 'Start Character Turn',
					description: 'Start a specific character\'s or NPC\'s turn',
					keywords: ['start', 'turn', 'character', 'npc'],
					category: 'DM',
					action: () => {
						setShowCharacterTurnSelector(true);
						setShowCommandPalette(false);
					},
				},
				{
					id: 'switch-map',
					label: 'Switch Map',
					description: 'Change to a different map',
					keywords: ['map', 'switch', 'change', 'load'],
					category: 'Map',
					action: () => {
						setShowMapSwitcher(true);
						setShowCommandPalette(false);
					},
				},
				{
					id: 'stop-game',
					label: 'Stop Game',
					description: 'Stop the current game and return to lobby',
					keywords: ['stop', 'end', 'quit', 'lobby'],
					category: 'Game',
					action: async () => {
						if (inviteCode) {
							try {
								await stopGameMutation.mutateAsync({
									path: `/games/${inviteCode}/stop`,
								});
								router.push(`/host-game/${inviteCode}`);
							} catch (error) {
								console.error('Failed to stop game:', error);
								Alert.alert('Error', error instanceof Error ? error.message : 'Failed to stop game');
							}
						}
					},
				},
			);
		}

		// Player commands (during their turn)
		if (isPlayerTurn && currentCharacterId) {
			commands.push(
				{
					id: 'cast-spell',
					label: 'Cast Spell',
					description: 'Cast a spell from your available spells',
					keywords: ['cast', 'spell', 'magic'],
					category: 'Actions',
					action: () => {
						setSelectedCharacterForAction(currentCharacterId);
						setShowSpellActionSelector(true);
						setShowCommandPalette(false);
					},
				},
				{
					id: 'basic-attack',
					label: 'Basic Attack',
					description: 'Perform a basic melee or ranged attack',
					keywords: ['attack', 'basic', 'melee', 'ranged'],
					category: 'Actions',
					action: async () => {
						if (inviteCode && currentCharacterId) {
							try {
								await performActionMutation.mutateAsync({
									path: `/games/${inviteCode}/characters/${currentCharacterId}/actions`,
									body: {
										actionType: 'basic_attack',
									},
								});
								setShowCommandPalette(false);
								Alert.alert('Attack', 'Basic attack performed!');
							} catch (error) {
								console.error('Failed to perform attack:', error);
								Alert.alert('Error', error instanceof Error ? error.message : 'Failed to perform attack');
							}
						}
					},
				},
				{
					id: 'use-item',
					label: 'Use Item',
					description: 'Use an item from your inventory',
					keywords: ['use', 'item', 'inventory'],
					category: 'Actions',
					action: () => {
						Alert.alert('Use Item', 'Item selection coming soon');
						setShowCommandPalette(false);
					},
				},
				{
					id: 'heal-potion',
					label: 'Heal with Potion',
					description: 'Use a healing potion to restore health',
					keywords: ['heal', 'potion', 'health'],
					category: 'Actions',
					action: async () => {
						if (inviteCode && currentCharacterId) {
							try {
								await performActionMutation.mutateAsync({
									path: `/games/${inviteCode}/characters/${currentCharacterId}/actions`,
									body: {
										actionType: 'heal_potion',
									},
								});
								setShowCommandPalette(false);
								Alert.alert('Heal', 'Healing potion used!');
							} catch (error) {
								console.error('Failed to use potion:', error);
								Alert.alert('Error', error instanceof Error ? error.message : 'Failed to use potion');
							}
						}
					},
				},
				{
					id: 'delay-turn',
					label: 'Delay Turn',
					description: 'Delay your turn (move to end of initiative)',
					keywords: ['delay', 'wait', 'hold'],
					category: 'Turn',
					action: () => {
						Alert.alert('Delay Turn', 'Turn delay feature coming soon');
						setShowCommandPalette(false);
					},
				},
				{
					id: 'skip-turn',
					label: 'Skip Turn',
					description: 'End your turn immediately',
					keywords: ['skip', 'end', 'turn'],
					category: 'Turn',
					action: async () => {
						if (inviteCode) {
							try {
								await endTurnMutation.mutateAsync({
									path: `/games/${inviteCode}/turn/end`,
								});
								// Force immediate refetch of game state
								if (refreshGameState) {
									await refreshGameState();
								}
								setShowCommandPalette(false);
							} catch (error) {
								console.error('Failed to skip turn:', error);
								Alert.alert('Error', error instanceof Error ? error.message : 'Failed to skip turn');
							}
						}
					},
				},
				{
					id: 'roll-perception',
					label: 'Roll Perception',
					description: 'Roll a perception check',
					keywords: ['perception', 'roll', 'check', 'wisdom'],
					category: 'Actions',
					action: async () => {
						if (inviteCode && currentCharacterId) {
							try {
								const result = await rollPerceptionCheckMutation.mutateAsync({
									path: `/games/${inviteCode}/characters/${currentCharacterId}/perception-check`,
								});
								setShowCommandPalette(false);
								Alert.alert('Perception Check', `Rolled: ${result.total}\n${result.breakdown || ''}`);
							} catch (error) {
								console.error('Failed to roll perception:', error);
								Alert.alert('Error', error instanceof Error ? error.message : 'Failed to roll perception');
							}
						}
					},
				},
				{
					id: 'move',
					label: 'Move',
					description: 'Click on a tile to see movement options',
					keywords: ['move', 'movement', 'walk'],
					category: 'Actions',
					action: () => {
						setShowCommandPalette(false);
						Alert.alert('Movement', 'Click on a tile to see available movement options.');
					},
				},
			);
		}

		commands.push(
			{
				id: 'open-notifications',
				label: 'Open Activity Log',
				description: 'View game activity and messages',
				keywords: ['log', 'activity', 'messages', 'notifications'],
				category: 'View',
				action: () => {
					setShowNotifications(true);
					setShowCommandPalette(false);
				},
			},
		);

		return commands;
	}, [isHost, inviteCode, isPlayerTurn, currentCharacterId, performActionMutation, endTurnMutation, rollPerceptionCheckMutation, nextTurnMutation, stopGameMutation]);

	// Determine available actions for a tile
	const getAvailableActions = useCallback(
		(x: number, y: number): { actions: PlayerAction[]; targetLabel?: string } => {
			const actions: PlayerAction[] = [];
			let targetLabel: string | undefined;

			// Check if it's player's turn or DM's turn
			const canAct = isPlayerTurn || isHost;
			if (!canAct) {
				return { actions: [] };
			}

			if (!mapState) {
				return { actions: [] };
			}

			// Prefer the active turn's token id (handles NPC turns where entityId is token.id)
			const activeEntityId = activeTurnTokenId ?? activeCharacterIdForMovement;

			if (!activeEntityId) {
				return { actions: [] };
			}

			const activeToken = mapState.tokens?.find(
				t =>
					(t.entityId === activeEntityId || t.id === activeEntityId) &&
					(t.type === 'player' || t.type === 'npc'),
			);

			if (!activeToken) {
				return { actions: [] };
			}

			const fromPos = { x: activeToken.x, y: activeToken.y };
			const toPos = { x, y };
			const majorActionAvailable = !(activeTurnForMovement?.majorActionUsed ?? false);
			const minorActionAvailable = !(activeTurnForMovement?.minorActionUsed ?? false);

			// Check what's on the tile
			const tokenOnTile = mapState.tokens?.find(t => t.x === x && t.y === y);
			const isOwnTile = activeToken.x === x && activeToken.y === y;

			// If clicking on own tile, only allow movement if there's a path
			if (isOwnTile) {
				return { actions: [] };
			}

			// Check if tile is empty
			if (!tokenOnTile) {
				// Empty tile - check if movement is possible
				const reachable = calculateMovementRange(mapState, fromPos, movementBudget);
				const isReachable = reachable.some(tile => tile.x === x && tile.y === y);
				if (isReachable && movementBudget > 0) {
					actions.push('move');
				}
				return { actions, targetLabel: 'Empty Tile' };
			}

			// There's a token on the tile
			targetLabel = tokenOnTile.label || 'Target';

			// Check distance
			const distance = Math.abs(fromPos.x - toPos.x) + Math.abs(fromPos.y - toPos.y);
			const inMelee = isInMeleeRange(fromPos, toPos);
			const inRanged = isInRangedRange(fromPos, toPos, 5); // Default ranged range

			// Object tokens (traps, fires, doors, chests, items)
			if (tokenOnTile.type === 'object') {
				const itemType = (tokenOnTile.metadata as { itemType?: string })?.itemType;

				if (itemType === 'trap' || itemType === 'fire') {
					if (inMelee) {
						actions.push('disarm');
					}
					actions.push('inspect');
				} else if (itemType === 'door') {
					if (inMelee) {
						actions.push('open');
					}
					actions.push('inspect');
				} else if (itemType === 'chest') {
					if (inMelee) {
						actions.push('open');
					}
					actions.push('inspect');
				} else {
					// Generic item
					if (inMelee) {
						actions.push('pick_up');
					}
					actions.push('inspect');
				}
				return { actions, targetLabel };
			}

			// NPC or Player token
			if (tokenOnTile.type === 'npc' || tokenOnTile.type === 'player') {
				// Talk is always available if in range (adjacent or same tile)
				if (distance <= 1) {
					actions.push('talk');
				}

				// Inspect is always available
				actions.push('inspect');

				// Combat actions if in range
				if ((inMelee || inRanged) && majorActionAvailable) {
					actions.push('cast_spell');
					actions.push('basic_attack');
				}
				// Use Item - check if character has items (simplified for now)
				if (minorActionAvailable && activeCharacter) {
					actions.push('use_item');
				}
			}

			return { actions, targetLabel };
		},
		[
			isPlayerTurn,
			isHost,
			activeCharacterIdForMovement,
			activeTurnTokenId,
			mapState,
			movementBudget,
			activeTurnForMovement,
			activeCharacter,
		],
	);

	const handleTokenPress = useCallback(
		(token: MapToken) => {
			if (!mapState) return;

			const actingCharacterId = hostActingAsActiveCharacter
				? gameState?.activeTurn?.entityId
				: currentCharacterId;

			if (!isHost || hostActingAsActiveCharacter) {
				const isOwnToken = token.type === 'player' && token.entityId === actingCharacterId;

				if (isOwnToken) {
					if (selectedTokenId === token.id && selectedTokenMovementRange.length > 0) {
						setSelectedTokenId(null);
						setSelectedTokenMovementRange([]);
						return;
					}

					const character = effectiveGameState?.characters.find(c => c.id === actingCharacterId);
					const personalMovementBudget = character ? getCharacterSpeed(character) : DEFAULT_RACE_SPEED;
					const reachable = calculateMovementRange(mapState, { x: token.x, y: token.y }, personalMovementBudget);
					setSelectedTokenId(token.id);
					setSelectedTokenMovementRange(reachable);
				} else {
					const isActingCharacterTurn = isPlayerTurn || hostActingAsActiveCharacter;
					if (!isActingCharacterTurn) {
						Alert.alert('Not your turn', 'Wait for your turn to perform actions.');
						return;
					}

					const { actions, targetLabel } = getAvailableActions(token.x, token.y);
					if (actions.length > 0) {
						setPlayerActionMenu({ x: token.x, y: token.y, actions, targetLabel: targetLabel || token.label });
					}
				}
				return;
			}

			if (selectedTokenId === token.id && selectedTokenMovementRange.length > 0) {
				setSelectedTokenId(null);
				setSelectedTokenMovementRange([]);
				return;
			}

			let movementBudget = DEFAULT_RACE_SPEED; // Default movement budget
			const tokenPosition = { x: token.x, y: token.y };

			if (token.type === 'player' && token.entityId) {
				const character = effectiveGameState?.characters.find(c => c.id === token.entityId);
				if (character) {
					movementBudget = getCharacterSpeed(character);
				}
			} else if (token.type === 'npc') {
				movementBudget = DEFAULT_RACE_SPEED;
			}

			const reachable = calculateMovementRange(mapState, tokenPosition, movementBudget);
			setSelectedTokenId(token.id);
			setSelectedTokenMovementRange(reachable);
		},
		[
			mapState,
			effectiveGameState?.characters,
			effectiveGameState?.activeTurn?.entityId,
			selectedTokenId,
			selectedTokenMovementRange,
			isHost,
			hostActingAsActiveCharacter,
			currentCharacterId,
			isPlayerTurn,
			getAvailableActions,
		],
	);

	const handleTokenLongPress = useCallback(
		(token: MapToken) => {
			// Only show token detail modal on long press for host
			if (isHost) {
				setSelectedToken(token);
				setShowTokenModal(true);
			}
		},
		[isHost],
	);


	const handleTokenDamage = useCallback(
		async (amount: number) => {
			if (!selectedToken?.entityId || !inviteCode) return;
			try {
				await dealDamageMutation.mutateAsync({
					path: `/games/${inviteCode}/characters/${selectedToken.entityId}/damage`,
					body: { amount },
				});
			} catch (error) {
				console.error('Failed to deal damage:', error);
				Alert.alert('Error', 'Failed to deal damage');
			}
		},
		[selectedToken, inviteCode, dealDamageMutation],
	);

	const handleTokenHeal = useCallback(
		async (amount: number) => {
			if (!selectedToken?.entityId || !inviteCode) return;
			try {
				await healCharacterMutation.mutateAsync({
					path: `/games/${inviteCode}/characters/${selectedToken.entityId}/heal`,
					body: { amount },
				});
			} catch (error) {
				console.error('Failed to heal:', error);
				Alert.alert('Error', 'Failed to heal character');
			}
		},
		[selectedToken, inviteCode, healCharacterMutation],
	);

	const handleCharacterDamage = useCallback(
		async (characterId: string, amount: number) => {
			if (!inviteCode) return;
			try {
				console.log('[Damage] Dealing damage:', { characterId, amount, inviteCode });
				const result = await dealDamageMutation.mutateAsync({
					path: `/games/${inviteCode}/characters/${characterId}/damage`,
					body: { amount },
				});
				console.log('[Damage] Mutation successful:', result);

				// Optimistically update local game state if we have the updated character
				if (result?.character && gameState) {
					const updatedCharacters = gameState.characters.map(c =>
						c.id === characterId ? result.character! : c,
					);
					setGameState({
						...gameState,
						characters: updatedCharacters,
					});
				}

				// Force immediate refetch of game state to ensure consistency
				if (refreshGameState) {
					await refreshGameState();
				}
			} catch (error) {
				console.error('[Damage] Failed to deal damage:', error);
				Alert.alert('Error', `Failed to deal damage: ${error instanceof Error ? error.message : 'Unknown error'}`);
				throw error; // Re-throw so modal can handle it
			}
		},
		[inviteCode, dealDamageMutation, refreshGameState, gameState],
	);

	const handleCharacterHeal = useCallback(
		async (characterId: string, amount: number) => {
			if (!inviteCode) return;
			try {
				console.log('[Heal] Healing character:', { characterId, amount, inviteCode });
				const result = await healCharacterMutation.mutateAsync({
					path: `/games/${inviteCode}/characters/${characterId}/heal`,
					body: { amount },
				});
				console.log('[Heal] Mutation successful:', result);

				// Optimistically update local game state if we have the updated character
				if (result?.character && gameState) {
					const updatedCharacters = gameState.characters.map(c =>
						c.id === characterId ? result.character! : c,
					);
					setGameState({
						...gameState,
						characters: updatedCharacters,
					});
				}

				// Force immediate refetch of game state to ensure consistency
				if (refreshGameState) {
					await refreshGameState();
				}
			} catch (error) {
				console.error('[Heal] Failed to heal:', error);
				Alert.alert('Error', `Failed to heal character: ${error instanceof Error ? error.message : 'Unknown error'}`);
				throw error; // Re-throw so modal can handle it
			}
		},
		[inviteCode, healCharacterMutation, refreshGameState, gameState],
	);

	const handleCharacterSelect = useCallback(
		async (characterId: string, type: 'player' | 'npc') => {
			if (!isHost) return;
			setSelectedCharacterForDM({ id: characterId, type });

			// If it's an NPC, fetch the NPC definition to get stats
			if (type === 'npc' && inviteCode) {
				try {
					const token = mapState?.tokens.find(t => t.id === characterId);
					if (token?.entityId) {
						// For NPCs, entityId should be the npc_id (from convertTokens: token.npc_id)
						const npcId = token.entityId;
						// Use query hook for NPC definition - would need to be called with useNpcDefinition hook
						// TODO: Use useNpcDefinition hook for proper NPC definition lookup
						// For now, skip stats extraction since we don't have the NPC definition
						const npcDef: NpcDefinition | null = null;
						// Type assertion needed because TypeScript knows npcDef is always null at compile time
						const checkedNpcDef = npcDef as NpcDefinition | null;
						if (checkedNpcDef !== null && 'stats' in checkedNpcDef && checkedNpcDef.stats) {
							// Stats is a Record<string, unknown>, extract the stat values
							const stats = checkedNpcDef.stats as Record<string, unknown>;
							setNpcStats({
								STR: (typeof stats.STR === 'number' ? stats.STR : 10) as number,
								DEX: (typeof stats.DEX === 'number' ? stats.DEX : 10) as number,
								CON: (typeof stats.CON === 'number' ? stats.CON : 10) as number,
								INT: (typeof stats.INT === 'number' ? stats.INT : 10) as number,
								WIS: (typeof stats.WIS === 'number' ? stats.WIS : 10) as number,
								CHA: (typeof stats.CHA === 'number' ? stats.CHA : 10) as number,
							});
						} else {
							setNpcStats(undefined);
						}
					} else {
						setNpcStats(undefined);
					}
				} catch (error) {
					console.error('Failed to fetch NPC stats:', error);
					setNpcStats(undefined);
				}
			} else {
				setNpcStats(undefined);
			}

			setShowCharacterDMModal(true);
		},
		[isHost, inviteCode, mapState],
	);

	const handleUpdateCharacter = useCallback(
		async (characterId: string, updates: Partial<Character>) => {
			if (!inviteCode) return;
			try {
				console.log('[handleUpdateCharacter] Updating:', { characterId, updates });
				// Use DMAction to update character - flatten the structure
				await handleDMAction('update_character', {
					characterId,
					...updates,
				});
				// Game state will refresh automatically via query invalidation
			} catch (error) {
				console.error('Failed to update character:', error);
				Alert.alert('Error', 'Failed to update character');
			}
		},
		[inviteCode, handleDMAction, submitDMActionMutation],
	);

	const handleTileLongPress = useCallback(
		(x: number, y: number) => {
			if (isHost && isMapEditMode) {
				setTileActionMenu({ x, y });
			}
		},
		[isHost, isMapEditMode],
	);

	const handleTileRightPress = useCallback(
		(x: number, y: number) => {
			if (isHost) {
				setTileDetails({ x, y });
			}
		},
		[isHost],
	);

	const handleTileAction = useCallback(
		async (action: TileAction, x: number, y: number) => {
			if (!inviteCode || !mapState) return;

			try {
				switch (action) {
					case 'changeTerrain':
					case 'placeWater':
					case 'placeRoad':
					case 'clearTile': {
						const terrainType = action === 'placeWater' ? 'water' : action === 'placeRoad' ? 'road' : action === 'clearTile' ? 'grass' : 'stone';
						await mutateTerrainMutation.mutateAsync({
							path: `/games/${inviteCode}/map/terrain`,
							body: {
								tiles: [
									{
										x,
										y,
										terrainType,
									},
								],
							},
						});
						break;
					}
					case 'placeNpc':
					case 'placePlayer':
						// These are handled via drag-and-drop from palette
						break;
				}
			} catch (error) {
				console.error('Failed to perform tile action:', error);
				Alert.alert('Error', 'Failed to modify terrain');
			}
		},
		[inviteCode, mapState, mutateTerrainMutation],
	);

	const handlePlaceItemToken = useCallback(
		(x: number, y: number) => {
			if (!inviteCode || !selectedItemType) return;

			const placeItem = async () => {
				try {
					const itemLabels: Record<string, string> = {
						fire: '🔥 Fire',
						trap: '⚠️ Trap',
						obstacle: '🪨 Obstacle',
					};

					await saveMapTokenMutation.mutateAsync({
						path: `/games/${inviteCode}/map/tokens`,
						body: {
							tokenType: 'object',
							x,
							y,
							label: itemLabels[selectedItemType] || 'Item',
							metadata: { itemType: selectedItemType },
							overrideValidation: true,
						},
					});
					setSelectedItemType(null);
				} catch (error) {
					console.error('Failed to place item token:', error);
					Alert.alert('Error', 'Failed to place item');
				}
			};

			placeItem();
		},
		[inviteCode, selectedItemType, saveMapTokenMutation],
	);

	// Handle tile press - show action menu
	const handlePlayerTilePress = useCallback(
		(x: number, y: number) => {
			console.log('[TilePress] Tile clicked:', { x, y, movementInFlight, isHost, isMapEditMode, isPlayerTurn });

			// Skip if movement is in flight
			if (movementInFlight) {
				console.log('[TilePress] Movement in flight, skipping');
				return;
			}

			// Skip if in edit mode or placement modes
			if (isHost && isMapEditMode) {
				console.log('[TilePress] In edit mode, skipping');
				return;
			}
			if (npcPlacementMode && isHost) {
				console.log('[TilePress] In NPC placement mode, skipping');
				return;
			}
			if (elementPlacementMode && isHost) {
				console.log('[TilePress] In element placement mode, skipping');
				return;
			}
			if (isHost && isMapEditMode && selectedItemType) {
				console.log('[TilePress] Item placement mode, skipping');
				return;
			}

			// Check if it's player's turn or DM's turn
			if (!isPlayerTurn && !isHost) {
				console.log('[TilePress] Not player turn and not host');
				Alert.alert('Not your turn', 'Wait for your turn to perform actions.');
				return;
			}

			// Get available actions
			const { actions, targetLabel } = getAvailableActions(x, y);
			console.log('[TilePress] Available actions:', { actions, targetLabel });

			if (actions.length === 0) {
				console.log('[TilePress] No actions available');
				return;
			}

			// Show action menu
			console.log('[TilePress] Showing action menu');
			setPlayerActionMenu({ x, y, actions, targetLabel });
		},
		[movementInFlight, isHost, isMapEditMode, npcPlacementMode, elementPlacementMode, selectedItemType, isPlayerTurn, getAvailableActions],
	);

	// Handle player action execution
	const updateTurnUsage = useCallback(
		async (
			update: { movementUsed?: number; majorActionUsed?: boolean; minorActionUsed?: boolean },
			actorEntityId?: string | null,
		) => {
			if (!inviteCode) {
				return;
			}
			const entityId = actorEntityId ?? effectiveGameState?.activeTurn?.entityId;
			if (!entityId) {
				return;
			}

			try {
				// Optimistic update: update local state immediately
				if (effectiveGameState?.activeTurn && effectiveGameState.activeTurn.entityId === entityId) {
					setGameState({
						...effectiveGameState,
						activeTurn: {
							...effectiveGameState.activeTurn,
							movementUsed: update.movementUsed ?? effectiveGameState.activeTurn.movementUsed ?? 0,
							majorActionUsed: update.majorActionUsed ?? effectiveGameState.activeTurn.majorActionUsed ?? false,
							minorActionUsed: update.minorActionUsed ?? effectiveGameState.activeTurn.minorActionUsed ?? false,
						},
					});
				}

				await updateTurnStateMutation.mutateAsync({
					path: `/games/${inviteCode}/turn/update`,
					body: {
						...update,
						actorEntityId: entityId,
					},
				});

				// Immediately refetch game state to ensure consistency
				if (refreshGameState) {
					await refreshGameState();
				}
			} catch (error) {
				console.error('Failed to update turn state usage:', error);
				// Revert optimistic update on error
				if (polledState) {
					setGameState(polledState);
				}
			}
		},
		[inviteCode, effectiveGameState, updateTurnStateMutation, refreshGameState, polledState],
	);

	const handleMovementRangeTilePress = useCallback(
		async (x: number, y: number) => {
			// Handle clicking on a movement range tile to move the selected token
			if (!selectedTokenId || !mapState || !inviteCode) {
				console.log('Movement blocked: missing requirements', { selectedTokenId, mapLoaded: !!mapState, inviteCode });
				return;
			}

			const selectedToken = mapState.tokens?.find(t => t.id === selectedTokenId);
			if (!selectedToken) {
				console.log('Movement blocked: token not found', selectedTokenId);
				return;
			}

			// Check if clicked tile is in movement range
			const isInRange = selectedTokenMovementRange.some(tile => tile.x === x && tile.y === y);
			if (!isInRange) {
				// Clear selection if clicking outside range
				console.log('Movement blocked: tile not in range', { x, y, range: selectedTokenMovementRange.length });
				setSelectedTokenId(null);
				setSelectedTokenMovementRange([]);
				return;
			}

			// Don't move if clicking the same tile
			if (selectedToken.x === x && selectedToken.y === y) {
				console.log('Movement blocked: same tile');
				return;
			}

			// Move the token
			try {
				const response = await moveTokenMutation.mutateAsync({
					path: `/games/${inviteCode}/map/move`,
					body: {
						tokenId: selectedToken.id,
						x,
						y,
						overrideValidation: isHost,
					},
				});

				if (response?.gameState) {
					setGameState(response.gameState);
					const updatedTokens = response.gameState.mapState?.tokens;
					if (updatedTokens) {
						updateCachedTokens(() => updatedTokens);
					}
				}

				// Clear selection after move (immediate UI feedback)
				setSelectedTokenId(null);
				setSelectedTokenMovementRange([]);

				// Wait half a second and then refresh the game state
				setTimeout(() => {
					refreshGameState();
				}, 500);
			} catch (error) {
				console.error('Failed to move token:', error);
				Alert.alert('Error', 'Failed to move token');
			}
		},
		[selectedTokenId, mapState, inviteCode, selectedTokenMovementRange, isHost, moveTokenMutation, updateCachedTokens],
	);

	const formatMovementValue = useCallback((value: number) => {
		return Math.abs(value - Math.round(value)) < 0.01 ? Math.round(value).toString() : value.toFixed(1);
	}, []);

	const getActionTargetAt = useCallback(
		(xCoord: number, yCoord: number) => {
			const targetToken = mapState?.tokens?.find(
				token =>
					token.x === xCoord &&
					token.y === yCoord &&
					(token.type === 'player' || token.type === 'npc'),
			);

			if (!targetToken) {
				return null;
			}

			if (targetToken.type === 'player') {
				const characterId = typeof targetToken.entityId === 'string' ? targetToken.entityId : null;
				if (!characterId) {
					return null;
				}
				return {
					targetId: characterId,
					label: targetToken.label || 'Target',
				};
			}

			return {
				targetId: targetToken.id,
				label: targetToken.label || 'Target',
			};
		},
		[mapState?.tokens],
	);

	const presentCombatResult = useCallback((result?: CharacterActionResult | null) => {
		if (!result) {
			return;
		}
		setCombatResult(result);
		setShowCombatResult(true);
	}, []);

	const handlePlayerAction = useCallback(
		async (action: PlayerAction, x: number, y: number) => {
			if (!inviteCode || !mapState) return;

			// For DM: can act on any turn (player, NPC, or DM turn) unless paused
			// For players: can only act on their own turn
			// Use effectiveGameState to get the latest turn data from query
			const activeCharacterId = isPlayerTurn
				? (isHost && effectiveGameState?.activeTurn?.entityId ? effectiveGameState.activeTurn.entityId : currentCharacterId)
				: (isHost && !effectiveGameState?.pausedTurn && effectiveGameState?.activeTurn?.entityId ? effectiveGameState.activeTurn.entityId : null);

			console.log('[Movement] Active character check:', {
				isPlayerTurn,
				isHost,
				currentCharacterId,
				activeTurnEntityId: effectiveGameState?.activeTurn?.entityId,
				activeCharacterId,
				activeTurnType: effectiveGameState?.activeTurn?.type,
				pausedTurn: effectiveGameState?.pausedTurn,
			});

			if (!activeCharacterId) {
				Alert.alert('Error', 'No active character found');
				return;
			}

			const activeEntityId = activeTurnTokenId ?? activeCharacterId;
			const activeToken = mapState.tokens?.find(
				t =>
					(t.entityId === activeEntityId || t.id === activeEntityId) &&
					(t.type === 'player' || t.type === 'npc'),
			);

			if (!activeToken) {
				Alert.alert('Error', 'No active token found');
				return;
			}

			// Use effectiveGameState to get the latest movement data from query
			const activeTurnForEntity = effectiveGameState?.activeTurn?.entityId === activeEntityId ? effectiveGameState.activeTurn : null;
			const totalMovementSpeed = totalMovementSpeedForActive;
			const movementUsed = activeTurnForEntity?.movementUsed ?? 0;
			const remainingMovement = Math.max(0, totalMovementSpeed - movementUsed);
			const majorActionAvailable = !(activeTurnForEntity?.majorActionUsed ?? false);
			const minorActionAvailable = !(activeTurnForEntity?.minorActionUsed ?? false);

			try {
				switch (action) {
					case 'move': {
						console.log('[Movement] Starting move action', {
							from: { x: activeToken.x, y: activeToken.y },
							to: { x, y },
							activeCharacterId,
							tokenType: activeToken.type,
							tokenId: activeToken.id,
						});

						setMovementInFlight(true);
						try {
							const response = await moveTokenMutation.mutateAsync({
								path: `/games/${inviteCode}/map/move`,
								body: {
									tokenId: activeToken.id,
									x,
									y,
									overrideValidation: isHost,
								},
							});

							if (response?.gameState) {
								setGameState(response.gameState);
								const updatedTokens = response.gameState.mapState?.tokens;
								if (updatedTokens) {
									updateCachedTokens(() => updatedTokens);
								}
							}

							// For non-host players, backend updates movementUsed, but keep local state cumulative for UI responsiveness
							if (!isHost && activeToken.type === 'player') {
								setGameState(prev => {
									if (!prev?.activeTurn) return prev;
									const matchesEntity = prev.activeTurn.entityId === activeToken.entityId || prev.activeTurn.entityId === activeToken.id;
									if (!matchesEntity) return prev;
									const currentUsed = prev.activeTurn.movementUsed ?? 0;
									const moveCost = response?.cost ?? 0;
									const updatedUsed = Math.min(totalMovementSpeed, currentUsed + moveCost);
									return {
										...prev,
										activeTurn: {
											...prev.activeTurn,
											movementUsed: updatedUsed,
										},
									};
								});
							}

							setPathPreview(null);
							setSelectedTokenId(null);
							setSelectedTokenMovementRange([]);
						} catch (error) {
							console.error('[Movement] Unexpected error:', error);
							Alert.alert('Movement failed', error instanceof Error ? error.message : 'Could not move token');
						} finally {
							setMovementInFlight(false);
							console.log('[Movement] Movement handler finished');
							// Wait half a second and then refresh the game state
							setTimeout(() => {
								console.log('[Movement] Refreshing game state');
								refreshGameState();
							}, 500);
						}
						break;
					}
					case 'talk': {
						// Open chat/dialogue - for now just show an alert
						const targetToken = mapState.tokens?.find(t => t.x === x && t.y === y);
						Alert.alert('Talk', `Initiating conversation with ${targetToken?.label || 'target'}`);
						// TODO: Open chat interface
						break;
					}
					case 'inspect': {
						// Trigger perception check
						if (activeCharacterId) {
							try {
								const result = await rollPerceptionCheckMutation.mutateAsync({
									path: `/games/${inviteCode}/characters/${activeCharacterId}/perception-check`,
								});
								const breakdown = result.breakdown ? `\n${result.breakdown}` : '';
								const dcSummary =
									typeof result.dc === 'number'
										? `\nDC ${result.dc} • ${result.success ? 'Success' : 'Failed'}`
										: '';
								Alert.alert(
									'Perception Check',
									`${result.mode === 'passive' ? 'Passive' : 'Active'}: ${result.total}${breakdown}${dcSummary}`,
								);
							} catch (error) {
								console.error('Failed to roll perception:', error);
								Alert.alert('Error', error instanceof Error ? error.message : 'Failed to roll perception');
							}
						}
						break;
					}
					case 'cast_spell': {
						if (!majorActionAvailable) {
							Alert.alert('Major Action Used', 'You have already used your major action this turn.');
							break;
						}
						const targetInfo = getActionTargetAt(x, y);
						if (!targetInfo) {
							Alert.alert('No Target', 'Select a target tile before casting a spell.');
							break;
						}
						setPendingActionTarget(targetInfo);
						setSelectedCharacterForAction(activeCharacterId);
						setShowSpellActionSelector(true);
						break;
					}
					case 'basic_attack': {
						if (!majorActionAvailable) {
							Alert.alert('Major Action Used', 'You have already used your major action this turn.');
							break;
						}
						const targetInfo = getActionTargetAt(x, y);
						if (!targetInfo) {
							Alert.alert('No Target', 'Select a target to attack.');
							break;
						}
						if (activeCharacterId) {
							try {
								const response = await performActionMutation.mutateAsync({
									path: `/games/${inviteCode}/characters/${activeCharacterId}/actions`,
									body: {
										actionType: 'basic_attack',
										targetId: targetInfo.targetId,
									},
								});
								if (response.actionResult) {
									presentCombatResult(response.actionResult);
								}
								await updateTurnUsage({ majorActionUsed: true }, activeCharacterId);
							} catch (error) {
								console.error('Failed to perform attack:', error);
								Alert.alert('Error', error instanceof Error ? error.message : 'Failed to perform attack');
							}
						}
						break;
					}
					case 'use_item': {
						if (!minorActionAvailable) {
							Alert.alert('Minor Action Used', 'You have already used your minor action this turn.');
							break;
						}
						// Open item selector
						Alert.alert('Use Item', 'Item selection coming soon');
						await updateTurnUsage({ minorActionUsed: true }, activeCharacterId);
						break;
					}
					case 'disarm': {
						// Disarm trap/fire
						Alert.alert('Disarm', 'Disarming trap/fire...');
						// TODO: Implement disarm action
						break;
					}
					case 'open': {
						// Open door/chest
						Alert.alert('Open', 'Opening...');
						// TODO: Implement open action
						break;
					}
					case 'pick_up': {
						// Pick up item
						Alert.alert('Pick Up', 'Picking up item...');
						// TODO: Implement pick up action
						break;
					}
				}
			} catch (error) {
				console.error('Failed to perform action:', error);
				Alert.alert('Error', error instanceof Error ? error.message : 'Failed to perform action');
			} finally {
				setMovementInFlight(false);
			}
		},
		[
			inviteCode,
			mapState,
			isPlayerTurn,
			isHost,
			currentCharacterId,
			gameState,
			updateTurnUsage,
			totalMovementSpeedForActive,
			activeTurnTokenId,
			getActionTargetAt,
			presentCombatResult,
			performActionMutation,
			moveTokenMutation,
			updateCachedTokens,
		],
	);


	if (!gameState) {
		return (
			<ThemedView style={styles.container}>
				<Stack.Screen options={{ title: 'Loading...' }} />
				<ThemedText>Loading game...</ThemedText>
			</ThemedView>
		);
	}

	const renderMapSection = () => (
		<ScrollView
			style={styles.mapScrollContainer}
			contentContainerStyle={styles.mapScrollContent}
			showsVerticalScrollIndicator={true}
			showsHorizontalScrollIndicator={true}
		>
			<View style={styles.mapContainer}>
				{gameState?.pausedTurn && (
					<View style={styles.pausedIndicator}>
						<ThemedText style={styles.pausedText}>⏸️ Turn Paused - DM Action</ThemedText>
					</View>
				)}
				{isHost && isMapEditMode && (
					<View style={styles.editModeIndicator}>
						<ThemedText style={styles.editModeText}>✏️ Edit Mode Active - Drag tokens or long-press tiles</ThemedText>
					</View>
				)}
				{!isPlayerTurn && !isHost && currentTurnName && !gameState?.pausedTurn && (
					<ThemedText style={styles.mapHint}>Waiting for your turn... (Current: {currentTurnName})</ThemedText>
				)}
				{selectedTokenId && (
					<ThemedText style={styles.mapHint}>
						Showing movement range for selected token. Click another token to see its range.
					</ThemedText>
				)}
				{elementPlacementMode && isHost && (
					<ThemedText style={styles.mapHint}>
						Tap on the map to place {elementPlacementMode}. Tap the element picker again to cancel.
					</ThemedText>
				)}
				{npcPlacementMode && isHost && (
					<View style={styles.placementHintContainer}>
						<ThemedText style={styles.mapHint}>
							Click to place the {npcPlacementMode.npcName}
						</ThemedText>
						<TouchableOpacity
							style={styles.cancelPlacementButton}
							onPress={() => {
								setNpcPlacementMode(null);
							}}
						>
							<ThemedText style={styles.cancelPlacementButtonText}>Cancel</ThemedText>
						</TouchableOpacity>
					</View>
				)}
				{mapState ? (
					<InteractiveMap
						map={mapState}
						isEditable={isHost && isMapEditMode}
						isHost={isHost}
						// Allow token dragging for hosts during gameplay (not just edit mode)
						onTokenDragEnd={isHost ? async (token, x, y) => {
							try {
								// Skip if invalid coordinates (deletion case)
								if (x === -1 && y === -1) {
									return;
								}

								// For NPCs, we need to pass npcId instead of characterId
								// Optimistic update: update local state immediately
								applyTokenPositionUpdates([{ id: token.id, x, y }]);

								// Save to backend asynchronously
								moveTokenMutation.mutateAsync({
									path: `/games/${inviteCode}/map/move`,
									body: {
										tokenId: token.id,
										x,
										y,
										overrideValidation: true,
									},
								}).then((response) => {
									if (response?.gameState) {
										setGameState(response.gameState);
										const updatedTokens = response.gameState.mapState?.tokens;
										if (updatedTokens) {
											updateCachedTokens(() => updatedTokens);
										}
									}
								}).catch((error: any) => {
									console.error('Failed to save token movement:', error);
									// Revert optimistic update on error
									applyTokenPositionUpdates([{ id: token.id, x: token.x, y: token.y }]);
									Alert.alert('Error', 'Failed to save movement. Changes reverted.');
								});

								// Refresh map state in background (non-blocking)
								// Map state will refresh automatically via query invalidation
							} catch (error) {
								console.error('Failed to move token:', error);
								Alert.alert('Error', 'Failed to move token');
							}
						} : undefined}
						// Highlight the token whose turn it is; fall back to the player's own token
						highlightTokenId={activeTurnTokenId ?? playerToken?.id ?? currentCharacterId ?? undefined}
						onTilePress={
							npcPlacementMode && isHost
								? async (x, y) => {
									if (!inviteCode || !mapState || !npcPlacementMode) return;
									try {
										// Count how many NPCs of this type already exist to create unique label
										const existingNpcsOfType = (mapState.tokens || []).filter(
											token => token.type === 'npc' && token.label?.startsWith(npcPlacementMode.npcName),
										);
										const count = existingNpcsOfType.length;
										const uniqueLabel = count > 0 ? `${npcPlacementMode.npcName} ${count + 1}` : npcPlacementMode.npcName;

										const result = await placeNpcMutation.mutateAsync({
											path: `/games/${inviteCode}/npcs`,
											body: {
												npcId: npcPlacementMode.npcId,
												x,
												y,
												label: uniqueLabel,
											},
										});

										// Optimistically update map cache with the new NPC token list
										if (result?.tokens) {
											updateCachedTokens(() => result.tokens);
										}

										setNpcPlacementMode(null);
										Alert.alert('Success', `${uniqueLabel} placed on map and added to character list`);
									} catch (error) {
										console.error('Failed to place NPC:', error);
										Alert.alert('Error', error instanceof Error ? error.message : 'Failed to place NPC');
									}
								}
								: elementPlacementMode && isHost
									? async (x, y) => {
										if (!inviteCode || !mapState) return;
										try {
											await saveMapTokenMutation.mutateAsync({
												path: `/games/${inviteCode}/map/tokens`,
												body: {
													tokenType: 'object',
													x,
													y,
													label: elementPlacementMode === 'fire' ? '🔥 Fire' : '🪨 Obstacle',
													metadata: { itemType: elementPlacementMode },
													overrideValidation: true,
												},
											});
											setElementPlacementMode(null);
											Alert.alert('Success', `${elementPlacementMode} placed on map`);
										} catch (error) {
											console.error('Failed to place element:', error);
											Alert.alert('Error', 'Failed to place map element');
										}
									}
									: isHost && isMapEditMode && selectedItemType
										? handlePlaceItemToken
										: selectedTokenId
											? handleMovementRangeTilePress
											: handlePlayerTilePress
						}
						onTileLongPress={isHost && isMapEditMode ? handleTileLongPress : undefined}
						onTileRightPress={isHost ? handleTileRightPress : undefined}
						onTokenPress={handleTokenPress}
						onTokenLongPress={handleTokenLongPress}
						reachableTiles={selectedTokenId ? selectedTokenMovementRange : movementRange}
						pathTiles={pathPreview?.path}
					/>
				) : (
					<ThemedText style={styles.mapHint}>Waiting for the DM to configure a map.</ThemedText>
				)}
				{isHost && isMapEditMode && (
					<View style={styles.itemPalette}>
						<ThemedText style={styles.itemPaletteTitle}>Place Items</ThemedText>
						<View style={styles.itemPaletteButtons}>
							<TouchableOpacity
								style={[styles.itemButton, selectedItemType === 'fire' && styles.itemButtonSelected]}
								onPress={() => setSelectedItemType(selectedItemType === 'fire' ? null : 'fire')}
							>
								<ThemedText style={styles.itemButtonText}>🔥 Fire</ThemedText>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.itemButton, selectedItemType === 'trap' && styles.itemButtonSelected]}
								onPress={() => setSelectedItemType(selectedItemType === 'trap' ? null : 'trap')}
							>
								<ThemedText style={styles.itemButtonText}>⚠️ Trap</ThemedText>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.itemButton, selectedItemType === 'obstacle' && styles.itemButtonSelected]}
								onPress={() => setSelectedItemType(selectedItemType === 'obstacle' ? null : 'obstacle')}
							>
								<ThemedText style={styles.itemButtonText}>🪨 Obstacle</ThemedText>
							</TouchableOpacity>
						</View>
						{selectedItemType && (
							<ThemedText style={styles.itemPaletteHint}>
								Tap a tile to place {selectedItemType}
							</ThemedText>
						)}
					</View>
				)}
			</View>
		</ScrollView>
	);


	return (
		<ThemedView style={styles.container}>
			<Stack.Screen
				options={{
					title: gameState.quest.name,
					headerShown: true,
				}}
			/>

			<CombatResultModal
				visible={showCombatResult && !!combatResult}
				result={combatResult}
				onClose={() => {
					setShowCombatResult(false);
					setCombatResult(null);
				}}
			/>
			<View style={styles.statusBar}>
				<ConnectionStatusIndicator onGameStateUpdate={handleGameStateUpdate} />
				<View style={styles.statusRight}>
					{currentTurnName && (
						<ThemedText style={styles.turnIndicator}>
							{isPlayerTurn && !isHost ? '🟢 Your Turn' : `🟢 ${currentTurnName}'s Turn`}
						</ThemedText>
					)}
					{__DEV__ && gameState?.activeTurn && (
						<ThemedText style={[styles.turnIndicator, { fontSize: 10, opacity: 0.7 }]}>
							[Debug: {gameState.activeTurn.type} {gameState.activeTurn.entityId?.slice(-4)} vs {currentCharacterId?.slice(-4)}]
						</ThemedText>
					)}
					<TouchableOpacity
						style={styles.notificationButton}
						onPress={() => setShowNotifications(true)}
					>
						<ThemedText style={styles.notificationButtonText}>📋</ThemedText>
						{unreadMessageCount > 0 && (
							<View style={styles.notificationBadge}>
								<ThemedText style={styles.notificationBadgeText}>
									{unreadMessageCount > 99 ? '99+' : unreadMessageCount}
								</ThemedText>
							</View>
						)}
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.commandButton}
						onPress={() => setShowCommandPalette(true)}
					>
						<ThemedText style={styles.commandButtonText}>
							{Platform.OS === 'web' ? '⌘K' : '⚡'}
						</ThemedText>
					</TouchableOpacity>
					{isPlayerTurn && (
						<TouchableOpacity
							style={[styles.lobbyButton, styles.endTurnButton]}
							onPress={async () => {
								if (inviteCode) {
									try {
										await endTurnMutation.mutateAsync({
											path: `/games/${inviteCode}/turn/end`,
										});
										// Force immediate refetch of game state
										if (refreshGameState) {
											await refreshGameState();
										}
									} catch (error) {
										console.error('Failed to end turn:', error);
										Alert.alert('Error', 'Failed to end turn');
									}
								}
							}}
						>
							<ThemedText style={styles.lobbyButtonText}>End Turn</ThemedText>
						</TouchableOpacity>
					)}
					{isHost && (
						<>
							{gameState?.pausedTurn && (
								<TouchableOpacity
									style={[styles.lobbyButton, styles.resumeButton]}
									onPress={async () => {
										try {
											const response = await resumeTurnMutation.mutateAsync({
												path: `/games/${inviteCode}/turn/resume`,
											});
											if (response && gameState) {
												setGameState({ ...gameState, activeTurn: response.activeTurn, pausedTurn: undefined });
											}
										} catch (error) {
											console.error('Failed to resume turn:', error);
											Alert.alert('Error', 'Failed to resume turn');
										}
									}}
								>
									<ThemedText style={styles.lobbyButtonText}>Resume Turn</ThemedText>
								</TouchableOpacity>
							)}
							{gameState?.activeTurn && gameState.activeTurn.type !== 'dm' && (
								<TouchableOpacity
									style={[styles.lobbyButton, styles.interruptButton]}
									onPress={async () => {
										try {
											const response = await interruptTurnMutation.mutateAsync({
												path: `/games/${inviteCode}/turn/interrupt`,
											});
											if (response && gameState) {
												setGameState({ ...gameState, activeTurn: response.activeTurn, pausedTurn: response.pausedTurn });
											}
										} catch (error) {
											console.error('Failed to interrupt turn:', error);
											Alert.alert('Error', 'Failed to interrupt turn');
										}
									}}
								>
									<ThemedText style={styles.lobbyButtonText}>DM Action</ThemedText>
								</TouchableOpacity>
							)}
							<TouchableOpacity
								style={[styles.lobbyButton, isMapEditMode && styles.editButtonActive]}
								onPress={() => setIsMapEditMode(mode => !mode)}
							>
								<ThemedText style={styles.lobbyButtonText}>
									{isMapEditMode ? 'Edit Mode: On' : 'Edit Map'}
								</ThemedText>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.lobbyButton, styles.stopButton]}
								onPress={async () => {
									if (inviteCode) {
										try {
											await stopGameMutation.mutateAsync({
												path: `/games/${inviteCode}/stop`,
											});
											router.push(`/host-game/${inviteCode}`);
										} catch (error) {
											console.error('Failed to stop game:', error);
											Alert.alert('Error', error instanceof Error ? error.message : 'Failed to stop game');
										}
									} else {
										router.push('/host-game');
									}
								}}
							>
								<ThemedText style={styles.lobbyButtonText}>End Enconter</ThemedText>
							</TouchableOpacity>
							<ThemedText style={styles.hostBadge}>Host</ThemedText>
						</>
					)}
				</View>
			</View>
			<View style={styles.content}>
				{/* Show character sheet for non-hosts when no active encounter */}
				{!isHost && !effectiveGameState?.activeTurn ? (
					<CharacterSheetModal
						visible={true}
						onClose={() => {
							// Don't allow closing - this is the main view during long rest
						}}
						allowClose={false}
					/>
				) : isMobile ? (
					// Mobile: Stacked layout
					<ScrollView
						style={styles.scrollView}
						contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
					>
						<PlayerCharacterList
							characters={effectiveGameState?.characters || []}
							currentPlayerId={currentCharacterId}
							npcTokens={mapState?.tokens?.filter(t => t.type === 'npc') || []}
							activeTurnEntityId={effectiveGameState?.activeTurn?.entityId}
							activeTurn={effectiveGameState?.activeTurn}
							onCharacterSelect={
								isHost
									? handleCharacterSelect
									: (characterId: string, type: 'player' | 'npc') => {
										setSelectedCharacterForView({ id: characterId, type });
										setShowCharacterViewModal(true);
									}
							}
							canSelect={true}
							initiativeOrder={effectiveGameState?.initiativeOrder}
						/>
						{renderMapSection()}
					</ScrollView>
				) : (
					// Tablet/Desktop: Side-by-side layout
					<View style={styles.desktopLayout}>
						<View style={styles.sidebar}>
							<PlayerCharacterList
								characters={effectiveGameState?.characters || []}
								currentPlayerId={currentCharacterId}
								npcTokens={mapState?.tokens?.filter(t => t.type === 'npc') || []}
								activeTurnEntityId={effectiveGameState?.activeTurn?.entityId}
								activeTurn={effectiveGameState?.activeTurn}
								onCharacterSelect={
									isHost
										? handleCharacterSelect
										: (characterId: string, type: 'player' | 'npc') => {
											setSelectedCharacterForView({ id: characterId, type });
											setShowCharacterViewModal(true);
										}
								}
								canSelect={true}
								initiativeOrder={effectiveGameState?.initiativeOrder}
							/>
							{isHost && charactersWithoutTokens.length > 0 && (
								<View style={styles.warningContainer}>
									<ThemedText style={styles.warningTitle}>⚠️ Characters Not Placed</ThemedText>
									<ThemedText style={styles.warningText}>
										{charactersWithoutTokens.length} character{charactersWithoutTokens.length > 1 ? 's' : ''} need to be placed on the map before the encounter can begin:
									</ThemedText>
									{charactersWithoutTokens.map(char => (
										<ThemedText key={char.id} style={styles.warningCharacter}>
											• {char.name || 'Unknown'}
										</ThemedText>
									))}
									<TouchableOpacity
										style={[styles.button, styles.autoPlaceButton, isPlacing && styles.buttonDisabled]}
										onPress={handleAutoPlaceCharacters}
										disabled={isPlacing}
									>
										<ThemedText style={styles.buttonText}>
											{isPlacing ? 'Placing...' : 'Auto Place Characters'}
										</ThemedText>
									</TouchableOpacity>
									<ThemedText style={styles.warningHint}>
										Or go to the map editor to place these characters manually.
									</ThemedText>
								</View>
							)}
						</View>
						<View style={styles.mainContent}>
							{renderMapSection()}
						</View>
					</View>
				)}
			</View>

			{/* Notifications Panel */}
			<NotificationsPanel
				messages={effectiveGameState?.messages || []}
				visible={showNotifications}
				onClose={() => setShowNotifications(false)}
				unreadCount={unreadMessageCount}
				inviteCode={inviteCode}
				isHost={isHost}
			/>

			{/* Command Palette */}
			<CommandPalette
				visible={showCommandPalette}
				onClose={() => setShowCommandPalette(false)}
				commands={commandPaletteCommands}
				onAIRequest={handleAIRequest}
			/>

			{/* Token Detail Modal */}
			<TokenDetailModal
				visible={showTokenModal}
				token={selectedToken}
				onClose={() => {
					setShowTokenModal(false);
					setSelectedToken(null);
				}}
				onDamage={isHost && selectedToken?.entityId ? handleTokenDamage : undefined}
				onHeal={isHost && selectedToken?.entityId ? handleTokenHeal : undefined}
				onDelete={isHost ? async () => {
					if (selectedToken?.id && inviteCode) {
						try {
							await deleteMapTokenMutation.mutateAsync({
								path: `/games/${inviteCode}/map/tokens/${selectedToken.id}`,
							});
							setShowTokenModal(false);
							setSelectedToken(null);
						} catch (error) {
							console.error('Failed to delete token:', error);
							Alert.alert('Error', 'Failed to delete token');
						}
					}
				} : undefined}
				canEdit={isHost}
			/>

			{/* Tile Action Menu */}
			{tileActionMenu && (
				<TileActionMenu
					visible={!!tileActionMenu}
					x={tileActionMenu.x}
					y={tileActionMenu.y}
					availableActions={['changeTerrain', 'placeWater', 'placeRoad', 'clearTile']}
					onAction={handleTileAction}
					onClose={() => setTileActionMenu(null)}
				/>
			)}

			{/* Tile Details Modal */}
			{tileDetails && mapState && (
				<TileDetailsModal
					visible={!!tileDetails}
					x={tileDetails.x}
					y={tileDetails.y}
					terrain={mapState.terrain?.[tileDetails.y]?.[tileDetails.x]?.terrain || mapState.defaultTerrain || 'stone'}
					elevation={mapState.terrain?.[tileDetails.y]?.[tileDetails.x]?.elevation || 0}
					isBlocked={mapState.terrain?.[tileDetails.y]?.[tileDetails.x]?.difficult || false}
					hasFog={mapState.terrain?.[tileDetails.y]?.[tileDetails.x]?.fogged || false}
					featureType={mapState.terrain?.[tileDetails.y]?.[tileDetails.x]?.featureType || null}
					metadata={mapState.terrain?.[tileDetails.y]?.[tileDetails.x]?.metadata || {}}
					isHost={isHost}
					onClose={() => setTileDetails(null)}
				/>
			)}

			{/* Player Action Menu */}
			{playerActionMenu && (
				<PlayerActionMenu
					visible={!!playerActionMenu}
					x={playerActionMenu.x}
					y={playerActionMenu.y}
					availableActions={playerActionMenu.actions}
					targetLabel={playerActionMenu.targetLabel}
					onAction={handlePlayerAction}
					onClose={() => setPlayerActionMenu(null)}
				/>
			)}

			{/* Character DM Modal (Host only) */}
			{selectedCharacterForDM && (
				<CharacterDMModal
					gameId={inviteCode || ''}
					visible={showCharacterDMModal}
					character={
						selectedCharacterForDM.type === 'player'
							? effectiveGameState?.characters.find(c => c.id === selectedCharacterForDM.id) || null
							: null
					}
					npcToken={
						selectedCharacterForDM.type === 'npc'
							? mapState?.tokens.find(t => t.id === selectedCharacterForDM.id) || null
							: null
					}
					onClose={() => {
						setShowCharacterDMModal(false);
						setSelectedCharacterForDM(null);
						setNpcStats(undefined);
					}}
					onDamage={handleCharacterDamage}
					onHeal={handleCharacterHeal}
					onUpdateCharacter={selectedCharacterForDM.type === 'player' ? handleUpdateCharacter : undefined}
					initiativeOrder={effectiveGameState?.initiativeOrder}
					npcStats={npcStats}
				/>
			)}

			{/* Character View Modal (Players) */}
			{selectedCharacterForView && (
				<CharacterViewModal
					visible={showCharacterViewModal}
					character={
						selectedCharacterForView.type === 'player'
							? effectiveGameState?.characters.find(c => c.id === selectedCharacterForView.id) || null
							: null
					}
					npcToken={
						selectedCharacterForView.type === 'npc'
							? mapState?.tokens.find(t => t.id === selectedCharacterForView.id) || null
							: null
					}
					onClose={() => {
						setShowCharacterViewModal(false);
						setSelectedCharacterForView(null);
					}}
					isNPC={selectedCharacterForView.type === 'npc'}
					showFullStats={selectedCharacterForView.type === 'player'} // Full stats for players, limited for NPCs
					initiativeOrder={effectiveGameState?.initiativeOrder}
				/>
			)}

			{/* Map Element Picker */}
			<MapElementPicker
				visible={showMapElementPicker}
				onClose={() => {
					setShowMapElementPicker(false);
					setElementPlacementMode(null);
				}}
				onSelect={(elementType: MapElementType) => {
					// Enter placement mode - user will click on map to place
					setElementPlacementMode(elementType);
					setShowMapElementPicker(false);
					Alert.alert('Place Element', `Tap on the map to place ${elementType}. Tap again to cancel.`);
				}}
			/>

			{/* Spell/Action Selector */}
			<SpellActionSelector
				visible={showSpellActionSelector}
				onClose={() => {
					setShowSpellActionSelector(false);
					setSelectedCharacterForAction(null);
					setPendingActionTarget(null);
				}}
				character={
					selectedCharacterForAction
						? effectiveGameState?.characters.find(c => c.id === selectedCharacterForAction) || null
						: currentCharacterId
							? effectiveGameState?.characters.find(c => c.id === currentCharacterId) || null
							: null
				}
				isDM={isHost && !!selectedCharacterForAction}
				onSelect={async (action) => {
					if (!inviteCode) return;

					const characterId = selectedCharacterForAction || currentCharacterId;
					if (!characterId) return;

					const isActiveEntity = effectiveGameState?.activeTurn?.entityId === characterId;
					if (isActiveEntity) {
						const majorActionAlreadyUsed = gameState?.activeTurn?.majorActionUsed ?? false;
						const minorActionAlreadyUsed = gameState?.activeTurn?.minorActionUsed ?? false;

						if ((action.type === 'cast_spell' || action.type === 'basic_attack') && majorActionAlreadyUsed) {
							Alert.alert('Major Action Used', 'You have already used your major action this turn.');
							return;
						}

						if ((action.type === 'heal_potion' || action.type === 'use_item') && minorActionAlreadyUsed) {
							Alert.alert('Minor Action Used', 'You have already used your minor action this turn.');
							return;
						}
					}

					try {
						if (action.type === 'cast_spell') {
							if (!pendingActionTarget) {
								Alert.alert('No Target', 'Select a target before casting a spell.');
								return;
							}
							const response = await castSpellMutation.mutateAsync({
								path: `/games/${inviteCode}/characters/${characterId}/cast-spell`,
								body: {
									spellName: action.name,
									targetId: pendingActionTarget.targetId,
								},
							});
							if (response.actionResult) {
								presentCombatResult(response.actionResult);
							}
						} else {
							if (action.type === 'basic_attack') {
								if (!pendingActionTarget) {
									Alert.alert('No Target', 'Select a target to attack.');
									return;
								}
								const response = await performActionMutation.mutateAsync({
									path: `/games/${inviteCode}/characters/${characterId}/actions`,
									body: {
										actionType: 'basic_attack',
										targetId: pendingActionTarget.targetId,
									},
								});
								if (response.actionResult) {
									presentCombatResult(response.actionResult);
								}
							} else {
								await performActionMutation.mutateAsync({
									path: `/games/${inviteCode}/characters/${characterId}/actions`,
									body: {
										actionType: action.type,
									},
								});
							}
						}
						if (action.type === 'cast_spell' || action.type === 'basic_attack') {
							await updateTurnUsage({ majorActionUsed: true }, characterId);
						} else if (action.type === 'heal_potion' || action.type === 'use_item') {
							await updateTurnUsage({ minorActionUsed: true }, characterId);
						}
						// Game state will refresh automatically via query invalidation
						if (action.type !== 'cast_spell' && action.type !== 'basic_attack') {
							Alert.alert('Success', `${action.name} performed!`);
						}
					} catch (error) {
						console.error('Failed to perform action:', error);
						Alert.alert('Error', error instanceof Error ? error.message : 'Failed to perform action');
					} finally {
						setPendingActionTarget(null);
						setShowSpellActionSelector(false);
						setSelectedCharacterForAction(null);
					}
				}}
			/>

			{/* NPC Selector */}
			{showNpcSelector && inviteCode && (
				<NpcSelector
					visible={showNpcSelector}
					onClose={() => {
						// Only close the selector, don't clear placement mode if NPC was already selected
						setShowNpcSelector(false);
						// Only clear placement mode if user explicitly closes without selecting
						// (This will be handled by the Cancel button in placement hint)
					}}
					inviteCode={inviteCode}
					onSelectNpc={(npcId, npcName) => {
						setNpcPlacementMode({ npcId, npcName });
						setShowNpcSelector(false);
					}}
					onCreateCustomNpc={async (customNpc) => {
						if (!inviteCode || !mapState) return;
						// For custom NPCs, we'll place them at the center of the map
						// The user can move them later
						const centerX = Math.floor((mapState.width || 20) / 2);
						const centerY = Math.floor((mapState.height || 20) / 2);
						try {
							// Count how many NPCs with this name already exist to create unique label
							const existingNpcsOfType = (mapState.tokens || []).filter(
								token => token.type === 'npc' && token.label?.startsWith(customNpc.name),
							);
							const count = existingNpcsOfType.length;
							const uniqueLabel = count > 0 ? `${customNpc.name} ${count + 1}` : customNpc.name;

							const result = await placeNpcMutation.mutateAsync({
								path: `/games/${inviteCode}/npcs`,
								body: {
									customNpc: {
										name: customNpc.name,
										role: customNpc.role,
										alignment: customNpc.alignment,
										disposition: customNpc.disposition,
										description: customNpc.description,
										maxHealth: customNpc.maxHealth,
										armorClass: customNpc.armorClass,
										color: customNpc.color,
									},
									x: centerX,
									y: centerY,
									label: uniqueLabel,
								},
							});

							// Optimistically update map cache with the new NPC token list
							if (result?.tokens) {
								updateCachedTokens(() => result.tokens);
							}

							Alert.alert('Success', `${uniqueLabel} created and placed on map`);
						} catch (error) {
							console.error('Failed to create NPC:', error);
							Alert.alert('Error', 'Failed to create NPC');
						}
					}}
				/>
			)}

			{/* Character Turn Selector */}
			{showCharacterTurnSelector && (
				<Modal visible={showCharacterTurnSelector} transparent animationType="fade" onRequestClose={() => setShowCharacterTurnSelector(false)}>
					<TouchableOpacity
						style={styles.modalOverlay}
						activeOpacity={1}
						onPress={() => setShowCharacterTurnSelector(false)}
					>
						<ThemedView style={styles.characterTurnSelectorContainer}>
							<ThemedText type="subtitle" style={styles.characterTurnSelectorTitle}>
								Start Character Turn
							</ThemedText>
							<ScrollView style={styles.characterTurnSelectorList}>
								{/* Player Characters */}
								{effectiveGameState?.characters && effectiveGameState.characters.length > 0 && (
									<>
										<ThemedText style={styles.characterTurnSelectorSectionTitle}>Player Characters</ThemedText>
										{effectiveGameState.characters.map((character) => (
											<TouchableOpacity
												key={character.id}
												style={styles.characterTurnSelectorItem}
												onPress={async () => {
													if (!inviteCode) return;
													try {
														const response = await startTurnMutation.mutateAsync({
															path: `/games/${inviteCode}/turn/start`,
															body: {
																turnType: 'player',
																entityId: character.id,
															},
														});
														if (response) {
															setGameState(response);
														}
														setShowCharacterTurnSelector(false);
														Alert.alert('Success', `Started ${character.name}'s turn`);
													} catch (error) {
														console.error('Failed to start turn:', error);
														Alert.alert('Error', error instanceof Error ? error.message : 'Failed to start turn');
													}
												}}
											>
												<ThemedText style={styles.characterTurnSelectorItemName}>{character.name}</ThemedText>
												<ThemedText style={styles.characterTurnSelectorItemType}>(Player)</ThemedText>
											</TouchableOpacity>
										))}
									</>
								)}
								{/* NPCs */}
								{mapState?.tokens?.filter(t => t.type === 'npc').length && (mapState?.tokens?.filter(t => t.type === 'npc').length ?? 0) > 0 && (
									<>
										<ThemedText style={styles.characterTurnSelectorSectionTitle}>NPCs</ThemedText>
										{mapState?.tokens
											?.filter(t => t.type === 'npc')
											.map((token) => (
												<TouchableOpacity
													key={token.id}
													style={styles.characterTurnSelectorItem}
													onPress={async () => {
														if (!inviteCode) return;
														try {
															// Use token.id (not token.entityId) to match initiative order entityId
															const response = await startTurnMutation.mutateAsync({
																path: `/games/${inviteCode}/turn/start`,
																body: {
																	turnType: 'npc',
																	entityId: token.id,
																},
															});
															if (response) {
																setGameState(response);
															}
															setShowCharacterTurnSelector(false);
															Alert.alert('Success', `Started ${token.label || 'NPC'}'s turn`);
														} catch (error) {
															console.error('Failed to start turn:', error);
															Alert.alert('Error', error instanceof Error ? error.message : 'Failed to start turn');
														}
													}}
												>
													<ThemedText style={styles.characterTurnSelectorItemName}>{token.label || `NPC ${token.id.slice(-4)}`}</ThemedText>
													<ThemedText style={styles.characterTurnSelectorItemType}>(NPC)</ThemedText>
												</TouchableOpacity>
											))}
									</>
								)}
								{(!effectiveGameState?.characters || effectiveGameState.characters.length === 0) &&
									(!mapState?.tokens?.filter(t => t.type === 'npc').length || (mapState?.tokens?.filter(t => t.type === 'npc').length ?? 0) === 0) && (
									<ThemedText style={styles.characterTurnSelectorEmpty}>No characters or NPCs available</ThemedText>
								)}
							</ScrollView>
						</ThemedView>
					</TouchableOpacity>
				</Modal>
			)}
		</ThemedView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	statusBar: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 8,
		backgroundColor: '#E2D3B3',
		borderBottomWidth: 1,
		borderBottomColor: '#C9B037',
	},
	statusLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	statusText: {
		fontSize: 12,
		color: '#6B5B3D',
	},
	statusRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	turnIndicator: {
		fontSize: 12,
		fontWeight: '600',
		color: '#8B6914',
	},
	editModeBadge: {
		backgroundColor: '#DBEAFE',
		color: '#1E40AF',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
		marginLeft: 8,
	},
	lobbyButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		backgroundColor: '#8B6914',
		borderRadius: 6,
		marginRight: 8,
	},
	endTurnButton: {
		backgroundColor: '#059669',
		borderColor: '#047857',
		borderWidth: 1,
	},
	stopButton: {
		backgroundColor: '#B91C1C',
	},
	interruptButton: {
		backgroundColor: '#DC2626',
	},
	resumeButton: {
		backgroundColor: '#059669',
	},
	editButtonActive: {
		backgroundColor: '#7C3AED',
	},
	lobbyButtonText: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: '600',
	},
	hostBadge: {
		fontSize: 12,
		fontWeight: 'bold',
		color: '#8B6914',
		backgroundColor: '#F5E6D3',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
	},
	content: {
		flex: 1,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingBottom: 20,
	},
	desktopLayout: {
		flex: 1,
		flexDirection: 'row',
	},
	sidebar: {
		width: 300,
		borderRightWidth: 1,
		borderRightColor: '#C9B037',
	},
	mainContent: {
		flex: 1,
	},
	mapContainer: {
		borderWidth: 1,
		borderColor: '#C9B037',
		borderRadius: 12,
		padding: 0,
		marginBottom: 0,
		backgroundColor: '#FFF9EF',
		gap: 0,
	},
	mapHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: 8,
	},
	turnResourceRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	turnResourceBadge: {
		flexDirection: 'column',
		backgroundColor: '#FFF3CD',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderWidth: 1,
		borderColor: '#F0C36D',
	},
	turnResourceBadgeUsed: {
		opacity: 0.6,
	},
	turnResourceLabel: {
		fontSize: 12,
		color: '#6B4F1D',
		textTransform: 'uppercase',
	},
	turnResourceValue: {
		fontSize: 14,
		fontWeight: '700',
		color: '#2F1B0C',
	},
	movementButton: {
		backgroundColor: '#E6DDC6',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
	},
	movementButtonActive: {
		backgroundColor: '#C9B037',
	},
	movementButtonDisabled: {
		opacity: 0.5,
	},
	movementButtonText: {
		color: '#3B2F1B',
		fontWeight: '600',
	},
	mapHint: {
		color: '#6B5B3D',
	},
	mapScrollContainer: {
		flex: 1,
	},
	mapScrollContent: {
		flexGrow: 1,
		padding: 8,
	},
	movementToggle: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#C9B037',
		backgroundColor: '#FFF',
	},
	movementToggleActive: {
		backgroundColor: '#E9D8A6',
	},
	movementToggleText: {
		color: '#3B2F1B',
		fontWeight: '600',
	},
	notificationButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
		backgroundColor: '#8B6914',
		marginRight: 8,
		position: 'relative',
	},
	notificationButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
	},
	notificationBadge: {
		position: 'absolute',
		top: -4,
		right: -4,
		backgroundColor: '#B91C1C',
		borderRadius: 10,
		minWidth: 18,
		height: 18,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 4,
		borderWidth: 2,
		borderColor: '#FFF9EF',
	},
	notificationBadgeText: {
		color: '#FFFFFF',
		fontSize: 10,
		fontWeight: '700',
	},
	commandButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
		backgroundColor: '#4A6741',
		marginRight: 8,
	},
	commandButtonText: {
		color: '#FFF9EF',
		fontSize: 12,
		fontWeight: '600',
	},
	mapSwitcherContainer: {
		marginTop: 16,
		gap: 8,
	},
	mapSwitchButton: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#4A6741',
		borderRadius: 8,
		alignItems: 'center',
	},
	mapSwitchButtonText: {
		color: '#FFF9EF',
		fontSize: 14,
		fontWeight: '600',
	},
	mapSwitcherPanel: {
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 12,
		padding: 12,
		backgroundColor: '#FFF9EF',
		maxHeight: 300,
	},
	mapSwitcherTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#3B2F1B',
		marginBottom: 12,
	},
	mapSwitcherList: {
		maxHeight: 250,
	},
	mapSwitcherItem: {
		padding: 12,
		borderRadius: 8,
		backgroundColor: '#FFFFFF',
		marginBottom: 8,
		borderWidth: 1,
		borderColor: '#E2D3B3',
	},
	mapSwitcherItemActive: {
		backgroundColor: '#E9D8A6',
		borderColor: '#C9B037',
	},
	mapSwitcherItemText: {
		fontSize: 14,
		color: '#3B2F1B',
	},
	mapSwitcherItemTextActive: {
		fontWeight: '700',
		color: '#8B6914',
	},
	mapSwitcherEmpty: {
		color: '#6B5B3D',
	},
	warningContainer: {
		backgroundColor: '#FFF3CD',
		borderRadius: 12,
		padding: 12,
		marginBottom: 16,
		borderWidth: 2,
		borderColor: '#FFC107',
	},
	warningTitle: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#856404',
		marginBottom: 8,
	},
	warningText: {
		fontSize: 14,
		color: '#856404',
		marginBottom: 8,
	},
	warningCharacter: {
		fontSize: 13,
		color: '#856404',
		marginLeft: 8,
		marginBottom: 4,
	},
	warningHint: {
		fontSize: 12,
		color: '#856404',
		fontStyle: 'italic',
		marginTop: 8,
	},
	button: {
		backgroundColor: '#8B6914',
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	buttonText: {
		color: '#FFFFFF',
		fontSize: 14,
		fontWeight: '600',
	},
	autoPlaceButton: {
		backgroundColor: '#059669',
		marginTop: 12,
		marginBottom: 8,
	},
	buttonDisabled: {
		opacity: 0.5,
	},
	itemPalette: {
		position: 'absolute',
		bottom: 16,
		left: 16,
		right: 16,
		backgroundColor: '#FFF9EF',
		borderRadius: 12,
		padding: 12,
		borderWidth: 1,
		borderColor: '#C9B037',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
	},
	itemPaletteTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#3B2F1B',
		marginBottom: 8,
	},
	itemPaletteButtons: {
		flexDirection: 'row',
		gap: 8,
	},
	itemButton: {
		flex: 1,
		padding: 10,
		borderRadius: 8,
		backgroundColor: '#E6DDC6',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	itemButtonSelected: {
		backgroundColor: '#C9B037',
		borderColor: '#8B6914',
		borderWidth: 2,
	},
	itemButtonText: {
		color: '#3B2F1B',
		fontWeight: '600',
		fontSize: 12,
	},
	itemPaletteHint: {
		marginTop: 8,
		fontSize: 12,
		color: '#6B5B3D',
		textAlign: 'center',
	},
	pausedIndicator: {
		backgroundColor: '#FEF3C7',
		borderColor: '#F59E0B',
		borderWidth: 2,
		borderRadius: 8,
		padding: 8,
		marginBottom: 8,
	},
	pausedText: {
		color: '#92400E',
		fontWeight: '700',
		fontSize: 14,
		textAlign: 'center',
	},
	editModeIndicator: {
		backgroundColor: '#DBEAFE',
		borderColor: '#3B82F6',
		borderWidth: 2,
		borderRadius: 8,
		padding: 8,
		marginBottom: 8,
	},
	editModeText: {
		color: '#1E40AF',
		fontWeight: '700',
		fontSize: 14,
		textAlign: 'center',
	},
	logItem: {
		borderRadius: 8,
		backgroundColor: '#FFFFFF',
		padding: 10,
		gap: 6,
	},
	logContent: {
		color: '#3B2F1B',
	},
	logMetaRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	logMeta: {
		fontSize: 11,
		color: '#6B5B3D',
	},
	dmPanel: {
		width: 350,
		borderLeftWidth: 1,
		borderLeftColor: '#C9B037',
		maxHeight: '100%',
	},
	mobileDMPanel: {
		maxHeight: 320,
		borderTopWidth: 1,
		borderTopColor: '#C9B037',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	characterTurnSelectorContainer: {
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
	characterTurnSelectorTitle: {
		fontSize: 20,
		fontWeight: '700',
		marginBottom: 20,
		textAlign: 'center',
	},
	characterTurnSelectorList: {
		maxHeight: 400,
	},
	characterTurnSelectorSectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#8B6914',
		marginTop: 10,
		marginBottom: 5,
	},
	characterTurnSelectorItem: {
		backgroundColor: '#FFFFFF',
		borderRadius: 8,
		padding: 12,
		marginBottom: 8,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	characterTurnSelectorItemName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#3B2F1B',
	},
	characterTurnSelectorItemType: {
		fontSize: 14,
		color: '#6B5B3D',
	},
	characterTurnSelectorEmpty: {
		textAlign: 'center',
		color: '#6B5B3D',
		fontStyle: 'italic',
		padding: 20,
	},
	placementHintContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#FFF9EF',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#C9B037',
		padding: 8,
		marginBottom: 8,
		gap: 8,
	},
	cancelPlacementButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		backgroundColor: '#B91C1C',
		borderRadius: 6,
	},
	cancelPlacementButtonText: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: '600',
	},
});

export default MultiplayerGameScreen;
