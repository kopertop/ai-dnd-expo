---
name: Map Editor Full Functionality
overview: Transform the basic map editor into a fully interactive editor with panning/zooming, tile selection, single and bulk tile property editing, terrain painting, and tool selection - matching the React Native implementation.
todos:
  - id: create-canvas-component
    content: Create MapEditorCanvas component with tile rendering, click detection, and coordinate conversion
    status: completed
  - id: create-property-editor
    content: Create TilePropertyEditor web component ported from React Native version
    status: completed
  - id: add-state-management
    content: Add tiles, selection, pan, zoom, and tool state to map editor route
    status: completed
  - id: implement-panning
    content: Implement mouse drag panning with bounds clamping and cursor feedback
    status: completed
  - id: implement-zooming
    content: Implement mouse wheel zoom and zoom controls (+/-, reset, fit to screen)
    status: completed
  - id: implement-tile-selection
    content: Implement single and multi-tile selection with visual highlights
    status: completed
  - id: implement-bulk-editing
    content: Implement bulk property editing for multiple selected tiles
    status: completed
  - id: implement-terrain-painting
    content: Implement terrain painting tool with terrain type palette
    status: completed
  - id: add-tool-sidebar
    content: Add left sidebar with tool selection (Pointer, Grid, Terrain, Objects, Properties)
    status: completed
  - id: integrate-canvas
    content: Replace static preview with interactive canvas and wire up all event handlers
    status: completed
  - id: add-zoom-controls
    content: Add zoom controls overlay (buttons and percentage display) to canvas
    status: completed
  - id: test-save-load
    content: Test that tiles save and load correctly through the API
    status: pending
---

# Map Editor Full Functionality Implementation

## Overview

The current web map editor (`src/routes/admin/maps/$id.tsx`) is a basic form-based editor. We need to transform it into a fully interactive canvas-based editor matching the React Native implementation (`app/admin/maps/[id].tsx`), with panning, zooming, tile selection, property editing, and terrain painting.

## Architecture

### Current State

- Static preview with grid overlay
- Form-based editing in sidebar tabs
- No interactive canvas
- No tile selection or property editing
- No panning/zooming

### Target State

- Interactive canvas with clickable tiles
- Panning via mouse drag
- Zooming via mouse wheel and controls
- Single tile selection with property sidebar
- Multi-tile selection (Shift+click or drag selection)
- Bulk property editing for selected tiles
- Terrain painting tool
- Tool selection sidebar (Pointer, Grid, Terrain, Objects, Properties)
- Visual feedback for selected tiles

## Implementation Plan

### 1. Create Interactive Canvas Component

**File**: `src/components/map-editor-canvas.tsx` (new)Create a reusable canvas component that handles:

- Rendering map background image with grid overlay
- Tile click detection and coordinate conversion
- Visual rendering of tiles (terrain colors, selection highlights)
- Panning state management
- Zoom state management
- Mouse event handling (click, drag, wheel)

**Key features:**

- Convert screen coordinates to grid coordinates
- Render selected tiles with highlight overlay
- Support for terrain visualization (colored overlays)
- Handle panning bounds and zoom limits (0.25x to 4x)
- Display zoom percentage

### 2. Create Tile Property Editor Component

**File**: `src/components/tile-property-editor.tsx` (new)Port the React Native `TilePropertyEditor` to web:

- Terrain type dropdown (using `constants/terrain-types.ts`)
- Movement cost input
- Blocked/Difficult terrain toggles
- Cover settings (Provides Cover toggle, Cover Type selection)
- Elevation input
- Feature Type input
- Auto-update logic (blocked → movement cost 999, difficult → movement cost 2, etc.)

**Props:**

- `properties`: TileProperties object
- `onChange`: Callback when properties change
- `onClose`: Callback to close editor
- `selectedCount`: Number of selected tiles (for bulk editing)

### 3. Update Map Editor Route

**File**: `src/routes/admin/maps/$id.tsx`**State Management:**

- Add `tiles` state: `Record<string, TileData>` (key: "x,y")
- Add `selectedTileKeys` state: `Set<string>`
- Add `activeTool` state: `'select' | 'grid' | 'terrain' | 'object' | 'properties'`
- Add `panOffset` state: `{ x: number, y: number }`
- Add `zoom` state: `number` (default 1, range 0.25-4)
- Add `isPanning` state: `boolean`
- Add `activeTerrain` state: `string` (for terrain painting)

**Load tiles from API:**

- When map loads, parse `map.tiles` array into `tiles` Record
- Convert API format to internal `TileData` format

**Save tiles to API:**

- Convert `tiles` Record to array format for API
- Include tiles in `saveMap` payload

**Tool Selection Sidebar:**

- Replace current tab buttons with icon-based tool selector (left sidebar)
- Tools: Pointer (select), Grid, Pencil (terrain), Cube (objects), Gear (properties)
- Highlight active tool

**Canvas Integration:**

- Replace static preview with `MapEditorCanvas` component
- Pass tile data, selection state, pan/zoom state
- Handle tile click events
- Handle pan/zoom events

**Property Sidebar:**

- Show `TilePropertyEditor` when tiles are selected
- Support single tile editing
- Support bulk editing (merge properties, show "X tiles selected")
- "Clear Tile" button to remove tile properties

**Zoom Controls:**

- Add zoom controls overlay (top-right of canvas)
- Buttons: +, -, Reset, Fit to Screen
- Display current zoom percentage

### 4. Panning Implementation

- Mouse drag to pan (only in select/grid tools)
- Track pan start position
- Clamp pan to map bounds with margin
- Update cursor style (grab/grabbing)
- Disable panning when in terrain/object tools

### 5. Zooming Implementation

- Mouse wheel zoom (with Ctrl/Cmd modifier or always enabled)
- Zoom controls (+/- buttons, reset, fit to screen)
- Zoom percentage display
- Clamp zoom between 0.25x and 4x
- Update pan bounds when zoom changes

### 6. Tile Selection

- Single click: select one tile
- Shift+click: toggle tile in multi-selection
- Visual highlight for selected tiles (blue outline or overlay)
- Click outside to deselect
- Show property editor when tiles selected

### 7. Bulk Editing

- When multiple tiles selected, merge their properties
- Show "X tiles selected" message
- Apply changes to all selected tiles
- Handle mixed values (show placeholder or first tile's value)

### 8. Terrain Painting Tool

- Select terrain type from palette
- Click tiles to paint terrain
- Click again to remove terrain
- Visual feedback (terrain color overlay)
- Update tile properties based on terrain preset

### 9. Data Format Conversion

**API Format → Internal Format:**

```typescript
// API: { x, y, terrain_type, movement_cost, is_blocked, ... }
// Internal: { x, y, terrain, movement_cost, is_blocked, ... }
```

**Internal Format → API Format:**

```typescript
// Convert tiles Record to array
Object.values(tiles).map(tile => ({
  x: tile.x,
  y: tile.y,
  terrain_type: tile.terrain || 'none',
  movement_cost: tile.movement_cost ?? 1,
  is_blocked: tile.is_blocked ?? false,
  // ... other properties
}))
```



### 10. Styling and Layout

- Left sidebar: Tool selection (vertical icon buttons)
- Main canvas: Interactive map with zoom controls overlay
- Right sidebar: Property editor (when tiles selected) or empty
- Responsive layout (sidebar collapses on mobile)

## Files to Create/Modify

### New Files

1. `src/components/map-editor-canvas.tsx` - Interactive canvas component
2. `src/components/tile-property-editor.tsx` - Web version of tile property editor

### Modified Files

1. `src/routes/admin/maps/$id.tsx` - Major refactor to add interactive editing
2. `src/utils/maps.ts` - Ensure tiles are included in save payload (may already be handled)

## Key Dependencies

- React hooks: `useState`, `useRef`, `useEffect`, `useCallback`
- Mouse events: `onMouseDown`, `onMouseMove`, `onMouseUp`, `onWheel`
- Coordinate conversion utilities
- Terrain type constants from `constants/terrain-types.ts`