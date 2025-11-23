import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CharacterDMModal } from '@/components/character-dm-modal';
import { CharacterViewModal } from '@/components/character-view-modal';
import { CommandPalette, type Command } from '@/components/command-palette';
import { MapElementPicker, type MapElementType } from '@/components/map-element-picker';
import { InteractiveMap } from '@/components/map/interactive-map';
import { TileActionMenu, type TileAction } from '@/components/map/tile-action-menu';
import { NotificationsPanel } from '@/components/notifications-panel';
import { NpcSelector } from '@/components/npc-selector';
import { PlayerActionMenu, type PlayerAction } from '@/components/player-action-menu';
import { PlayerCharacterList } from '@/components/player-character-list';
import { SpellActionSelector } from '@/components/spell-action-selector';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TokenDetailModal } from '@/components/token-detail-modal';
import { DEFAULT_RACE_SPEED } from '@/constants/race-speed';
import { usePollingGameState } from '@/hooks/use-polling-game-state';
import { useScreenSize } from '@/hooks/use-screen-size';
import { useWebSocket } from '@/hooks/use-websocket';
import { multiplayerClient } from '@/services/api/multiplayer-client';
import { PlayerActionMessage } from '@/types/api/websocket-messages';
import { Character } from '@/types/character';
import { MultiplayerGameState } from '@/types/multiplayer-game';
import { MapState, MapToken } from '@/types/multiplayer-map';
import { getCharacterSpeed } from '@/utils/character-utils';
import { calculateMovementRange, findPathWithCosts, isInMeleeRange, isInRangedRange } from '@/utils/movement-calculator';

const MultiplayerGameScreen: React.FC = () => {
	const params = useLocalSearchParams<{ inviteCode: string; hostId?: string; playerId?: string }>();
	const { inviteCode, hostId, playerId } = params;
	const [gameState, setGameState] = useState<MultiplayerGameState | null>(null);
	const [sharedMap, setSharedMap] = useState<MapState | null>(null);
	const [movementRange, setMovementRange] = useState<Array<{ x: number; y: number; cost: number }>>([]);
	const [pathPreview, setPathPreview] = useState<{ path: Array<{ x: number; y: number }>; cost: number } | null>(
		null,
	);
	const [movementInFlight, setMovementInFlight] = useState(false);
	const [isHost, setIsHost] = useState(false);
	const [playerActionMenu, setPlayerActionMenu] = useState<{ x: number; y: number; actions: PlayerAction[]; targetLabel?: string } | null>(null);
	const [wsConnected, setWsConnected] = useState(false);
	const [showMapSwitcher, setShowMapSwitcher] = useState(false);
	const [availableMaps, setAvailableMaps] = useState<Array<{ id: string; name: string }>>([]);
	const [switchingMap, setSwitchingMap] = useState(false);
	const [showNotifications, setShowNotifications] = useState(false);
	const [showCommandPalette, setShowCommandPalette] = useState(false);
	const [unreadMessageCount, setUnreadMessageCount] = useState(0);
	const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
	const [selectedTokenMovementRange, setSelectedTokenMovementRange] = useState<Array<{ x: number; y: number; cost: number }>>([]);
	const [isMapEditMode, setIsMapEditMode] = useState(false);
	const [hasRolledInitiative, setHasRolledInitiative] = useState(false);
	const [selectedToken, setSelectedToken] = useState<MapToken | null>(null);
	const [showTokenModal, setShowTokenModal] = useState(false);
	const [tileActionMenu, setTileActionMenu] = useState<{ x: number; y: number } | null>(null);
	const [selectedItemType, setSelectedItemType] = useState<'fire' | 'trap' | 'obstacle' | null>(null);
	const [selectedCharacterForDM, setSelectedCharacterForDM] = useState<{ id: string; type: 'player' | 'npc' } | null>(null);
	const [showCharacterDMModal, setShowCharacterDMModal] = useState(false);
	const [npcStats, setNpcStats] = useState<{ STR: number; DEX: number; CON: number; INT: number; WIS: number; CHA: number } | undefined>(undefined);
	const [selectedCharacterForView, setSelectedCharacterForView] = useState<{ id: string; type: 'player' | 'npc' } | null>(null);
	const [showCharacterViewModal, setShowCharacterViewModal] = useState(false);
	const [showMapElementPicker, setShowMapElementPicker] = useState(false);
	const [showSpellActionSelector, setShowSpellActionSelector] = useState(false);
	const [selectedCharacterForAction, setSelectedCharacterForAction] = useState<string | null>(null);
	const [elementPlacementMode, setElementPlacementMode] = useState<MapElementType | null>(null);
	const [showCharacterTurnSelector, setShowCharacterTurnSelector] = useState(false);
	const [showNpcSelector, setShowNpcSelector] = useState(false);
	const [npcPlacementMode, setNpcPlacementMode] = useState<{ npcId: string; npcName: string } | null>(null);
	const placingCharactersRef = useRef<Set<string>>(new Set());
	const isPlacingRef = useRef(false);
	const { isMobile } = useScreenSize();
	const insets = useSafeAreaInsets();

	// Get character ID from gameState (memoized to prevent re-renders)
	const characterId = useMemo(() => {
		if (!gameState || !playerId) return '';
		const player = gameState.players.find(p => p.playerId === playerId);
		return player?.characterId || '';
	}, [gameState, playerId]);

	const currentCharacterId = useMemo(
		() => gameState?.players.find(p => p.playerId === playerId)?.characterId,
		[gameState?.players, playerId],
	);

	// Get the active character ID - for DM, use the active turn's entity, for players use their own
	const activeCharacterIdForMovement = useMemo(() => {
		if (isHost && gameState?.activeTurn && !gameState.pausedTurn) {
			// DM acting as the active character
			return gameState.activeTurn.entityId;
		}
		return currentCharacterId;
	}, [isHost, gameState?.activeTurn, gameState?.pausedTurn, currentCharacterId]);

	const activeCharacter = useMemo(() => {
		if (!activeCharacterIdForMovement) {
			return null;
		}
		return gameState?.characters.find(c => c.id === activeCharacterIdForMovement) ?? null;
	}, [gameState?.characters, activeCharacterIdForMovement]);

	const playerToken = useMemo(() => {
		if (!sharedMap) {
			return null;
		}

		// For DM: use active turn's character/NPC token
		// For players: use their own token
		const entityId = activeCharacterIdForMovement;
		if (!entityId) {
			return null;
		}

		return (
			sharedMap.tokens?.find(token =>
				(token.type === 'player' || token.type === 'npc') &&
				token.entityId === entityId,
			) ?? null
		);
	}, [sharedMap, activeCharacterIdForMovement]);

	const activeTurnForMovement = useMemo(() => {
		if (!gameState?.activeTurn) {
			return null;
		}
		return gameState.activeTurn.entityId === activeCharacterIdForMovement ? gameState.activeTurn : null;
	}, [gameState, activeCharacterIdForMovement]);

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

	const movementUsedAmount = useMemo(
		() => Math.max(0, totalMovementSpeedForActive - movementBudget),
		[totalMovementSpeedForActive, movementBudget],
	);

	const isPlayerTurn = useMemo(() => {
		// If no active turn, no one's turn
		if (!gameState?.activeTurn) {
			return false;
		}

		// If turn is paused, DM is in "DM Action" mode - no one can act
		if (gameState.pausedTurn) {
			return false;
		}

		// For DM: if there's an active turn (player or NPC), DM acts as that character
		// unless the turn is paused (DM Action mode)
		if (isHost && gameState.activeTurn.entityId) {
			return (
				gameState.activeTurn.type === 'player' ||
				gameState.activeTurn.type === 'npc'
			);
		}

		// For players: only their own turn
		if (!currentCharacterId) {
			return false;
		}

		return (
			gameState.activeTurn.type === 'player' &&
			gameState.activeTurn.entityId === currentCharacterId
		);
	}, [gameState, currentCharacterId, isHost]);

	const currentTurnName = useMemo(() => {
		if (!gameState?.activeTurn) {
			return null;
		}
		if (gameState.activeTurn.type === 'player') {
			const character = gameState.characters.find(
				c => c.id === gameState.activeTurn?.entityId,
			);
			return character?.name || 'Player';
		}
		if (gameState.activeTurn.type === 'npc') {
			return 'NPC';
		}
		return 'DM';
	}, [gameState?.activeTurn, gameState?.characters]);

	const hostActingAsActiveCharacter = useMemo(() => {
		return Boolean(
			isHost && !gameState?.pausedTurn && gameState?.activeTurn?.entityId,
		);
	}, [isHost, gameState?.pausedTurn, gameState?.activeTurn?.entityId]);

	const refreshSharedMap = useCallback(async () => {
		if (!inviteCode) {
			return;
		}

		try {
			const state = await multiplayerClient.getMapState(inviteCode);
			setSharedMap(state);
		} catch (error) {
			console.error('Failed to refresh shared map:', error);
		}
	}, [inviteCode]);

	const loadAvailableMaps = useCallback(async () => {
		try {
			const response = await multiplayerClient.getAllMaps();
			setAvailableMaps(response.maps || []);
		} catch (error) {
			console.error('Failed to load maps:', error);
		}
	}, []);

	const handleSwitchMap = useCallback(
		async (mapId: string) => {
			if (!inviteCode) return;

			setSwitchingMap(true);
			try {
				await multiplayerClient.switchMap(inviteCode, mapId);
				await refreshSharedMap();
				setShowMapSwitcher(false);
				Alert.alert('Success', 'Map switched successfully');
			} catch (error) {
				console.error('Failed to switch map:', error);
				Alert.alert('Error', error instanceof Error ? error.message : 'Failed to switch map');
			} finally {
				setSwitchingMap(false);
			}
		},
		[inviteCode, refreshSharedMap],
	);

	useEffect(() => {
		if (isHost && showMapSwitcher) {
			loadAvailableMaps();
		}
	}, [isHost, showMapSwitcher, loadAvailableMaps]);

	// Determine if this is the host
	useEffect(() => {
		if (hostId && gameState) {
			setIsHost(gameState.hostId === hostId);
		}
	}, [hostId, gameState]);

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
	const { gameState: polledState } = usePollingGameState({
		inviteCode: inviteCode || '',
		enabled: (!wsIsConnected && !!inviteCode) || !gameState, // Poll if WS not connected OR no gameState yet
		pollInterval: 3000,
		onGameStateUpdate: handlePollingUpdate,
	});

	// Update gameState from polling if we don't have it yet
	useEffect(() => {
		if (!gameState && polledState) {
			setGameState(polledState);
		}
	}, [gameState, polledState]);

	useEffect(() => {
		if (gameState?.mapState) {
			setSharedMap(gameState.mapState);
		}
	}, [gameState?.mapState]);

	const loadGameState = useCallback(async () => {
		if (!inviteCode) return;
		try {
			const session = await multiplayerClient.getGameSession(inviteCode);
			if (session.gameState) {
				setGameState(session.gameState);
			}
		} catch (error) {
			Alert.alert('Error', 'Failed to load game state');
			console.error(error);
		}
	}, [inviteCode]);

	// Check for characters without tokens on the map
	const charactersWithoutTokens = useMemo(() => {
		if (!gameState?.characters || !sharedMap?.tokens) return [];
		return gameState.characters.filter(char => {
			const hasToken = sharedMap.tokens.some(token => token.type === 'player' && token.entityId === char.id);
			return !hasToken;
		});
	}, [gameState?.characters, sharedMap?.tokens]);

	// Auto-place missing characters on the map
	useEffect(() => {
		if (
			isHost &&
			sharedMap &&
			charactersWithoutTokens.length > 0 &&
			inviteCode &&
			gameState?.status === 'active' &&
			!isPlacingRef.current // Prevent concurrent placement runs
		) {
			const autoPlaceCharacters = async () => {
				// Prevent concurrent runs
				if (isPlacingRef.current) return;
				isPlacingRef.current = true;

				try {
					// Filter out characters that are already being placed or already have tokens
					const charactersToPlace = charactersWithoutTokens.filter(char => {
						// Skip if already being placed
						if (placingCharactersRef.current.has(char.id)) {
							return false;
						}
						// Double-check: verify character doesn't already have a token
						const hasToken = sharedMap.tokens?.some(
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
						(sharedMap.tokens || []).map(t => `${t.x},${t.y}`),
					);

					const openTiles: Array<{ x: number; y: number; priority: number }> = [];

					// Iterate through map to find open tiles
					for (let y = 0; y < sharedMap.height; y++) {
						for (let x = 0; x < sharedMap.width; x++) {
							const key = `${x},${y}`;
							if (occupiedTiles.has(key)) continue;

							// Check if tile is blocked
							const cell = sharedMap.terrain?.[y]?.[x];
							if (cell?.difficult) continue; // Skip difficult terrain

							// Prefer roads/gravel over other terrain
							const terrain = cell?.terrain || sharedMap.defaultTerrain || 'stone';
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
					for (let i = 0; i < charactersToPlace.length && i < openTiles.length; i++) {
						const character = charactersToPlace[i];
						const tile = openTiles[i];

						// Mark as being placed
						placingCharactersRef.current.add(character.id);

						try {
							await multiplayerClient.placePlayerToken(inviteCode, {
								characterId: character.id,
								x: tile.x,
								y: tile.y,
								label: character.name || 'Unknown',
								icon: character.icon,
							});
							// Remove from placing set after successful placement
							placingCharactersRef.current.delete(character.id);
						} catch (error) {
							console.error(`Failed to auto-place character ${character.id}:`, error);
							// Remove from placing set on error so it can be retried
							placingCharactersRef.current.delete(character.id);
						}
					}

					// Refresh map after placing
					await refreshSharedMap();
				} catch (error) {
					console.error('Failed to auto-place characters:', error);
				} finally {
					isPlacingRef.current = false;
				}
			};

			autoPlaceCharacters();
		}
	}, [isHost, sharedMap, charactersWithoutTokens, inviteCode, gameState?.status, refreshSharedMap]);

	// Auto-roll initiative when encounter starts (map is set, game is active, and all characters are placed)
	useEffect(() => {
		if (
			isHost &&
			gameState?.mapState &&
			gameState.status === 'active' &&
			charactersWithoutTokens.length === 0 && // All characters must be placed
			!hasRolledInitiative &&
			!gameState.initiativeOrder &&
			inviteCode
		) {
			const rollInitiative = async () => {
				try {
					setHasRolledInitiative(true);
					const response = await multiplayerClient.rollInitiative(inviteCode);
					setGameState(response); // Directly update game state with response
				} catch (error) {
					console.error('Failed to roll initiative:', error);
					setHasRolledInitiative(false);
				}
			};

			rollInitiative();
		}
	}, [isHost, gameState?.mapState, gameState?.status, charactersWithoutTokens.length, hasRolledInitiative, gameState?.initiativeOrder, inviteCode, loadGameState]);

	// Track unread messages
	useEffect(() => {
		if (gameState?.messages) {
			// Count messages that are newer than when notifications were last opened
			// For now, just show total count if panel is closed
			if (!showNotifications && gameState.messages.length > 0) {
				setUnreadMessageCount(gameState.messages.length);
			} else {
				setUnreadMessageCount(0);
			}
		}
	}, [gameState?.messages, showNotifications]);

	// Calculate movement range when it's player's turn or DM's turn (for movement preview)
	useEffect(() => {
		if (!sharedMap || !playerToken || movementBudget <= 0 || (!isPlayerTurn && !isHost)) {
			setMovementRange([]);
			setPathPreview(null);
			return;
		}

		// Only show movement range for players on their turn, or DM on any turn
		if (isPlayerTurn || isHost) {
			const reachable = calculateMovementRange(sharedMap, { x: playerToken.x, y: playerToken.y }, movementBudget);
			setMovementRange(reachable);
		}
	}, [sharedMap, playerToken, movementBudget, isPlayerTurn, isHost]);

	// Load initial game state - only once
	const loadGameStateRef = useRef(false);
	useEffect(() => {
		if (inviteCode && !loadGameStateRef.current && !gameState) {
			loadGameStateRef.current = true;
			loadGameState();
		}
		refreshSharedMap().catch(() => undefined);
		const interval = setInterval(() => {
			refreshSharedMap().catch(() => undefined);
		}, 5000);
		return () => clearInterval(interval);
	}, [inviteCode, refreshSharedMap, loadGameState, gameState]);

	// Handle CMD+K / CTRL+K keyboard shortcut for command palette
	useEffect(() => {
		if (Platform.OS !== 'web') return;

		const handleKeyDown = (e: KeyboardEvent) => {
			// CMD+K on Mac, CTRL+K on Windows/Linux
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
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
				await multiplayerClient.submitDMAction(inviteCode, {
					type: type as 'narrate' | 'update_character' | 'update_npc' | 'advance_story' | 'roll_dice',
					data,
					hostId,
				});

				// Refresh state
				if (!wsIsConnected) {
					setTimeout(loadGameState, 500);
				}
			} catch (error) {
				Alert.alert('Error', 'Failed to perform DM action');
				console.error(error);
			}
		},
		[inviteCode, hostId, gameState, wsIsConnected, loadGameState],
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
					id: 'roll-initiative',
					label: 'Roll Initiative',
					description: 'Start encounter by rolling initiative for all characters and NPCs',
					keywords: ['initiative', 'roll', 'encounter', 'combat', 'start'],
					category: 'Encounter',
					action: async () => {
						try {
							await multiplayerClient.rollInitiative(inviteCode);
							setHasRolledInitiative(true);
							setTimeout(() => {
								loadGameState();
							}, 500);
							Alert.alert('Success', 'Initiative rolled!');
						} catch (error) {
							console.error('Failed to roll initiative:', error);
							Alert.alert('Error', error instanceof Error ? error.message : 'Failed to roll initiative');
						}
					},
				},
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
								const response = await multiplayerClient.nextTurn(inviteCode);
								if (response) {
									setGameState(response);
								} else {
									setTimeout(() => {
										loadGameState();
									}, 500);
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
								await multiplayerClient.stopGame(inviteCode);
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
								await multiplayerClient.performAction(inviteCode, currentCharacterId, 'basic_attack');
								setTimeout(() => {
									loadGameState();
								}, 500);
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
								await multiplayerClient.performAction(inviteCode, currentCharacterId, 'heal_potion');
								setTimeout(() => {
									loadGameState();
								}, 500);
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
								const response = await multiplayerClient.endTurn(inviteCode);
								if (response) {
									setGameState(response);
								} else {
									setTimeout(() => {
										loadGameState();
									}, 500);
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
								const result = await multiplayerClient.rollPerceptionCheck(inviteCode, currentCharacterId);
								setTimeout(() => {
									loadGameState();
								}, 500);
								setShowCommandPalette(false);
								Alert.alert('Perception Check', `Rolled: ${result.total}\n${result.breakdown}`);
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
	}, [isHost, inviteCode, loadGameState, isPlayerTurn, currentCharacterId]);

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

			const activeEntityId = activeCharacterIdForMovement;

			if (!activeEntityId) {
				return { actions: [] };
			}

			const activeToken = sharedMap?.tokens?.find(
				t => t.entityId === activeEntityId && (t.type === 'player' || t.type === 'npc'),
			);

			if (!activeToken || !sharedMap) {
				return { actions: [] };
			}

			const fromPos = { x: activeToken.x, y: activeToken.y };
			const toPos = { x, y };
			const majorActionAvailable = !(activeTurnForMovement?.majorActionUsed ?? false);
			const minorActionAvailable = !(activeTurnForMovement?.minorActionUsed ?? false);

			// Check what's on the tile
			const tokenOnTile = sharedMap.tokens?.find(t => t.x === x && t.y === y);
			const isOwnTile = activeToken.x === x && activeToken.y === y;

			// If clicking on own tile, only allow movement if there's a path
			if (isOwnTile) {
				return { actions: [] };
			}

			// Check if tile is empty
			if (!tokenOnTile) {
				// Empty tile - check if movement is possible
				const reachable = calculateMovementRange(sharedMap, fromPos, movementBudget);
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
			sharedMap,
			movementBudget,
			activeTurnForMovement,
			activeCharacter,
		],
	);

	const handleTokenPress = useCallback(
		(token: MapToken) => {
			if (!sharedMap) return;

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

					const character = gameState?.characters.find(c => c.id === actingCharacterId);
					const personalMovementBudget = character ? getCharacterSpeed(character) : DEFAULT_RACE_SPEED;
					const reachable = calculateMovementRange(sharedMap, { x: token.x, y: token.y }, personalMovementBudget);
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
				const character = gameState?.characters.find(c => c.id === token.entityId);
				if (character) {
					movementBudget = getCharacterSpeed(character);
				}
			} else if (token.type === 'npc') {
				movementBudget = DEFAULT_RACE_SPEED;
			}

			const reachable = calculateMovementRange(sharedMap, tokenPosition, movementBudget);
			setSelectedTokenId(token.id);
			setSelectedTokenMovementRange(reachable);
		},
		[
			sharedMap,
			gameState?.characters,
			gameState?.activeTurn?.entityId,
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

	const handleMovementRangeTilePress = useCallback(
		async (x: number, y: number) => {
			// Handle clicking on a movement range tile to move the selected token
			if (!selectedTokenId || !sharedMap || !inviteCode) {
				console.log('Movement blocked: missing requirements', { selectedTokenId, sharedMap: !!sharedMap, inviteCode });
				return;
			}

			const selectedToken = sharedMap.tokens?.find(t => t.id === selectedTokenId);
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
				// If it's a player token and not host, validate movement
				if (selectedToken.type === 'player' && !isHost) {
					// Player movement - validate
					if (selectedToken.entityId !== currentCharacterId || !isPlayerTurn) {
						Alert.alert('Not your turn', 'You can only move your character during your turn.');
						return;
					}

					const validation = await multiplayerClient.validateMovement(inviteCode, {
						characterId: selectedToken.entityId || '',
						fromX: selectedToken.x,
						fromY: selectedToken.y,
						toX: x,
						toY: y,
					});

					if (!validation?.valid) {
						Alert.alert('Move blocked', 'That move is not allowed.');
						return;
					}

					// Optimistic update: update local state immediately
					if (sharedMap) {
						const updatedTokens = (sharedMap.tokens || []).map(t =>
							t.id === selectedToken.id ? { ...t, x, y, metadata: { ...t.metadata, path: validation.path } } : t,
						);
						setSharedMap({ ...sharedMap, tokens: updatedTokens });
					}

					// Save to backend asynchronously
					multiplayerClient.saveMapToken(inviteCode, {
						id: selectedToken.id,
						tokenType: 'player',
						x,
						y,
						characterId: selectedToken.entityId,
						label: selectedToken.label,
						color: selectedToken.color,
						metadata: { ...selectedToken.metadata, path: validation.path },
					}).catch(error => {
						console.error('Failed to save token movement:', error);
						// Revert optimistic update on error
						if (sharedMap) {
							const revertedTokens = (sharedMap.tokens || []).map(t =>
								t.id === selectedToken.id ? { ...t, x: selectedToken.x, y: selectedToken.y } : t,
							);
							setSharedMap({ ...sharedMap, tokens: revertedTokens });
							Alert.alert('Error', 'Failed to save movement. Changes reverted.');
						}
					});

					// Refresh map state in background (non-blocking)
					refreshSharedMap().catch(console.error);
				} else {
					// Host can move any token with override
					const tokenData: {
						id: string;
						tokenType: 'player' | 'npc' | 'object';
						x: number;
						y: number;
						characterId?: string;
						npcId?: string;
						label: string;
						color?: string;
						overrideValidation: boolean;
					} = {
						id: selectedToken.id,
						tokenType: selectedToken.type,
						x,
						y,
						label: selectedToken.label,
						color: selectedToken.color,
						overrideValidation: true,
					};

					// Set the appropriate ID field based on token type
					if (selectedToken.type === 'npc' && selectedToken.entityId) {
						tokenData.npcId = selectedToken.entityId;
					} else if (selectedToken.type === 'player' && selectedToken.entityId) {
						tokenData.characterId = selectedToken.entityId;
					}

					// Optimistic update: update local state immediately
					if (sharedMap) {
						const updatedTokens = (sharedMap.tokens || []).map(t =>
							t.id === selectedToken.id ? { ...t, x, y } : t,
						);
						setSharedMap({ ...sharedMap, tokens: updatedTokens });
					}

					// Save to backend asynchronously
					multiplayerClient.saveMapToken(inviteCode, tokenData).catch(error => {
						console.error('Failed to save token movement:', error);
						// Revert optimistic update on error
						if (sharedMap) {
							const revertedTokens = (sharedMap.tokens || []).map(t =>
								t.id === selectedToken.id ? { ...t, x: selectedToken.x, y: selectedToken.y } : t,
							);
							setSharedMap({ ...sharedMap, tokens: revertedTokens });
							Alert.alert('Error', 'Failed to save movement. Changes reverted.');
						}
					});

					// Refresh map state in background (non-blocking)
					refreshSharedMap().catch(console.error);
				}

				// Clear selection after move (immediate UI feedback)
				setSelectedTokenId(null);
				setSelectedTokenMovementRange([]);
			} catch (error) {
				console.error('Failed to move token:', error);
				Alert.alert('Error', 'Failed to move token');
			}
		},
		[selectedTokenId, sharedMap, inviteCode, selectedTokenMovementRange, isHost, currentCharacterId, isPlayerTurn, refreshSharedMap],
	);

	const handleTokenDamage = useCallback(
		async (amount: number) => {
			if (!selectedToken?.entityId || !inviteCode) return;
			try {
				await multiplayerClient.dealDamage(inviteCode, selectedToken.entityId, amount);
				await loadGameState();
				await refreshSharedMap();
			} catch (error) {
				console.error('Failed to deal damage:', error);
				Alert.alert('Error', 'Failed to deal damage');
			}
		},
		[selectedToken, inviteCode, loadGameState, refreshSharedMap],
	);

	const handleTokenHeal = useCallback(
		async (amount: number) => {
			if (!selectedToken?.entityId || !inviteCode) return;
			try {
				await multiplayerClient.healCharacter(inviteCode, selectedToken.entityId, amount);
				await loadGameState();
				await refreshSharedMap();
			} catch (error) {
				console.error('Failed to heal:', error);
				Alert.alert('Error', 'Failed to heal character');
			}
		},
		[selectedToken, inviteCode, loadGameState, refreshSharedMap],
	);

	const handleCharacterDamage = useCallback(
		async (characterId: string, amount: number) => {
			if (!inviteCode) return;
			try {
				await multiplayerClient.dealDamage(inviteCode, characterId, amount);
				await loadGameState();
			} catch (error) {
				console.error('Failed to deal damage:', error);
				Alert.alert('Error', 'Failed to deal damage');
			}
		},
		[inviteCode, loadGameState],
	);

	const handleCharacterHeal = useCallback(
		async (characterId: string, amount: number) => {
			if (!inviteCode) return;
			try {
				await multiplayerClient.healCharacter(inviteCode, characterId, amount);
				await loadGameState();
			} catch (error) {
				console.error('Failed to heal:', error);
				Alert.alert('Error', 'Failed to heal character');
			}
		},
		[inviteCode, loadGameState],
	);

	const handleCharacterSelect = useCallback(
		async (characterId: string, type: 'player' | 'npc') => {
			if (!isHost) return;
			setSelectedCharacterForDM({ id: characterId, type });

			// If it's an NPC, fetch the NPC definition to get stats
			if (type === 'npc' && inviteCode) {
				try {
					const token = sharedMap?.tokens.find(t => t.id === characterId);
					if (token?.entityId) {
						// For NPCs, entityId should be the npc_id (from convertTokens: token.npc_id)
						const npcId = token.entityId;
						const npcDef = await multiplayerClient.getNpcDefinition(inviteCode, npcId).catch(() => null);
						if (npcDef && npcDef.stats) {
							// Stats is a Record<string, unknown>, extract the stat values
							const stats = npcDef.stats as Record<string, unknown>;
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
		[isHost, inviteCode, sharedMap],
	);

	const handleUpdateCharacter = useCallback(
		async (characterId: string, updates: Partial<Character>) => {
			if (!inviteCode) return;
			try {
				// Use DMAction to update character
				await handleDMAction('update_character', {
					characterId,
					updates,
				});
				await loadGameState();
			} catch (error) {
				console.error('Failed to update character:', error);
				Alert.alert('Error', 'Failed to update character');
			}
		},
		[inviteCode, handleDMAction, loadGameState],
	);

	const handleTileLongPress = useCallback(
		(x: number, y: number) => {
			if (isHost && isMapEditMode) {
				setTileActionMenu({ x, y });
			}
		},
		[isHost, isMapEditMode],
	);

	const handleTileAction = useCallback(
		async (action: TileAction, x: number, y: number) => {
			if (!inviteCode || !sharedMap) return;

			try {
				switch (action) {
					case 'changeTerrain':
					case 'placeWater':
					case 'placeRoad':
					case 'clearTile': {
						const terrainType = action === 'placeWater' ? 'water' : action === 'placeRoad' ? 'road' : action === 'clearTile' ? 'grass' : 'stone';
						await multiplayerClient.mutateTerrain(inviteCode, {
							tiles: [
								{
									x,
									y,
									terrainType,
								},
							],
						});
						await refreshSharedMap();
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
		[inviteCode, sharedMap, refreshSharedMap],
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

					await multiplayerClient.saveMapToken(inviteCode, {
						tokenType: 'object',
						x,
						y,
						label: itemLabels[selectedItemType] || 'Item',
						metadata: { itemType: selectedItemType },
						overrideValidation: true,
					});
					await refreshSharedMap();
					setSelectedItemType(null);
				} catch (error) {
					console.error('Failed to place item token:', error);
					Alert.alert('Error', 'Failed to place item');
				}
			};

			placeItem();
		},
		[inviteCode, selectedItemType, refreshSharedMap],
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
			const entityId = actorEntityId ?? gameState?.activeTurn?.entityId;
			if (!entityId) {
				return;
			}

			try {
				await multiplayerClient.updateTurnState(inviteCode, {
					...update,
					actorEntityId: entityId,
				});
			} catch (error) {
				console.error('Failed to update turn state usage:', error);
			}
		},
		[inviteCode, gameState?.activeTurn?.entityId],
	);

	const formatMovementValue = useCallback((value: number) => {
		return Math.abs(value - Math.round(value)) < 0.01 ? Math.round(value).toString() : value.toFixed(1);
	}, []);

	const handlePlayerAction = useCallback(
		async (action: PlayerAction, x: number, y: number) => {
			if (!inviteCode || !sharedMap) return;

			// For DM: can act on any turn (player, NPC, or DM turn) unless paused
			// For players: can only act on their own turn
			const activeCharacterId = isPlayerTurn
				? (isHost && gameState?.activeTurn?.entityId ? gameState.activeTurn.entityId : currentCharacterId)
				: (isHost && !gameState?.pausedTurn && gameState?.activeTurn?.entityId ? gameState.activeTurn.entityId : null);

			console.log('[Movement] Active character check:', {
				isPlayerTurn,
				isHost,
				currentCharacterId,
				activeTurnEntityId: gameState?.activeTurn?.entityId,
				activeCharacterId,
				activeTurnType: gameState?.activeTurn?.type,
				pausedTurn: gameState?.pausedTurn,
			});

			if (!activeCharacterId) {
				Alert.alert('Error', 'No active character found');
				return;
			}

			const activeToken = sharedMap.tokens?.find(
				t => t.entityId === activeCharacterId && (t.type === 'player' || t.type === 'npc'),
			);

			if (!activeToken) {
				Alert.alert('Error', 'No active token found');
				return;
			}

			const activeTurnForEntity = gameState?.activeTurn?.entityId === activeCharacterId ? gameState.activeTurn : null;
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

						// Use existing movement logic
						const pathResult = findPathWithCosts(sharedMap, { x: activeToken.x, y: activeToken.y }, { x, y });
						console.log('[Movement] Path result:', pathResult);

						if (!pathResult || !pathResult.path.length) {
							console.error('[Movement] No path found');
							Alert.alert('No path', 'Unable to find a valid path to that tile.');
							return;
						}

						console.log('[Movement] Budget check:', {
							cost: pathResult.cost,
							remainingMovement,
							totalMovementSpeed,
							movementUsed,
						});

						if (pathResult.cost > remainingMovement) {
							console.error('[Movement] Not enough movement points');
							Alert.alert('Not enough movement', 'You need more movement points for that path.');
							return;
						}

						setMovementInFlight(true);
						try {
							// Use path result for validation - frontend pathfinding is sufficient
							// The backend validation endpoint doesn't exist, so we trust our pathfinding
							const validation: { valid: boolean; cost: number; path: Array<{ x: number; y: number }> } = {
								valid: true,
								cost: pathResult.cost,
								path: pathResult.path,
							};

							console.log('[Movement] Using path result for movement validation:', validation);

							// Optimistic update: update local state immediately
							if (sharedMap) {
								const updatedTokens = (sharedMap.tokens || []).map(t =>
									t.id === activeToken.id ? { ...t, x, y, metadata: { ...t.metadata, path: validation.path } } : t,
								);
								setSharedMap({ ...sharedMap, tokens: updatedTokens });
							}

							// Save to backend - use npcId for NPCs, characterId for players
							const tokenData: {
								id: string;
								tokenType: 'player' | 'npc' | 'object';
								x: number;
								y: number;
								characterId?: string;
								npcId?: string;
								label: string;
								color?: string;
								metadata?: Record<string, unknown>;
								overrideValidation?: boolean;
							} = {
								id: activeToken.id,
								tokenType: activeToken.type,
								x,
								y,
								label: activeToken.label,
								color: activeToken.color,
								metadata: { ...activeToken.metadata, path: validation.path },
							};

							// Set the appropriate ID field based on token type
							if (activeToken.type === 'npc' && activeToken.entityId) {
								tokenData.npcId = activeToken.entityId;
								tokenData.overrideValidation = isHost; // DM can override validation for NPCs
								console.log('[Movement] Saving NPC token:', { npcId: activeToken.entityId, overrideValidation: isHost });
							} else if (activeToken.type === 'player' && activeToken.entityId) {
								tokenData.characterId = activeToken.entityId;
								console.log('[Movement] Saving player token:', { characterId: activeToken.entityId });
							}

							console.log('[Movement] Saving token data:', tokenData);
							await multiplayerClient.saveMapToken(inviteCode, tokenData);
							console.log('[Movement] Token saved successfully');

							const updatedMovementUsed = Math.min(totalMovementSpeed, movementUsed + pathResult.cost);

							// Refresh map and game state to update action points
							await refreshSharedMap();
							await updateTurnUsage({ movementUsed: updatedMovementUsed }, activeCharacterId);
							setTimeout(() => {
								loadGameState();
							}, 300);
							setPathPreview(null);
							setSelectedTokenId(null);
							setSelectedTokenMovementRange([]);
						} catch (error) {
							console.error('[Movement] Failed to move player:', error);
							console.error('[Movement] Error details:', {
								message: error instanceof Error ? error.message : String(error),
								stack: error instanceof Error ? error.stack : undefined,
							});
							// Revert optimistic update on error
							if (sharedMap) {
								const revertedTokens = (sharedMap.tokens || []).map(t =>
									t.id === activeToken.id ? { ...t, x: activeToken.x, y: activeToken.y } : t,
								);
								setSharedMap({ ...sharedMap, tokens: revertedTokens });
								console.log('[Movement] Reverted optimistic update');
							}
							Alert.alert('Movement failed', error instanceof Error ? error.message : 'Could not move token');
						} finally {
							setMovementInFlight(false);
							console.log('[Movement] Movement handler finished');
						}
						break;
					}
					case 'talk': {
						// Open chat/dialogue - for now just show an alert
						const targetToken = sharedMap.tokens?.find(t => t.x === x && t.y === y);
						Alert.alert('Talk', `Initiating conversation with ${targetToken?.label || 'target'}`);
						// TODO: Open chat interface
						break;
					}
					case 'inspect': {
						// Trigger perception check
						if (activeCharacterId) {
							try {
								const result = await multiplayerClient.rollPerceptionCheck(inviteCode, activeCharacterId);
								setTimeout(() => {
									loadGameState();
								}, 500);
								Alert.alert('Perception Check', `Rolled: ${result.total}\n${result.breakdown}`);
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
						// Open spell selector
						setSelectedCharacterForAction(activeCharacterId);
						setShowSpellActionSelector(true);
						break;
					}
					case 'basic_attack': {
						if (!majorActionAvailable) {
							Alert.alert('Major Action Used', 'You have already used your major action this turn.');
							break;
						}
						// Perform basic attack
						if (activeCharacterId) {
							try {
								await multiplayerClient.performAction(inviteCode, activeCharacterId, 'basic_attack');
								await updateTurnUsage({ majorActionUsed: true }, activeCharacterId);
								setTimeout(() => {
									loadGameState();
								}, 500);
								Alert.alert('Attack', 'Basic attack performed!');
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
			sharedMap,
			isPlayerTurn,
			isHost,
			currentCharacterId,
			gameState,
			refreshSharedMap,
			loadGameState,
			updateTurnUsage,
			totalMovementSpeedForActive,
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
				<View style={styles.mapHeader}>
					<ThemedText type="subtitle">Shared Map</ThemedText>
				</View>
				{(isPlayerTurn || isHost) && (
					<View style={styles.turnResourceRow}>
						<View style={styles.turnResourceBadge}>
							<ThemedText style={styles.turnResourceLabel}>Movement</ThemedText>
							<ThemedText style={styles.turnResourceValue}>
								{formatMovementValue(movementUsedAmount)} / {formatMovementValue(totalMovementSpeedForActive)}
							</ThemedText>
						</View>
						<View
							style={[
								styles.turnResourceBadge,
								activeTurnForMovement?.majorActionUsed && styles.turnResourceBadgeUsed,
							]}
						>
							<ThemedText style={styles.turnResourceLabel}>Major</ThemedText>
							<ThemedText style={styles.turnResourceValue}>
								{activeTurnForMovement?.majorActionUsed ? 'Used' : 'Ready'}
							</ThemedText>
						</View>
						<View
							style={[
								styles.turnResourceBadge,
								activeTurnForMovement?.minorActionUsed && styles.turnResourceBadgeUsed,
							]}
						>
							<ThemedText style={styles.turnResourceLabel}>Minor</ThemedText>
							<ThemedText style={styles.turnResourceValue}>
								{activeTurnForMovement?.minorActionUsed ? 'Used' : 'Ready'}
							</ThemedText>
						</View>
					</View>
				)}
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
				{(isPlayerTurn || isHost) && (
					<ThemedText style={styles.mapHint}>Click on a tile to see available actions.</ThemedText>
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
				{sharedMap ? (
					<InteractiveMap
						map={sharedMap}
						isEditable={isHost && isMapEditMode}
						// Allow token dragging for hosts during gameplay (not just edit mode)
						onTokenDragEnd={isHost ? async (token, x, y) => {
							try {
								// Skip if invalid coordinates (deletion case)
								if (x === -1 && y === -1) {
									return;
								}

								// For NPCs, we need to pass npcId instead of characterId
								const tokenData: {
									id: string;
									tokenType: 'player' | 'npc' | 'object';
									x: number;
									y: number;
									characterId?: string;
									npcId?: string;
									label: string;
									color?: string;
									overrideValidation: boolean;
								} = {
									id: token.id,
									tokenType: token.type,
									x,
									y,
									label: token.label,
									color: token.color,
									overrideValidation: true, // DM override - can move at any time
								};

								// Set the appropriate ID field based on token type
								if (token.type === 'npc' && token.entityId) {
									tokenData.npcId = token.entityId;
								} else if (token.type === 'player' && token.entityId) {
									tokenData.characterId = token.entityId;
								}

								// Optimistic update: update local state immediately
								if (sharedMap) {
									const updatedTokens = (sharedMap.tokens || []).map(t =>
										t.id === token.id ? { ...t, x, y } : t,
									);
									setSharedMap({ ...sharedMap, tokens: updatedTokens });
								}

								// Save to backend asynchronously
								multiplayerClient.saveMapToken(inviteCode || '', tokenData).catch(error => {
									console.error('Failed to save token movement:', error);
									// Revert optimistic update on error
									if (sharedMap) {
										const revertedTokens = (sharedMap.tokens || []).map(t =>
											t.id === token.id ? { ...t, x: token.x, y: token.y } : t,
										);
										setSharedMap({ ...sharedMap, tokens: revertedTokens });
										Alert.alert('Error', 'Failed to save movement. Changes reverted.');
									}
								});

								// Refresh map state in background (non-blocking)
								refreshSharedMap().catch(console.error);
							} catch (error) {
								console.error('Failed to move token:', error);
								Alert.alert('Error', 'Failed to move token');
							}
						} : undefined}
						highlightTokenId={currentCharacterId || undefined}
						onTilePress={
							npcPlacementMode && isHost
								? async (x, y) => {
									if (!inviteCode || !sharedMap || !npcPlacementMode) return;
									try {
										await multiplayerClient.placeNpc(inviteCode, {
											npcId: npcPlacementMode.npcId,
											x,
											y,
											label: npcPlacementMode.npcName,
										});
										// Refresh both map and game state to ensure NPC appears in character list
										await refreshSharedMap();
										setTimeout(() => {
											loadGameState();
										}, 300);
										setNpcPlacementMode(null);
										Alert.alert('Success', `${npcPlacementMode.npcName} placed on map and added to character list`);
									} catch (error) {
										console.error('Failed to place NPC:', error);
										Alert.alert('Error', error instanceof Error ? error.message : 'Failed to place NPC');
									}
								}
								: elementPlacementMode && isHost
									? async (x, y) => {
										if (!inviteCode || !sharedMap) return;
										try {
											await multiplayerClient.placeMapElement(inviteCode, elementPlacementMode, x, y);
											await refreshSharedMap();
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
			<View style={styles.statusBar}>
				<ThemedText style={styles.statusText}>{wsConnected ? '🟢 Connected' : '🟡 Polling'}</ThemedText>
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
										const response = await multiplayerClient.endTurn(inviteCode);
										if (response) {
											setGameState(response);
										} else {
											setTimeout(() => {
												loadGameState();
											}, 500);
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
											await multiplayerClient.resumeTurn(inviteCode || '');
											setTimeout(() => {
												loadGameState();
											}, 500);
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
											await multiplayerClient.interruptTurn(inviteCode || '');
											setTimeout(() => {
												loadGameState();
											}, 500);
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
											await multiplayerClient.stopGame(inviteCode);
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
				{isMobile ? (
					// Mobile: Stacked layout
					<ScrollView
						style={styles.scrollView}
						contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
					>
						<PlayerCharacterList
							characters={gameState.characters}
							currentPlayerId={currentCharacterId}
							npcTokens={sharedMap?.tokens?.filter(t => t.type === 'npc') || []}
							activeTurnEntityId={gameState?.activeTurn?.entityId}
							onCharacterSelect={
								isHost
									? handleCharacterSelect
									: (characterId: string, type: 'player' | 'npc') => {
										setSelectedCharacterForView({ id: characterId, type });
										setShowCharacterViewModal(true);
									}
							}
							canSelect={true}
							initiativeOrder={gameState.initiativeOrder}
						/>
						{renderMapSection()}
					</ScrollView>
				) : (
					// Tablet/Desktop: Side-by-side layout
					<View style={styles.desktopLayout}>
						<View style={styles.sidebar}>
							<PlayerCharacterList
								characters={gameState.characters}
								currentPlayerId={currentCharacterId}
								npcTokens={sharedMap?.tokens?.filter(t => t.type === 'npc') || []}
								activeTurnEntityId={gameState?.activeTurn?.entityId}
								onCharacterSelect={
									isHost
										? handleCharacterSelect
										: (characterId: string, type: 'player' | 'npc') => {
											setSelectedCharacterForView({ id: characterId, type });
											setShowCharacterViewModal(true);
										}
								}
								canSelect={true}
								initiativeOrder={gameState.initiativeOrder}
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
									<ThemedText style={styles.warningHint}>
										Go to the map editor to place these characters.
									</ThemedText>
								</View>
							)}
						</View>
						<View style={styles.mainContent}>
							{renderMapSection()}
							{isHost && (
								<View style={styles.mapSwitcherContainer}>
									<TouchableOpacity
										style={styles.mapSwitchButton}
										onPress={() => setShowMapSwitcher(!showMapSwitcher)}
									>
										<ThemedText style={styles.mapSwitchButtonText}>
											{showMapSwitcher ? 'Hide Map Switcher' : 'Switch Map'}
										</ThemedText>
									</TouchableOpacity>
									{showMapSwitcher && (
										<View style={styles.mapSwitcherPanel}>
											<ThemedText style={styles.mapSwitcherTitle}>Available Maps</ThemedText>
											{availableMaps.length === 0 ? (
												<ThemedText style={styles.mapSwitcherEmpty}>Loading maps...</ThemedText>
											) : (
												<ScrollView style={styles.mapSwitcherList}>
													{availableMaps.map(map => (
														<TouchableOpacity
															key={map.id}
															style={[
																styles.mapSwitcherItem,
																sharedMap?.id === map.id && styles.mapSwitcherItemActive,
															]}
															onPress={() => handleSwitchMap(map.id)}
															disabled={switchingMap || sharedMap?.id === map.id}
														>
															<ThemedText
																style={[
																	styles.mapSwitcherItemText,
																	sharedMap?.id === map.id && styles.mapSwitcherItemTextActive,
																]}
															>
																{map.name}
																{sharedMap?.id === map.id && ' (Current)'}
															</ThemedText>
														</TouchableOpacity>
													))}
												</ScrollView>
											)}
										</View>
									)}
								</View>
							)}
						</View>
					</View>
				)}
			</View>

			{/* Notifications Panel */}
			<NotificationsPanel
				messages={gameState?.messages || []}
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
							await multiplayerClient.deleteMapToken(inviteCode, selectedToken.id);
							await refreshSharedMap();
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
					visible={showCharacterDMModal}
					character={
						selectedCharacterForDM.type === 'player'
							? gameState.characters.find(c => c.id === selectedCharacterForDM.id) || null
							: null
					}
					npcToken={
						selectedCharacterForDM.type === 'npc'
							? sharedMap?.tokens.find(t => t.id === selectedCharacterForDM.id) || null
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
					initiativeOrder={gameState?.initiativeOrder}
					npcStats={npcStats}
				/>
			)}

			{/* Character View Modal (Players) */}
			{selectedCharacterForView && (
				<CharacterViewModal
					visible={showCharacterViewModal}
					character={
						selectedCharacterForView.type === 'player'
							? gameState.characters.find(c => c.id === selectedCharacterForView.id) || null
							: null
					}
					npcToken={
						selectedCharacterForView.type === 'npc'
							? sharedMap?.tokens.find(t => t.id === selectedCharacterForView.id) || null
							: null
					}
					onClose={() => {
						setShowCharacterViewModal(false);
						setSelectedCharacterForView(null);
					}}
					isNPC={selectedCharacterForView.type === 'npc'}
					showFullStats={selectedCharacterForView.type === 'player'} // Full stats for players, limited for NPCs
					initiativeOrder={gameState?.initiativeOrder}
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
				}}
				character={
					selectedCharacterForAction
						? gameState?.characters.find(c => c.id === selectedCharacterForAction) || null
						: currentCharacterId
							? gameState?.characters.find(c => c.id === currentCharacterId) || null
							: null
				}
				isDM={isHost && !!selectedCharacterForAction}
				onSelect={async (action) => {
					if (!inviteCode) return;

					const characterId = selectedCharacterForAction || currentCharacterId;
					if (!characterId) return;

					const isActiveEntity = gameState?.activeTurn?.entityId === characterId;
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
							await multiplayerClient.castSpell(inviteCode, characterId, action.name);
						} else {
							await multiplayerClient.performAction(inviteCode, characterId, action.type);
						}
						if (action.type === 'cast_spell' || action.type === 'basic_attack') {
							await updateTurnUsage({ majorActionUsed: true }, characterId);
						} else if (action.type === 'heal_potion' || action.type === 'use_item') {
							await updateTurnUsage({ minorActionUsed: true }, characterId);
						}
						setTimeout(() => {
							loadGameState();
						}, 500);
						Alert.alert('Success', `${action.name} performed!`);
					} catch (error) {
						console.error('Failed to perform action:', error);
						Alert.alert('Error', error instanceof Error ? error.message : 'Failed to perform action');
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
						if (!inviteCode || !sharedMap) return;
						// For custom NPCs, we'll place them at the center of the map
						// The user can move them later
						const centerX = Math.floor((sharedMap.width || 20) / 2);
						const centerY = Math.floor((sharedMap.height || 20) / 2);
						try {
							await multiplayerClient.placeNpc(inviteCode, {
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
								label: customNpc.name,
							});
							await refreshSharedMap();
							setTimeout(() => {
								loadGameState();
							}, 300);
							Alert.alert('Success', `${customNpc.name} created and placed on map`);
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
								{gameState?.characters && gameState.characters.length > 0 && (
									<>
										<ThemedText style={styles.characterTurnSelectorSectionTitle}>Player Characters</ThemedText>
										{gameState.characters.map((character) => (
											<TouchableOpacity
												key={character.id}
												style={styles.characterTurnSelectorItem}
												onPress={async () => {
													if (!inviteCode) return;
													try {
														const response = await multiplayerClient.startCharacterTurn(inviteCode, character.id, 'player');
														if (response) {
															setGameState(response);
														} else {
															setTimeout(() => {
																loadGameState();
															}, 500);
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
								{sharedMap?.tokens?.filter(t => t.type === 'npc').length && (sharedMap?.tokens?.filter(t => t.type === 'npc').length ?? 0) > 0 && (
									<>
										<ThemedText style={styles.characterTurnSelectorSectionTitle}>NPCs</ThemedText>
										{sharedMap?.tokens
											?.filter(t => t.type === 'npc')
											.map((token) => (
												<TouchableOpacity
													key={token.id}
													style={styles.characterTurnSelectorItem}
													onPress={async () => {
														if (!inviteCode) return;
														try {
															// Use token.id (not token.entityId) to match initiative order entityId
															const response = await multiplayerClient.startCharacterTurn(inviteCode, token.id, 'npc');
															if (response) {
																setGameState(response);
															} else {
																setTimeout(() => {
																	loadGameState();
																}, 500);
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
								{(!gameState?.characters || gameState.characters.length === 0) &&
									(!sharedMap?.tokens?.filter(t => t.type === 'npc').length || (sharedMap?.tokens?.filter(t => t.type === 'npc').length ?? 0) === 0) && (
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
		padding: 12,
		marginBottom: 16,
		backgroundColor: '#FFF9EF',
		gap: 8,
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
