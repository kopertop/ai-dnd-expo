import { useAuth } from 'expo-auth-template/frontend';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { IconPicker } from '@/components/icon-picker';
import { InteractiveMap } from '@/components/map/interactive-map';
import { TileActionMenu, type TileAction } from '@/components/map/tile-action-menu';
import { TokenDetailModal } from '@/components/token-detail-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { multiplayerClient } from '@/services/api/multiplayer-client';
import {
	NpcPlacementRequest,
	PlacedNpc,
} from '@/types/api/multiplayer-api';
import { Character } from '@/types/character';
import { MapState, MapToken, NpcDefinition } from '@/types/multiplayer-map';

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
	const [mapState, setMapState] = useState<MapState | null>(null);
	const [mapLoading, setMapLoading] = useState(false);
	const [mapError, setMapError] = useState<string | null>(null);
	const [npcPalette, setNpcPalette] = useState<NpcDefinition[]>([]);
	const [selectedNpc, setSelectedNpc] = useState<NpcDefinition | null>(null);
	const [selectedPlayer, setSelectedPlayer] = useState<Character | null>(null);
	const [lobbyCharacters, setLobbyCharacters] = useState<Character[]>([]);
	const [charactersLoading, setCharactersLoading] = useState(false);
	const [useCustomNpc, setUseCustomNpc] = useState(false);
	const [customNpcIcon, setCustomNpcIcon] = useState<string>('🛡️');
	const [showAddNpcModal, setShowAddNpcModal] = useState(false);
	const [newNpcForm, setNewNpcForm] = useState({
		name: '',
		role: '',
		alignment: 'neutral',
		icon: '👤',
	});
	const [customNpcForm, setCustomNpcForm] = useState<NonNullable<NpcPlacementRequest['customNpc']>>({
		name: 'Custom Ally',
		role: 'Support',
		alignment: 'neutral',
		disposition: 'friendly',
		description: 'Quick ally ready to assist the party.',
		maxHealth: 18,
		armorClass: 12,
		color: '#4A6741',
	});
	const [editorMode, setEditorMode] = useState<MapEditorMode>('npc');
	const [mapPreset, setMapPreset] = useState<MapPresetOption>('forest');
	const [mutatingTerrain, setMutatingTerrain] = useState(false);
	const draggedTiles = useRef<Set<string>>(new Set());
	const terrainMutationsInFlight = useRef(0);
	const [tileMenuVisible, setTileMenuVisible] = useState(false);
	const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);
	const [tokenDetailVisible, setTokenDetailVisible] = useState(false);
	const [selectedToken, setSelectedToken] = useState<MapToken | null>(null);
	const insets = useSafeAreaInsets();
	const { user } = useAuth();

	const refreshMapState = useCallback(async () => {
		if (!inviteCode) {
			setMapState(null);
			return;
		}

		setMapError(null);
		setMapLoading(true);
		try {
			const state = await multiplayerClient.getMapState(inviteCode);
			setMapState(state);
		} catch (error) {
			console.error('Failed to load map state:', error);
			setMapError(error instanceof Error ? error.message : 'Failed to load map');
		} finally {
			setMapLoading(false);
		}
	}, [inviteCode]);

	useEffect(() => {
		if (inviteCode) {
			if (mapId === 'new-map') {
				// Don't auto-generate - let user click Generate button
				setMapState(null);
				setMapLoading(false);
				setMapError(null);
			} else {
				refreshMapState();
			}
		}
	}, [inviteCode, mapId, refreshMapState]);

	useEffect(() => {
		if (!inviteCode) {
			setNpcPalette([]);
			return;
		}

		multiplayerClient
			.getNpcDefinitions(inviteCode)
			.then(response => setNpcPalette(response.npcs))
			.catch(error => {
				console.error('Failed to load NPC palette:', error);
			});
	}, [inviteCode]);

	useEffect(() => {
		if (!inviteCode) {
			setLobbyCharacters([]);
			return;
		}

		let cancelled = false;
		setCharactersLoading(true);
		multiplayerClient
			.getGameCharacters(inviteCode)
			.then(response => {
				if (!cancelled) {
					setLobbyCharacters(response.characters);
				}
			})
			.catch(error => {
				if (!cancelled) {
					console.error('Failed to load lobby characters:', error);
				}
			})
			.finally(() => {
				if (!cancelled) {
					setCharactersLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [inviteCode]);

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
				await multiplayerClient.mutateTerrain(inviteCode, {
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
				});
				await refreshMapState();
			} catch (error) {
				Alert.alert('Edit Failed', error instanceof Error ? error.message : 'Unable to edit terrain');
			} finally {
				terrainMutationsInFlight.current -= 1;
				if (terrainMutationsInFlight.current <= 0) {
					setMutatingTerrain(false);
				}
			}
		},
		[editorMode, mapState, refreshMapState, inviteCode],
	);

	const handleTilePress = useCallback(
		async (x: number, y: number) => {
			if (!inviteCode || !mapState) {
				return;
			}

			if (editorMode === 'npc') {
				const customPayload = !selectedNpc && useCustomNpc ? customNpcForm : null;
				if (!selectedNpc && !customPayload) {
					Alert.alert('Select NPC', 'Choose an NPC from the palette first.');
					return;
				}

				try {
					await multiplayerClient.placeNpc(inviteCode, {
						npcId: selectedNpc?.slug ?? 'custom',
						x,
						y,
						label: selectedNpc?.name ?? customPayload?.name,
						customNpc: customPayload ? { ...customPayload, icon: customNpcIcon } : undefined,
					});
					await refreshMapState();
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
					await multiplayerClient.placePlayerToken(inviteCode, {
						characterId: selectedPlayer.id,
						x,
						y,
						label: selectedPlayer.name,
						icon: selectedPlayer.icon,
					});
					await refreshMapState();
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
			refreshMapState,
			useCustomNpc,
			customNpcForm,
			customNpcIcon,
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
			console.log('handleTokenDrop called:', { token, x, y, inviteCode, mapState: !!mapState });
			if (!inviteCode || !mapState) {
				console.warn('Missing inviteCode or mapState');
				return;
			}

			if (token.type === 'npc') {
				const npc = npcPalette.find(n => n.id === token.id);
				if (npc) {
					try {
						console.log('Placing NPC:', npc.name, 'at', x, y);
						await multiplayerClient.placeNpc(inviteCode, {
							npcId: npc.slug,
							x,
							y,
							label: npc.name,
						});
						await refreshMapState();
						console.log('NPC placed successfully');
					} catch (error) {
						console.error('NPC placement error:', error);
						Alert.alert('Placement Failed', error instanceof Error ? error.message : 'Unable to place NPC');
					}
				} else if (token.id === 'custom') {
					setEditorMode('npc');
					setUseCustomNpc(true);
					setTimeout(() => {
						handleTilePress(x, y);
					}, 100);
				} else {
					console.warn('NPC not found in palette:', token.id);
				}
			} else if (token.type === 'player') {
				const character = lobbyCharacters.find(c => c.id === token.id);
				if (character) {
					try {
						console.log('Placing Player:', character.name, 'at', x, y);
						await multiplayerClient.placePlayerToken(inviteCode, {
							characterId: character.id,
							x,
							y,
							label: character.name,
							icon: character.icon,
						});
						await refreshMapState();
						console.log('Player placed successfully');
					} catch (error) {
						console.error('Player placement error:', error);
						Alert.alert('Placement Failed', error instanceof Error ? error.message : 'Unable to place player');
					}
				} else {
					console.warn('Character not found in lobby:', token.id);
				}
			}
		},
		[inviteCode, mapState, npcPalette, lobbyCharacters, refreshMapState, handleTilePress],
	);

	const handleGenerateMap = useCallback(async () => {
		if (!inviteCode) {
			return;
		}

		setMapError(null);
		setMapLoading(true);
		try {
			const generated = await multiplayerClient.generateMap(inviteCode, {
				preset: mapPreset,
			});
			setMapState(generated);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unable to generate map';
			setMapError(errorMessage);
			Alert.alert('Generation Failed', errorMessage);
		} finally {
			setMapLoading(false);
		}
	}, [inviteCode, mapPreset]);

	const handleTileLongPress = useCallback((x: number, y: number) => {
		setSelectedTile({ x, y });
		setTileMenuVisible(true);
	}, []);

	const handleTokenLongPress = useCallback((token: MapToken) => {
		setSelectedToken(token);
		setTokenDetailVisible(true);
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
				await multiplayerClient.deleteMapToken(inviteCode, selectedToken.id);
				await refreshMapState();
				setTokenDetailVisible(false);
				setSelectedToken(null);
			} catch (error) {
				Alert.alert('Delete Failed', error instanceof Error ? error.message : 'Unable to delete token');
			}
		};
		void deleteToken();
	}, [inviteCode, selectedToken, refreshMapState]);

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
									onPress={() => refreshMapState().catch(() => undefined)}
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
					{mapError && <ThemedText style={styles.errorText}>{mapError}</ThemedText>}
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
							<TokenDetailModal
								visible={tokenDetailVisible}
								token={selectedToken}
								canEdit={true}
								onClose={() => {
									setTokenDetailVisible(false);
									setSelectedToken(null);
								}}
								onMove={handleTokenMove}
								onDelete={handleTokenDelete}
							/>
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
						showsHorizontalScrollIndicator={false}
					>
						{npcPalette.length === 0 && (
							<ThemedText style={styles.emptyStateText}>
								No NPC definitions available. NPCs will be loaded automatically.
							</ThemedText>
						)}
						{npcPalette.map(npc => {
							const isSelected = selectedNpc?.id === npc.id && !useCustomNpc;
							return (
								<DraggableCard
									key={npc.id}
									tokenData={{
										type: 'npc',
										id: npc.id,
										label: npc.name,
										icon: npc.icon,
										role: npc.role,
									}}
									style={[styles.npcCard, isSelected && styles.npcCardSelected]}
									onPress={() => {
										setUseCustomNpc(false);
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
						<DraggableCard
							tokenData={{
								type: 'npc',
								id: 'custom',
								label: customNpcForm.name || 'Custom NPC',
								icon: customNpcIcon,
							}}
							style={[styles.npcCard, useCustomNpc && styles.npcCardSelected]}
							onPress={() => {
								setSelectedNpc(null);
								setUseCustomNpc(true);
								setShowAddNpcModal(true);
							}}
						>
							<ThemedText style={styles.npcName}>Custom NPC</ThemedText>
							<ThemedText style={styles.npcMeta}>Tap to create</ThemedText>
						</DraggableCard>
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
							style={styles.doneButton}
							onPress={() => {
								router.back();
							}}
						>
							<ThemedText style={styles.doneButtonText}>Done Editing</ThemedText>
						</TouchableOpacity>
					</View>
				</View>
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
	},
	paletteContent: {
		gap: 12,
		paddingRight: 12,
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
		backgroundColor: '#FFFFFF',
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
	dispositionRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
		marginTop: 8,
	},
	dispositionButton: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	dispositionButtonActive: {
		backgroundColor: '#C9B037',
	},
	dispositionButtonText: {
		color: '#6B5B3D',
		fontSize: 12,
		textTransform: 'capitalize',
	},
	dispositionButtonTextActive: {
		color: '#1F130A',
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
	loaderFallback: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
	},
});

export default HostGameMapEditorScreen;

