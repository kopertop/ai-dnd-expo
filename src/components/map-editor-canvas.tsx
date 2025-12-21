import * as React from 'react';

interface TileData {
	x: number;
	y: number;
	terrain?: string;
	movement_cost?: number;
	is_blocked?: boolean;
	is_difficult?: boolean;
	provides_cover?: boolean;
	cover_type?: 'half' | 'three-quarters' | 'full' | null;
	elevation?: number;
	feature_type?: string | null;
}

interface MapEditorCanvasProps {
	backgroundImageUrl: string | null;
	gridSize: number;
	gridOffsetX: number;
	gridOffsetY: number;
	gridColumns: number;
	gridRows: number;
	tiles: Record<string, TileData>;
	selectedTileKeys: Set<string>;
	panOffset: { x: number; y: number };
	zoom: number;
	isPanning: boolean;
	onTileClick: (x: number, y: number, isShiftPressed: boolean) => void;
	onPanChange: (offset: { x: number; y: number }) => void;
	onZoomChange: (zoom: number) => void;
	onPanningChange: (isPanning: boolean) => void;
	activeTool: string;
	showGrid: boolean;
	containerRef: React.RefObject<HTMLDivElement>;
}

const TERRAIN_COLORS: Record<string, string> = {
	grass: 'rgba(34, 197, 94, 0.3)',
	forest: 'rgba(22, 163, 74, 0.4)',
	mountain: 'rgba(107, 114, 128, 0.5)',
	desert: 'rgba(251, 191, 36, 0.3)',
	water: 'rgba(59, 130, 246, 0.4)',
	sand: 'rgba(254, 243, 199, 0.4)',
	stone: 'rgba(156, 163, 175, 0.3)',
	dirt: 'rgba(120, 53, 15, 0.3)',
	snow: 'rgba(249, 250, 251, 0.4)',
	swamp: 'rgba(34, 197, 94, 0.5)',
	wall: 'rgba(0, 0, 0, 0.5)',
	difficult: 'rgba(251, 146, 60, 0.3)',
	cover: 'rgba(34, 197, 94, 0.3)',
};

const MapEditorCanvas: React.FC<MapEditorCanvasProps> = ({
	backgroundImageUrl,
	gridSize,
	gridOffsetX,
	gridOffsetY,
	gridColumns,
	gridRows,
	tiles,
	selectedTileKeys,
	panOffset,
	zoom,
	isPanning,
	onTileClick,
	onPanChange,
	onZoomChange,
	onPanningChange,
	activeTool,
	showGrid,
	containerRef,
}) => {
	const canvasRef = React.useRef<HTMLDivElement>(null);
	const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 });
	const panStartRef = React.useRef({ x: 0, y: 0 });
	const mouseStartRef = React.useRef({ x: 0, y: 0 });
	const isRightClickPanRef = React.useRef(false);

	const MIN_ZOOM = 0.25;
	const MAX_ZOOM = 4;

	// Update container size
	React.useEffect(() => {
		const updateSize = () => {
			if (containerRef.current) {
				const rect = containerRef.current.getBoundingClientRect();
				setContainerSize({ width: rect.width, height: rect.height });
			}
		};

		updateSize();
		window.addEventListener('resize', updateSize);
		return () => window.removeEventListener('resize', updateSize);
	}, [containerRef]);

	// Convert screen coordinates to grid coordinates
	const screenToGrid = (screenX: number, screenY: number): { x: number; y: number } | null => {
		if (!containerRef.current) return null;

		const rect = containerRef.current.getBoundingClientRect();
		const relativeX = screenX - rect.left;
		const relativeY = screenY - rect.top;

		// Account for pan and zoom (transform is applied to canvas, so we need to reverse it)
		const worldX = (relativeX - panOffset.x) / zoom;
		const worldY = (relativeY - panOffset.y) / zoom;

		// Account for grid offset
		const gridX = (worldX - gridOffsetX) / gridSize;
		const gridY = (worldY - gridOffsetY) / gridSize;

		const x = Math.floor(gridX);
		const y = Math.floor(gridY);

		if (x < 0 || x >= gridColumns || y < 0 || y >= gridRows) {
			return null;
		}

		return { x, y };
	};

	// Clamp zoom
	const clampZoom = (value: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));

	// No panning limits - allow unlimited panning in any direction
	const clampPan = (value: number, containerSize: number, mapSize: number) => {
		// Return value as-is, no clamping
		return value;
	};

	// Calculate map dimensions
	const mapWidth = gridColumns * gridSize + gridOffsetX;
	const mapHeight = gridRows * gridSize + gridOffsetY;
	const mapWidthPx = mapWidth * zoom;
	const mapHeightPx = mapHeight * zoom;

	// Mouse event handlers
	const handleMouseDown = (e: React.MouseEvent) => {
		// Right-click: always start panning
		if (e.button === 2) {
			e.preventDefault();
			mouseStartRef.current = { x: e.clientX, y: e.clientY };
			panStartRef.current = panOffset;
			isRightClickPanRef.current = true;
			onPanningChange(true);
			return;
		}

		// Left-click: handle based on tool
		if (activeTool !== 'select' && activeTool !== 'grid') return;

		const isShiftPressed = e.shiftKey;
		const gridPos = screenToGrid(e.clientX, e.clientY);

		if (gridPos) {
			onTileClick(gridPos.x, gridPos.y, isShiftPressed);
		} else if (!isShiftPressed) {
			// Start panning
			mouseStartRef.current = { x: e.clientX, y: e.clientY };
			panStartRef.current = panOffset;
			isRightClickPanRef.current = false;
			onPanningChange(true);
		}
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		// Right-click panning works regardless of tool
		if (isPanning && isRightClickPanRef.current) {
			// Invert direction: dragging right moves map right, dragging down moves map down
			const deltaX = e.clientX - mouseStartRef.current.x;
			const deltaY = e.clientY - mouseStartRef.current.y;

			const newPanX = clampPan(panStartRef.current.x + deltaX, containerSize.width, mapWidthPx);
			const newPanY = clampPan(panStartRef.current.y + deltaY, containerSize.height, mapHeightPx);

			onPanChange({ x: newPanX, y: newPanY });
			return;
		}

		// Left-click panning (only in select/grid tools)
		if (isPanning && !isRightClickPanRef.current && (activeTool === 'select' || activeTool === 'grid')) {
			// Invert direction: dragging right moves map right, dragging down moves map down
			const deltaX = e.clientX - mouseStartRef.current.x;
			const deltaY = e.clientY - mouseStartRef.current.y;

			const newPanX = clampPan(panStartRef.current.x + deltaX, containerSize.width, mapWidthPx);
			const newPanY = clampPan(panStartRef.current.y + deltaY, containerSize.height, mapHeightPx);

			onPanChange({ x: newPanX, y: newPanY });
		} else if (activeTool === 'terrain' && !isRightClickPanRef.current) {
			// Handle terrain painting on drag
			if (e.buttons === 1) {
				const gridPos = screenToGrid(e.clientX, e.clientY);
				if (gridPos) {
					onTileClick(gridPos.x, gridPos.y, false);
				}
			}
		}
	};

	const handleMouseUp = () => {
		onPanningChange(false);
		isRightClickPanRef.current = false;
	};

	const handleContextMenu = (e: React.MouseEvent) => {
		// Prevent context menu when right-clicking to pan
		e.preventDefault();
	};

	const handleWheel = (e: React.WheelEvent) => {
		e.preventDefault();
		const delta = e.deltaY > 0 ? -0.1 : 0.1;
		const newZoom = clampZoom(zoom + delta);
		onZoomChange(newZoom);
	};

	// Update cursor style
	React.useEffect(() => {
		if (canvasRef.current) {
			if (isPanning) {
				canvasRef.current.style.cursor = 'grabbing';
			} else if (activeTool === 'select' || activeTool === 'grid') {
				canvasRef.current.style.cursor = 'grab';
			} else {
				// Show grab cursor for right-click panning hint
				canvasRef.current.style.cursor = 'grab';
			}
		}
	}, [isPanning, activeTool]);

	if (!backgroundImageUrl) {
		return (
			<div className="flex h-64 items-center justify-center rounded-md border border-dashed border-slate-200 bg-white text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-500">
				Set a background image to edit the map.
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className="relative h-full w-full overflow-hidden bg-slate-100 dark:bg-slate-900"
		>
			<div
				ref={canvasRef}
				className="absolute left-0 top-0"
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onMouseLeave={handleMouseUp}
				onWheel={handleWheel}
				onContextMenu={handleContextMenu}
				style={{
					transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
					transformOrigin: '0 0',
					width: `${mapWidth}px`,
					height: `${mapHeight}px`,
				}}
			>
				{/* Background Image */}
				<img
					src={backgroundImageUrl}
					alt="Map background"
					className="absolute left-0 top-0"
					style={{
						width: `${mapWidth}px`,
						height: `${mapHeight}px`,
						objectFit: 'contain',
					}}
				/>

				{/* Grid Overlay */}
				{showGrid ? (
					<svg
						className="pointer-events-none absolute left-0 top-0"
						width={mapWidth}
						height={mapHeight}
						style={{ opacity: 0.35 }}
					>
						{/* Vertical lines */}
						{Array.from({ length: gridColumns + 1 }, (_, i) => {
							const x = i * gridSize + gridOffsetX;
							return (
								<line
									key={`v-${i}`}
									x1={x}
									y1={gridOffsetY}
									x2={x}
									y2={mapHeight}
									stroke="rgba(255, 255, 255, 0.5)"
									strokeWidth={1}
								/>
							);
						})}
						{/* Horizontal lines */}
						{Array.from({ length: gridRows + 1 }, (_, i) => {
							const y = i * gridSize + gridOffsetY;
							return (
								<line
									key={`h-${i}`}
									x1={gridOffsetX}
									y1={y}
									x2={mapWidth}
									y2={y}
									stroke="rgba(255, 255, 255, 0.5)"
									strokeWidth={1}
								/>
							);
						})}
					</svg>
				) : null}

				{/* Tile Overlays */}
				<svg
					className="pointer-events-none absolute left-0 top-0"
					width={mapWidth}
					height={mapHeight}
				>
					{Object.entries(tiles).map(([key, tile]) => {
						const x = tile.x * gridSize + gridOffsetX;
						const y = tile.y * gridSize + gridOffsetY;
						const isSelected = selectedTileKeys.has(key);
						const terrainColor = tile.terrain ? TERRAIN_COLORS[tile.terrain] : undefined;

						return (
							<g key={key}>
								{/* Terrain color overlay */}
								{terrainColor ? (
									<rect
										x={x}
										y={y}
										width={gridSize}
										height={gridSize}
										fill={terrainColor}
									/>
								) : null}
								{/* Selection highlight */}
								{isSelected ? (
									<rect
										x={x}
										y={y}
										width={gridSize}
										height={gridSize}
										fill="none"
										stroke="#FCD34D"
										strokeWidth={6}
										strokeDasharray="8 4"
										opacity={1}
									>
										<animate
											attributeName="stroke-dashoffset"
											values="0;12"
											dur="0.5s"
											repeatCount="indefinite"
										/>
									</rect>
								) : null}
							</g>
						);
					})}
				</svg>
			</div>
		</div>
	);
};

export default MapEditorCanvas;
