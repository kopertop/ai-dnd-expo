import { ImageSourcePropType } from 'react-native';

export interface SpriteSheetConfig {
	source: ImageSourcePropType;
	tileWidth: number;
	tileHeight: number;
	columns: number;
	rows: number;
}

export interface SpriteCoordinates {
	x: number; // Column index (0-based)
	y: number; // Row index (0-based)
}

/**
 * Get the source and style for rendering a sprite from a spritesheet
 * Note: React Native doesn't natively support spritesheets, so we'll need to use
 * a library like react-native-super-grid or create a custom solution.
 * For now, we'll return the full spritesheet and coordinates that can be used
 * with a spritesheet rendering component.
 */
export function getSpriteSource(
	config: SpriteSheetConfig,
	coordinates: SpriteCoordinates,
): {
	source: ImageSourcePropType;
	coordinates: SpriteCoordinates;
	config: SpriteSheetConfig;
} {
	return {
		source: config.source,
		coordinates,
		config,
	};
}

/**
 * Calculate the style for displaying a sprite from a spritesheet
 * This uses CSS background-position technique for web, or a custom component for native
 */
export function getSpriteStyle(
	config: SpriteSheetConfig,
	coordinates: SpriteCoordinates,
	size?: { width: number; height: number },
) {
	const { tileWidth, tileHeight, columns } = config;
	const { x, y } = coordinates;

	// Calculate background position
	const backgroundPositionX = -(x * tileWidth);
	const backgroundPositionY = -(y * tileHeight);

	return {
		width: size?.width || tileWidth,
		height: size?.height || tileHeight,
		backgroundPosition: `${backgroundPositionX}px ${backgroundPositionY}px`,
		backgroundSize: `${columns * tileWidth}px auto`,
	};
}
