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
  const [screenData, setScreenData] = useState(Dimensions.get('window'));

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

  // Set up viewport for camera controls (pan, zoom)
  const setupViewport = (app: PIXI.Application) => {
    // For now, we'll use a simple container as viewport
    // In a full implementation, you might want to use pixi-viewport library
    const viewport = new PIXI.Container();
    app.stage.addChild(viewport);
    viewportRef.current = viewport;

    // Basic pan controls (will be enhanced later)
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };

    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;

    app.stage.on('pointerdown', (event: any) => {
      isDragging = true;
      dragStart = { x: event.data.global.x, y: event.data.global.y };
    });

    app.stage.on('pointermove', (event: any) => {
      if (isDragging) {
        const dx = event.data.global.x - dragStart.x;
        const dy = event.data.global.y - dragStart.y;
        viewport.x += dx;
        viewport.y += dy;
        dragStart = { x: event.data.global.x, y: event.data.global.y };
      }
    });

    app.stage.on('pointerup', () => {
      isDragging = false;
    });

    app.stage.on('pointerupoutside', () => {
      isDragging = false;
    });

    console.log('✅ Viewport controls set up');
  };

  // Load world state and render map
  const loadWorld = (worldState: GameWorldState) => {
    console.log('🗺️ Loading world state:', worldState.worldMap.name);
    
    if (!pixiAppRef.current || !viewportRef.current) return;

    const viewport = viewportRef.current;
    
    // Clear existing world
    viewport.removeChildren();

    // Render each region
    worldState.worldMap.regions.forEach(region => {
      renderRegion(region, viewport);
    });

    // Position camera at player location
    if (worldState.playerPosition) {
      const tileSize = 32; // Will be configurable
      viewport.x = -worldState.playerPosition.position.x * tileSize + screenData.width / 2;
      viewport.y = -worldState.playerPosition.position.y * tileSize + screenData.height / 2;
    }

    console.log('✅ World loaded successfully');
  };

  // Render a region on the map
  const renderRegion = (region: any, viewport: PIXI.Container) => {
    console.log(`🏞️ Rendering region: ${region.name}`);
    
    const tileSize = 32;
    
    // Create container for this region
    const regionContainer = new PIXI.Container();
    viewport.addChild(regionContainer);

    // Render each tile in the region
    region.tiles.forEach((tile: any) => {
      const tileSprite = createTileSprite(tile, tileSize);
      tileSprite.x = tile.position.x * tileSize;
      tileSprite.y = tile.position.y * tileSize;
      regionContainer.addChild(tileSprite);
    });
  };

  // Create a sprite for a map tile
  const createTileSprite = (tile: any, size: number): PIXI.Graphics => {
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
    graphics.rect(0, 0, size, size);
    
    // Add border
    graphics.stroke({ width: 1, color: 0x000000, alpha: 0.2 });
    graphics.rect(0, 0, size, size);

    // Add elevation shading
    if (tile.elevation > 0) {
      const elevationAlpha = Math.min(tile.elevation * 0.1, 0.5);
      graphics.fill({ color: 0xffffff, alpha: elevationAlpha });
      graphics.rect(0, 0, size, size);
    }

    return graphics;
  };

  // Create a simple placeholder world for testing
  const createPlaceholderWorld = () => {
    console.log('🎨 Creating placeholder world...');
    
    if (!pixiAppRef.current || !viewportRef.current) return;

    const viewport = viewportRef.current;
    const tileSize = 32;
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

    // Add a simple player marker
    const player = new PIXI.Graphics();
    player.fill(0xff0000);
    player.circle(tileSize / 2, tileSize / 2, 8);
    player.x = 5 * tileSize;
    player.y = 5 * tileSize;
    viewport.addChild(player);

    console.log('✅ Placeholder world created');
  };

  // Update world when worldState changes
  useEffect(() => {
    if (worldState && pixiAppRef.current) {
      loadWorld(worldState);
    }
  }, [worldState]);

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