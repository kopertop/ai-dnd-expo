import { 
  WorldMap, 
  Region, 
  MapTile, 
  PointOfInterest, 
  BiomeType, 
  TerrainType, 
  Position,
  PlayerPosition,
  GameWorldState,
} from '@/types/world-map';

// Simple seedable random number generator
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice<T>(array: T[]): T {
    return array[this.range(0, array.length - 1)];
  }
}

// Noise generation for terrain
class SimplexNoise {
  private grad3 = [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
  ];
  private p: number[] = [];
  private perm: number[] = [];

  constructor(private random: SeededRandom) {
    // Generate permutation table
    for (let i = 0; i < 256; i++) {
      this.p[i] = Math.floor(random.next() * 256);
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
    }
  }

  private dot(g: number[], x: number, y: number): number {
    return g[0] * x + g[1] * y;
  }

  noise(xin: number, yin: number): number {
    let n0, n1, n2;
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const G2 = (3 - Math.sqrt(3)) / 6;
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    
    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }
    
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.perm[ii + this.perm[jj]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;
    
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) n0 = 0;
    else {
      t0 *= t0;
      n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
    }
    
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) n1 = 0;
    else {
      t1 *= t1;
      n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
    }
    
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) n2 = 0;
    else {
      t2 *= t2;
      n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
    }
    
    return 70 * (n0 + n1 + n2);
  }
}

export interface WorldGenerationConfig {
  worldName: string;
  startingArea: string;
  seed: number;
  worldSize: { width: number; height: number };
  regionSize: { width: number; height: number };
}

export class WorldGenerator {
  private random: SeededRandom;
  private noise: SimplexNoise;

  constructor(private config: WorldGenerationConfig) {
    this.random = new SeededRandom(config.seed);
    this.noise = new SimplexNoise(this.random);
  }

  generateWorld(): GameWorldState {
    console.log('🌍 Generating world:', this.config.worldName);
    
    const worldMap = this.createWorldMap();
    const playerPosition = this.createInitialPlayerPosition(worldMap);
    
    const gameWorldState: GameWorldState = {
      worldMap,
      playerPosition,
      exploredTiles: [this.getTileId(playerPosition.position)],
      discoveredPOIs: [],
      gameTime: {
        day: 1,
        hour: 8,
        timeScale: 1,
      },
      weather: {
        type: 'clear',
        intensity: 0.5,
      },
    };

    console.log('✅ World generation complete');
    return gameWorldState;
  }

  private createWorldMap(): WorldMap {
    const { worldSize, regionSize } = this.config;
    const regionsX = Math.ceil(worldSize.width / regionSize.width);
    const regionsY = Math.ceil(worldSize.height / regionSize.height);
    
    const regions: Region[] = [];
    let startingRegionId = '';

    // Generate regions
    for (let rx = 0; rx < regionsX; rx++) {
      for (let ry = 0; ry < regionsY; ry++) {
        const region = this.generateRegion(rx, ry, regionSize);
        regions.push(region);
        
        // Mark center region as starting region
        if (rx === Math.floor(regionsX / 2) && ry === Math.floor(regionsY / 2)) {
          startingRegionId = region.id;
        }
      }
    }

    return {
      id: `world-${this.config.seed}`,
      name: this.config.worldName,
      dimensions: worldSize,
      regions,
      startingRegionId,
      generationSeed: this.config.seed,
      version: 1,
      createdAt: Date.now(),
      lastModified: Date.now(),
    };
  }

  private generateRegion(regionX: number, regionY: number, regionSize: { width: number; height: number }): Region {
    const regionId = `region-${regionX}-${regionY}`;
    const biome = this.getBiomeForStartingArea(this.config.startingArea);
    
    const bounds = {
      topLeft: { x: regionX * regionSize.width, y: regionY * regionSize.height },
      bottomRight: { 
        x: (regionX + 1) * regionSize.width - 1, 
        y: (regionY + 1) * regionSize.height - 1 
      },
    };

    const tiles = this.generateRegionTiles(bounds, biome);
    const pointsOfInterest = this.generatePOIs(bounds, biome);

    return {
      id: regionId,
      name: this.generateRegionName(biome, regionX, regionY),
      biome,
      bounds,
      tiles,
      pointsOfInterest,
      connections: [], // Will be populated based on adjacent regions
      generationSeed: this.config.seed + regionX * 1000 + regionY,
    };
  }

  private generateRegionTiles(bounds: { topLeft: Position; bottomRight: Position }, biome: BiomeType): MapTile[] {
    const tiles: MapTile[] = [];
    
    for (let x = bounds.topLeft.x; x <= bounds.bottomRight.x; x++) {
      for (let y = bounds.topLeft.y; y <= bounds.bottomRight.y; y++) {
        const tile = this.generateTile(x, y, biome);
        tiles.push(tile);
      }
    }

    return tiles;
  }

  private generateTile(x: number, y: number, biome: BiomeType): MapTile {
    const noiseScale = 0.1;
    const elevation = Math.max(0, Math.min(10, Math.floor((this.noise.noise(x * noiseScale, y * noiseScale) + 1) * 5)));
    
    const terrain = this.getTerrainForBiome(biome, elevation, x, y);
    
    return {
      id: this.getTileId({ x, y }),
      position: { x, y },
      terrain,
      elevation,
      objects: [],
      walkable: this.isTerrainWalkable(terrain),
      explored: false,
    };
  }

  private getTerrainForBiome(biome: BiomeType, elevation: number, x: number, y: number): TerrainType {
    const noise = this.noise.noise(x * 0.05, y * 0.05);
    
    switch (biome) {
      case 'temperate_forest':
        if (elevation > 7) return 'mountain';
        if (elevation < 2) return 'water';
        if (noise > 0.3) return 'forest';
        return 'grass';
        
      case 'desert':
        if (elevation > 8) return 'mountain';
        if (elevation < 1) return 'water';
        if (noise > 0.2) return 'sand';
        return 'desert';
        
      case 'mountain':
        if (elevation < 3) return 'grass';
        if (elevation > 8) return 'snow';
        if (noise > 0.4) return 'stone';
        return 'mountain';
        
      case 'coastal':
        if (elevation < 3) return 'water';
        if (elevation > 6) return 'mountain';
        if (noise > 0.2) return 'sand';
        return 'grass';
        
      default:
        return 'grass';
    }
  }

  private isTerrainWalkable(terrain: TerrainType): boolean {
    return terrain !== 'water' && terrain !== 'mountain';
  }

  private generatePOIs(bounds: { topLeft: Position; bottomRight: Position }, biome: BiomeType): PointOfInterest[] {
    const pois: PointOfInterest[] = [];
    const regionArea = (bounds.bottomRight.x - bounds.topLeft.x) * (bounds.bottomRight.y - bounds.topLeft.y);
    const poiCount = Math.floor(regionArea / 400); // Roughly 1 POI per 400 tiles

    for (let i = 0; i < poiCount; i++) {
      const x = this.random.range(bounds.topLeft.x, bounds.bottomRight.x);
      const y = this.random.range(bounds.topLeft.y, bounds.bottomRight.y);
      
      const poi: PointOfInterest = {
        id: `poi-${x}-${y}`,
        name: this.generatePOIName(biome),
        type: this.random.choice(['settlement', 'landmark', 'resource', 'dungeon']),
        position: { x, y },
        discovered: false,
      };
      
      pois.push(poi);
    }

    return pois;
  }

  private getBiomeForStartingArea(startingArea: string): BiomeType {
    const areaMap: Record<string, BiomeType> = {
      'Whispering Woods': 'temperate_forest',
      'Sunscorch Desert': 'desert', 
      'Ironpeak Mountains': 'mountain',
      'Saltwind Coast': 'coastal',
      'Golden Plains': 'plains',
      'Mistral Swamps': 'swampland',
    };
    
    return areaMap[startingArea] || 'temperate_forest';
  }

  private generateRegionName(biome: BiomeType, x: number, y: number): string {
    const prefixes: Record<BiomeType, string[]> = {
      temperate_forest: ['Verdant', 'Whispering', 'Ancient', 'Misty'],
      tropical_forest: ['Lush', 'Emerald', 'Wild', 'Tangled'],
      desert: ['Scorching', 'Endless', 'Golden', 'Shifting'],
      mountain: ['Towering', 'Frozen', 'Jagged', 'Ancient'],
      coastal: ['Windswept', 'Rocky', 'Serene', 'Stormy'],
      plains: ['Rolling', 'Vast', 'Golden', 'Endless'],
      swampland: ['Murky', 'Twisted', 'Haunted', 'Foggy'],
      tundra: ['Frozen', 'Barren', 'Wind-swept', 'Desolate'],
      volcanic: ['Molten', 'Ashen', 'Burning', 'Smoky'],
    };

    const suffixes: Record<BiomeType, string[]> = {
      temperate_forest: ['Woods', 'Grove', 'Thicket', 'Glade'],
      tropical_forest: ['Jungle', 'Canopy', 'Tangle', 'Rainforest'],
      desert: ['Dunes', 'Wastes', 'Expanse', 'Sands'],
      mountain: ['Peaks', 'Ridge', 'Heights', 'Crags'],
      coastal: ['Cliffs', 'Shore', 'Bay', 'Harbor'],
      plains: ['Fields', 'Meadows', 'Grasslands', 'Steppes'],
      swampland: ['Marsh', 'Bog', 'Fen', 'Mire'],
      tundra: ['Tundra', 'Wastes', 'Flats', 'Expanse'],
      volcanic: ['Crater', 'Slopes', 'Caldera', 'Badlands'],
    };

    const prefix = this.random.choice(prefixes[biome]);
    const suffix = this.random.choice(suffixes[biome]);
    
    return `${prefix} ${suffix}`;
  }

  private generatePOIName(biome: BiomeType): string {
    const names = [
      'Ancient Ruins', 'Trader\'s Rest', 'Hidden Shrine', 'Bandit Camp',
      'Crystal Cave', 'Forgotten Temple', 'Merchant\'s Guild', 'Old Watchtower',
      'Sacred Grove', 'Abandoned Mine', 'Mystic Pool', 'Hunter\'s Lodge',
    ];
    
    return this.random.choice(names);
  }

  private createInitialPlayerPosition(worldMap: WorldMap): PlayerPosition {
    const startingRegion = worldMap.regions.find(r => r.id === worldMap.startingRegionId);
    if (!startingRegion) {
      throw new Error('Starting region not found');
    }

    // Find a walkable tile in the center of the starting region
    const centerX = Math.floor((startingRegion.bounds.topLeft.x + startingRegion.bounds.bottomRight.x) / 2);
    const centerY = Math.floor((startingRegion.bounds.topLeft.y + startingRegion.bounds.bottomRight.y) / 2);
    
    const walkableTile = startingRegion.tiles.find(tile => 
      tile.walkable && 
      Math.abs(tile.position.x - centerX) <= 5 && 
      Math.abs(tile.position.y - centerY) <= 5
    );

    const position = walkableTile ? walkableTile.position : { x: centerX, y: centerY };

    return {
      position,
      facing: 'north',
      regionId: startingRegion.id,
      lastUpdated: Date.now(),
    };
  }

  private getTileId(position: Position): string {
    return `tile-${position.x}-${position.y}`;
  }
}

// Utility function to generate a world based on game state
export const generateWorldForGameState = (gameWorld: string, startingArea: string): GameWorldState => {
  const seed = Math.floor(Math.random() * 1000000);
  
  const config: WorldGenerationConfig = {
    worldName: gameWorld,
    startingArea,
    seed,
    worldSize: { width: 200, height: 200 }, // 200x200 tile world
    regionSize: { width: 50, height: 50 }, // 50x50 tile regions
  };

  const generator = new WorldGenerator(config);
  return generator.generateWorld();
};