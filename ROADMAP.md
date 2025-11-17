# Map Enhancement and Admin Tools

## Overview

Enhance the map visualization with proper terrain colors and implement admin tools for tile editing and character placement. This will allow DMs to customize maps before and during gameplay. Includes support for GLB 3D character models from meshi.ai.

## Current State Analysis

### Existing Infrastructure

- Map rendering: `components/map/InteractiveMap.tsx` - basic terrain colors (water, grass, stone, lava)
- API endpoint: `POST /api/games/:inviteCode/map/terrain` - already supports bulk tile updates
- Token system: `POST /api/games/:inviteCode/map/tokens` - supports placing characters/NPCs
- Database: `map_tiles` table stores terrain_type, elevation, is_blocked, etc.
- Map generator: `shared/workers/map-generator.ts` - generates procedural maps with various terrain types

### Gaps

- Limited terrain color mapping (only 4 types)
- No admin UI for tile editing in DM controls
- No visual feedback for editable mode
- Missing terrain types: gravel/road, dirt, snow, mountains
- No tile selection/palette UI
- No 3D character model support

## Implementation Plan

### Phase 1: Terrain Color System Enhancement

**1.1 Extend terrain color mapping**

- File: `components/map/InteractiveMap.tsx`
- Expand `terrainColor()` function to support:
  - `grass` → `#7FB77E` (green) - existing
  - `water` → `#7FD1F7` (blue) - existing  
  - `gravel` / `road` → `#9B8B7A` (grey)
  - `dirt` → `#8B6F47` (brown)
  - `snow` → `#F5F5F5` (white)
  - `mountain` / `impassible` → `#2C2C2C` (black)
  - `stone` → `#B0A8B9` (grey) - existing
  - `lava` → `#F05D23` (red) - existing
  - Default fallback → `#D9D4C5` (beige)

**1.2 Update map generator to use new terrain types**

- File: `shared/workers/map-generator.ts`
- Update `buildRoadTiles()` to use `gravel` instead of `road` for consistency
- Add `dirt` terrain in forest clearing areas
- Add `snow` terrain option for future winter biomes
- Add `mountain` terrain for impassible areas

### Phase 2: Admin Tile Editing UI

**2.1 Create terrain palette component**

- New file: `components/map/terrain-palette.tsx`
- Display selectable terrain types with color swatches
- Include: grass, water, gravel, dirt, snow, mountain, stone, lava
- Show active selection state
- Responsive layout for mobile/tablet

**2.2 Enhance InteractiveMap for editing**

- File: `components/map/InteractiveMap.tsx`
- Add visual feedback for editable mode:
  - Highlight hovered tile when `isEditable={true}`
  - Show border/outline on hover
  - Optional: show coordinates on hover
- Improve `onTilePress` callback to pass selected terrain type
- Add debouncing for rapid tile clicks

**2.3 Add tile editing to DM controls**

- File: `components/dm-controls-panel.tsx`
- Add new "Map Editor" section:
  - Toggle for edit mode
  - Terrain palette selector
  - Current selection indicator
  - "Clear selection" button
- Wire up to `InteractiveMap` component with `isEditable` prop
- Handle tile updates via `multiplayerClient.updateMapTerrain()`

**2.4 Implement tile update logic**

- File: `services/api/multiplayer-client.ts`
- Add `updateMapTerrain()` method:
  ```typescript
  async updateMapTerrain(
    inviteCode: string,
    tiles: Array<{ x: number; y: number; terrainType: string }>
  ): Promise<MapStateResponse>
  ```

- Call `POST /api/games/:inviteCode/map/terrain` endpoint
- Batch updates for multiple tiles (e.g., paint mode)

**2.5 Add bulk editing features**

- Support "paint mode" - click and drag to paint multiple tiles
- Add "fill area" tool (future enhancement)
- Add "undo/redo" for tile changes (future enhancement)

### Phase 3: Character Placement System

**3.1 Enhance token placement UI**

- File: `components/dm-controls-panel.tsx`
- Add "Place Character" section:
  - List of available characters from game state
  - Click character → enter placement mode
  - Click map tile to place character token
  - Show preview of token before placement
- Add "Place NPC" button (reuse existing NPC placement logic)

**3.2 Improve token visualization**

- File: `components/map/InteractiveMap.tsx`
- Enhance token rendering:
  - Better visual distinction between player/NPC/object tokens
  - Show character name/initials more clearly
  - Add hover tooltip with character details
  - Improve z-index layering (tokens above terrain)
- Support GLB 3D models for characters:
  - Check if character has `glbModelUrl` property
  - Render 3D model using react-three-fiber/@react-three/drei
  - Fallback to 2D token if no GLB model available
  - Handle model loading states and errors

**3.3 Add token movement**

- Allow dragging tokens to new positions (future enhancement)
- Add API endpoint for token position updates (if not exists)

### Phase 3.5: GLB Character Model Support (meshi.ai)

**3.5.1 Extend character data model**

- File: `types/character.ts`
- Add optional `glbModelUrl?: string` field to Character interface
- Add `glbModelId?: string` for meshi.ai model references
- Update character schema in database (add `glb_model_url` column if needed)

**3.5.2 Create GLB model upload component**

- New file: `components/character-glb-upload.tsx`
- Support two methods:
  - Direct file upload (for local GLB files)
  - meshi.ai integration (fetch model by ID/URL)
- Show preview of 3D model before assignment
- Validate GLB file format and size limits
- Store GLB URLs in character metadata

**3.5.3 Integrate 3D rendering library**

- Install dependencies: `@react-three/fiber`, `@react-three/drei`, `three`
- Create 3D model renderer component:
  - New file: `components/map/glb-model-renderer.tsx`
  - Load and render GLB files using GLTFLoader
  - Support model positioning, scaling, rotation
  - Handle loading states and error boundaries

**3.5.4 Update character creation/editing**

- File: `app/new-character.tsx` and character editing screens
- Add "3D Model" section:
  - Option to upload GLB file
  - Option to enter meshi.ai model ID/URL
  - Preview current model if assigned
  - Remove model option
- Store GLB reference in character data

**3.5.5 Add GLB storage and API support**

- File: `api/src/routes/games.ts` or new `api/src/routes/characters.ts`
- Add endpoint for GLB upload:
  - `POST /api/characters/:id/glb-model`
  - Handle file upload (consider Cloudflare R2 or direct CDN)
  - Return CDN URL for stored model
- Support meshi.ai URL format (if publicly accessible)
- Update character update endpoint to accept `glbModelUrl`

**3.5.6 Update multiplayer client**

- File: `services/api/multiplayer-client.ts`
- Add methods for GLB model operations:
  - `uploadCharacterGlb(characterId, file): Promise<string>` - upload and get URL
  - `setCharacterGlbUrl(characterId, url): Promise<void>` - set meshi.ai URL
- Ensure GLB URLs are included in character data sync

**3.5.7 Performance optimizations**

- Implement model caching (store loaded GLB models in memory/IndexedDB)
- Lazy load models (only load when character is visible on map)
- Support model LOD (Level of Detail) for distant characters
- Compress GLB files if needed (meshi.ai may already optimize)
- Consider using `useGLTF` hook from drei for automatic caching

### Phase 4: Integration and Polish

**4.1 Update host game screen**

- File: `app/host-game.tsx`
- Ensure map editor is accessible:
  - Before game starts (status: 'waiting')
  - During gameplay (status: 'active')
- Add visual indicator when in edit mode
- Show unsaved changes warning if applicable

**4.2 Add map state persistence**

- Ensure tile changes are saved immediately
- Add loading states during save operations
- Handle error states gracefully

**4.3 Update map state adapter**

- File: `utils/schema-adapters.ts`
- Verify `mapStateFromDb()` correctly handles all terrain types
- Ensure terrain grid is properly normalized

## Testing Strategy

### Manual Testing Dialog

**Test Scenario: DM Creates and Customizes a Map**

1. **Setup**

   - DM logs in and creates a new game
   - Game status: 'waiting'
   - Navigate to host game view

2. **Generate Initial Map**

   - Click "Generate Map" or select existing map
   - Verify map displays with default terrain colors
   - Check all terrain types render correctly

3. **Enter Edit Mode**

   - Open DM Controls panel
   - Find "Map Editor" section
   - Toggle "Edit Mode" ON
   - Verify map shows hover feedback on tiles

4. **Edit Individual Tiles**

   - Select "grass" from terrain palette
   - Click a tile → verify it turns green
   - Select "water" from palette
   - Click another tile → verify it turns blue
   - Select "mountain" from palette
   - Click a tile → verify it turns black and becomes impassible

5. **Paint Multiple Tiles**

   - Select "gravel" from palette
   - Click and drag across multiple tiles
   - Verify all dragged tiles become grey
   - Check API calls are batched (not one per tile)

6. **Place Characters**

   - Exit edit mode (or switch to character placement)
   - Select a character from "Place Character" list
   - Click on map tile → verify token appears
   - Verify token shows character name/initials
   - Place another character → verify both tokens visible

7. **Test GLB Character Models**

   - Create/edit a character
   - Upload a GLB file or enter meshi.ai URL
   - Verify 3D model preview appears
   - Place character on map
   - Verify 3D model renders on map (not just 2D token)
   - Test model loading states and error handling

8. **Save and Verify**

   - Refresh page
   - Verify all tile changes persist
   - Verify all character tokens persist
   - Verify GLB model URLs persist in character data
   - Check map state in database

9. **Test During Active Game**

   - Start the game (status: 'active')
   - Enter edit mode
   - Modify a tile
   - Verify players see updated map (via WebSocket/polling)
   - Verify 3D character models are visible to players

10. **Test Edge Cases**

    - Try editing with no map selected → should show error
    - Try placing character on impassible tile → should allow or warn
    - Try rapid clicking → should debounce properly
    - Test on mobile device → verify touch interactions work
    - Test with large GLB files → verify performance/loading
    - Test with invalid GLB files → verify error handling

### Automated Tests (Future)

- Unit tests for `terrainColor()` function
- Integration tests for tile update API endpoint
- E2E tests for map editing workflow (Playwright)
- Unit tests for GLB model loading and rendering

## File Changes Summary

### Modified Files

- `components/map/InteractiveMap.tsx` - terrain colors, edit mode UI, GLB rendering
- `components/dm-controls-panel.tsx` - map editor controls
- `services/api/multiplayer-client.ts` - tile update method, GLB upload methods
- `shared/workers/map-generator.ts` - new terrain types
- `types/character.ts` - GLB model fields
- `app/new-character.tsx` - GLB upload UI
- `api/src/routes/games.ts` or new `api/src/routes/characters.ts` - GLB upload endpoint

### New Files

- `components/map/terrain-palette.tsx` - terrain selection UI
- `components/character-glb-upload.tsx` - GLB upload/selection component
- `components/map/glb-model-renderer.tsx` - 3D model rendering component

### Database

- Add `glb_model_url` column to `characters` table (if needed)
- No schema changes needed for terrain (terrain_type is already text field)

### Dependencies

- Add `@react-three/fiber` - React renderer for Three.js
- Add `@react-three/drei` - Useful helpers for react-three-fiber
- Add `three` - 3D graphics library

## Future Enhancements (Out of Scope)

- Tile images/sprites instead of solid colors
- Object layer (chests, altars, etc.)
- Fog of war visualization
- Elevation visualization
- Multi-layer terrain (e.g., grass with road overlay)
- Map import/export
- Undo/redo for tile edits
- Fill tool for area painting
- GLB model animation support
- Custom GLB model editor
- Model marketplace integration
