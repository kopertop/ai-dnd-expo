import React, { useEffect, useRef, useState } from 'react';
import { View, Dimensions, Platform } from 'react-native';
import * as PIXI from 'pixi.js';

import { WorldMap, Position, GameWorldState } from '@/types/world-map';

interface GameCanvasProps {
  worldState?: GameWorldState;
  onPlayerMove?: (newPosition: Position) => void;
  onTileClick?: (position: Position) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  worldState,
  onPlayerMove,
  onTileClick,
}) => {
  const canvasContainerRef = useRef<View>(null);
  const pixiAppRef = useRef<PIXI.Application | null>(null);
  const viewportRef = useRef<any>(null);
  const playerSpriteRef = useRef<PIXI.Graphics | null>(null);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [tileSize] = useState(32); // Make tile size consistent

  // Track screen dimensions for responsive canvas
  useEffect(() => {
    const onChange = (result: { window: any; screen: any }) => {
      setScreenData(result.window);
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  // Initialize Pixi.js application
  useEffect(() => {
    const initPixi = async () => {
      try {
        console.log('🎮 Initializing Pixi.js application...');
        
        // Create Pixi application
        const app = new PIXI.Application();
        await app.init({
          width: screenData.width,
          height: screenData.height,
          backgroundColor: 0x2c5530, // Dark forest green
          antialias: true,
          resolution: Platform.OS === 'web' ? window.devicePixelRatio || 1 : 2,
          autoDensity: true,
        });

        console.log('✅ Pixi.js application initialized');
        pixiAppRef.current = app;

        // For web, append canvas to DOM
        if (Platform.OS === 'web' && canvasContainerRef.current) {
          const container = canvasContainerRef.current as any;
          container.appendChild(app.canvas);
        }

        // Set up viewport for camera controls
        setupViewport(app);

        // Load initial world if provided
        if (worldState) {
          loadWorld(worldState);
        } else {
          // Create a simple placeholder for testing
          createPlaceholderWorld();
        }

      } catch (error) {
        console.error('❌ Failed to initialize Pixi.js:', error);
      }
    };

    initPixi();

    // Cleanup on unmount
    return () => {
      if (pixiAppRef.current) {
        pixiAppRef.current.destroy(true);
        pixiAppRef.current = null;
      }
    };
  }, []);

  // Handle screen resize
  useEffect(() => {
    if (pixiAppRef.current) {
      pixiAppRef.current.renderer.resize(screenData.width, screenData.height);
      if (viewportRef.current) {
        viewportRef.current.resize(screenData.width, screenData.height);
      }
    }
  }, [screenData]);

  // Set up viewport for camera controls and click handling
  const setupViewport = (app: PIXI.Application) => {
    const viewport = new PIXI.Container();
    app.stage.addChild(viewport);
    viewportRef.current = viewport;

    // Track dragging state
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let hasDragged = false;

    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;

    app.stage.on('pointerdown', (event: any) => {
      isDragging = true;
      hasDragged = false;
      dragStart = { x: event.data.global.x, y: event.data.global.y };
    });

    app.stage.on('pointermove', (event: any) => {
      if (isDragging) {
        const dx = event.data.global.x - dragStart.x;
        const dy = event.data.global.y - dragStart.y;
        
        // Only start panning if we've moved a significant distance
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          hasDragged = true;
          viewport.x += dx;
          viewport.y += dy;
          dragStart = { x: event.data.global.x, y: event.data.global.y };
        }
      }
    });

    app.stage.on('pointerup', (event: any) => {
      if (isDragging && !hasDragged) {
        // This was a click, not a drag - handle click-to-move
        handleMapClick(event);
      }
      isDragging = false;
      hasDragged = false;
    });

    app.stage.on('pointerupoutside', () => {
      isDragging = false;
      hasDragged = false;
    });

    console.log('✅ Viewport controls set up');
  };

  // Handle map clicks for movement
  const handleMapClick = (event: any) => {
    if (!viewportRef.current || !worldState || !onPlayerMove) return;

    const viewport = viewportRef.current;
    
    // Convert screen coordinates to world coordinates
    const worldX = Math.floor((event.data.global.x - viewport.x) / tileSize);
    const worldY = Math.floor((event.data.global.y - viewport.y) / tileSize);
    
    console.log('🎯 Map clicked at world position:', { x: worldX, y: worldY });
    
    // Check if the clicked tile is walkable
    const clickedTile = findTileAtPosition({ x: worldX, y: worldY });
    if (clickedTile && clickedTile.walkable) {
      console.log('🚶 Moving player to walkable tile');
      onPlayerMove({ x: worldX, y: worldY });
    } else {
      console.log('❌ Cannot move to non-walkable tile');
    }
  };

  // Find a tile at a specific position
  const findTileAtPosition = (position: Position): any => {
    if (!worldState) return null;
    
    for (const region of worldState.worldMap.regions) {
      const tile = region.tiles.find(t => 
        t.position.x === position.x && t.position.y === position.y
      );
      if (tile) return tile;
    }
    return null;
  };

  // Load world state and render map
  const loadWorld = (worldState: GameWorldState) => {
    console.log('🗺️ Loading world state:', worldState.worldMap.name);
    
    if (!pixiAppRef.current || !viewportRef.current) return;

    const viewport = viewportRef.current;
    
    // Clear existing world
    viewport.removeChildren();
    playerSpriteRef.current = null;

    // Render each region
    worldState.worldMap.regions.forEach(region => {
      renderRegion(region, viewport);
    });

    // Create and position player sprite
    createPlayerSprite(worldState.playerPosition, viewport);

    // Position camera at player location
    if (worldState.playerPosition) {
      centerCameraOnPlayer(worldState.playerPosition);
    }

    console.log('✅ World loaded successfully');
  };

  // Create the player sprite
  const createPlayerSprite = (playerPosition: any, viewport: PIXI.Container) => {
    const player = new PIXI.Graphics();
    
    // Draw player as a circle with character-like appearance
    player.fill(0x4169E1); // Royal blue
    player.circle(tileSize / 2, tileSize / 2, 12);
    
    // Add a border
    player.stroke({ width: 2, color: 0xFFFFFF });
    player.circle(tileSize / 2, tileSize / 2, 12);
    
    // Add facing direction indicator based on facing direction
    drawFacingIndicator(player, playerPosition.facing);
    
    // Position player on the map
    player.x = playerPosition.position.x * tileSize;
    player.y = playerPosition.position.y * tileSize;
    
    // Add to viewport and store reference
    viewport.addChild(player);
    playerSpriteRef.current = player;
    
    console.log('👤 Player sprite created at:', playerPosition.position);
  };

  // Center camera on player position
  const centerCameraOnPlayer = (playerPosition: any) => {
    if (!viewportRef.current) return;
    
    const viewport = viewportRef.current;
    viewport.x = -playerPosition.position.x * tileSize + screenData.width / 2;
    viewport.y = -playerPosition.position.y * tileSize + screenData.height / 2;
  };

  // Render a region on the map
  const renderRegion = (region: any, viewport: PIXI.Container) => {
    console.log(`🏞️ Rendering region: ${region.name}`);
    
    // Create container for this region
    const regionContainer = new PIXI.Container();
    viewport.addChild(regionContainer);

    // Render each tile in the region
    region.tiles.forEach((tile: any) => {
      const tileSprite = createTileSprite(tile);
      tileSprite.x = tile.position.x * tileSize;
      tileSprite.y = tile.position.y * tileSize;
      regionContainer.addChild(tileSprite);
    });
  };

  // Create a sprite for a map tile
  const createTileSprite = (tile: any): PIXI.Graphics => {
    const graphics = new PIXI.Graphics();
    
    // Get color based on terrain type
    const terrainColors: Record<string, number> = {
      grass: 0x4a7c59,
      forest: 0x2d4a22,
      mountain: 0x8b7355,
      desert: 0xc2b280,
      water: 0x4682b4,
      sand: 0xffd700,
      stone: 0x696969,
      dirt: 0x8b4513,
      snow: 0xfffafa,
      swamp: 0x556b2f,
    };

    const color = terrainColors[tile.terrain] || 0x4a7c59;
    
    // Draw tile
    graphics.fill(color);
    graphics.rect(0, 0, tileSize, tileSize);
    
    // Add border for non-walkable tiles
    if (!tile.walkable) {
      graphics.stroke({ width: 2, color: 0xff0000, alpha: 0.5 });
      graphics.rect(0, 0, tileSize, tileSize);
    } else {
      // Subtle border for walkable tiles
      graphics.stroke({ width: 1, color: 0x000000, alpha: 0.1 });
      graphics.rect(0, 0, tileSize, tileSize);
    }

    // Add elevation shading
    if (tile.elevation > 0) {
      const elevationAlpha = Math.min(tile.elevation * 0.1, 0.5);
      graphics.fill({ color: 0xffffff, alpha: elevationAlpha });
      graphics.rect(0, 0, tileSize, tileSize);
    }

    return graphics;
  };

  // Create a simple placeholder world for testing
  const createPlaceholderWorld = () => {
    console.log('🎨 Creating placeholder world...');
    
    if (!pixiAppRef.current || !viewportRef.current) return;

    const viewport = viewportRef.current;
    const gridSize = 20;

    // Create a simple grid of tiles
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const graphics = new PIXI.Graphics();
        
        // Checkerboard pattern
        const isLight = (x + y) % 2 === 0;
        const color = isLight ? 0x4a7c59 : 0x2d4a22;
        
        graphics.fill(color);
        graphics.rect(0, 0, tileSize, tileSize);
        graphics.stroke({ width: 1, color: 0x000000, alpha: 0.1 });
        graphics.rect(0, 0, tileSize, tileSize);
        
        graphics.x = x * tileSize;
        graphics.y = y * tileSize;
        
        viewport.addChild(graphics);
      }
    }

    // Add a simple player marker using our createPlayerSprite function
    const playerPosition = {
      position: { x: 5, y: 5 },
      facing: 'north',
    };
    createPlayerSprite(playerPosition, viewport);

    console.log('✅ Placeholder world created');
  };

  // Update player position when world state changes
  useEffect(() => {
    if (worldState && pixiAppRef.current) {
      if (playerSpriteRef.current) {
        // Update existing player position
        updatePlayerPosition(worldState.playerPosition);
      } else {
        // Load the entire world including player
        loadWorld(worldState);
      }
    }
  }, [worldState]);

  // Update player sprite position
  const updatePlayerPosition = (playerPosition: any) => {
    if (!playerSpriteRef.current) return;
    
    const player = playerSpriteRef.current;
    const newX = playerPosition.position.x * tileSize;
    const newY = playerPosition.position.y * tileSize;
    
    console.log('🚶 Updating player position to:', playerPosition.position);
    
    // Smooth movement animation (optional)
    if (Platform.OS === 'web') {
      // Simple animation for web
      const duration = 300; // ms
      const startX = player.x;
      const startY = player.y;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease-out animation
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        player.x = startX + (newX - startX) * easeProgress;
        player.y = startY + (newY - startY) * easeProgress;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      animate();
    } else {
      // Instant movement for mobile
      player.x = newX;
      player.y = newY;
    }
    
    // Update facing direction indicator
    updatePlayerFacing(playerPosition.facing);
  };

  // Draw facing direction indicator on player sprite
  const drawFacingIndicator = (player: PIXI.Graphics, facing: string) => {
    player.fill(0xFFFFFF);
    
    const centerX = tileSize / 2;
    const centerY = tileSize / 2;
    const indicatorDistance = 8;
    
    // Draw directional indicator based on facing
    switch (facing) {
      case 'north':
        // Triangle pointing up
        player.moveTo(centerX, centerY - indicatorDistance);
        player.lineTo(centerX - 3, centerY - indicatorDistance + 6);
        player.lineTo(centerX + 3, centerY - indicatorDistance + 6);
        player.closePath();
        player.fill();
        break;
      case 'south':
        // Triangle pointing down
        player.moveTo(centerX, centerY + indicatorDistance);
        player.lineTo(centerX - 3, centerY + indicatorDistance - 6);
        player.lineTo(centerX + 3, centerY + indicatorDistance - 6);
        player.closePath();
        player.fill();
        break;
      case 'east':
        // Triangle pointing right
        player.moveTo(centerX + indicatorDistance, centerY);
        player.lineTo(centerX + indicatorDistance - 6, centerY - 3);
        player.lineTo(centerX + indicatorDistance - 6, centerY + 3);
        player.closePath();
        player.fill();
        break;
      case 'west':
        // Triangle pointing left
        player.moveTo(centerX - indicatorDistance, centerY);
        player.lineTo(centerX - indicatorDistance + 6, centerY - 3);
        player.lineTo(centerX - indicatorDistance + 6, centerY + 3);
        player.closePath();
        player.fill();
        break;
      default:
        // Default to north
        player.circle(centerX, centerY - indicatorDistance, 2);
        break;
    }
  };

  // Update player facing direction
  const updatePlayerFacing = (facing: string) => {
    if (!playerSpriteRef.current) return;
    
    console.log('👁️ Player facing:', facing);
    
    // Redraw the player sprite with new facing direction
    const player = playerSpriteRef.current;
    player.clear();
    
    // Redraw player circle
    player.fill(0x4169E1);
    player.circle(tileSize / 2, tileSize / 2, 12);
    
    // Redraw border
    player.stroke({ width: 2, color: 0xFFFFFF });
    player.circle(tileSize / 2, tileSize / 2, 12);
    
    // Redraw facing indicator
    drawFacingIndicator(player, facing);
  };

  if (Platform.OS === 'web') {
    return (
      <div
        ref={canvasContainerRef as any}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
        }}
      />
    );
  }

  // For React Native, we would need expo-gl integration
  // This is a simplified version for web testing
  return (
    <View
      ref={canvasContainerRef}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#2c5530',
      }}
    />
  );
};