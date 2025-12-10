# Equipment Spritesheet Setup

This file explains how to set up a spritesheet for equipment icons.

## Quick Start

1. **Add your spritesheet image** to `assets/images/equipment/items.png` (or your preferred location)

2. **Update `constants/equipment-spritesheet.ts`**:

```typescript
export const EQUIPMENT_SPRITESHEET: SpriteSheetConfig = {
	source: require('@/assets/images/equipment/items.png'),
	tileWidth: 32,  // Width of each icon in pixels
	tileHeight: 32, // Height of each icon in pixels
	columns: 8,     // Number of columns in the spritesheet
	rows: 8,        // Number of rows in the spritesheet
};
```

3. **Map your equipment items** in the `EQUIPMENT_ICONS` object:

```typescript
export const EQUIPMENT_ICONS: Record<string, ...> = {
	item_longsword: { spritesheet: 'equipment', x: 0, y: 0 }, // Top-left icon
	item_dagger: { spritesheet: 'equipment', x: 1, y: 0 },    // Second icon in first row
	// ... etc
};
```

## Spritesheet Layout

Your spritesheet should be a grid of icons. For example, an 8x8 grid:

```
[0,0] [1,0] [2,0] ... [7,0]
[0,1] [1,1] [2,1] ... [7,1]
...
[0,7] [1,7] [2,7] ... [7,7]
```

Coordinates are 0-based, where:
- `x` is the column (0 = leftmost)
- `y` is the row (0 = topmost)

## Alternative: Direct Image Files

If you prefer individual image files instead of a spritesheet, you can use:

```typescript
item_longsword: require('@/assets/images/equipment/longsword.png'),
item_dagger: require('@/assets/images/equipment/dagger.png'),
```

Or URLs:

```typescript
item_longsword: 'https://example.com/icons/longsword.png',
```

## Current Icon Mappings

All equipment items in `constants/starting-equipment.ts` are automatically mapped to icons via `getEquipmentIcon()`. The mappings are defined in `EQUIPMENT_ICONS` in this file.

