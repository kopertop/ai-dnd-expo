import React from 'react';

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
	return (
		<SvgGameCanvas
			worldState={worldState}
			onPlayerMove={onPlayerMove}
			onTileClick={onTileClick}
		/>
	);
};
