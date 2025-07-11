import React from 'react';

import { SkiaGameCanvas } from '@/components/skia-game-canvas';
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
	// Use React Native Skia for all platforms (web and mobile)
	return (
		<SkiaGameCanvas
			worldState={worldState}
			onPlayerMove={onPlayerMove}
			onTileClick={onTileClick}
		/>
	);
};
