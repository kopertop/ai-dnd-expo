import {
	Canvas,
	Circle,
	Group,
	Rect,
	useCanvasRef,
} from '@shopify/react-native-skia';
import React, { useCallback, useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
	Easing,
	runOnJS,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated';

import { GameWorldState, Position } from '@/types/world-map';

interface SkiaGameCanvasProps {
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

export const SkiaGameCanvas: React.FC<SkiaGameCanvasProps> = ({
	worldState,
	onPlayerMove,
}) => {
	const { width: screenWidth, height: screenHeight } = useWindowDimensions();
	const canvasRef = useCanvasRef();

	// Reanimated values for camera position
	const cameraX = useSharedValue(0);
	const cameraY = useSharedValue(0);

	// Reanimated values for player position
	const playerX = useSharedValue(5 * TILE_SIZE + TILE_SIZE / 2);
	const playerY = useSharedValue(5 * TILE_SIZE + TILE_SIZE / 2);

	// React state for tiles
	const [tiles, setTiles] = useState<TileData[]>([]);
	const [playerPosition, setPlayerPosition] = useState({ x: 5, y: 5 });

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
			playerX.value = withTiming(world.playerPosition.position.x * TILE_SIZE + TILE_SIZE / 2, {
				duration: 300,
				easing: Easing.inOut(Easing.ease),
			});
			playerY.value = withTiming(world.playerPosition.position.y * TILE_SIZE + TILE_SIZE / 2, {
				duration: 300,
				easing: Easing.inOut(Easing.ease),
			});
		}
	}, [playerX, playerY]);

	// Initialize test world
	useEffect(() => {
		if (worldState) {
			loadWorldData(worldState);
		} else {
			createTestWorld();
		}
	}, [worldState, loadWorldData, createTestWorld]);

	// Center camera on player initially
	useEffect(() => {
		const centerX = -playerPosition.x * TILE_SIZE + screenWidth / 2;
		const centerY = -playerPosition.y * TILE_SIZE + screenHeight / 2;

		cameraX.value = withTiming(centerX, {
			duration: 300,
			easing: Easing.inOut(Easing.ease),
		});
		cameraY.value = withTiming(centerY, {
			duration: 300,
			easing: Easing.inOut(Easing.ease),
		});
	}, [playerPosition, screenWidth, screenHeight, cameraX, cameraY]);

	// Handle player movement
	const movePlayer = useCallback((newPos: Position) => {
		if (!onPlayerMove) return;

		// Find the tile at the new position
		const targetTile = tiles.find(tile => tile.x === newPos.x && tile.y === newPos.y);

		if (targetTile && targetTile.walkable) {
			// Animate player movement
			playerX.value = withTiming(newPos.x * TILE_SIZE + TILE_SIZE / 2, {
				duration: 300,
				easing: Easing.inOut(Easing.ease),
			});
			playerY.value = withTiming(newPos.y * TILE_SIZE + TILE_SIZE / 2, {
				duration: 300,
				easing: Easing.inOut(Easing.ease),
			});

			// Update camera to follow player
			const centerX = -newPos.x * TILE_SIZE + screenWidth / 2;
			const centerY = -newPos.y * TILE_SIZE + screenHeight / 2;

			cameraX.value = withTiming(centerX, {
				duration: 300,
				easing: Easing.inOut(Easing.ease),
			});
			cameraY.value = withTiming(centerY, {
				duration: 300,
				easing: Easing.inOut(Easing.ease),
			});

			// Update local state and notify parent
			setPlayerPosition(newPos);
			onPlayerMove(newPos);
		}
	}, [tiles, onPlayerMove, playerX, playerY, cameraX, cameraY, screenWidth, screenHeight]);

	// Handle tap gestures for movement
	const handleTap = useCallback((x: number, y: number) => {
		// Convert screen coordinates to world coordinates
		const worldX = Math.floor((x - cameraX.value) / TILE_SIZE);
		const worldY = Math.floor((y - cameraY.value) / TILE_SIZE);

		movePlayer({ x: worldX, y: worldY });
	}, [movePlayer, cameraX, cameraY]);

	// Gesture handler for tap-to-move
	const tapGesture = Gesture.Tap()
		.onEnd((event) => {
			runOnJS(handleTap)(event.x, event.y);
		});

	return (
		<GestureDetector gesture={tapGesture}>
			<Canvas ref={canvasRef} style={{ flex: 1 }}>
				<Group transform={[{ translateX: cameraX.value }, { translateY: cameraY.value }]}>
					{/* Render tiles */}
					{tiles.map((tile, index) => (
						<Rect
							key={`${tile.x}-${tile.y}-${index}`}
							x={tile.x * TILE_SIZE}
							y={tile.y * TILE_SIZE}
							width={TILE_SIZE}
							height={TILE_SIZE}
							color={tile.color}
						/>
					))}

					{/* Render tile borders */}
					{tiles.map((tile, index) => (
						<Rect
							key={`border-${tile.x}-${tile.y}-${index}`}
							x={tile.x * TILE_SIZE}
							y={tile.y * TILE_SIZE}
							width={TILE_SIZE}
							height={TILE_SIZE}
							color={tile.walkable ? 'rgba(0,0,0,0.1)' : 'rgba(255,0,0,0.5)'}
							style="stroke"
						/>
					))}

					{/* Render player */}
					<Circle
						cx={playerX}
						cy={playerY}
						r={12}
						color="#4169E1"
					/>

					{/* Player border */}
					<Circle
						cx={playerX}
						cy={playerY}
						r={12}
						color="#FFFFFF"
						style="stroke"
					/>
				</Group>
			</Canvas>
		</GestureDetector>
	);
};
