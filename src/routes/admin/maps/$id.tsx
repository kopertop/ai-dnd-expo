import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import * as React from 'react';

import { TERRAIN_TYPES } from '@/constants/terrain-types';
import ImageChooser from '~/components/image-chooser';
import MapEditorCanvas from '~/components/map-editor-canvas';
import RouteShell from '~/components/route-shell';
import TilePropertyEditor, { type TileProperties } from '~/components/tile-property-editor';
import { currentUserQueryOptions } from '~/utils/auth';
import { fetchMap, saveMap } from '~/utils/maps';
import { worldsQueryOptions } from '~/utils/worlds';

type ToolId = 'select' | 'grid' | 'terrain' | 'object' | 'properties';

type ObjectToken = {
	id?: string;
	label?: string | null;
	image_url?: string | null;
	x: number;
	y: number;
	metadata?: Record<string, unknown> | null;
};

type TileData = {
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
};

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

const clampZoom = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const AdminMapDetail: React.FC = () => {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const userQuery = useSuspenseQuery(currentUserQueryOptions());
	const user = userQuery.data;
	const isAdmin = user?.is_admin === true;

	const worldsQuery = useQuery({
		...worldsQueryOptions(),
		enabled: isAdmin,
	});
	const worlds = worldsQuery.data ?? [];

	const mapQuery = useQuery({
		queryKey: ['map', id],
		queryFn: () => fetchMap({ data: { id } }),
		enabled: isAdmin,
	});

	// Tool selection
	const [activeTool, setActiveTool] = React.useState<ToolId>('select');
	const [slugTouched, setSlugTouched] = React.useState(false);
	const [showGrid, setShowGrid] = React.useState(true);
	const [savingError, setSavingError] = React.useState<string | null>(null);

	// Map properties form
	const [formData, setFormData] = React.useState({
		name: '',
		slug: '',
		description: '',
		world_id: '',
		background_image_url: '',
		cover_image_url: '',
		grid_size: 100,
		grid_offset_x: 0,
		grid_offset_y: 0,
		grid_columns: 40,
		grid_rows: 30,
	});

	// Tiles state: key "x,y" -> TileData
	const [tiles, setTiles] = React.useState<Record<string, TileData>>({});
	const [originalTiles, setOriginalTiles] = React.useState<Record<string, TileData>>({});
	const [originalFormData, setOriginalFormData] = React.useState<typeof formData | null>(null);
	const [originalObjects, setOriginalObjects] = React.useState<ObjectToken[]>([]);
	const [selectedTileKeys, setSelectedTileKeys] = React.useState<Set<string>>(new Set());
	const [activeTerrain, setActiveTerrain] = React.useState('stone');
	const [lastSavedAt, setLastSavedAt] = React.useState<number | null>(null);
	const autoSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

	// Objects/tokens
	const [objects, setObjects] = React.useState<ObjectToken[]>([]);

	// Canvas state
	const canvasContainerRef = React.useRef<HTMLDivElement>(null);
	const [panOffset, setPanOffset] = React.useState({ x: 0, y: 0 });
	const [zoom, setZoom] = React.useState(1);
	const [isPanning, setIsPanning] = React.useState(false);

	const MIN_ZOOM = 0.25;
	const MAX_ZOOM = 4;

	// Prevent body scrolling when editor is open
	React.useEffect(() => {
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = '';
		};
	}, []);

	// Load map data
	React.useEffect(() => {
		const map = mapQuery.data;
		if (!map) return;

		setFormData((prev) => ({
			...prev,
			name: map.name ?? '',
			slug: map.slug ?? '',
			description: map.description ?? '',
			world_id: map.world_id ?? '',
			background_image_url: map.background_image_url ?? '',
			cover_image_url: map.cover_image_url ?? '',
			grid_size: map.grid_size ?? 100,
			grid_offset_x: map.grid_offset_x ?? 0,
			grid_offset_y: map.grid_offset_y ?? 0,
			grid_columns: map.grid_columns ?? map.width ?? 40,
			grid_rows: map.height ?? 30,
		}));

		// Load tiles
		const newTiles: Record<string, TileData> = {};
		if (map.tiles && Array.isArray(map.tiles)) {
			map.tiles.forEach((t: any) => {
				const key = `${t.x},${t.y}`;
				newTiles[key] = {
					x: t.x,
					y: t.y,
					terrain: t.terrain_type || t.terrain || 'none',
					movement_cost: t.movement_cost ?? 1,
					is_blocked: Boolean(t.is_blocked),
					is_difficult: Boolean(t.is_difficult),
					provides_cover: Boolean(t.provides_cover),
					cover_type: t.cover_type || null,
					elevation: t.elevation ?? 0,
					feature_type: t.feature_type || null,
				};
			});
		}
		setTiles(newTiles);
		setOriginalTiles(JSON.parse(JSON.stringify(newTiles))); // Deep copy for comparison

		// Load objects/tokens
		const tokenRows = Array.isArray(map.tokens) ? map.tokens : [];
		const loadedObjects = tokenRows.map((t) => ({
			id: typeof t.id === 'string' ? t.id : undefined,
			label: typeof t.label === 'string' ? t.label : null,
			image_url: typeof t.image_url === 'string' ? t.image_url : null,
			x: typeof t.x === 'number' ? t.x : 0,
			y: typeof t.y === 'number' ? t.y : 0,
			metadata: typeof t.metadata === 'object' && t.metadata ? (t.metadata as Record<string, unknown>) : null,
		}));
		setObjects(loadedObjects);
		setOriginalObjects(JSON.parse(JSON.stringify(loadedObjects))); // Deep copy

		// Store original form data for comparison
		const newFormData = {
			name: map.name ?? '',
			slug: map.slug ?? '',
			description: map.description ?? '',
			world_id: map.world_id ?? '',
			background_image_url: map.background_image_url ?? '',
			cover_image_url: map.cover_image_url ?? '',
			grid_size: map.grid_size ?? 100,
			grid_offset_x: map.grid_offset_x ?? 0,
			grid_offset_y: map.grid_offset_y ?? 0,
			grid_columns: map.grid_columns ?? map.width ?? 40,
			grid_rows: map.height ?? 30,
		};
		setOriginalFormData(newFormData);
		setLastSavedAt(Date.now());
	}, [mapQuery.data]);

	// Helper to check if form data has changed
	const hasFormDataChanged = React.useCallback(() => {
		if (!originalFormData) return true;
		return (
			formData.name.trim() !== originalFormData.name.trim() ||
			formData.slug.trim() !== originalFormData.slug.trim() ||
			formData.description.trim() !== originalFormData.description.trim() ||
			formData.world_id !== originalFormData.world_id ||
			formData.background_image_url !== originalFormData.background_image_url ||
			formData.cover_image_url !== originalFormData.cover_image_url ||
			formData.grid_size !== originalFormData.grid_size ||
			formData.grid_columns !== originalFormData.grid_columns ||
			formData.grid_rows !== originalFormData.grid_rows ||
			formData.grid_offset_x !== originalFormData.grid_offset_x ||
			formData.grid_offset_y !== originalFormData.grid_offset_y
		);
	}, [formData, originalFormData]);

	// Helper to check if objects have changed
	const hasObjectsChanged = React.useCallback(() => {
		if (objects.length !== originalObjects.length) return true;
		return objects.some((obj, idx) => {
			const orig = originalObjects[idx];
			return (
				!orig ||
				obj.id !== orig.id ||
				obj.label !== orig.label ||
				obj.image_url !== orig.image_url ||
				obj.x !== orig.x ||
				obj.y !== orig.y ||
				JSON.stringify(obj.metadata) !== JSON.stringify(orig.metadata)
			);
		});
	}, [objects, originalObjects]);

	// Helper to get changed tiles only
	const getChangedTiles = React.useCallback(() => {
		const changed: TileData[] = [];
		const allTileKeys = new Set([...Object.keys(tiles), ...Object.keys(originalTiles)]);

		allTileKeys.forEach((key) => {
			const current = tiles[key];
			const original = originalTiles[key];

			// Tile was added or modified
			if (current && (!original || JSON.stringify(current) !== JSON.stringify(original))) {
				changed.push(current);
			}
			// Tile was deleted (exists in original but not in current)
			// Note: We don't track deletions separately, but we can include them as empty tiles
			// For now, we'll just track additions/modifications
		});

		return changed;
	}, [tiles, originalTiles]);

	// Check if map can be saved (must have name and slug)
	const canSave = formData.name.trim().length > 0 && formData.slug.trim().length > 0;

	// Save mutation - saves all current state to DB
	const saveMutation = useMutation({
		mutationFn: async () => {
			setSavingError(null);

			// Always send all current tiles (API replaces all tiles)
			const tilesArray = Object.values(tiles).map((tile) => ({
				x: tile.x,
				y: tile.y,
				terrain_type: tile.terrain || 'none',
				movement_cost: tile.movement_cost ?? 1,
				is_blocked: tile.is_blocked ?? false,
				is_difficult: tile.is_difficult ?? false,
				provides_cover: tile.provides_cover ?? false,
				cover_type: tile.cover_type || null,
				elevation: tile.elevation ?? 0,
				feature_type: tile.feature_type || null,
			}));

			const payload = {
				id,
				name: formData.name.trim(),
				slug: formData.slug.trim(),
				description: formData.description.trim() ? formData.description.trim() : null,
				world_id: formData.world_id || null,
				background_image_url: formData.background_image_url || null,
				cover_image_url: formData.cover_image_url || null,
				grid_size: formData.grid_size,
				grid_columns: formData.grid_columns,
				grid_offset_x: formData.grid_offset_x,
				grid_offset_y: formData.grid_offset_y,
				width: formData.grid_columns,
				height: formData.grid_rows,
				tiles: tilesArray,
				tokens: objects.map((t) => ({
					id: t.id,
					label: t.label ?? 'Object',
					image_url: t.image_url ?? null,
					x: t.x,
					y: t.y,
					metadata: t.metadata ?? {},
				})),
			};

			return await saveMap({ data: payload });
		},
		onSuccess: async () => {
			// Update original state after successful save
			setOriginalTiles(JSON.parse(JSON.stringify(tiles)));
			setOriginalFormData(JSON.parse(JSON.stringify(formData)));
			setOriginalObjects(JSON.parse(JSON.stringify(objects)));
			setLastSavedAt(Date.now());
			await queryClient.invalidateQueries({ queryKey: ['maps'] });
			await queryClient.invalidateQueries({ queryKey: ['map', id] });
		},
		onError: (error) => {
			setSavingError(error instanceof Error ? error.message : 'Failed to save map');
		},
	});

	// Tile click handler
	const handleTileClick = React.useCallback(
		(x: number, y: number, isShiftPressed: boolean) => {
			const key = `${x},${y}`;

			if (activeTool === 'select') {
				if (isShiftPressed) {
					// Multi-selection mode: toggle tile in/out of selection
					setSelectedTileKeys((prev) => {
						const next = new Set(prev);
						if (next.has(key)) {
							next.delete(key);
						} else {
							// If tile doesn't exist, create default
							if (!tiles[key]) {
								setTiles((prev) => ({
									...prev,
									[key]: { x, y, terrain: 'none', movement_cost: 1 },
								}));
							}
							next.add(key);
						}
						return next;
					});
				} else {
					// Single selection mode: clear and select new tile
					if (selectedTileKeys.has(key) && selectedTileKeys.size === 1) {
						// Deselect if clicking the same single tile
						setSelectedTileKeys(new Set());
					} else {
						// If tile doesn't exist, create default
						if (!tiles[key]) {
							setTiles((prev) => ({
								...prev,
								[key]: { x, y, terrain: 'none', movement_cost: 1 },
							}));
						}
						setSelectedTileKeys(new Set([key]));
					}
				}
				return;
			}

			if (activeTool === 'terrain') {
				// Paint logic
				setTiles((prev) => {
					const next = { ...prev };
					if (next[key] && next[key].terrain === activeTerrain) {
						// Remove terrain if clicking same terrain
						delete next[key];
					} else {
						// Set terrain properties based on type
						const isDifficult = activeTerrain === 'difficult' || activeTerrain === 'water' || activeTerrain === 'swamp';
						const isBlocked = activeTerrain === 'wall' || activeTerrain === 'mountain';
						const providesCover = activeTerrain === 'forest' || activeTerrain === 'cover';

						next[key] = {
							x,
							y,
							terrain: activeTerrain,
							movement_cost: isDifficult ? 2 : 1,
							is_blocked: isBlocked,
							is_difficult: isDifficult,
							provides_cover: providesCover,
						};
					}
					return next;
				});
			}
		},
		[activeTool, activeTerrain, selectedTileKeys, tiles],
	);

	// Update selected tiles
	const updateSelectedTiles = React.useCallback(
		(updates: Partial<TileData>) => {
			if (selectedTileKeys.size === 0) return;
			setTiles((prev) => {
				const next = { ...prev };
				selectedTileKeys.forEach((key) => {
					if (next[key]) {
						next[key] = { ...next[key], ...updates };
					}
				});
				return next;
			});
			// Trigger auto-save check
			scheduleAutoSave();
		},
		[selectedTileKeys],
	);

	// Auto-save scheduling - use refs to avoid dependency issues
	const scheduleAutoSave = React.useCallback(() => {
		// Clear existing timeout
		if (autoSaveTimeoutRef.current) {
			clearTimeout(autoSaveTimeoutRef.current);
		}

		// Schedule new auto-save in 3 seconds
		autoSaveTimeoutRef.current = setTimeout(() => {
			// Use a function to capture current state at timeout execution
			const checkAndSave = () => {
				// Check if there are any changes using current state
				const currentTiles = tiles;
				const currentFormData = formData;
				const currentObjects = objects;

				// Check for tile changes
				const allTileKeys = new Set([
					...Object.keys(currentTiles),
					...Object.keys(originalTiles),
				]);
				let hasTileChanges = false;
				allTileKeys.forEach((key) => {
					const current = currentTiles[key];
					const original = originalTiles[key];
					if (
						(current && !original) ||
						(!current && original) ||
						(current && original && JSON.stringify(current) !== JSON.stringify(original))
					) {
						hasTileChanges = true;
					}
				});

				// Check for form data changes
				const hasFormChanges = originalFormData
					? currentFormData.name.trim() !== originalFormData.name.trim() ||
						currentFormData.slug.trim() !== originalFormData.slug.trim() ||
						currentFormData.description.trim() !== originalFormData.description.trim() ||
						currentFormData.world_id !== originalFormData.world_id ||
						currentFormData.background_image_url !== originalFormData.background_image_url ||
						currentFormData.cover_image_url !== originalFormData.cover_image_url ||
						currentFormData.grid_size !== originalFormData.grid_size ||
						currentFormData.grid_columns !== originalFormData.grid_columns ||
						currentFormData.grid_rows !== originalFormData.grid_rows ||
						currentFormData.grid_offset_x !== originalFormData.grid_offset_x ||
						currentFormData.grid_offset_y !== originalFormData.grid_offset_y
					: false;

				// Check for object changes
				const hasObjectChanges =
					currentObjects.length !== originalObjects.length ||
					currentObjects.some((obj, idx) => {
						const orig = originalObjects[idx];
						return (
							!orig ||
							obj.id !== orig.id ||
							obj.label !== orig.label ||
							obj.image_url !== orig.image_url ||
							obj.x !== orig.x ||
							obj.y !== orig.y ||
							JSON.stringify(obj.metadata) !== JSON.stringify(orig.metadata)
						);
					});

				if ((hasTileChanges || hasFormChanges || hasObjectChanges) && canSave && !saveMutation.isPending) {
					saveMutation.mutate();
				}
			};

			checkAndSave();
		}, 3000);
	}, [tiles, originalTiles, formData, originalFormData, objects, originalObjects, canSave, saveMutation]);

	// Trigger auto-save when tiles change
	React.useEffect(() => {
		if (originalTiles && Object.keys(originalTiles).length > 0) {
			scheduleAutoSave();
		}
		return () => {
			if (autoSaveTimeoutRef.current) {
				clearTimeout(autoSaveTimeoutRef.current);
			}
		};
	}, [tiles, scheduleAutoSave, originalTiles]);

	// Trigger auto-save when form data changes
	React.useEffect(() => {
		if (originalFormData) {
			scheduleAutoSave();
		}
	}, [formData, scheduleAutoSave, originalFormData]);

	// Trigger auto-save when objects change
	React.useEffect(() => {
		if (originalObjects.length > 0 || objects.length > 0) {
			scheduleAutoSave();
		}
	}, [objects, scheduleAutoSave, originalObjects]);

	// Convert TileData to TileProperties
	const tileDataToProperties = React.useCallback(
		(tile: TileData): TileProperties => ({
			terrainType: tile.terrain || 'none',
			movementCost: tile.movement_cost ?? 1,
			isBlocked: tile.is_blocked ?? false,
			isDifficult: tile.is_difficult ?? false,
			providesCover: tile.provides_cover ?? false,
			coverType: tile.cover_type || null,
			elevation: tile.elevation ?? 0,
			featureType: tile.feature_type || null,
		}),
		[],
	);

	// Convert TileProperties to TileData
	const propertiesToTileData = React.useCallback(
		(props: TileProperties): Partial<TileData> => ({
			terrain: props.terrainType,
			movement_cost: props.movementCost,
			is_blocked: props.isBlocked,
			is_difficult: props.isDifficult,
			provides_cover: props.providesCover,
			cover_type: props.coverType || undefined,
			elevation: props.elevation,
			feature_type: props.featureType,
		}),
		[],
	);

	// Merge properties from multiple tiles
	const mergeTileProperties = React.useCallback((): {
		properties: TileProperties;
		hasMixedValues: boolean;
	} => {
		if (selectedTileKeys.size === 0) {
			return {
				properties: {
					terrainType: 'none',
					movementCost: 1,
					isBlocked: false,
					isDifficult: false,
					providesCover: false,
					coverType: null,
					elevation: 0,
					featureType: null,
				},
				hasMixedValues: false,
			};
		}

		const tileArray = Array.from(selectedTileKeys)
			.map((key) => tiles[key])
			.filter(Boolean);
		if (tileArray.length === 0) {
			return {
				properties: {
					terrainType: 'none',
					movementCost: 1,
					isBlocked: false,
					isDifficult: false,
					providesCover: false,
					coverType: null,
					elevation: 0,
					featureType: null,
				},
				hasMixedValues: false,
			};
		}

		const firstTile = tileArray[0];
		const allSame = tileArray.every(
			(tile) =>
				tile.terrain === firstTile.terrain &&
				tile.movement_cost === firstTile.movement_cost &&
				tile.is_blocked === firstTile.is_blocked &&
				tile.is_difficult === firstTile.is_difficult &&
				tile.provides_cover === firstTile.provides_cover &&
				tile.cover_type === firstTile.cover_type &&
				tile.elevation === firstTile.elevation &&
				tile.feature_type === firstTile.feature_type,
		);

		return {
			properties: tileDataToProperties(firstTile),
			hasMixedValues: !allSame,
		};
	}, [selectedTileKeys, tiles, tileDataToProperties]);

	// Zoom handlers
	const handleZoomIn = React.useCallback(() => {
		setZoom((prev) => clampZoom(prev + 0.25, MIN_ZOOM, MAX_ZOOM));
	}, []);

	const handleZoomOut = React.useCallback(() => {
		setZoom((prev) => clampZoom(prev - 0.25, MIN_ZOOM, MAX_ZOOM));
	}, []);

	const handleZoomReset = React.useCallback(() => {
		setZoom(1);
		setPanOffset({ x: 0, y: 0 });
	}, []);

	const handleZoomToFit = React.useCallback(() => {
		if (!canvasContainerRef.current) return;
		const rect = canvasContainerRef.current.getBoundingClientRect();
		const mapWidth = formData.grid_columns * formData.grid_size + formData.grid_offset_x;
		const mapHeight = formData.grid_rows * formData.grid_size + formData.grid_offset_y;
		const scaleX = rect.width / mapWidth;
		const scaleY = rect.height / mapHeight;
		const newZoom = clampZoom(Math.min(scaleX, scaleY) * 0.9, MIN_ZOOM, MAX_ZOOM);
		setZoom(newZoom);
		setPanOffset({ x: 0, y: 0 });
	}, [formData.grid_columns, formData.grid_rows, formData.grid_size, formData.grid_offset_x, formData.grid_offset_y]);

	// Auto-zoom to fit when map loads
	const [hasAutoZoomed, setHasAutoZoomed] = React.useState(false);
	React.useEffect(() => {
		if (
			mapQuery.data &&
			formData.background_image_url &&
			canvasContainerRef.current &&
			!hasAutoZoomed &&
			formData.grid_columns > 0 &&
			formData.grid_rows > 0
		) {
			// Wait for image to load and container to size properly
			const timer = setTimeout(() => {
				handleZoomToFit();
				setHasAutoZoomed(true);
			}, 200);
			return () => clearTimeout(timer);
		}
	}, [
		mapQuery.data,
		formData.background_image_url,
		formData.grid_columns,
		formData.grid_rows,
		handleZoomToFit,
		hasAutoZoomed,
	]);

	// Get merged properties for selected tiles
	const { properties: mergedProperties } = mergeTileProperties();

	if (!isAdmin) {
		return (
			<RouteShell title="Map Editor" description="Edit map settings and assets.">
				<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
					Access denied. You must be an admin to manage maps.
				</div>
			</RouteShell>
		);
	}

	if (mapQuery.isLoading) {
		return (
			<RouteShell title="Map Editor" description="Edit map settings and assets.">
				<div className="text-sm text-slate-600 dark:text-slate-300">Loading map…</div>
			</RouteShell>
		);
	}

	if (!mapQuery.data) {
		return (
			<RouteShell title="Map Editor" description="Edit map settings and assets.">
				<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
					Map not found.
				</div>
			</RouteShell>
		);
	}

	return (
		<div className="fixed inset-0 flex h-screen w-screen flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
			{/* Top Bar */}
			<div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={() => navigate({ to: '/admin/maps' })}
						className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
					>
						Back
					</button>
					<h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
						{formData.name || id}
					</h1>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						disabled={!canSave || saveMutation.isPending}
						onClick={() => saveMutation.mutate()}
						className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-60"
					>
						{saveMutation.isPending ? 'Saving…' : 'Save'}
					</button>
				</div>
			</div>

			{savingError ? (
				<div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-200">
					{savingError}
				</div>
			) : null}

			{/* Main Content */}
			<div className="relative flex min-h-0 flex-1 overflow-hidden">
				{/* Tool Selection Sidebar */}
				<div className="flex shrink-0 flex-col gap-2 border-r border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
					{(
						[
							{ id: 'select' as const, label: 'Select', icon: '👆' },
							{ id: 'grid' as const, label: 'Grid', icon: '⊞' },
							{ id: 'terrain' as const, label: 'Terrain', icon: '🖌️' },
							{ id: 'object' as const, label: 'Object', icon: '📦' },
							{ id: 'properties' as const, label: 'Props', icon: '⚙️' },
						] as const
					).map((tool) => (
						<button
							key={tool.id}
							type="button"
							onClick={() => setActiveTool(tool.id)}
							title={tool.label}
							className={`flex h-12 w-12 items-center justify-center rounded-md text-lg transition ${
								activeTool === tool.id
									? 'bg-amber-600 text-white'
									: 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
							}`}
						>
							{tool.icon}
						</button>
					))}
					{/* Save Button */}
					<button
						type="button"
						onClick={() => {
							if (canSave && !saveMutation.isPending) {
								saveMutation.mutate();
							}
						}}
						disabled={!canSave || saveMutation.isPending}
						title={saveMutation.isPending ? 'Saving...' : 'Save Map'}
						className={`mt-2 flex h-12 w-12 items-center justify-center rounded-md text-lg transition ${
							!canSave || saveMutation.isPending
								? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
								: 'bg-emerald-600 text-white hover:bg-emerald-500'
						}`}
					>
						{saveMutation.isPending ? '⏳' : '💾'}
					</button>
				</div>

				{/* Properties/Options Sidebar - Only show when tool is active and not selecting tiles */}
				{activeTool !== 'select' && (
					<div className="flex h-full w-80 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
						{activeTool === 'properties' ? (
						<div className="space-y-3">
							<label className="block">
								<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
									Name <span className="text-red-600">*</span>
								</div>
								<input
									value={formData.name}
									onChange={(e) => {
										const nextName = e.target.value;
										setFormData((prev) => ({ ...prev, name: nextName }));
										if (!slugTouched) {
											setFormData((prev) => ({ ...prev, slug: slugify(nextName) }));
										}
									}}
									className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
								/>
							</label>

							<label className="block">
								<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
									Slug <span className="text-red-600">*</span>
								</div>
								<input
									value={formData.slug}
									onChange={(e) => {
										setSlugTouched(true);
										setFormData((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }));
									}}
									className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
								/>
							</label>

							<label className="block">
								<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
									Description
								</div>
								<textarea
									value={formData.description}
									onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
									rows={4}
									className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
								/>
							</label>

							<label className="block">
								<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">World</div>
								<select
									value={formData.world_id}
									onChange={(e) => setFormData((prev) => ({ ...prev, world_id: e.target.value }))}
									className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
								>
									<option value="">None</option>
									{worlds.map((w) => (
										<option key={w.id} value={w.id}>
											{w.name}
										</option>
									))}
								</select>
							</label>

							<div className="grid gap-3">
								<div>
									<ImageChooser
										value={formData.background_image_url || null}
										onChange={(url) => setFormData((prev) => ({ ...prev, background_image_url: url }))}
										category="Map"
										title="Background Image"
										placeholder="No background image"
										className="text-xs"
									/>
								</div>

								<div>
									<ImageChooser
										value={formData.cover_image_url || null}
										onChange={(url) => setFormData((prev) => ({ ...prev, cover_image_url: url }))}
										category="Map"
										title="Cover Image"
										placeholder="No cover image"
										className="text-xs"
									/>
								</div>
							</div>
						</div>
					) : null}

					{activeTool === 'grid' ? (
						<div className="space-y-3">
							<label className="flex items-center gap-2">
								<input
									type="checkbox"
									checked={showGrid}
									onChange={(e) => setShowGrid(e.target.checked)}
									className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
								/>
								<span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
									Show grid overlay
								</span>
							</label>

							<div className="grid gap-3 sm:grid-cols-2">
								<label className="block">
									<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
										Grid Size (px)
									</div>
									<input
										type="number"
										value={formData.grid_size}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												grid_size: parseInt(e.target.value, 10) || 100,
											}))
										}
										className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
									/>
								</label>

								<label className="block">
									<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
										Columns
									</div>
									<input
										type="number"
										value={formData.grid_columns}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												grid_columns: parseInt(e.target.value, 10) || 40,
											}))
										}
										className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
									/>
								</label>

								<label className="block">
									<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">Rows</div>
									<input
										type="number"
										value={formData.grid_rows}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												grid_rows: parseInt(e.target.value, 10) || 30,
											}))
										}
										className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
									/>
								</label>

								<label className="block">
									<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
										Offset X (px)
									</div>
									<input
										type="number"
										value={formData.grid_offset_x}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												grid_offset_x: parseInt(e.target.value, 10) || 0,
											}))
										}
										className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
									/>
								</label>

								<label className="block">
									<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
										Offset Y (px)
									</div>
									<input
										type="number"
										value={formData.grid_offset_y}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												grid_offset_y: parseInt(e.target.value, 10) || 0,
											}))
										}
										className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
									/>
								</label>
							</div>
						</div>
					) : null}

					{activeTool === 'terrain' ? (
						<div className="space-y-3">
							<div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
								Select Terrain Type
							</div>
							<div className="grid grid-cols-2 gap-2">
								{TERRAIN_TYPES.map((terrain) => (
									<button
										key={terrain}
										type="button"
										onClick={() => setActiveTerrain(terrain)}
										className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
											activeTerrain === terrain
												? 'border-amber-600 bg-amber-600 text-white'
												: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
										}`}
									>
										{terrain.charAt(0).toUpperCase() + terrain.slice(1)}
									</button>
								))}
							</div>
						</div>
					) : null}

					{activeTool === 'objects' ? (
						<div className="space-y-3">
							<div className="flex items-center justify-between gap-2">
								<div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Objects</div>
								<button
									type="button"
									onClick={() =>
										setObjects((prev) => [
											...prev,
											{
												id: `temp_${Date.now()}`,
												label: 'Object',
												image_url: null,
												x: 0,
												y: 0,
												metadata: {},
											},
										])
									}
									className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
								>
									Add
								</button>
							</div>

							<div className="space-y-3">
								{objects.length === 0 ? (
									<div className="text-sm text-slate-500">No objects placed.</div>
								) : null}
								{objects.map((obj, idx) => (
									<div
										key={obj.id ?? idx}
										className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"
									>
										<div className="flex items-start justify-between gap-2">
											<div className="min-w-0">
												<div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
													Object {idx + 1}
												</div>
											</div>
											<button
												type="button"
												onClick={() => setObjects((prev) => prev.filter((_, i) => i !== idx))}
												className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-500"
											>
												Remove
											</button>
										</div>

										<label className="mt-2 block">
											<div className="mb-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
												Label
											</div>
											<input
												value={obj.label ?? ''}
												onChange={(e) => {
													const value = e.target.value;
													setObjects((prev) => {
														const next = [...prev];
														next[idx] = { ...next[idx], label: value };
														return next;
													});
												}}
												className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
											/>
										</label>

										<div className="mt-2">
											<ImageChooser
												value={obj.image_url ?? null}
												onChange={(url) => {
													setObjects((prev) => {
														const next = [...prev];
														next[idx] = { ...next[idx], image_url: url };
														return next;
													});
												}}
												category="Object"
												title=""
												placeholder="No image"
												className="text-xs"
											/>
										</div>

										<div className="mt-3 grid gap-3 sm:grid-cols-2">
											<label className="block">
												<div className="mb-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
													X
												</div>
												<input
													type="number"
													value={obj.x}
													onChange={(e) => {
														const x = parseInt(e.target.value, 10) || 0;
														setObjects((prev) => {
															const next = [...prev];
															next[idx] = { ...next[idx], x };
															return next;
														});
													}}
													className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
												/>
											</label>
											<label className="block">
												<div className="mb-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
													Y
												</div>
												<input
													type="number"
													value={obj.y}
													onChange={(e) => {
														const y = parseInt(e.target.value, 10) || 0;
														setObjects((prev) => {
															const next = [...prev];
															next[idx] = { ...next[idx], y };
															return next;
														});
													}}
													className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
												/>
											</label>
										</div>

										{obj.image_url ? (
											<img
												src={obj.image_url}
												alt={obj.label ?? 'Object'}
												className="mt-3 h-24 w-full rounded-md border border-slate-200 object-contain dark:border-slate-700"
											/>
										) : null}
									</div>
								))}
							</div>
						</div>
					) : null}
					</div>
				)}

				{/* Canvas Area - Full Screen */}
				<div className="relative flex min-h-0 flex-1 overflow-hidden">
					{/* Zoom Controls */}
					<div className="absolute right-6 top-6 z-10 flex shrink-0 flex-col gap-2 rounded-md border border-slate-200 bg-white/90 p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900/90">
						<button
							type="button"
							onClick={handleZoomIn}
							className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
						>
							+
						</button>
						<button
							type="button"
							onClick={handleZoomOut}
							className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
						>
							−
						</button>
						<button
							type="button"
							onClick={handleZoomReset}
							className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
							title="Reset Zoom"
						>
							↻
						</button>
						<button
							type="button"
							onClick={handleZoomToFit}
							className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
							title="Fit to Screen"
						>
							⊞
						</button>
						<div className="border-t border-slate-200 pt-2 text-center text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-400">
							{Math.round(zoom * 100)}%
						</div>
					</div>

					{/* Canvas */}
					<div ref={canvasContainerRef} className="h-full w-full overflow-hidden">
						<MapEditorCanvas
							backgroundImageUrl={formData.background_image_url}
							gridSize={formData.grid_size}
							gridOffsetX={formData.grid_offset_x}
							gridOffsetY={formData.grid_offset_y}
							gridColumns={formData.grid_columns}
							gridRows={formData.grid_rows}
							tiles={tiles}
							selectedTileKeys={selectedTileKeys}
							panOffset={panOffset}
							zoom={zoom}
							isPanning={isPanning}
							onTileClick={handleTileClick}
							onPanChange={setPanOffset}
							onZoomChange={setZoom}
							onPanningChange={setIsPanning}
							activeTool={activeTool}
							showGrid={showGrid}
							containerRef={canvasContainerRef}
						/>
					</div>
				</div>

				{/* Tile Property Editor Popover - Right Side */}
				{selectedTileKeys.size > 0 ? (
					<div className="absolute right-0 top-0 z-50 flex h-full w-80 shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
						<div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
							<h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
								Tile Properties
							</h2>
							<button
								type="button"
								onClick={() => setSelectedTileKeys(new Set())}
								className="rounded-md px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
							>
								✕
							</button>
						</div>
						<div className="min-h-0 flex-1 overflow-y-auto p-4">
							<TilePropertyEditor
								properties={mergedProperties}
								onChange={(props) => {
									updateSelectedTiles(propertiesToTileData(props));
								}}
								onClose={() => setSelectedTileKeys(new Set())}
								selectedCount={selectedTileKeys.size}
								compact
							/>
							<button
								type="button"
								onClick={() => {
									const next = { ...tiles };
									selectedTileKeys.forEach((key) => {
										delete next[key];
									});
									setTiles(next);
									setSelectedTileKeys(new Set());
								}}
								className="mt-4 w-full rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
							>
								{selectedTileKeys.size > 1
									? `Clear ${selectedTileKeys.size} Tiles`
									: 'Clear Tile'}
							</button>
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
};

export const Route = createFileRoute('/admin/maps/$id')({
	component: AdminMapDetail,
});
