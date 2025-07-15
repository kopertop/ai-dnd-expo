import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, G, Rect } from 'react-native-svg';

import { GameWorldState, Position } from '@/types/world-map';

interface SvgGameCanvasProps {
	worldState?: GameWorldState;
	onPlayerMove?: (newPosition: Position) => void;
	onTileClick?: (position: Position) => void;
}

const TILE_SIZE = 32;
const GRID_SIZE = 20;

interface TileData {
	x: number;
	y: number;
	terrain: string;
	walkable: boolean;
	color: string;
}

export const SvgGameCanvas: React.FC<SvgGameCanvasProps> = ({ worldState, onPlayerMove }) => {
	const { width: screenWidth, height: screenHeight } = useWindowDimensions();

	// State for tiles and player
	const [tiles, setTiles] = useState<TileData[]>([]);
	const [playerPosition, setPlayerPosition] = useState({ x: 5, y: 5 });
	const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0 });

	// Memoized visible tiles for performance (viewport culling)
	const visibleTiles = useMemo(() => {
		const buffer = 2; // Extra tiles around viewport for smooth scrolling
		const minX = Math.floor(-cameraPosition.x / TILE_SIZE) - buffer;
		const maxX = Math.ceil((screenWidth - cameraPosition.x) / TILE_SIZE) + buffer;
		const minY = Math.floor(-cameraPosition.y / TILE_SIZE) - buffer;
		const maxY = Math.ceil((screenHeight - cameraPosition.y) / TILE_SIZE) + buffer;

		return tiles.filter(
			tile => tile.x >= minX && tile.x <= maxX && tile.y >= minY && tile.y <= maxY,
		);
	}, [tiles, cameraPosition.x, cameraPosition.y, screenWidth, screenHeight]);

	// Initialize test world
	const createTestWorld = useCallback(() => {
		const newTiles: TileData[] = [];

		for (let x = 0; x < GRID_SIZE; x++) {
			for (let y = 0; y < GRID_SIZE; y++) {
				const isLight = (x + y) % 2 === 0;
				newTiles.push({
					x,
					y,
					terrain: isLight ? 'grass' : 'forest',
					walkable: true,
					color: isLight ? '#4a7c59' : '#2d4a22',
				});
			}
		}

		setTiles(newTiles);
	}, []);

	const loadWorldData = useCallback((world: GameWorldState) => {
		const newTiles: TileData[] = [];

		// Convert world state to tile data
		world.worldMap.regions.forEach(region => {
			region.tiles.forEach(tile => {
				const terrainColors: Record<string, string> = {
					grass: '#4a7c59',
					forest: '#2d4a22',
					mountain: '#8b7355',
					desert: '#c2b280',
					water: '#4682b4',
					sand: '#ffd700',
					stone: '#696969',
					dirt: '#8b4513',
					snow: '#fffafa',
					swamp: '#556b2f',
				};

				newTiles.push({
					x: tile.position.x,
					y: tile.position.y,
					terrain: tile.terrain,
					walkable: tile.walkable,
					color: terrainColors[tile.terrain] || '#4a7c59',
				});
			});
		});

		setTiles(newTiles);

		// Update player position from world state
		if (world.playerPosition) {
			setPlayerPosition(world.playerPosition.position);
		}
	}, []);

	useEffect(() => {
		if (worldState) {
			loadWorldData(worldState);
		} else {
			createTestWorld();
		}
	}, [worldState, createTestWorld, loadWorldData]);

	// Center camera on player
	useEffect(() => {
		const centerX = -playerPosition.x * TILE_SIZE + screenWidth / 2;
		const centerY = -playerPosition.y * TILE_SIZE + screenHeight / 2;
		setCameraPosition({ x: centerX, y: centerY });
	}, [playerPosition, screenWidth, screenHeight]);

	// Handle player movement
	const movePlayer = useCallback(
		(newPos: Position) => {
			if (!onPlayerMove) return;

			// Find the tile at the new position
			const targetTile = tiles.find(tile => tile.x === newPos.x && tile.y === newPos.y);

			if (targetTile && targetTile.walkable) {
				setPlayerPosition(newPos);
				onPlayerMove(newPos);
			}
		},
		[tiles, onPlayerMove],
	);

	// Handle tap gestures for movement
	const handleTap = useCallback(
		(x: number, y: number) => {
			// Convert screen coordinates to world coordinates
			const worldX = Math.floor((x - cameraPosition.x) / TILE_SIZE);
			const worldY = Math.floor((y - cameraPosition.y) / TILE_SIZE);

			movePlayer({ x: worldX, y: worldY });
		},
		[movePlayer, cameraPosition],
	);

	// Gesture handler for tap-to-move
	const tapGesture = Gesture.Tap().onEnd(event => {
		'worklet';
		// Use runOnJS to call our handler from the UI thread
		const runOnJS = require('react-native-reanimated').runOnJS;
		runOnJS(handleTap)(event.x, event.y);
	});

	// Calculate player screen position
	const playerScreenX = playerPosition.x * TILE_SIZE + TILE_SIZE / 2;
	const playerScreenY = playerPosition.y * TILE_SIZE + TILE_SIZE / 2;

	return (
		<View style={{ flex: 1 }}>
			<GestureDetector gesture={tapGesture}>
				<Svg width={screenWidth} height={screenHeight} style={{ flex: 1 }}>
					<G transform={`translate(${cameraPosition.x}, ${cameraPosition.y})`}>
						{/* Render tiles - only visible ones for performance */}
						{visibleTiles.map((tile, index) => (
							<Rect
								key={`${tile.x}-${tile.y}-${index}`}
								x={tile.x * TILE_SIZE}
								y={tile.y * TILE_SIZE}
								width={TILE_SIZE}
								height={TILE_SIZE}
								fill={tile.color}
							/>
						))}

						{/* Render tile borders - only visible ones for performance */}
						{visibleTiles.map((tile, index) => (
							<Rect
								key={`border-${tile.x}-${tile.y}-${index}`}
								x={tile.x * TILE_SIZE}
								y={tile.y * TILE_SIZE}
								width={TILE_SIZE}
								height={TILE_SIZE}
								fill="none"
								stroke={tile.walkable ? 'rgba(0,0,0,0.1)' : 'rgba(255,0,0,0.5)'}
								strokeWidth={1}
							/>
						))}

						{/* Render player */}
						<Circle cx={playerScreenX} cy={playerScreenY} r={12} fill="#4169E1" />

						{/* Player border */}
						<Circle
							cx={playerScreenX}
							cy={playerScreenY}
							r={12}
							fill="none"
							stroke="#FFFFFF"
							strokeWidth={2}
						/>
					</G>
				</Svg>
			</GestureDetector>
		</View>
	);
};
