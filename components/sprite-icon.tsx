import React from 'react';
import { Image, ImageSourcePropType, View, ViewStyle } from 'react-native';

import type { SpriteCoordinates, SpriteSheetConfig } from '@/utils/spritesheet';

interface SpriteIconProps {
	spritesheet: SpriteSheetConfig;
	coordinates: SpriteCoordinates;
	size?: number;
	style?: ViewStyle;
}

/**
 * SpriteIcon component for rendering icons from a spritesheet
 *
 * Note: React Native doesn't natively support CSS background-position,
 * so we use a workaround with Image and View clipping, or we can use
 * a library. For now, this is a placeholder that shows the full spritesheet.
 *
 * For a proper implementation, consider using:
 * - react-native-super-grid
 * - A custom Image component with clipping
 * - Or pre-split the spritesheet into individual images
 */
export const SpriteIcon: React.FC<SpriteIconProps> = ({
	spritesheet,
	coordinates,
	size,
	style,
}) => {
	const { tileWidth, tileHeight } = spritesheet;
	const { x, y } = coordinates;
	const iconSize = size || tileWidth;

	// Calculate the crop area
	const cropX = x * tileWidth;
	const cropY = y * tileHeight;

	// For React Native, we'll use a View with overflow hidden and negative margin
	// This is a workaround - ideally you'd use a proper spritesheet library
	return (
		<View
			style={[
				{
					width: iconSize,
					height: iconSize,
					overflow: 'hidden',
				},
				style,
			]}
		>
			<Image
				source={spritesheet.source}
				style={{
					width: spritesheet.columns * tileWidth,
					height: spritesheet.rows * tileHeight,
					marginLeft: -cropX,
					marginTop: -cropY,
				}}
				resizeMode="stretch"
			/>
		</View>
	);
};

/**
 * Helper to resolve an icon reference to either a direct image source or spritesheet coordinates
 */
export function resolveItemIcon(
	iconRef: string | ImageSourcePropType | { spritesheet: string; x: number; y: number } | undefined,
	spritesheets?: Record<string, SpriteSheetConfig>,
): ImageSourcePropType | { spritesheet: SpriteSheetConfig; coordinates: SpriteCoordinates } | null {
	if (!iconRef) return null;

	// If it's already an ImageSourcePropType (number from require())
	if (typeof iconRef === 'number') {
		return iconRef;
	}

	// If it's an object with spritesheet coordinates
	if (typeof iconRef === 'object' && 'spritesheet' in iconRef && 'x' in iconRef && 'y' in iconRef) {
		if (spritesheets && spritesheets[iconRef.spritesheet]) {
			return {
				spritesheet: spritesheets[iconRef.spritesheet],
				coordinates: { x: iconRef.x, y: iconRef.y },
			};
		}
		return null;
	}

	// If it's a string, try to resolve it
	if (typeof iconRef === 'string') {
		// Check if it's a spritesheet reference format: "spritesheet:name:x:y"
		const spritesheetMatch = iconRef.match(/^spritesheet:([^:]+):(\d+):(\d+)$/);
		if (spritesheetMatch && spritesheets) {
			const [, name, x, y] = spritesheetMatch;
			if (spritesheets[name]) {
				return {
					spritesheet: spritesheets[name],
					coordinates: { x: parseInt(x, 10), y: parseInt(y, 10) },
				};
			}
		}

		// Otherwise, treat as URI
		return { uri: iconRef };
	}

	return null;
}

