import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, PanResponder, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ExpoIcon } from '@/components/expo-icon';
import { MapState, MapToken } from '@/types/multiplayer-map';

const TILE_SIZE = 28;

interface InteractiveMapProps {
	map?: MapState | null;
	isEditable?: boolean;
	enableTokenDrag?: boolean;
	onTilePress?: (x: number, y: number) => void;
	onTileDrag?: (x: number, y: number) => void;
	onTileDragEnd?: () => void;
	onTileLongPress?: (x: number, y: number) => void;
	onTokenPress?: (token: MapToken) => void;
	onTokenLongPress?: (token: MapToken) => void;
	onTokenDrop?: (token: { type: 'npc' | 'player'; id: string; label: string; icon?: string }, x: number, y: number) => void;
	onTokenDragEnd?: (token: MapToken, x: number, y: number) => void;
	highlightTokenId?: string;
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
	onTokenDrop?: (token: { type: 'npc' | 'player'; id: string; label: string; icon?: string }, x: number, y: number) => void;
	onTilePress?: (x: number, y: number) => void;
	onTileLongPress?: (x: number, y: number) => void;
	canInteract: boolean;
	isReachable: boolean;
	setHoveredTile: (tile: { x: number; y: number } | null) => void;
}> = ({ x, y, cell, isPathTile, hoveredTile, isEditable, onTokenDrop, onTilePress, onTileLongPress, canInteract, isReachable, setHoveredTile }) => {
	const tileRef = useRef<View>(null);

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

	return (
		<View
			ref={tileRef}
			key={`tile-${x}-${y}`}
			style={[
				styles.tile,
				{
					width: TILE_SIZE,
					height: TILE_SIZE,
					backgroundColor: terrainColor(cell?.terrain),
					borderColor: isPathTile
						? '#FFD447'
						: hoveredTile?.x === x && hoveredTile?.y === y
							? '#FFD700'
							: styles.tile.borderColor,
					borderWidth: isPathTile
						? 2
						: hoveredTile?.x === x && hoveredTile?.y === y
							? 2
							: styles.tile.borderWidth,
					opacity: hoveredTile?.x === x && hoveredTile?.y === y ? 0.6 : 1,
				},
			]}
		>
			<TouchableOpacity
				style={StyleSheet.absoluteFill}
				activeOpacity={canInteract ? 0.7 : 1}
				disabled={!canInteract && !isEditable}
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
	enableTokenDrag = false,
	onTilePress,
	onTileDrag,
	onTileDragEnd,
	onTileLongPress,
	onTokenPress,
	onTokenLongPress,
	onTokenDrop,
	onTokenDragEnd,
	highlightTokenId,
	reachableTiles,
	pathTiles,
}) => {
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
	const [containerSize, setContainerSize] = useState<{ width: number; height: number }>(() => ({
		width: Dimensions.get('window').width,
		height: Dimensions.get('window').height / 2,
	}));
	const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
	const panStartRef = useRef({ x: 0, y: 0 });
	const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);

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
		map: MapState;
		enableTokenDrag: boolean;
	}> = ({ token, highlightTokenId, onTokenPress, onTokenLongPress, onTokenDragEnd, map, enableTokenDrag }) => {
		const tokenRef = useRef<View>(null);
		const isDraggingRef = useRef(false);

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
					const wrapper = document.querySelector('[data-map-container]') as HTMLElement;
					if (wrapper) {
						mapContainer = wrapper;
					} else {
						// Fallback: find the wrapper by class or style
						const allDivs = Array.from(document.querySelectorAll('div'));
						mapContainer = allDivs.find(div => {
							const style = window.getComputedStyle(div);
							return style.position === 'relative' || style.position === 'absolute';
						}) as HTMLElement || null;
					}

					if (mapContainer) {
						const rect = mapContainer.getBoundingClientRect();
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
							const gridContainer = mapContainer.querySelector('[style*="gridContainer"]') ||
								mapContainer.querySelector('[style*="transform"]') as HTMLElement;

							let relativeX = dropX - rect.left;
							let relativeY = dropY - rect.top;

							// Account for pan offset if the map is panned
							if (gridContainer) {
								const gridRect = gridContainer.getBoundingClientRect();
								relativeX = dropX - gridRect.left;
								relativeY = dropY - gridRect.top;
							}

							// Calculate tile coordinates
							const tileX = Math.max(0, Math.min(map.width - 1, Math.floor(relativeX / TILE_SIZE)));
							const tileY = Math.max(0, Math.min(map.height - 1, Math.floor(relativeY / TILE_SIZE)));

							console.log('Moving token to tile:', tileX, tileY, 'from drop position:', dropX, dropY, 'relative:', relativeX, relativeY);
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
							const estimatedTileX = Math.floor((dropX - windowCenterX + 200) / TILE_SIZE);
							const estimatedTileY = Math.floor((dropY - windowCenterY + 200) / TILE_SIZE);
							console.log('Moving token to estimated tile (fallback):', estimatedTileX, estimatedTileY);
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
		}, [token, onTokenDragEnd, map, enableTokenDrag]);

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
						left: token.x * TILE_SIZE,
						top: token.y * TILE_SIZE,
						width: TILE_SIZE,
						height: TILE_SIZE,
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
				{renderTokenContent(token)}
			</TouchableOpacity>
		);
	};

	const renderTokenContent = (token: MapToken) => {
		const icon = token.icon || token.metadata?.icon || token.metadata?.image;

		let color = token.color;
		if (!color) {
			try {
				if (token.metadata) {
					const metadata = typeof token.metadata === 'string' ? JSON.parse(token.metadata) : token.metadata;
					if (metadata.tags?.includes('friendly')) {
						color = '#4CAF50';
					} else if (metadata.tags?.includes('hostile')) {
						color = '#F44336';
					} else if (metadata.tags?.includes('neutral')) {
						color = '#2196F3';
					} else {
						color = '#1F130A';
					}
				}
			} catch (error) {
				console.error('Failed to parse token metadata:', error, token.metadata);
			}
		}
		console.log('[MapTokenComponent] icon', token, icon, color);

		// If icon exists, render it using ExpoIcon
		if (typeof icon === 'string' && icon.trim().length > 0) {
			return (
				<ExpoIcon
					icon={icon.trim()}
					size={20}
					color="#1F130A"
					style={{ color }}
				/>
			);
		}

		// Fallback to initials only if no icon is available
		return (
			<Text style={styles.tokenLabel} numberOfLines={1}>
				{token.label?.slice(0, 2).toUpperCase() || 'T'}
			</Text>
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

	useEffect(() => {
		if (Platform.OS === 'web' && wrapperRef.current) {
			const element = wrapperRef.current as any;
			const domNode = element._nativeNode || element;
			if (domNode && typeof domNode.setAttribute === 'function') {
				domNode.setAttribute('data-map-container', 'true');
			}
		}
	}, []);

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
			style={styles.wrapper}
			onLayout={event => setContainerSize(event.nativeEvent.layout)}
			{...(enablePanning ? panResponder.panHandlers : {})}
		>
			<View style={styles.panSurface}>
				<View
					style={[
						styles.gridContainer,
						{
							width: map.width * TILE_SIZE,
							height: map.height * TILE_SIZE,
							transform: [
								{ translateX: panOffset.x },
								{ translateY: panOffset.y },
							],
						},
					]}
				>
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
										onTokenDrop={onTokenDrop}
										onTilePress={onTilePress}
										onTileLongPress={onTileLongPress}
										canInteract={canInteract}
										isReachable={isReachable}
										setHoveredTile={setHoveredTile}
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
								map={map}
								enableTokenDrag={enableTokenDrag}
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
		padding: 12,
		alignItems: 'center',
		width: '100%',
	},
	panSurface: {
		flex: 1,
		width: '100%',
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
