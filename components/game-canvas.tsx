import React from 'react';
import { Platform } from 'react-native';

import { SkiaGameCanvas } from '@/components/skia-game-canvas';
import { SvgGameCanvas } from '@/components/svg-game-canvas';
import { GameWorldState, Position } from '@/types/world-map';

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
	// Use SVG for web platform to avoid Skia WebGL issues, Skia for native platforms
	if (Platform.OS === 'web') {
		return (
			<SvgGameCanvas
				worldState={worldState}
				onPlayerMove={onPlayerMove}
				onTileClick={onTileClick}
			/>
		);
	}

	// Use React Native Skia for mobile platforms
	return (
		<SkiaGameCanvas
			worldState={worldState}
			onPlayerMove={onPlayerMove}
			onTileClick={onTileClick}
		/>
	);
};
