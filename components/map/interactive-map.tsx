import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
    Image,
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';

import { ExpoIcon } from '@/components/expo-icon';
import { useScreenSize } from '@/hooks/use-screen-size';
import { MapState, MapToken } from '@/types/multiplayer-map';

const TILE_SIZE = 28;

interface InteractiveMapProps {
	map?: MapState | null;
	isEditable?: boolean;
	isHost?: boolean;
	enableTokenDrag?: boolean;
	onTokenPreviewPosition?: (token: MapToken, x: number, y: number) => void;
	onTilePress?: (x: number, y: number) => void;
	onTileDrag?: (x: number, y: number) => void;
	onTileDragEnd?: () => void;
	onTileLongPress?: (x: number, y: number) => void;
	onTileRightPress?: (x: number, y: number) => void;
	onTokenPress?: (token: MapToken) => void;
	onTokenLongPress?: (token: MapToken) => void;
	onTokenDrop?: (token: { type: 'npc' | 'player'; id: string; label: string; icon?: string }, x: number, y: number) => void;
	onTokenDragEnd?: (token: MapToken, x: number, y: number) => void;
	highlightTokenId?: string;
	tokenPositionOverrides?: Record<string, { x: number; y: number }>;
	tokenHealthOverrides?: Record<string, { current: number; max: number }>;
	reachableTiles?: Array<{ x: number; y: number; cost: number }>;
	pathTiles?: Array<{ x: number; y: number }>;
}

const terrainColors: Record<string, string> = {
	water: '#7FD1F7',
	grass: '#7FB77E',
	forest: '#2D4A22',
	mountain: '#8B7355',
	impassible: '#4B4844',
	impassable: '#4B4844',
	desert: '#C2B280',
	sand: '#FFD700',
	stone: '#B0A8B9',
	gravel: '#A89F91',
	road: '#C8A97E',
	dirt: '#8B4513',
	mud: '#6E431C',
	snow: '#FFF9F5',
	ice: '#DFF3FF',
	tundra: '#C8D3C0',
	swamp: '#556B2F',
	marsh: '#667E52',
	cobblestone: '#9E8FA4',
	plaza: '#D7C3A3',
	market: '#C6A15E',
	fountain: '#9BD7E8',
	pit: '#2F1B10',
	doorway: '#A58A6B',
	bridge: '#C1B199',
	dock: '#7E5E3B',
	harbor: '#7E5E3B',
	cliff: '#7A654B',
	hill: '#A4A77D',
	beach: '#F4E2B4',
	path: '#BBA37A',
	tree: '#3E6B4B',
	wall: '#4A4A4A',
	pillar: '#B6B6B6',
	ruins: '#7F6A6A',
	rubble: '#7D7063',
	lava: '#F05D23',
};

const terrainColor = (terrain?: string) => {
	const normalizedTerrain = terrain?.trim().toLowerCase();
	return normalizedTerrain ? terrainColors[normalizedTerrain] ?? '#D9D4C5' : '#D9D4C5';
};

// Tile component that can properly use hooks for drag-and-drop
const MapTile: React.FC<{
	x: number;
	y: number;
	cell: any;
	isPathTile: boolean;
	hoveredTile: { x: number; y: number } | null;
	isEditable: boolean;
	isHost?: boolean;
	onTokenDrop?: (token: { type: 'npc' | 'player'; id: string; label: string; icon?: string }, x: number, y: number) => void;
	onTilePress?: (x: number, y: number) => void;
	onTileLongPress?: (x: number, y: number) => void;
	onTileRightPress?: (x: number, y: number) => void;
	canInteract: boolean;
	isReachable: boolean;
	setHoveredTile: (tile: { x: number; y: number } | null) => void;
	tileSize: number;
}> = ({ x, y, cell, isPathTile, hoveredTile, isEditable, isHost, onTokenDrop, onTilePress, onTileLongPress, onTileRightPress, canInteract, isReachable, setHoveredTile, tileSize }) => {
	const tileRef = useRef<View>(null);

	// Attach right-click handler for web
	useEffect(() => {
		if (Platform.OS === 'web' && onTileRightPress && tileRef.current) {
			const timeoutId = setTimeout(() => {
				const element = tileRef.current as any;
				if (!element) return;

				let domNode: HTMLElement | null = null;
				if (element._nativeNode) {
					domNode = element._nativeNode;
				} else if (element.nodeType === 1) {
					domNode = element;
				} else if (element.firstChild && element.firstChild.nodeType === 1) {
					domNode = element.firstChild;
				}

				if (domNode && typeof domNode.addEventListener === 'function') {
					const handleContextMenu = (e: MouseEvent) => {
						e.preventDefault();
						e.stopPropagation();
						onTileRightPress(x, y);
					};

					domNode.addEventListener('contextmenu', handleContextMenu);
					return () => {
						domNode?.removeEventListener('contextmenu', handleContextMenu);
					};
				}
			}, 0);

			return () => {
				clearTimeout(timeoutId);
			};
		}
	}, [x, y, onTileRightPress]);

	// Attach drag handlers directly to DOM node for web
	useEffect(() => {
		if (Platform.OS === 'web' && isEditable && onTokenDrop && tileRef.current) {
			const timeoutId = setTimeout(() => {
				const element = tileRef.current as any;
				if (!element) return;

				let domNode: HTMLElement | null = null;

				if (element._nativeNode) {
					domNode = element._nativeNode;
				} else if (element.nodeType === 1) {
					domNode = element;
				} else if (element.firstChild && element.firstChild.nodeType === 1) {
					domNode = element.firstChild;
				}

				if (domNode && typeof domNode.addEventListener === 'function') {
					const handleDragEnter = (e: DragEvent) => {
						e.preventDefault();
						e.stopPropagation();
						if (e.dataTransfer) {
							e.dataTransfer.dropEffect = 'move';
						}
						setHoveredTile({ x, y });
					};

					const handleDragOver = (e: DragEvent) => {
						e.preventDefault();
						e.stopPropagation();
						if (e.dataTransfer) {
							e.dataTransfer.dropEffect = 'move';
						}
						setHoveredTile({ x, y });
					};

					const handleDragLeave = (e: DragEvent) => {
						const rect = domNode!.getBoundingClientRect();
						const leaveX = e.clientX;
						const leaveY = e.clientY;
						if (leaveX < rect.left || leaveX > rect.right || leaveY < rect.top || leaveY > rect.bottom) {
							setHoveredTile(null);
						}
					};

					const handleDrop = (e: DragEvent) => {
						e.preventDefault();
						e.stopPropagation();
						e.stopImmediatePropagation();
						setHoveredTile(null);

						const data = e.dataTransfer?.getData('application/json');
						console.log('Drop event on tile:', { x, y, data, hasOnTokenDrop: !!onTokenDrop, dataTransfer: !!e.dataTransfer });

						if (!data) {
							console.warn('No drop data found');
							return;
						}

						if (!onTokenDrop) {
							console.warn('onTokenDrop callback not provided');
							return;
						}

						try {
							const token = JSON.parse(data);
							console.log('Parsed token data:', token);
							console.log('Calling onTokenDrop with:', { token, x, y });
							onTokenDrop(token, x, y);
						} catch (err) {
							console.error('Failed to parse drop data:', err, 'Raw data:', data);
						}
					};

					domNode.addEventListener('dragenter', handleDragEnter);
					domNode.addEventListener('dragover', handleDragOver);
					domNode.addEventListener('dragleave', handleDragLeave);
					domNode.addEventListener('drop', handleDrop);

					return () => {
						if (domNode) {
							domNode.removeEventListener('dragenter', handleDragEnter);
							domNode.removeEventListener('dragover', handleDragOver);
							domNode.removeEventListener('dragleave', handleDragLeave);
							domNode.removeEventListener('drop', handleDrop);
						}
					};
				}
			}, 0);

			return () => {
				clearTimeout(timeoutId);
			};
		}
	}, [x, y, isEditable, onTokenDrop, setHoveredTile]);

	// Check if this tile has a trap (only visible to host)
	const hasTrap = isHost && cell?.featureType === 'trap';
	let trapMetadata: Record<string, unknown> | null = null;
	if (hasTrap && cell?.metadata) {
		try {
			trapMetadata = typeof cell.metadata === 'string' ? JSON.parse(cell.metadata) : cell.metadata;
		} catch (e) {
			console.warn('Failed to parse trap metadata:', e);
		}
	}
	const isTrapTriggered = trapMetadata?.triggered === true;

	// Check if tile is blocked - database is_blocked is converted to 'difficult' in the cell object
	// Update: difficult now means difficult, blocked means impassible
	const isBlocked = cell?.blocked === true || (cell?.movementCost || 0) >= 999;
	const isDifficult = cell?.difficult === true || ((cell?.movementCost || 0) > 1 && (cell?.movementCost || 0) < 999);

	// Check if tile has fog of war
	const hasFog = cell?.fogged === true;
	const fogOpacity = hasFog ? (isHost ? 0.1 : 0.9) : 0;

	// Determine background color - blocked tiles are black (or water blue if water terrain)
	// For VTT maps with background image, we want tiles to be transparent unless special
	const getBackgroundColor = () => {
		// If using background image, make default/empty tiles transparent
		// Only color special tiles (blocked, difficult, etc) with some transparency
		// Or keep current logic but add transparency?

		// If map has background, we want tiles to be transparent by default so background shows
		// We only overlay colors for semantic meaning (blocked, difficult, movement range)
		// But we don't have access to map.background here directly without passing it down
		// Let's assume if terrain is 'stone' (default) it might be transparent if we want

		// Actually, let's keep current logic but maybe use RGBA for all colors if we want background to show through?
		// User said "tiles should overlay with transparency"

		if (isBlocked) {
			const terrain = cell?.terrain?.trim().toLowerCase();
			if (terrain === 'water') {
				return 'rgba(127, 209, 247, 0.5)'; // Water blue transparent
			}
			return 'rgba(0, 0, 0, 0.5)'; // Black transparent
		}

		if (isDifficult) {
			return 'rgba(139, 69, 19, 0.3)'; // Brown transparent for difficult
		}

		// For standard terrain, if we have a background, we might want fully transparent?
		// But we don't know if we have a background here easily.
		// However, the terrainColor function returns solid colors.
		// Let's convert them to RGBA? Or just leave as is for now and let the user paint transparency?
		// The user said "Tiles overlay background with transparency (already supported)"
		// If existing tiles are opaque, they will block the background.
		// We should probably update terrainColor to return transparent colors or make the View transparent.

		const color = terrainColor(cell?.terrain);

		// If it's the default 'stone' or 'grass' and we are rendering over a background,
		// we might want it transparent.
		// For now, let's just apply a global opacity to the background color
		// if it's not a special semantic tile.

		// Actually, if we return a solid color, it blocks the image.
		// We should convert hex to rgba with opacity.
		if (color.startsWith('#')) {
			const r = parseInt(color.slice(1, 3), 16);
			const g = parseInt(color.slice(3, 5), 16);
			const b = parseInt(color.slice(5, 7), 16);
			return `rgba(${r}, ${g}, ${b}, 0.3)`; // 30% opacity for terrain overlay
		}

		return color;
	};

	// Determine border color - prioritize path, then hover, then trap, then default
	const getBorderColor = () => {
		if (isPathTile) return '#FFD447';
		if (hoveredTile?.x === x && hoveredTile?.y === y) return '#FFD700';
		if (hasTrap) return isTrapTriggered ? '#8B0000' : '#DC143C'; // Dark red if triggered, crimson if active
		return styles.tile.borderColor;
	};

	const getBorderWidth = () => {
		if (isPathTile) return 2;
		if (hoveredTile?.x === x && hoveredTile?.y === y) return 2;
		if (hasTrap) return 2;
		return styles.tile.borderWidth;
	};

	// Create fog wave pattern - horizontal wavy lines
	const fogWavePattern = [];
	if (hasFog && tileSize > 0) {
		const waveSpacing = Math.max(4, Math.floor(tileSize / 5));
		const numWaves = Math.ceil(tileSize / waveSpacing) + 1;
		const waveAmplitude = Math.max(1.5, Math.floor(tileSize / 12));
		const pointsPerWave = Math.max(12, Math.floor(tileSize / 2));

		for (let wave = 0; wave < numWaves; wave++) {
			const baseY = wave * waveSpacing;
			const wavePoints = [];

			for (let i = 0; i <= pointsPerWave; i++) {
				const x = (i / pointsPerWave) * tileSize;
				const y = baseY + Math.sin((i / pointsPerWave) * Math.PI * 4) * waveAmplitude;
				wavePoints.push({ x, y });
			}

			// Create segments between wave points
			for (let i = 0; i < wavePoints.length - 1; i++) {
				const p1 = wavePoints[i];
				const p2 = wavePoints[i + 1];
				const width = p2.x - p1.x;
				const height = Math.abs(p2.y - p1.y) + 1;
				const top = Math.min(p1.y, p2.y);

				fogWavePattern.push(
					<View
						key={`fog-wave-${wave}-${i}`}
						style={[
							styles.fogWaveSegment,
							{
								left: p1.x,
								top: top,
								width: Math.max(1, width),
								height: Math.max(1, height),
							},
						]}
					/>,
				);
			}
		}
	}

	return (
		<View
			ref={tileRef}
			key={`tile-${x}-${y}`}
			style={[
				styles.tile,
				{
					width: tileSize,
					height: tileSize,
					backgroundColor: getBackgroundColor(),
					borderColor: getBorderColor(),
					borderWidth: getBorderWidth(),
					opacity: hoveredTile?.x === x && hoveredTile?.y === y ? 0.6 : 1,
				},
			]}
		>
			{hasTrap && (
				<View style={styles.trapIndicator}>
					<Text style={styles.trapIcon}>⚠</Text>
				</View>
			)}
			{hasFog && !isBlocked && (
				<View style={[styles.fogOverlay, { opacity: fogOpacity }]} pointerEvents="none">
					<View style={styles.fogPatternContainer}>
						{fogWavePattern}
					</View>
				</View>
			)}
			<TouchableOpacity
				style={StyleSheet.absoluteFill}
				activeOpacity={canInteract ? 0.7 : 1}
				disabled={!canInteract && !isEditable && !onTileRightPress}
				onPress={() => {
					console.log('[MapTile] Tile pressed:', { x, y, canInteract, hasOnTilePress: !!onTilePress });
					onTilePress?.(x, y);
				}}
				onLongPress={() => onTileLongPress?.(x, y)}
			>
				{isReachable && (
					<View style={styles.rangeOutline} />
				)}
			</TouchableOpacity>
		</View>
	);
};

const InteractiveMapComponent: React.FC<InteractiveMapProps> = ({
	map,
	isEditable = false,
	isHost = false,
	enableTokenDrag = false,
	onTokenPreviewPosition,
	tokenPositionOverrides,
	tokenHealthOverrides,
	onTilePress,
	onTileDrag,
	onTileDragEnd,
	onTileLongPress,
	onTileRightPress,
	onTokenPress,
	onTokenLongPress,
	onTokenDrop,
	onTokenDragEnd,
	highlightTokenId,
	reachableTiles,
	pathTiles,
}) => {
	const { height: screenHeight } = useWindowDimensions();
	const { isDesktop, isTablet } = useScreenSize();
	// Subtract header height: 200px on desktop/large screens, 120px on mobile
	const headerHeight = (isDesktop || isTablet) ? 140 : 120;
	const availableHeight = screenHeight - headerHeight;

	// Calculate minimum container size based on map dimensions and TILE_SIZE
	// This ensures the map never gets smaller than its original size
	const minContainerSize = useMemo(() => {
		if (!map) return 0;
		const mapMaxDimension = Math.max(map.width, map.height);
		return mapMaxDimension * TILE_SIZE;
	}, [map]);
	const normalizedTerrain = useMemo(() => {
		if (!map) {
			return [];
		}

		if (map.terrain && map.terrain.length === map.height) {
			return map.terrain;
		}

		return Array.from({ length: map.height }, () =>
			Array.from({ length: map.width }, () => ({ terrain: map.defaultTerrain ?? 'stone' })),
		);
	}, [map]);

	const [isDragging, setIsDragging] = useState(false);
	const lastDragKey = useRef<string | null>(null);
	// Initialize containerSize to match availableHeight for square container
	const [containerSize, setContainerSize] = useState<{ width: number; height: number }>(() => ({
		width: availableHeight,
		height: availableHeight,
	}));
	const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
	const panStartRef = useRef({ x: 0, y: 0 });
	const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);

	// Load background image if present
	// We don't need explicit loading state as React Native Image handles it,
	// but we could add a loader if needed
	const backgroundImage = map?.background;

	const startDrag = (x: number, y: number) => {
		if (!onTileDrag || !isEditable) {
			return;
		}

		setIsDragging(true);
		const key = `${x}-${y}`;
		lastDragKey.current = key;
		onTileDrag(x, y);
	};

	const continueDrag = (x: number, y: number) => {
		if (!isDragging || !onTileDrag || !isEditable) {
			return;
		}

		const key = `${x}-${y}`;
		if (lastDragKey.current === key) {
			return;
		}

		lastDragKey.current = key;
		onTileDrag(x, y);
	};

	const endDrag = () => {
		if (!isDragging) {
			return;
		}

		setIsDragging(false);
		lastDragKey.current = null;
		onTileDragEnd?.();
	};

	const reachableLookup = useMemo(() => {
		const lookup = new Map<string, number>();
		reachableTiles?.forEach(tile => {
			lookup.set(`${tile.x}-${tile.y}`, tile.cost);
		});
		return lookup;
	}, [reachableTiles]);

	const pathLookup = useMemo(() => new Set(pathTiles?.map(tile => `${tile.x}-${tile.y}`)), [pathTiles]);

	// Separate component for tokens to avoid hooks in map()
	const MapTokenComponent: React.FC<{
		token: MapToken;
		highlightTokenId?: string;
	onTokenPress?: (token: MapToken) => void;
	onTokenLongPress?: (token: MapToken) => void;
	onTokenDragEnd?: (token: MapToken, x: number, y: number) => void;
	onTokenPreviewPosition?: (token: MapToken, x: number, y: number) => void;
	map: MapState;
	enableTokenDrag: boolean;
	tileSize: number;
	tokenPositionOverrides?: Record<string, { x: number; y: number }>;
}> = ({
	token,
	highlightTokenId,
	onTokenPress,
	onTokenLongPress,
	onTokenDragEnd,
	onTokenPreviewPosition,
	map,
	enableTokenDrag,
	tileSize,
	tokenPositionOverrides,
}) => {
	const tokenRef = useRef<View>(null);
	const isDraggingRef = useRef(false);
	const overridePos = tokenPositionOverrides?.[token.id];
	const renderX = overridePos?.x ?? token.x;
	const renderY = overridePos?.y ?? token.y;

	useEffect(() => {
		if (Platform.OS !== 'web' || !tokenRef.current) {
			return;
		}

		// If drag is disabled, ensure cleanup and return early
		if (!enableTokenDrag || !onTokenDragEnd || !map) {
			const timeoutId = setTimeout(() => {
				const element = tokenRef.current as any;
				if (!element) return;

				let domNode: HTMLElement | null = null;
				if (element._nativeNode) {
					domNode = element._nativeNode;
				} else if (element.nodeType === 1) {
					domNode = element;
				} else if (element.firstChild && element.firstChild.nodeType === 1) {
					domNode = element.firstChild;
				}

				if (domNode && typeof domNode.setAttribute === 'function') {
					domNode.removeAttribute('draggable');
					domNode.style.cursor = '';
					domNode.style.userSelect = '';
				}
			}, 0);

			return () => clearTimeout(timeoutId);
		}

		const element = tokenRef.current as any;
		if (!element) {
			return;
		}

		let domNode: HTMLElement | null = null;

		if (element._nativeNode) {
			domNode = element._nativeNode;
		} else if (element.nodeType === 1) {
			domNode = element;
		} else if (element.firstChild && element.firstChild.nodeType === 1) {
			domNode = element.firstChild;
		}

		if (!domNode || typeof domNode.setAttribute !== 'function') {
			return;
		}

		const timeoutId = setTimeout(() => {
			domNode.setAttribute('draggable', 'true');
			domNode.style.cursor = 'grab';
			domNode.style.userSelect = 'none';

			const handleDragStart = (e: DragEvent) => {
				if (!e.dataTransfer) return;
				e.stopPropagation();
				e.dataTransfer.effectAllowed = 'move';
				e.dataTransfer.setData('application/json', JSON.stringify(token));
				if (domNode) {
					domNode.style.opacity = '0.5';
				}
				// Set dragging flag to prevent long press
				isDraggingRef.current = true;
				console.log('Token drag started:', token.id);
			};

			const handleDragEnd = (e: DragEvent) => {
				console.log('Token drag ended:', token.id, 'at', e.clientX, e.clientY);
				if (domNode) {
					domNode.style.opacity = '1';
				}

				// Clear dragging flag after a delay to prevent long press
				setTimeout(() => {
					isDraggingRef.current = false;
				}, 200);

				if (!onTokenDragEnd) return;

				// Check if drop was outside map bounds
				const dropX = e.clientX;
				const dropY = e.clientY;

				// Get map container bounds - try multiple selectors
				let mapContainer: HTMLElement | null = null;
				// First try the grid container (most reliable)
				const gridContainer = document.querySelector('[data-grid-container]') as HTMLElement;
				if (gridContainer) {
					const gridRect = gridContainer.getBoundingClientRect();
					if (gridRect.width > 0 && gridRect.height > 0) {
						mapContainer = gridContainer;
					}
				}
				// Fallback to wrapper container
				if (!mapContainer) {
					const wrapper = document.querySelector('[data-map-container]') as HTMLElement;
					if (wrapper) {
						mapContainer = wrapper;
					} else {
						// Last resort: find the wrapper by class or style
						const allDivs = Array.from(document.querySelectorAll('div'));
						mapContainer = allDivs.find(div => {
							const style = window.getComputedStyle(div);
							return style.position === 'relative' || style.position === 'absolute';
						}) as HTMLElement || null;
					}
				}

				if (mapContainer) {
					let rect = mapContainer.getBoundingClientRect();

					// If wrapper has zero dimensions, try to use grid container directly
					if (rect.width === 0 || rect.height === 0) {
						const gridContainer = document.querySelector('[data-grid-container]') as HTMLElement;
						if (gridContainer) {
							const gridRect = gridContainer.getBoundingClientRect();
							if (gridRect.width > 0 && gridRect.height > 0) {
								rect = gridRect;
								mapContainer = gridContainer;
							}
						}
					}

					const isOutsideMap =
							dropX < rect.left - 50 ||
							dropX > rect.right + 50 ||
							dropY < rect.top - 50 ||
							dropY > rect.bottom + 50;

					console.log('Map bounds:', rect, 'Drop point:', dropX, dropY, 'Outside:', isOutsideMap);

					if (isOutsideMap) {
						console.log('Deleting token:', token.id);
						onTokenDragEnd(token, -1, -1);
					} else {
						// Calculate tile coordinates from drop position
						// Find the grid container (the actual map grid)
						let gridContainer = mapContainer.querySelector('[data-grid-container]') as HTMLElement;

						// If not found as child, try direct query
						if (!gridContainer) {
							gridContainer = document.querySelector('[data-grid-container]') as HTMLElement;
						}

						// Calculate relative position - use grid container if available, otherwise use map container
						let relativeX = dropX - rect.left;
						let relativeY = dropY - rect.top;

						// If we have a grid container, use its bounds for more accurate calculation
						if (gridContainer) {
							const gridRect = gridContainer.getBoundingClientRect();
							relativeX = dropX - gridRect.left;
							relativeY = dropY - gridRect.top;
						}

						// Calculate tile coordinates
						const tileX = Math.max(0, Math.min(map.width - 1, Math.floor(relativeX / tileSize)));
						const tileY = Math.max(0, Math.min(map.height - 1, Math.floor(relativeY / tileSize)));

						// Snap the DOM element immediately to the target tile for instant feedback
						if (domNode) {
							domNode.style.left = `${tileX * tileSize}px`;
							domNode.style.top = `${tileY * tileSize}px`;
						}

						console.log('Moving token to tile:', tileX, tileY, 'from drop position:', dropX, dropY, 'relative:', relativeX, relativeY);
						onTokenPreviewPosition?.(token, tileX, tileY);
						onTokenDragEnd(token, tileX, tileY);
					}
				} else {
					// If we can't find the container, assume it's outside if dropped far from center
					console.warn('Could not find map container, using fallback detection');
					const windowCenterX = window.innerWidth / 2;
					const windowCenterY = window.innerHeight / 2;
					const distanceFromCenter = Math.sqrt(
						Math.pow(dropX - windowCenterX, 2) +
							Math.pow(dropY - windowCenterY, 2),
					);
						// If dropped more than 300px from center, consider it deleted
					if (distanceFromCenter > 300) {
						console.log('Deleting token (fallback):', token.id);
						onTokenDragEnd(token, -1, -1);
					} else {
						// Try to calculate tile from center position as fallback
						// This is a rough estimate - ideally we'd find the map container
						const estimatedTileX = Math.floor((dropX - windowCenterX + 200) / tileSize);
						const estimatedTileY = Math.floor((dropY - windowCenterY + 200) / tileSize);
						if (domNode) {
							domNode.style.left = `${estimatedTileX * tileSize}px`;
							domNode.style.top = `${estimatedTileY * tileSize}px`;
						}
						console.log('Moving token to estimated tile (fallback):', estimatedTileX, estimatedTileY);
						onTokenPreviewPosition?.(token, estimatedTileX, estimatedTileY);
						onTokenDragEnd(token, estimatedTileX, estimatedTileY);
					}
				}
			};

			domNode.addEventListener('dragstart', handleDragStart);
			domNode.addEventListener('dragend', handleDragEnd);

			return () => {
				domNode?.removeEventListener('dragstart', handleDragStart);
				domNode?.removeEventListener('dragend', handleDragEnd);
				domNode.removeAttribute('draggable');
				domNode.style.cursor = '';
				domNode.style.userSelect = '';
			};
		}, 0);

		return () => clearTimeout(timeoutId);
	}, [token, onTokenDragEnd, map, enableTokenDrag, tileSize]);

	// Prevent long press when dragging
	const handleLongPress = () => {
		if (!isDraggingRef.current && onTokenLongPress) {
			onTokenLongPress(token);
		}
	};

	return (
		<TouchableOpacity
			ref={tokenRef}
			style={[
				styles.token,
				{
					left: renderX * tileSize,
					top: renderY * tileSize,
					width: tileSize,
					height: tileSize,
					borderColor:
							token.id === highlightTokenId
								? '#FFD447'
								: token.color || '#3B2F1B',
				},
			]}
			onPress={() => {
				console.log('[MapToken] Token pressed:', { tokenId: token.id, x: token.x, y: token.y, hasOnTokenPress: !!onTokenPress });
				onTokenPress?.(token);
			}}
			onLongPress={handleLongPress}
			disabled={!onTokenPress && !onTokenLongPress}
		>
			{renderTokenContent(token, tileSize)}
		</TouchableOpacity>
	);
};

	const renderTokenContent = (token: MapToken, tokenTileSize: number) => {
		let parsedMetadata: any = undefined;
		if (token.metadata) {
			try {
				parsedMetadata = typeof token.metadata === 'string' ? JSON.parse(token.metadata) : token.metadata;
			} catch (error) {
				console.error('Failed to parse token metadata:', error, token.metadata);
			}
		}

		// Check for 0 HP (unconscious/dead)
		const isUnconscious = token.hitPoints !== undefined && token.hitPoints <= 0;

		const icon = token.icon || parsedMetadata?.icon || parsedMetadata?.image;

		let color = token.color;
		if (!color && parsedMetadata) {
			if (parsedMetadata.tags?.includes('friendly')) {
				color = '#4CAF50';
			} else if (parsedMetadata.tags?.includes('hostile')) {
				color = '#F44336';
			} else if (parsedMetadata.tags?.includes('neutral')) {
				color = '#2196F3';
			} else {
				color = '#1F130A';
			}
		} else if (!color) {
			color = '#1F130A';
		}

		// Calculate icon size based on tile size (70% of tile size, minimum 16px)
		const iconSize = Math.max(16, Math.floor(tokenTileSize * 0.7));
		const labelFontSize = Math.max(10, Math.floor(tokenTileSize * 0.4));

		const content = (() => {
			// If icon exists, render it using ExpoIcon
			if (typeof icon === 'string' && icon.trim().length > 0) {
				return (
					<ExpoIcon
						icon={icon.trim()}
						size={iconSize}
						color="#1F130A"
						style={{ color, opacity: isUnconscious ? 0.5 : 1 }}
					/>
				);
			}

			// Fallback to initials only if no icon is available
			return (
				<Text style={[styles.tokenLabel, { fontSize: labelFontSize, opacity: isUnconscious ? 0.5 : 1 }]} numberOfLines={1}>
					{token.label?.slice(0, 2).toUpperCase() || 'T'}
				</Text>
			);
		})();

		return (
			<View style={{ alignItems: 'center', justifyContent: 'center' }}>
				{content}
				{isUnconscious && (
					<View style={StyleSheet.absoluteFill} pointerEvents="none">
						<View style={{
							flex: 1,
							alignItems: 'center',
							justifyContent: 'center',
							backgroundColor: 'rgba(0,0,0,0.3)',
							borderRadius: 4,
						}}>
							<Text style={{
								fontSize: iconSize * 1.5,
								color: '#FF0000',
								opacity: 0.5,
								fontWeight: 'bold',
								textShadowColor: 'rgba(0, 0, 0, 0.75)',
								textShadowOffset: { width: 1, height: 1 },
								textShadowRadius: 2,
							}}>❌</Text>
						</View>
					</View>
				)}
			</View>
		);
	};

	const mapWidthPx = (map?.width ?? 0) * TILE_SIZE;
	const mapHeightPx = (map?.height ?? 0) * TILE_SIZE;

	const clampPan = (value: number, viewport: number, content: number) => {
		if (content <= viewport) {
			return 0;
		}

		const min = viewport - content;
		return Math.min(0, Math.max(min, value));
	};

	const enablePanning = mapWidthPx > containerSize.width || mapHeightPx > containerSize.height;

	const panResponder = useMemo(
		() =>
			PanResponder.create({
				onStartShouldSetPanResponder: () => false,
				onMoveShouldSetPanResponder: (_, gestureState) =>
					enablePanning &&
					!isEditable &&
					(Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6),
				onPanResponderGrant: () => {
					panStartRef.current = panOffset;
				},
				onPanResponderMove: (_, gestureState) => {
					if (!enablePanning) {
						return;
					}

					setPanOffset({
						x: clampPan(
							panStartRef.current.x + gestureState.dx,
							containerSize.width,
							mapWidthPx,
						),
						y: clampPan(
							panStartRef.current.y + gestureState.dy,
							containerSize.height,
							mapHeightPx,
						),
					});
				},
			}),
		[
			enablePanning,
			isEditable,
			containerSize.width,
			containerSize.height,
			mapWidthPx,
			mapHeightPx,
			panOffset,
		],
	);

	// Clear hovered tile when drag ends (for web)
	React.useEffect(() => {
		if (Platform.OS === 'web') {
			const handleDragEnd = () => {
				// Small delay to ensure drop event fires first
				setTimeout(() => {
					setHoveredTile(null);
				}, 100);
			};
			const handleDragLeave = (e: DragEvent) => {
				// Clear if dragging outside the map container
				if (e.target === e.currentTarget) {
					setHoveredTile(null);
				}
			};
			document.addEventListener('dragend', handleDragEnd);
			return () => {
				document.removeEventListener('dragend', handleDragEnd);
			};
		}
	}, []);

	const wrapperRef = useRef<View>(null);
	const gridContainerRef = useRef<View>(null);

	useEffect(() => {
		if (Platform.OS === 'web' && wrapperRef.current) {
			const element = wrapperRef.current as any;
			const domNode = element._nativeNode || element;
			if (domNode && typeof domNode.setAttribute === 'function') {
				domNode.setAttribute('data-map-container', 'true');
			}
		}
	}, []);

	useEffect(() => {
		if (Platform.OS === 'web' && gridContainerRef.current) {
			const element = gridContainerRef.current as any;
			const domNode = element._nativeNode || element;
			if (domNode && typeof domNode.setAttribute === 'function') {
				domNode.setAttribute('data-grid-container', 'true');
			}
		}
	}, []);

	// Sync containerSize with availableHeight when it changes (fixes race condition)
	// Ensure container size is at least the minimum required to maintain original tile size
	useEffect(() => {
		const size = Math.max(availableHeight, minContainerSize);
		setContainerSize({ width: size, height: size });
	}, [availableHeight, minContainerSize]);

	// Calculate dynamic tile size to scale tiles to fill the square container
	// Must be before early return to satisfy React Hook rules
	const tileSize = useMemo(() => {
		if (!map || containerSize.width === 0 || containerSize.height === 0) {
			return TILE_SIZE; // Fallback to default
		}
		const containerDimension = Math.min(containerSize.width, containerSize.height);
		const mapMaxDimension = Math.max(map.width, map.height);
		const calculatedTileSize = Math.floor(containerDimension / mapMaxDimension);
		// Ensure minimum tile size is at least TILE_SIZE (28px) to maintain original map size
		return Math.max(calculatedTileSize, TILE_SIZE);
	}, [map, containerSize.width, containerSize.height]);

	if (!map) {
		return (
			<View style={styles.emptyState}>
				<Text style={styles.emptyTitle}>No map selected</Text>
				<Text style={styles.emptySubtitle}>The DM can configure a map from the host view.</Text>
			</View>
		);
	}

	return (
		<View
			ref={wrapperRef}
			style={[styles.wrapper, { height: Math.max(availableHeight, minContainerSize), width: Math.max(availableHeight, minContainerSize) }]}
			onLayout={event => {
				// Enforce square dimensions: use the smaller dimension for both width and height
				// Ensure it's at least the minimum container size
				const { width, height } = event.nativeEvent.layout;
				const squareDimension = Math.max(Math.min(width, height), minContainerSize);
				setContainerSize({ width: squareDimension, height: squareDimension });
			}}
			{...(enablePanning ? panResponder.panHandlers : {})}
		>
			<View style={styles.panSurface}>
				<View
					ref={gridContainerRef}
					style={[
						styles.gridContainer,
						{
							width: map.width * tileSize,
							height: map.height * tileSize,
							transform: [
								{ translateX: panOffset.x },
								{ translateY: panOffset.y },
							],
						},
					]}
				>
					{backgroundImage && (
						<Image
							source={{ uri: backgroundImage }}
							style={[
								StyleSheet.absoluteFill,
								{
									width: map.width * tileSize,
									height: map.height * tileSize,
									opacity: 1, // Full opacity for VTT maps
									zIndex: 0, // Behind tiles
								},
							]}
							resizeMode="stretch"
						/>
					)}
					{normalizedTerrain.map((row, y) => (
						<View key={`row-${y}`} style={styles.row}>
							{row.map((cell, x) => {
								const key = `${x}-${y}`;
								const canInteract = Boolean(onTilePress);
								const isReachable = reachableLookup.has(key);
								const isPathTile = pathLookup.has(key);

								return (
									<MapTile
										key={key}
										x={x}
										y={y}
										cell={cell}
										isPathTile={isPathTile}
										hoveredTile={hoveredTile}
										isEditable={isEditable}
										isHost={isHost}
										onTokenDrop={onTokenDrop}
										onTilePress={onTilePress}
										onTileLongPress={onTileLongPress}
										onTileRightPress={onTileRightPress}
										canInteract={canInteract}
										isReachable={isReachable}
										setHoveredTile={setHoveredTile}
										tileSize={tileSize}
									/>
								);
							})}
						</View>
					))}
					<View
						pointerEvents="box-none"
						style={[StyleSheet.absoluteFill, styles.tokenLayer]}
					>
						{map.tokens?.map(token => (
							<MapTokenComponent
								key={token.id}
								token={token}
								highlightTokenId={highlightTokenId}
								onTokenPress={onTokenPress}
								onTokenLongPress={onTokenLongPress}
								onTokenDragEnd={onTokenDragEnd}
								onTokenPreviewPosition={onTokenPreviewPosition}
								map={map}
								enableTokenDrag={enableTokenDrag}
								tileSize={tileSize}
								tokenPositionOverrides={tokenPositionOverrides}
							/>
						))}
					</View>
				</View>
			</View>
		</View>
	);
};

InteractiveMapComponent.displayName = 'InteractiveMap';

export const InteractiveMap = memo(InteractiveMapComponent);

const styles = StyleSheet.create({
	wrapper: {
		alignItems: 'center',
		justifyContent: 'center',
		alignSelf: 'center',
	},
	panSurface: {
		width: '100%',
		height: '100%',
		alignItems: 'center',
		justifyContent: 'center',
	},
	gridContainer: {
		position: 'relative',
		borderWidth: 1,
		borderColor: '#CAB08A',
		backgroundColor: '#1F130A',
	},
	row: {
		flexDirection: 'row',
	},
	tile: {
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(0, 0, 0, 0.1)',
		position: 'relative',
		...(Platform.OS === 'web' ? {
			userSelect: 'none',
			WebkitUserSelect: 'none',
		} : {}),
	},
	rangeBadge: {
		backgroundColor: 'rgba(255, 212, 71, 0.85)',
		paddingHorizontal: 4,
		paddingVertical: 1,
		borderRadius: 4,
		alignSelf: 'flex-end',
		margin: 2,
	},
	rangeText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#1F130A',
	},
	rangeOutline: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		borderWidth: 2,
		borderColor: '#4CAF50',
		borderRadius: 2,
		backgroundColor: 'rgba(76, 175, 80, 0.15)',
	},
	tokenLayer: {
		position: 'absolute',
	},
	token: {
		position: 'absolute',
		borderWidth: 2,
		borderRadius: 4,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(255, 255, 255, 0.8)',
	},
	tokenLabel: {
		fontSize: 12,
		fontWeight: 'bold',
		color: '#1F130A',
	},
	tokenEmoji: {
		fontSize: 16,
	},
	tokenImage: {
		width: 20,
		height: 20,
		resizeMode: 'contain',
	},
	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		padding: 24,
		borderRadius: 8,
		backgroundColor: 'rgba(0, 0, 0, 0.05)',
	},
	trapIndicator: {
		position: 'absolute',
		top: 2,
		right: 2,
		width: 12,
		height: 12,
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 10,
	},
	trapIcon: {
		fontSize: 10,
		color: '#DC143C',
		fontWeight: 'bold',
	},
	fogOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: '#808080',
		overflow: 'hidden',
	},
	fogPatternContainer: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	},
	fogWaveSegment: {
		position: 'absolute',
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
	},
	emptyTitle: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#3B2F1B',
	},
	emptySubtitle: {
		marginTop: 4,
		fontSize: 14,
		color: '#6B5B3D',
		textAlign: 'center',
	},
});
