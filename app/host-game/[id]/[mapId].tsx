/* eslint-disable unicorn/filename-case */

import { useAuth } from 'expo-auth-template/frontend';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppFooter } from '@/components/app-footer';
import { CharacterDMModal } from '@/components/character-dm-modal';
import { InteractiveMap } from '@/components/map/interactive-map';
import { TileActionMenu, type TileAction } from '@/components/map/tile-action-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useGameCharacters } from '@/hooks/api/use-character-queries';
import {
	useDeleteMapToken,
	useGenerateMap,
	useMapState,
	useMutateTerrain,
	useNpcDefinitions,
	usePlaceNpc,
	usePlacePlayerToken,
	useSaveMapToken,
	useUpdateMapState,
} from '@/hooks/api/use-map-queries';
import { Character } from '@/types/character';
import { MapToken, NpcDefinition } from '@/types/multiplayer-map';

type MapEditorMode = 'npc' | 'player' | 'road' | 'tree' | 'water' | 'mountain' | 'erase';
type MapPresetOption = 'forest' | 'road' | 'dungeon' | 'town';

const MAP_PRESETS: MapPresetOption[] = ['forest', 'road', 'dungeon', 'town'];
const MAP_EDITOR_MODES: Array<{ key: MapEditorMode; label: string }> = [
	{ key: 'npc', label: 'NPC' },
	{ key: 'player', label: 'Player' },
	{ key: 'road', label: 'Road' },
	{ key: 'tree', label: 'Tree' },
	{ key: 'water', label: 'Water' },
	{ key: 'mountain', label: 'Mountain' },
	{ key: 'erase', label: 'Erase' },
];

// Map NPC roles and character classes to SVG icons
const getTokenSvg = (tokenData: { type: 'npc' | 'player'; role?: string; label?: string; icon?: string; class?: string }): string => {
	// If icon is provided and it's an SVG, use it
	if (tokenData.icon && tokenData.icon.startsWith('<svg')) {
		return tokenData.icon;
	}

	// For NPCs, map by role
	if (tokenData.type === 'npc') {
		const role = (tokenData.role || '').toLowerCase();
		if (role.includes('vendor') || role.includes('merchant') || role.includes('shop')) {
			return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="8" fill="#FFD700" stroke="#FFA500" stroke-width="1"/><text x="10" y="14" font-size="12" text-anchor="middle" fill="#000">$</text></svg>';
		}
		if (role.includes('scout') || role.includes('ranger') || role.includes('tracker')) {
			return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="8" r="3" fill="none" stroke="#333" stroke-width="1.5"/><line x1="10" y1="11" x2="10" y2="15" stroke="#333" stroke-width="1.5"/><line x1="7" y1="13" x2="13" y2="13" stroke="#333" stroke-width="1.5"/></svg>';
		}
		if (role.includes('sentinel') || role.includes('guard') || role.includes('watch')) {
			return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="4" width="8" height="12" fill="#666" stroke="#333" stroke-width="1"/><rect x="8" y="6" width="4" height="2" fill="#333"/><rect x="8" y="9" width="4" height="2" fill="#333"/></svg>';
		}
		if (role.includes('healer') || role.includes('cleric') || role.includes('priest')) {
			return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 4 L10 16 M4 10 L16 10" stroke="#FF0000" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="10" r="6" fill="none" stroke="#FF0000" stroke-width="1"/></svg>';
		}
		if (role.includes('mage') || role.includes('wizard') || role.includes('sorcerer')) {
			return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2 L12 8 L18 8 L13 12 L15 18 L10 14 L5 18 L7 12 L2 8 L8 8 Z" fill="#9B59B6" stroke="#6A1B9A" stroke-width="0.5"/></svg>';
		}
		if (role.includes('warrior') || role.includes('fighter') || role.includes('soldier')) {
			return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2 L12 6 L16 6 L13 9 L15 13 L10 10 L5 13 L7 9 L4 6 L8 6 Z" fill="#666" stroke="#333" stroke-width="0.5"/></svg>';
		}
		if (role.includes('rogue') || role.includes('thief') || role.includes('assassin')) {
			return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2 L12 7 L17 5 L14 10 L19 12 L14 14 L17 19 L12 17 L10 22 L8 17 L3 19 L6 14 L1 12 L6 10 L3 5 L8 7 Z" fill="#333" stroke="#000" stroke-width="0.5"/></svg>';
		}
		if (role.includes('bard') || role.includes('minstrel')) {
			return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M5 5 Q10 2 15 5 Q10 8 5 5" fill="none" stroke="#FF6B6B" stroke-width="1.5"/><circle cx="7" cy="6" r="1" fill="#FF6B6B"/><circle cx="13" cy="6" r="1" fill="#FF6B6B"/></svg>';
		}
		if (role.includes('blacksmith') || role.includes('smith')) {
			return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="6" width="4" height="8" fill="#8B4513" stroke="#654321" stroke-width="1"/><rect x="9" y="4" width="2" height="2" fill="#654321"/></svg>';
		}
		if (role.includes('innkeeper') || role.includes('tavern')) {
			return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="8" width="8" height="6" fill="#8B4513" stroke="#654321" stroke-width="1"/><rect x="7" y="9" width="6" height="4" fill="#FFD700"/></svg>';
		}
		// Default NPC - person icon
		return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="7" r="3" fill="#4A90E2" stroke="#2E5C8A" stroke-width="1"/><path d="M5 18 Q5 13 10 13 Q15 13 15 18" fill="#4A90E2" stroke="#2E5C8A" stroke-width="1"/></svg>';
	}

	// For players, map by class
	if (tokenData.type === 'player') {
		const className = (tokenData.class || '').toLowerCase();
		if (className.includes('fighter')) {
			return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2 L12 6 L16 6 L13 9 L15 13 L10 10 L5 13 L7 9 L4 6 L8 6 Z" fill="#C0C0C0" stroke="#666" stroke-width="0.5"/></svg>';
		}
		if (className.includes('rogue')) {
			return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2 L12 7 L17 5 L14 10 L19 12 L14 14 L17 19 L12 17 L10 22 L8 17 L3 19 L6 14 L1 12 L6 10 L3 5 L8 7 Z" fill="#333" stroke="#000" stroke-width="0.5"/></svg>';
		}
		if (className.includes('wizard')) {
			return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2 L12 8 L18 8 L13 12 L15 18 L10 14 L5 18 L7 12 L2 8 L8 8 Z" fill="#9B59B6" stroke="#6A1B9A" stroke-width="0.5"/></svg>';
		}
		if (className.includes('cleric')) {
			return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 4 L10 16 M4 10 L16 10" stroke="#FF0000" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="10" r="6" fill="none" stroke="#FF0000" stroke-width="1"/></svg>';
		}
		if (className.includes('ranger')) {
			return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2 L12 6 L16 2 L14 10 L20 10 L14 12 L16 20 L12 16 L10 20 L8 16 L4 20 L6 12 L0 10 L6 10 L4 2 L8 6 Z" fill="#228B22" stroke="#006400" stroke-width="0.5"/></svg>';
		}
		if (className.includes('paladin')) {
			return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="4" width="8" height="12" fill="#FFD700" stroke="#FFA500" stroke-width="1"/><path d="M10 6 L11 9 L14 9 L11.5 11 L12.5 14 L10 12 L7.5 14 L8.5 11 L6 9 L9 9 Z" fill="#FFA500"/></svg>';
		}
		if (className.includes('warlock')) {
			return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2 L12 8 L18 8 L13 12 L15 18 L10 14 L5 18 L7 12 L2 8 L8 8 Z" fill="#8B0000" stroke="#4B0000" stroke-width="0.5"/></svg>';
		}
		if (className.includes('barbarian')) {
			return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2 L12 6 L16 6 L13 9 L15 13 L10 10 L5 13 L7 9 L4 6 L8 6 Z" fill="#8B0000" stroke="#4B0000" stroke-width="0.5"/></svg>';
		}
		if (className.includes('bard')) {
			return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M5 5 Q10 2 15 5 Q10 8 5 5" fill="none" stroke="#FF6B6B" stroke-width="1.5"/><circle cx="7" cy="6" r="1" fill="#FF6B6B"/><circle cx="13" cy="6" r="1" fill="#FF6B6B"/></svg>';
		}
		if (className.includes('sorcerer')) {
			return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="6" fill="#FF69B4" stroke="#FF1493" stroke-width="1"/><circle cx="10" cy="10" r="3" fill="#FFB6C1"/></svg>';
		}
		if (className.includes('druid')) {
			return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2 Q6 6 6 10 Q6 14 10 18 Q14 14 14 10 Q14 6 10 2" fill="#228B22" stroke="#006400" stroke-width="0.5"/><circle cx="10" cy="10" r="2" fill="#32CD32"/></svg>';
		}
		if (className.includes('monk')) {
			return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="6" fill="#FFA500" stroke="#FF8C00" stroke-width="1"/><circle cx="10" cy="10" r="3" fill="#FFD700"/></svg>';
		}
		if (className.includes('artificer')) {
			return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="8" height="8" fill="#4169E1" stroke="#000080" stroke-width="1"/><rect x="8" y="8" width="4" height="4" fill="#87CEEB"/></svg>';
		}
		// Default player - wizard hat
		return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2 L12 8 L18 8 L13 12 L15 18 L10 14 L5 18 L7 12 L2 8 L8 8 Z" fill="#9B59B6" stroke="#6A1B9A" stroke-width="0.5"/></svg>';
	}

	// Fallback - person icon
	return '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="7" r="3" fill="#4A90E2" stroke="#2E5C8A" stroke-width="1"/><path d="M5 18 Q5 13 10 13 Q15 13 15 18" fill="#4A90E2" stroke="#2E5C8A" stroke-width="1"/></svg>';
};

// Improved DraggableCard component with proper HTML5 drag-and-drop
const DraggableCard = ({
	tokenData,
	onPress,
	style,
	children,
}: {
	tokenData: any;
	onPress: () => void;
	style: any;
	children: React.ReactNode;
}) => {
	const containerRef = useRef<View>(null);
	const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);

	useEffect(() => {
		if (Platform.OS === 'web' && containerRef.current) {
			// Use setTimeout to ensure DOM is ready
			const timeoutId = setTimeout(() => {
				const element = containerRef.current as any;
				if (!element) return;

				// Try multiple ways to find the DOM node
				let domNode: HTMLElement | null = null;

				// Method 1: Direct access if it's already a DOM element
				if (element.nodeType === 1) {
					domNode = element;
				}
				// Method 2: React Native Web's internal structure
				else if (element._nativeNode) {
					domNode = element._nativeNode;
				}
				// Method 3: First child if View wraps content
				else if (element.firstChild && element.firstChild.nodeType === 1) {
					domNode = element.firstChild;
				}
				// Method 4: Use querySelector to find the actual div
				else if (element.querySelector) {
					domNode = element.querySelector('div');
				}

				if (domNode && typeof domNode.addEventListener === 'function') {
					domNode.draggable = true;

					// Prevent text selection
					domNode.style.userSelect = 'none';
					(domNode.style as any).webkitUserSelect = 'none';
					(domNode.style as any).MozUserSelect = 'none';
					(domNode.style as any).msUserSelect = 'none';
					domNode.style.cursor = 'grab';

					// Create drag preview image function (single icon, 1 tile size)
					// Use SVG converted to data URL (works synchronously)
					let dragImageElement: HTMLImageElement | null = null;

					const createDragImage = (svgString: string): HTMLImageElement => {
						// Remove previous drag image if it exists
						if (dragImageElement && dragImageElement.parentNode) {
							dragImageElement.parentNode.removeChild(dragImageElement);
						}

						// Convert SVG to data URL (synchronous)
						const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

						// Create an image element from SVG data URL
						const img = new Image();
						img.src = svgDataUrl;
						img.width = 28;
						img.height = 28;
						img.style.position = 'absolute';
						img.style.top = '-9999px';
						img.style.left = '-9999px';
						img.style.pointerEvents = 'none';
						document.body.appendChild(img);

						dragImageElement = img;

						return img;
					};

					const handleDragStart = (e: DragEvent) => {
						e.stopPropagation();

						if (!e.dataTransfer) return;

						// Store the mouse position relative to the element
						let offsetX = 14; // Default to center
						let offsetY = 14;

						if (domNode) {
							const rect = domNode.getBoundingClientRect();
							const mouseX = e.clientX - rect.left;
							const mouseY = e.clientY - rect.top;
							// Clamp offset to element bounds (use actual element size, not fixed 28)
							const elementWidth = rect.width || 28;
							const elementHeight = rect.height || 28;
							offsetX = Math.max(0, Math.min(elementWidth, mouseX));
							offsetY = Math.max(0, Math.min(elementHeight, mouseY));
							dragStartPosRef.current = { x: offsetX, y: offsetY };
						}

						e.dataTransfer.effectAllowed = 'move';
						e.dataTransfer.setData('application/json', JSON.stringify(tokenData));

						// Get appropriate SVG icon based on type/role/class
						const svgIcon = getTokenSvg(tokenData);
						console.log('Creating drag image with SVG for token:', tokenData);

						// Create drag image element from SVG (using data URL for synchronous loading)
						const dragImage = createDragImage(svgIcon);

						// The offset should be relative to where the mouse clicked
						// Clamp to the drag image size (28x28)
						const dragOffsetX = Math.min(14, Math.max(0, offsetX));
						const dragOffsetY = Math.min(14, Math.max(0, offsetY));

						// Set drag image - data URL should work synchronously
						e.dataTransfer.setDragImage(dragImage, dragOffsetX, dragOffsetY);

						if (domNode) {
							domNode.style.opacity = '0.5';
						}
					};

					const handleDragEndCleanup = (e: DragEvent) => {
						// Clean up drag image element after a short delay to ensure drag completes
						setTimeout(() => {
							if (dragImageElement && dragImageElement.parentNode) {
								dragImageElement.parentNode.removeChild(dragImageElement);
								dragImageElement = null;
							}
						}, 100);
						if (domNode) {
							domNode.style.opacity = '1';
						}
					};

					domNode.addEventListener('dragstart', handleDragStart);
					domNode.addEventListener('dragend', handleDragEndCleanup);

					return () => {
						if (domNode) {
							domNode.removeEventListener('dragstart', handleDragStart);
							domNode.removeEventListener('dragend', handleDragEndCleanup);
						}
						// Clean up drag image element if it still exists
						if (dragImageElement && dragImageElement.parentNode) {
							dragImageElement.parentNode.removeChild(dragImageElement);
							dragImageElement = null;
						}
					};
				}
			}, 0);

			return () => {
				clearTimeout(timeoutId);
			};
		}
	}, [tokenData]);

	if (Platform.OS === 'web') {
		return (
			<View
				ref={containerRef}
				style={[style, { cursor: 'grab', userSelect: 'none' }]}
			>
				<TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ flex: 1 }}>
					{children}
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<TouchableOpacity style={style} onPress={onPress} activeOpacity={0.7}>
			{children}
		</TouchableOpacity>
	);
};

const HostGameMapEditorScreen: React.FC = () => {
	const params = useLocalSearchParams<{ id: string; mapId: string }>();
	const inviteCode = params.id;
	const mapId = params.mapId;
	const [selectedNpc, setSelectedNpc] = useState<NpcDefinition | null>(null);
	const [selectedPlayer, setSelectedPlayer] = useState<Character | null>(null);
	const [showAddNpcModal, setShowAddNpcModal] = useState(false);
	const [newNpcForm, setNewNpcForm] = useState({
		name: '',
		role: '',
		alignment: 'neutral',
		disposition: 'friendly' as 'friendly' | 'hostile' | 'neutral' | 'vendor',
		description: '',
		maxHealth: 18,
		armorClass: 12,
		color: '#4A6741',
		icon: '',
	});
	const [editorMode, setEditorMode] = useState<MapEditorMode>('npc');
	const [mapPreset, setMapPreset] = useState<MapPresetOption>('forest');
	const [mutatingTerrain, setMutatingTerrain] = useState(false);
	const draggedTiles = useRef<Set<string>>(new Set());
	const terrainMutationsInFlight = useRef(0);
	const [tileMenuVisible, setTileMenuVisible] = useState(false);
	const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);
	const [showCharacterDMModal, setShowCharacterDMModal] = useState(false);
	const [selectedToken, setSelectedToken] = useState<MapToken | null>(null);
	const insets = useSafeAreaInsets();
	const { user } = useAuth();

	// Use query hooks
	const shouldFetchMap = inviteCode && mapId !== 'new-map';
	const { data: mapState, isLoading: mapLoading, error: mapError } = useMapState(
		shouldFetchMap ? inviteCode : null,
	);
	const { data: npcDefinitionsData } = useNpcDefinitions(inviteCode);
	const npcPalette = npcDefinitionsData?.npcs || [];
	const { data: charactersData, isLoading: charactersLoading } = useGameCharacters(inviteCode);
	const lobbyCharacters = charactersData?.characters || [];

	// Mutation hooks
	const generateMapMutation = useGenerateMap(inviteCode || '');
	const mutateTerrainMutation = useMutateTerrain(inviteCode || '');
	const updateMapStateMutation = useUpdateMapState(inviteCode || '');
	const placeNpcMutation = usePlaceNpc(inviteCode || '');
	const placePlayerTokenMutation = usePlacePlayerToken(inviteCode || '');
	const saveMapTokenMutation = useSaveMapToken(inviteCode || '');
	const deleteMapTokenMutation = useDeleteMapToken(inviteCode || '');

	const applyTerrainEdit = useCallback(
		async (x: number, y: number) => {
			if (!inviteCode || !mapState || editorMode === 'npc' || editorMode === 'player') {
				return;
			}

			const terrainType =
				editorMode === 'road'
					? 'road'
					: editorMode === 'tree'
						? 'tree'
						: editorMode === 'water'
							? 'water'
							: editorMode === 'mountain'
								? 'mountain'
								: mapState.defaultTerrain ?? 'stone';
			const featureType =
				editorMode === 'road'
					? 'road'
					: editorMode === 'tree'
						? 'tree'
						: editorMode === 'water'
							? 'water'
							: editorMode === 'mountain'
								? 'mountain'
								: null;
			const isBlocked = editorMode === 'tree' || editorMode === 'water' || editorMode === 'mountain';
			const metadata =
				editorMode === 'road'
					? { variant: 'stone' }
					: editorMode === 'tree'
						? { variant: 'oak' }
						: editorMode === 'water'
							? { depth: 'shallow' }
							: editorMode === 'mountain'
								? { variant: 'peak' }
								: {};

			terrainMutationsInFlight.current += 1;
			setMutatingTerrain(true);
			try {
				await mutateTerrainMutation.mutateAsync({
					path: `/games/${inviteCode}/map/terrain`,
					body: {
						tiles: [
							{
								x,
								y,
								terrainType,
								featureType,
								isBlocked,
								metadata,
							},
						],
					},
				});
			} catch (error) {
				Alert.alert('Edit Failed', error instanceof Error ? error.message : 'Unable to edit terrain');
			} finally {
				terrainMutationsInFlight.current -= 1;
				if (terrainMutationsInFlight.current <= 0) {
					setMutatingTerrain(false);
				}
			}
		},
		[editorMode, mapState, inviteCode, mutateTerrainMutation],
	);

	const handleTilePress = useCallback(
		async (x: number, y: number) => {
			if (!inviteCode || !mapState) {
				return;
			}

			if (editorMode === 'npc') {
				if (!selectedNpc) {
					Alert.alert('Select NPC', 'Choose an NPC from the palette first.');
					return;
				}

				try {
					await placeNpcMutation.mutateAsync({
						path: `/games/${inviteCode}/npcs`,
						body: {
							npcId: selectedNpc.slug,
							mapId: mapState?.id || (mapId !== 'new-map' ? mapId : undefined),
							x,
							y,
							label: selectedNpc.name,
						},
					});
				} catch (error) {
					Alert.alert('Placement Failed', error instanceof Error ? error.message : 'Unable to place NPC');
				}
				return;
			}

			if (editorMode === 'player') {
				if (!selectedPlayer) {
					Alert.alert('Select Player', 'Choose a player from the list first.');
					return;
				}

				try {
					await placePlayerTokenMutation.mutateAsync({
						path: `/games/${inviteCode}/map/tokens`,
						body: {
							characterId: selectedPlayer.id,
							x,
							y,
							label: selectedPlayer.name,
							icon: selectedPlayer.icon,
							tokenType: 'player',
						},
					});
				} catch (error) {
					Alert.alert('Placement Failed', error instanceof Error ? error.message : 'Unable to place player');
				}
				return;
			}

			await applyTerrainEdit(x, y);
		},
		[
			applyTerrainEdit,
			inviteCode,
			editorMode,
			selectedNpc,
			selectedPlayer,
			mapState,
			mapId,
			placeNpcMutation,
			placePlayerTokenMutation,
		],
	);

	const handleTileDrag = useCallback(
		(x: number, y: number) => {
			if (editorMode === 'npc' || editorMode === 'player') {
				return;
			}

			const key = `${x},${y}`;
			if (draggedTiles.current.has(key)) {
				return;
			}

			draggedTiles.current.add(key);
			void applyTerrainEdit(x, y);
		},
		[applyTerrainEdit, editorMode],
	);

	const handleTileDragEnd = useCallback(() => {
		draggedTiles.current.clear();
	}, []);

	const handleTokenDrop = useCallback(
		async (token: { type: 'npc' | 'player'; id: string; label: string; icon?: string; role?: string }, x: number, y: number) => {
			console.log('=== handleTokenDrop called ===');
			console.log('Token:', token);
			console.log('Position:', { x, y });
			console.log('inviteCode:', inviteCode);
			console.log('mapState exists:', !!mapState);
			console.log('npcPalette length:', npcPalette.length);
			console.log('npcPalette IDs:', npcPalette.map(n => n.id));
			console.log('lobbyCharacters length:', lobbyCharacters.length);

			if (!inviteCode || !mapState) {
				console.warn('Missing inviteCode or mapState', { inviteCode, mapState: !!mapState });
				Alert.alert('Error', 'Missing game session or map. Please refresh the page.');
				return;
			}

			if (token.type === 'npc') {
				console.log('Looking for NPC with id:', token.id);
				console.log('Token data:', token);
				console.log('NPC Palette:', npcPalette.map(n => ({ id: n.id, slug: n.slug, name: n.name })));
				// Try matching by id first, then by slug (token might have slug field)
				const npc = npcPalette.find(n =>
					n.id === token.id ||
					n.slug === token.id ||
					((token as any).slug && n.slug === (token as any).slug),
				);
				console.log('Found NPC:', npc ? { name: npc.name, id: npc.id, slug: npc.slug } : 'NOT FOUND');

				if (npc) {
					try {
						console.log('Placing NPC:', npc.name, 'at', x, y, 'with slug:', npc.slug);
						console.log('mapState.id:', mapState.id);
						console.log('mapId from route:', mapId);

						const result = await placeNpcMutation.mutateAsync({
							path: `/games/${inviteCode}/npcs`,
							body: {
								npcId: npc.slug,
								mapId: mapState.id || (mapId !== 'new-map' ? mapId : undefined),
								x,
								y,
								label: npc.name,
							},
						});
						console.log('Place NPC API response:', result);
						console.log('NPC placed successfully, map refreshed');
						Alert.alert('Success', `${npc.name} placed at (${x}, ${y})`);
					} catch (error) {
						console.error('NPC placement error:', error);
						const errorMessage = error instanceof Error ? error.message : 'Unable to place NPC';
						console.error('Error details:', error);
						Alert.alert('Placement Failed', errorMessage);
					}
				} else {
					console.warn('NPC not found in palette:', token.id);
					console.warn('Available NPC IDs:', npcPalette.map(n => ({ id: n.id, slug: n.slug, name: n.name })));
					Alert.alert('Error', `NPC with ID "${token.id}" not found in palette. Available: ${npcPalette.length} NPCs`);
				}
			} else if (token.type === 'player') {
				console.log('Looking for Player with id:', token.id);
				const character = lobbyCharacters.find(c => c.id === token.id);
				console.log('Found Character:', character ? { name: character.name, id: character.id } : 'NOT FOUND');

				if (character) {
					try {
						console.log('Placing Player:', character.name, 'at', x, y);
						console.log('mapState.id:', mapState.id);
						console.log('mapId from route:', mapId);

						const result = await placePlayerTokenMutation.mutateAsync({
							path: `/games/${inviteCode}/map/tokens`,
							body: {
								characterId: character.id,
								x,
								y,
								label: character.name,
								icon: character.icon,
								tokenType: 'player',
							},
						});
						console.log('Place Player API response:', result);
						console.log('Player placed successfully, map refreshed');
						Alert.alert('Success', `${character.name} placed at (${x}, ${y})`);
					} catch (error) {
						console.error('Player placement error:', error);
						const errorMessage = error instanceof Error ? error.message : 'Unable to place player';
						console.error('Error details:', error);
						Alert.alert('Placement Failed', errorMessage);
					}
				} else {
					console.warn('Character not found in lobby:', token.id);
					console.warn('Available Character IDs:', lobbyCharacters.map(c => ({ id: c.id, name: c.name })));
					Alert.alert('Error', `Character with ID "${token.id}" not found in lobby. Available: ${lobbyCharacters.length} characters`);
				}
			}
		},
		[inviteCode, mapState, npcPalette, lobbyCharacters, handleTilePress, placeNpcMutation, placePlayerTokenMutation],
	);

	const handleGenerateMap = useCallback(async () => {
		if (!inviteCode) {
			return;
		}

		try {
			// Delete all NPC tokens before generating new map
			if (mapState?.tokens) {
				const npcTokens = mapState.tokens.filter(token => token.type === 'npc');
				console.log(`Deleting ${npcTokens.length} NPC tokens before map generation`);

				// Delete all NPC tokens in parallel
				await Promise.all(
					npcTokens.map((token: any) =>
						deleteMapTokenMutation.mutateAsync({
							path: `/games/${inviteCode}/map/tokens/${token.id}`,
						}).catch((err: any) => {
							console.warn(`Failed to delete token ${token.id}:`, err);
						}),
					),
				);
			}

			const generated = await generateMapMutation.mutateAsync({
				path: `/games/${inviteCode}/map/generate`,
				body: {
					preset: mapPreset,
				},
			});
			console.log('Map generated:', generated.id, 'for game:', inviteCode);
			// The generateMap endpoint already sets the map as current_map_id
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unable to generate map';
			Alert.alert('Generation Failed', errorMessage);
		}
	}, [inviteCode, mapPreset, mapState, generateMapMutation, deleteMapTokenMutation]);

	const handleTileLongPress = useCallback((x: number, y: number) => {
		setSelectedTile({ x, y });
		setTileMenuVisible(true);
	}, []);

	const handleTokenLongPress = useCallback((token: MapToken) => {
		setSelectedToken(token);
		setShowCharacterDMModal(true);
	}, []);

	const handleTokenMove = useCallback(() => {
		if (!inviteCode || !selectedToken) return;
		// TODO: Implement token move API call
		Alert.alert('Not Implemented', 'Token move functionality coming soon');
	}, [inviteCode, selectedToken]);

	const handleTokenDelete = useCallback(() => {
		if (!inviteCode || !selectedToken) return;
		const deleteToken = async () => {
			try {
				await deleteMapTokenMutation.mutateAsync({
					path: `/games/${inviteCode}/map/tokens/${selectedToken.id}`,
				});
				setShowCharacterDMModal(false);
				setSelectedToken(null);
			} catch (error) {
				Alert.alert('Delete Failed', error instanceof Error ? error.message : 'Unable to delete token');
			}
		};
		void deleteToken();
	}, [inviteCode, selectedToken, deleteMapTokenMutation]);

	const handleCharacterDamage = useCallback(
		async (characterId: string, amount: number) => {
			if (!inviteCode) return;
			// TODO: Implement damage handling for map editor context if needed
			// For now, map editor is primarily for layout, but character interactions might be useful
			console.log('Damage not implemented in map editor yet', { characterId, amount });
		},
		[inviteCode],
	);

	const handleCharacterHeal = useCallback(
		async (characterId: string, amount: number) => {
			if (!inviteCode) return;
			// TODO: Implement heal handling for map editor context if needed
			console.log('Heal not implemented in map editor yet', { characterId, amount });
		},
		[inviteCode],
	);

	const handleUpdateCharacter = useCallback(
		async (updates: Partial<Character>) => {
			if (!inviteCode) return;
			// TODO: Implement character update for map editor context if needed
			console.log('Update character not implemented in map editor yet', { updates });
		},
		[inviteCode],
	);

	const getAvailableTileActions = useCallback((): TileAction[] => {
		return ['placeNpc', 'placePlayer', 'changeTerrain'];
	}, []);

	const handleTileAction = useCallback(
		(action: TileAction, x: number, y: number) => {
			if (action === 'placeNpc') {
				setEditorMode('npc');
				setTileMenuVisible(false);
			} else if (action === 'placePlayer') {
				setEditorMode('player');
				setTileMenuVisible(false);
			} else if (action === 'changeTerrain') {
				setEditorMode('road');
				setTileMenuVisible(false);
			}
		},
		[],
	);

	if (!user) {
		return (
			<ThemedView style={styles.container}>
				<Stack.Screen options={{ title: 'Map Editor', headerShown: true }} />
				<View style={styles.loaderFallback}>
					<ActivityIndicator size="large" color="#8B6914" />
					<ThemedText style={styles.loadingText}>Loading...</ThemedText>
				</View>
				<AppFooter />
			</ThemedView>
		);
	}

	return (
		<ThemedView style={styles.container}>
			<Stack.Screen options={{ title: 'Map Editor', headerShown: true }} />
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={true}
			>
				<View style={styles.editorContainer}>
					<View style={styles.editorToolbar}>
						<View style={styles.workspaceHeader}>
							<ThemedText type="subtitle">Map Tools</ThemedText>
							<View style={styles.toolbarActions}>
								<TouchableOpacity
									style={styles.mapRefreshButton}
									onPress={() => {
										// Map state will refetch automatically via useMapState
									}}
								>
									<ThemedText style={styles.mapRefreshButtonText}>Refresh</ThemedText>
								</TouchableOpacity>
								{mutatingTerrain && <ActivityIndicator size="small" color="#8B6914" />}
							</View>
						</View>
						<View style={styles.presetControls}>
							{MAP_PRESETS.map(preset => {
								const active = mapPreset === preset;
								return (
									<TouchableOpacity
										key={preset}
										style={[styles.presetButton, active && styles.presetButtonActive]}
										onPress={() => setMapPreset(preset)}
									>
										<ThemedText
											style={[styles.presetButtonText, active && styles.presetButtonTextActive]}
										>
											{preset}
										</ThemedText>
									</TouchableOpacity>
								);
							})}
							<TouchableOpacity
								style={[styles.generateButton, mapLoading && styles.buttonDisabled]}
								onPress={handleGenerateMap}
								disabled={mapLoading}
							>
								<ThemedText style={styles.generateButtonText}>
									{mapLoading ? 'Working...' : 'Generate'}
								</ThemedText>
							</TouchableOpacity>
						</View>
						<View style={styles.editorModes}>
							{MAP_EDITOR_MODES.map(mode => {
								const active = editorMode === mode.key;
								return (
									<TouchableOpacity
										key={mode.key}
										style={[styles.modeButton, active && styles.modeButtonActive]}
										onPress={() => setEditorMode(mode.key)}
									>
										<ThemedText style={[styles.modeButtonText, active && styles.modeButtonTextActive]}>
											{mode.label}
										</ThemedText>
									</TouchableOpacity>
								);
							})}
						</View>
					</View>
				</View>
				<View style={styles.dmWorkspace}>
					{mapError && <ThemedText style={styles.errorText}>{mapError.message || 'Failed to load map'}</ThemedText>}
					{mapLoading ? (
						<View style={styles.loadingContainer}>
							<ActivityIndicator size="small" color="#8B6914" />
							<ThemedText style={styles.loadingText}>Loading map...</ThemedText>
						</View>
					) : mapState ? (
						<>
							<InteractiveMap
								map={mapState}
								isEditable
								onTilePress={handleTilePress}
								onTileDrag={handleTileDrag}
								onTileDragEnd={handleTileDragEnd}
								onTileLongPress={handleTileLongPress}
								onTokenLongPress={handleTokenLongPress}
								onTokenDrop={handleTokenDrop}
								onTokenDragEnd={async (token, x, y) => {
									// If dragged outside map bounds (x === -1, y === -1), delete the token
									if (x === -1 && y === -1 && token.type === 'npc') {
										try {
											await deleteMapTokenMutation.mutateAsync({
												path: `/games/${inviteCode}/map/tokens/${token.id}`,
											});
											Alert.alert('Success', `${token.label || 'NPC'} removed from map`);
										} catch (error) {
											Alert.alert('Error', error instanceof Error ? error.message : 'Failed to remove NPC');
										}
									}
								}}
							/>
							<TileActionMenu
								visible={tileMenuVisible}
								x={selectedTile?.x ?? 0}
								y={selectedTile?.y ?? 0}
								availableActions={getAvailableTileActions()}
								onAction={handleTileAction}
								onClose={() => {
									setTileMenuVisible(false);
									setSelectedTile(null);
								}}
							/>
							{/* Character DM Modal replaces TokenDetailModal */}
							{selectedToken && (
								<CharacterDMModal
									gameId={inviteCode || ''}
									visible={showCharacterDMModal}
									character={
										selectedToken.type === 'player'
											? lobbyCharacters.find(c => c.id === selectedToken.entityId || c.id === selectedToken.id) || null
											: null
									}
									npcToken={
										selectedToken.type === 'npc'
											? selectedToken
											: null
									}
									onClose={() => {
										setShowCharacterDMModal(false);
										setSelectedToken(null);
									}}
									onDamage={handleCharacterDamage}
									onHeal={handleCharacterHeal}
									onUpdateCharacter={selectedToken.type === 'player' ? handleUpdateCharacter : undefined}
								/>
							)}
						</>
					) : (
						<View style={styles.loadingContainer}>
							<ThemedText style={styles.errorText}>No map available. Click "Generate" to create one.</ThemedText>
						</View>
					)}
					<View style={styles.paletteHeader}>
						<ThemedText type="subtitle">NPC Palette ({npcPalette.length})</ThemedText>
						<TouchableOpacity
							style={styles.addNpcButton}
							onPress={() => setShowAddNpcModal(true)}
						>
							<ThemedText style={styles.addNpcButtonText}>+ Add NPC</ThemedText>
						</TouchableOpacity>
					</View>
					<ThemedText style={styles.paletteHint}>
						Select an NPC, then tap the map to place. Or drag from palette to map.
					</ThemedText>
					<ScrollView
						horizontal
						style={styles.paletteScroll}
						contentContainerStyle={styles.paletteContent}
						showsHorizontalScrollIndicator={true}
						nestedScrollEnabled={true}
						scrollEnabled={true}
						alwaysBounceHorizontal={false}
					>
						{npcPalette.length === 0 && (
							<View style={styles.emptyStateContainer}>
								<ThemedText style={styles.emptyStateText}>
									No NPC definitions available. NPCs will be loaded automatically.
								</ThemedText>
							</View>
						)}
						{npcPalette.map(npc => {
							const isSelected = selectedNpc?.id === npc.id;
							return (
								<DraggableCard
									key={npc.id}
									tokenData={{
										type: 'npc',
										id: npc.id, // Use id for matching
										slug: npc.slug, // Also include slug as fallback
										label: npc.name,
										icon: npc.icon,
										role: npc.role,
									}}
									style={[styles.npcCard, isSelected && styles.npcCardSelected]}
									onPress={() => {
										setSelectedNpc(isSelected ? null : npc);
									}}
								>
									<ThemedText style={styles.npcName}>{npc.name}</ThemedText>
									<ThemedText style={styles.npcMeta}>
										{npc.role} • {npc.alignment}
									</ThemedText>
								</DraggableCard>
							);
						})}
					</ScrollView>
					{editorMode === 'player' && (
						<View style={styles.playerPalette}>
							<View style={styles.paletteHeader}>
								<ThemedText type="subtitle">Player Selection</ThemedText>
								<ThemedText style={styles.paletteHint}>
									Select a player, then tap the map to place. Or drag from list to map.
								</ThemedText>
							</View>
							<ScrollView
								horizontal
								style={styles.paletteScroll}
								contentContainerStyle={styles.paletteContent}
								showsHorizontalScrollIndicator={false}
							>
								{charactersLoading ? (
									<ThemedText style={styles.emptyStateText}>Loading characters...</ThemedText>
								) : lobbyCharacters.length === 0 ? (
									<ThemedText style={styles.emptyStateText}>No players have joined yet.</ThemedText>
								) : (
									lobbyCharacters.map(character => {
										const isSelected = selectedPlayer?.id === character.id;
										return (
											<DraggableCard
												key={character.id}
												tokenData={{
													type: 'player',
													id: character.id,
													label: character.name,
													icon: character.icon,
													class: character.class,
												}}
												style={[styles.npcCard, isSelected && styles.npcCardSelected]}
												onPress={() => {
													setSelectedPlayer(isSelected ? null : character);
												}}
											>
												<ThemedText style={styles.npcName}>{character.name}</ThemedText>
												<ThemedText style={styles.npcMeta}>
													{character.class} • Level {character.level}
												</ThemedText>
											</DraggableCard>
										);
									})
								)}
							</ScrollView>
						</View>
					)}
					<View style={styles.actionButtons}>
						<TouchableOpacity
							style={[styles.doneButton, mapLoading && styles.doneButtonDisabled]}
							onPress={async () => {
								if (!inviteCode) {
									Alert.alert('Error', 'Missing game session');
									return;
								}

								if (!mapState) {
									Alert.alert('Error', 'No map to save. Please generate a map first.');
									return;
								}

								try {
									console.log('=== SAVING MAP ===');
									console.log('Map ID:', mapState.id);
									console.log('Game Invite Code:', inviteCode);
									console.log('Map State:', { id: mapState.id, width: mapState.width, height: mapState.height, tokens: mapState.tokens?.length || 0 });

									// Ensure the map is set as the current map for this game
									// This saves the map association and ensures it persists
									console.log('Calling updateMapState...');
									const updatedState = await updateMapStateMutation.mutateAsync({
										path: `/games/${inviteCode}/map`,
										body: {
											id: mapState.id,
										},
									});

									console.log('Map state updated successfully:', updatedState.id);
									console.log('Updated map has', updatedState.tokens?.length || 0, 'tokens');

									console.log('Map saved successfully, navigating to lobby');

									// Navigate back to the lobby screen
									router.replace(`/host-game/${inviteCode}`);
								} catch (error) {
									console.error('=== FAILED TO SAVE MAP ===');
									console.error('Error:', error);
									console.error('Error details:', error instanceof Error ? error.stack : 'Unknown error');
									const errorMessage = error instanceof Error ? error.message : 'Failed to save map';
									Alert.alert('Error', errorMessage);
								}
							}}
							disabled={mapLoading || updateMapStateMutation.isPending || !mapState}
						>
							<ThemedText style={styles.doneButtonText}>
								{updateMapStateMutation.isPending ? 'Saving...' : 'Done Editing'}
							</ThemedText>
						</TouchableOpacity>
					</View>
				</View>
			</ScrollView>

			{/* Add NPC Modal */}
			<Modal
				visible={showAddNpcModal}
				transparent
				animationType="slide"
				onRequestClose={() => setShowAddNpcModal(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<ThemedText type="title" style={styles.modalTitle}>Create New NPC</ThemedText>
							<TouchableOpacity
								onPress={() => setShowAddNpcModal(false)}
								style={styles.modalCloseButton}
							>
								<ThemedText style={styles.modalCloseText}>✕</ThemedText>
							</TouchableOpacity>
						</View>

						<ScrollView style={styles.modalScrollView}>
							<View style={styles.modalForm}>
								<ThemedText style={styles.formLabel}>Name *</ThemedText>
								<TextInput
									style={styles.formInput}
									value={newNpcForm.name}
									onChangeText={(text) => setNewNpcForm({ ...newNpcForm, name: text })}
									placeholder="NPC Name"
									placeholderTextColor="#999"
								/>

								<ThemedText style={styles.formLabel}>Role *</ThemedText>
								<TextInput
									style={styles.formInput}
									value={newNpcForm.role}
									onChangeText={(text) => setNewNpcForm({ ...newNpcForm, role: text })}
									placeholder="e.g., Guard, Merchant, Healer"
									placeholderTextColor="#999"
								/>

								<ThemedText style={styles.formLabel}>Alignment</ThemedText>
								<View style={styles.alignmentRow}>
									{['lawful', 'neutral', 'chaotic'].map(align => (
										<TouchableOpacity
											key={align}
											style={[
												styles.alignmentButton,
												newNpcForm.alignment === align && styles.alignmentButtonActive,
											]}
											onPress={() => setNewNpcForm({ ...newNpcForm, alignment: align })}
										>
											<ThemedText style={[
												styles.alignmentButtonText,
												newNpcForm.alignment === align && styles.alignmentButtonTextActive,
											]}>
												{align}
											</ThemedText>
										</TouchableOpacity>
									))}
								</View>

								<ThemedText style={styles.formLabel}>Disposition</ThemedText>
								<View style={styles.dispositionRow}>
									{['friendly', 'neutral', 'hostile', 'vendor'].map(disp => (
										<TouchableOpacity
											key={disp}
											style={[
												styles.dispositionButton,
												newNpcForm.disposition === disp && styles.dispositionButtonActive,
											]}
											onPress={() => setNewNpcForm({ ...newNpcForm, disposition: disp as any })}
										>
											<ThemedText style={[
												styles.dispositionButtonText,
												newNpcForm.disposition === disp && styles.dispositionButtonTextActive,
											]}>
												{disp}
											</ThemedText>
										</TouchableOpacity>
									))}
								</View>

								<ThemedText style={styles.formLabel}>Description</ThemedText>
								<TextInput
									style={[styles.formInput, styles.formTextArea]}
									value={newNpcForm.description}
									onChangeText={(text) => setNewNpcForm({ ...newNpcForm, description: text })}
									placeholder="Optional description"
									placeholderTextColor="#999"
									multiline
									numberOfLines={3}
								/>

								<View style={styles.statsRow}>
									<View style={styles.statInput}>
										<ThemedText style={styles.formLabel}>Max Health</ThemedText>
										<TextInput
											style={styles.formInput}
											value={newNpcForm.maxHealth.toString()}
											onChangeText={(text) => {
												const num = parseInt(text, 10);
												if (!isNaN(num)) {
													setNewNpcForm({ ...newNpcForm, maxHealth: num });
												}
											}}
											keyboardType="numeric"
											placeholder="18"
											placeholderTextColor="#999"
										/>
									</View>

									<View style={styles.statInput}>
										<ThemedText style={styles.formLabel}>Armor Class</ThemedText>
										<TextInput
											style={styles.formInput}
											value={newNpcForm.armorClass.toString()}
											onChangeText={(text) => {
												const num = parseInt(text, 10);
												if (!isNaN(num)) {
													setNewNpcForm({ ...newNpcForm, armorClass: num });
												}
											}}
											keyboardType="numeric"
											placeholder="12"
											placeholderTextColor="#999"
										/>
									</View>
								</View>

								<ThemedText style={styles.formLabel}>Icon (SVG or Emoji)</ThemedText>
								<TextInput
									style={styles.formInput}
									value={newNpcForm.icon}
									onChangeText={(text) => setNewNpcForm({ ...newNpcForm, icon: text })}
									placeholder="Leave empty for auto-generated icon"
									placeholderTextColor="#999"
								/>

								<ThemedText style={styles.formLabel}>Color</ThemedText>
								<TextInput
									style={styles.formInput}
									value={newNpcForm.color}
									onChangeText={(text) => setNewNpcForm({ ...newNpcForm, color: text })}
									placeholder="#4A6741"
									placeholderTextColor="#999"
								/>
							</View>
						</ScrollView>

						<View style={styles.modalFooter}>
							<TouchableOpacity
								style={[styles.modalButton, styles.modalButtonCancel]}
								onPress={() => {
									setShowAddNpcModal(false);
									setNewNpcForm({
										name: '',
										role: '',
										alignment: 'neutral',
										disposition: 'friendly',
										description: '',
										maxHealth: 18,
										armorClass: 12,
										color: '#4A6741',
										icon: '',
									});
								}}
							>
								<ThemedText style={styles.modalButtonCancelText}>Cancel</ThemedText>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.modalButton, styles.modalButtonSave, (!newNpcForm.name || !newNpcForm.role) && styles.modalButtonDisabled]}
								onPress={async () => {
									if (!newNpcForm.name || !newNpcForm.role || !inviteCode) {
										Alert.alert('Error', 'Name and Role are required');
										return;
									}

									try {
										// Create NPC by placing it off-map, then delete the token
										// This adds it to the NPC definitions/palette
										const result = await placeNpcMutation.mutateAsync({
											path: `/games/${inviteCode}/npcs`,
											body: {
												npcId: 'custom',
												mapId: mapState?.id || (mapId !== 'new-map' ? mapId : undefined),
												x: -1, // Off-map
												y: -1, // Off-map
												label: newNpcForm.name,
												customNpc: {
													name: newNpcForm.name,
													role: newNpcForm.role,
													alignment: newNpcForm.alignment,
													disposition: newNpcForm.disposition,
													description: newNpcForm.description || undefined,
													maxHealth: newNpcForm.maxHealth,
													armorClass: newNpcForm.armorClass,
													color: newNpcForm.color,
													icon: newNpcForm.icon || undefined,
												},
											},
										});

										// Delete the token that was created (we just wanted the NPC definition)
										if (result.tokens && result.tokens.length > 0) {
											const tokenId = result.tokens[result.tokens.length - 1].id;
											try {
												await deleteMapTokenMutation.mutateAsync({
													path: `/games/${inviteCode}/map/tokens/${tokenId}`,
												});
											} catch (err) {
												console.warn('Failed to delete off-map token:', err);
											}
										}

										// Small delay to ensure backend has fully committed the NPC definition
										await new Promise(resolve => setTimeout(resolve, 100));

										// NPC palette will refresh automatically via query invalidation
										// The placeNpc mutation will invalidate the NPC definitions query

										// Reset form and close modal
										setNewNpcForm({
											name: '',
											role: '',
											alignment: 'neutral',
											disposition: 'friendly',
											description: '',
											maxHealth: 18,
											armorClass: 12,
											color: '#4A6741',
											icon: '',
										});
										setShowAddNpcModal(false);
										Alert.alert('Success', `${newNpcForm.name} added to NPC palette`);
									} catch (error) {
										console.error('Failed to create NPC:', error);
										Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create NPC');
									}
								}}
								disabled={!newNpcForm.name || !newNpcForm.role}
							>
								<ThemedText style={styles.modalButtonSaveText}>Create NPC</ThemedText>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

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
		width: '100%',
	},
	scrollContent: {
		paddingBottom: 20,
		flexGrow: 1,
		minHeight: '100%',
	},
	editorContainer: {
		padding: 16,
		width: '100%',
	},
	editorToolbar: {
		padding: 16,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		backgroundColor: '#FFF4DF',
		gap: 12,
		marginBottom: 16,
	},
	workspaceHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	toolbarActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	mapRefreshButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		backgroundColor: '#3B2F1B',
	},
	mapRefreshButtonText: {
		color: '#F5E6D3',
		fontWeight: '600',
	},
	presetControls: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		alignItems: 'center',
	},
	presetButton: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	presetButtonActive: {
		backgroundColor: '#C9B037',
	},
	presetButtonText: {
		color: '#3B2F1B',
		fontWeight: '600',
		textTransform: 'capitalize',
	},
	presetButtonTextActive: {
		color: '#1F130A',
	},
	generateButton: {
		backgroundColor: '#3B2F1B',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 12,
	},
	generateButtonText: {
		color: '#F5E6D3',
		fontWeight: '600',
	},
	editorModes: {
		flexDirection: 'row',
		gap: 8,
	},
	modeButton: {
		paddingHorizontal: 14,
		paddingVertical: 6,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: '#D4BC8B',
	},
	modeButtonActive: {
		backgroundColor: '#8B6914',
		borderColor: '#8B6914',
	},
	modeButtonText: {
		color: '#3B2F1B',
		fontWeight: '600',
	},
	modeButtonTextActive: {
		color: '#FFF9EF',
	},
	dmWorkspace: {
		marginTop: 24,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 16,
		backgroundColor: '#FFF9EF',
		gap: 12,
	},
	paletteHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 16,
	},
	addNpcButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		backgroundColor: '#8B6914',
	},
	addNpcButtonText: {
		color: '#FFF9EF',
		fontWeight: '600',
		fontSize: 12,
	},
	paletteHint: {
		color: '#6B5B3D',
		fontSize: 12,
		marginTop: 8,
	},
	paletteScroll: {
		marginTop: 8,
		maxHeight: 200,
	},
	paletteContent: {
		gap: 12,
		paddingRight: 12,
		paddingLeft: 12,
		paddingBottom: 8,
	},
	playerPalette: {
		marginTop: 16,
	},
	npcCard: {
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		minWidth: 140,
		maxWidth: 140,
		backgroundColor: '#FFFFFF',
		flexShrink: 0,
	},
	npcCardSelected: {
		borderColor: '#8B6914',
		backgroundColor: '#F5E6D3',
	},
	npcName: {
		fontWeight: '600',
	},
	npcMeta: {
		color: '#6B5B3D',
		fontSize: 12,
	},
	input: {
		borderWidth: 1,
		borderColor: '#C9B037',
		borderRadius: 8,
		paddingHorizontal: 10,
		paddingVertical: 6,
		color: '#3B2F1B',
		marginTop: 8,
	},
	customNpcButton: {
		marginTop: 8,
		paddingVertical: 8,
		borderRadius: 8,
		backgroundColor: '#3B2F1B',
		alignItems: 'center',
	},
	customNpcButtonText: {
		color: '#F5E6D3',
		fontWeight: '600',
	},
	buttonDisabled: {
		opacity: 0.5,
	},
	loadingContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 20,
		gap: 12,
	},
	loadingText: {
		color: '#6B5B3D',
	},
	actionButtons: {
		marginTop: 24,
		paddingTop: 16,
		borderTopWidth: 1,
		borderTopColor: '#E2D3B3',
	},
	doneButton: {
		backgroundColor: '#8B6914',
		paddingVertical: 14,
		paddingHorizontal: 24,
		borderRadius: 12,
		alignItems: 'center',
	},
	doneButtonDisabled: {
		opacity: 0.5,
	},
	doneButtonText: {
		color: '#FFF9EF',
		fontWeight: '700',
		fontSize: 16,
	},
	errorText: {
		color: '#B91C1C',
		fontWeight: '600',
		textAlign: 'center',
	},
	emptyStateText: {
		fontSize: 14,
		color: '#6B5B3D',
		textAlign: 'center',
	},
	emptyStateContainer: {
		width: '100%',
		paddingVertical: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	loaderFallback: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContent: {
		backgroundColor: '#FFF9EF',
		borderRadius: 16,
		width: '90%',
		maxWidth: 500,
		maxHeight: '80%',
		borderWidth: 1,
		borderColor: '#E2D3B3',
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#E2D3B3',
	},
	modalTitle: {
		color: '#3B2F1B',
		fontWeight: '600',
	},
	modalCloseButton: {
		padding: 4,
	},
	modalCloseText: {
		fontSize: 24,
		color: '#6B5B3D',
		fontWeight: '600',
	},
	modalScrollView: {
		maxHeight: 400,
	},
	modalForm: {
		padding: 16,
		gap: 12,
	},
	formLabel: {
		color: '#3B2F1B',
		fontSize: 14,
		fontWeight: '600',
		marginBottom: 4,
	},
	formInput: {
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 8,
		padding: 12,
		color: '#3B2F1B',
		fontSize: 14,
	},
	formTextArea: {
		minHeight: 80,
		textAlignVertical: 'top',
	},
	alignmentRow: {
		flexDirection: 'row',
		gap: 8,
	},
	alignmentButton: {
		flex: 1,
		padding: 10,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
	},
	alignmentButtonActive: {
		backgroundColor: '#8B6914',
		borderColor: '#8B6914',
	},
	alignmentButtonText: {
		color: '#3B2F1B',
		fontSize: 12,
		fontWeight: '600',
		textTransform: 'capitalize',
	},
	alignmentButtonTextActive: {
		color: '#FFF9EF',
	},
	dispositionRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	dispositionButton: {
		flex: 1,
		minWidth: '45%',
		padding: 10,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
	},
	dispositionButtonActive: {
		backgroundColor: '#8B6914',
		borderColor: '#8B6914',
	},
	dispositionButtonText: {
		color: '#3B2F1B',
		fontSize: 12,
		fontWeight: '600',
		textTransform: 'capitalize',
	},
	dispositionButtonTextActive: {
		color: '#FFF9EF',
	},
	statsRow: {
		flexDirection: 'row',
		gap: 12,
	},
	statInput: {
		flex: 1,
	},
	modalFooter: {
		flexDirection: 'row',
		gap: 12,
		padding: 16,
		borderTopWidth: 1,
		borderTopColor: '#E2D3B3',
	},
	modalButton: {
		flex: 1,
		padding: 12,
		borderRadius: 8,
		alignItems: 'center',
	},
	modalButtonCancel: {
		backgroundColor: '#E2D3B3',
	},
	modalButtonSave: {
		backgroundColor: '#8B6914',
	},
	modalButtonDisabled: {
		opacity: 0.5,
	},
	modalButtonCancelText: {
		color: '#3B2F1B',
		fontWeight: '600',
	},
	modalButtonSaveText: {
		color: '#FFF9EF',
		fontWeight: '600',
	},
});

export default HostGameMapEditorScreen;
