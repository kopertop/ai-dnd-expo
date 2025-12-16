import { apiService } from 'expo-auth-template/frontend';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Image,
	Platform,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Line, Rect } from 'react-native-svg';

import { ExpoIcon } from '@/components/expo-icon';
import { ImageUploader } from '@/components/image-uploader';
import { MediaLibraryModal } from '@/components/media-library-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TilePropertyEditor } from '@/components/tile-property-editor';

interface TileData {
	x: number;
	y: number;
	terrain: string; // terrain_type
	movement_cost?: number;
	is_blocked?: boolean;
	is_difficult?: boolean;
	provides_cover?: boolean;
	cover_type?: 'half' | 'three-quarters' | 'full';
	elevation?: number;
	feature_type?: string | null;
}

interface MapData {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	background_image_url: string | null;
	cover_image_url: string | null;
	grid_columns: number;
	grid_size: number;
	grid_offset_x: number;
	grid_offset_y: number;
	width: number;
	height: number;
	world_id: string | null;
	tiles?: any[]; // From API
	tokens?: any[];
}

interface Tool {
	id: 'select' | 'grid' | 'terrain' | 'object' | 'properties';
	name: string;
	icon: string;
}

const TERRAIN_TYPES = [
	{ id: 'wall', color: 'rgba(0, 0, 0, 0.5)', label: 'Wall', blocked: true },
	{ id: 'water', color: 'rgba(0, 0, 255, 0.3)', label: 'Water', difficult: true },
	{ id: 'difficult', color: 'rgba(255, 165, 0, 0.3)', label: 'Difficult', difficult: true },
	{ id: 'cover', color: 'rgba(0, 128, 0, 0.3)', label: 'Cover', cover: true },
];

const MapEditorScreen: React.FC = () => {
	const { id } = useLocalSearchParams<{ id: string }>();
	const [map, setMap] = useState<MapData | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [activeTool, setActiveTool] = useState<Tool['id']>('select');
	const [showSidebar, setShowSidebar] = useState(true);

	// Grid config
	const [gridConfig, setGridConfig] = useState({
		size: 64,
		offsetX: 0,
		offsetY: 0,
		columns: 20,
		rows: 20,
	});

	// Tiles state: key "x,y" -> TileData
	const [tiles, setTiles] = useState<Record<string, TileData>>({});
	const [objects, setObjects] = useState<any[]>([]);

	// Selection
	const [selectedTileKey, setSelectedTileKey] = useState<string | null>(null);
	const selectedTile = selectedTileKey ? tiles[selectedTileKey] : null;

	// Active brush settings
	const [activeTerrain, setActiveTerrain] = useState('wall');

	// Modals
	const [bgPickerVisible, setBgPickerVisible] = useState(false);
	const [coverPickerVisible, setCoverPickerVisible] = useState(false);

	// Canvas container size for scaling
	const [canvasContainerSize, setCanvasContainerSize] = useState({ width: 0, height: 0 });
	const canvasContainerRef = useRef<View>(null);

	// Panning state
	const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
	const panStartRef = useRef({ x: 0, y: 0 });

	// Zoom state
	const MIN_ZOOM = 0.25;
	const MAX_ZOOM = 4;
	const [zoom, setZoom] = useState(1);
	const [isPanning, setIsPanning] = useState(false);

	useEffect(() => {
		if (id) loadMap(id);
	}, [id]);

	const loadMap = async (mapId: string) => {
		try {
			setLoading(true);
			const data: MapData = await apiService.fetchApi(`/maps/${mapId}`);
			setMap(data);

			setGridConfig({
				size: data.grid_size || 64,
				offsetX: data.grid_offset_x || 0,
				offsetY: data.grid_offset_y || 0,
				columns: data.grid_columns || 20,
				rows: Math.floor((data.height || 20)),
			});

			// Load Tiles
			const newTiles: Record<string, TileData> = {};
			if (data.tiles && Array.isArray(data.tiles)) {
				data.tiles.forEach((t: any) => {
					newTiles[`${t.x},${t.y}`] = {
						x: t.x,
						y: t.y,
						terrain: t.terrain_type || t.terrain || 'none',
						movement_cost: t.movement_cost,
						is_blocked: Boolean(t.is_blocked),
						is_difficult: Boolean(t.is_difficult),
						provides_cover: Boolean(t.provides_cover),
						cover_type: t.cover_type,
						elevation: t.elevation || 0,
						feature_type: t.feature_type || null,
					};
				});
			}
			setTiles(newTiles);

			// Load Objects
			if (data.tokens && Array.isArray(data.tokens)) {
				const loadedObjects = data.tokens.map(t => ({
					id: t.id,
					x: t.x,
					y: t.y,
					image_url: t.image_url,
					label: t.label,
				}));
				setObjects(loadedObjects);
			}

		} catch (error) {
			console.error(error);
			Alert.alert('Error', 'Failed to load map');
		} finally {
			setLoading(false);
		}
	};

	const handleSave = async () => {
		if (!map) return;
		try {
			setSaving(true);

			// Convert tiles record to array with API format
			const tilesArray = Object.values(tiles).map(tile => {
				const terrainValue = tile.terrain || 'none';
				return {
					x: tile.x,
					y: tile.y,
					terrain: terrainValue,
					terrain_type: terrainValue,
					movement_cost: tile.movement_cost ?? 1,
					is_blocked: tile.is_blocked ?? false,
					is_difficult: tile.is_difficult ?? false,
					provides_cover: tile.provides_cover ?? false,
					cover_type: tile.cover_type || null,
					elevation: tile.elevation ?? 0,
					feature_type: tile.feature_type || null,
				};
			});

			const payload = {
				...map,
				grid_size: gridConfig.size,
				grid_offset_x: gridConfig.offsetX,
				grid_offset_y: gridConfig.offsetY,
				grid_columns: gridConfig.columns,
				width: gridConfig.columns,
				height: gridConfig.rows,
				tiles: tilesArray, // Send array
				tokens: objects.map(obj => ({
					id: typeof obj.id === 'string' && obj.id.startsWith('temp_') ? undefined : obj.id,
					x: obj.x,
					y: obj.y,
					image_url: obj.image_url,
					label: obj.label || 'Object',
					token_type: 'prop',
				})),
			};
			if (map.id) {
				await apiService.fetchApi(`/maps/${map.id}`, {
					method: 'PATCH',
					body: JSON.stringify(payload),
				});
			} else {
				await apiService.fetchApi('/maps', {
					method: 'POST',
					body: JSON.stringify(payload),
				});
			}

			Alert.alert('Success', 'Map saved');
			// Don't reload fully to keep state, maybe update ID?
		} catch (error: any) {
			Alert.alert('Error', error.message);
		} finally {
			setSaving(false);
		}
	};

	const handleTileClick = (x: number, y: number) => {
		const key = `${x},${y}`;

		if (activeTool === 'select') {
			// Select or deselect
			if (selectedTileKey === key) {
				setSelectedTileKey(null);
			} else {
				// If tile doesn't exist, maybe create default
				if (!tiles[key]) {
					setTiles(prev => ({
						...prev,
						[key]: { x, y, terrain: 'none', movement_cost: 1 },
					}));
				}
				setSelectedTileKey(key);
				setShowSidebar(true);
			}
			return;
		}

		if (activeTool === 'terrain') {
			// Paint logic
			const preset = TERRAIN_TYPES.find(t => t.id === activeTerrain);
			setTiles(prev => {
				const next = { ...prev };
				if (next[key] && next[key].terrain === activeTerrain) {
					delete next[key];
				} else {
					next[key] = {
						x, y,
						terrain: activeTerrain,
						is_blocked: preset?.blocked,
						is_difficult: preset?.difficult,
						provides_cover: preset?.cover,
						movement_cost: preset?.difficult ? 2 : 1,
					};
				}
				return next;
			});
		}
	};

	const updateSelectedTile = (updates: Partial<TileData>) => {
		if (!selectedTileKey) return;
		setTiles(prev => ({
			...prev,
			[selectedTileKey]: { ...prev[selectedTileKey], ...updates },
		}));
	};

	// Convert TileData to TileProperties format for TilePropertyEditor
	const tileDataToProperties = (tile: TileData) => ({
		terrainType: tile.terrain || 'none',
		movementCost: tile.movement_cost ?? 1,
		isBlocked: tile.is_blocked ?? false,
		isDifficult: tile.is_difficult ?? false,
		providesCover: tile.provides_cover ?? false,
		coverType: tile.cover_type || null,
		elevation: tile.elevation ?? 0,
		featureType: tile.feature_type || null,
	});

	// Convert TileProperties back to TileData format
	const propertiesToTileData = (props: {
		terrainType: string;
		movementCost: number;
		isBlocked: boolean;
		isDifficult: boolean;
		providesCover: boolean;
		coverType: 'half' | 'three-quarters' | 'full' | null;
		elevation: number;
		featureType: string | null;
	}): Partial<TileData> => ({
		terrain: props.terrainType,
		movement_cost: props.movementCost,
		is_blocked: props.isBlocked,
		is_difficult: props.isDifficult,
		provides_cover: props.providesCover,
		cover_type: props.coverType || undefined,
		elevation: props.elevation,
		feature_type: props.featureType,
	});

	const handleAddObject = (imageUrl: string) => {
		setObjects(prev => [
			...prev,
			{
				id: `temp_${Date.now()}`,
				x: 0,
				y: 0,
				image_url: imageUrl,
				label: 'Object',
			},
		]);
		setActiveTool('object');
		Alert.alert('Object Added', 'Object placed at (0,0).');
	};

	const tools: Tool[] = [
		{ id: 'select', name: 'Select', icon: 'Feather:mouse-pointer' },
		{ id: 'grid', name: 'Grid', icon: 'Feather:grid' },
		{ id: 'terrain', name: 'Paint', icon: 'Ionicons:brush' },
		{ id: 'object', name: 'Object', icon: 'Feather:box' },
		{ id: 'properties', name: 'Properties', icon: 'Feather:settings' },
	];

	if (loading || !map) {
		return (
			<ThemedView style={styles.center}>
				<ActivityIndicator size="large" color="#8B6914" testID="loading-indicator" />
			</ThemedView>
		);
	}

	return (
		<ThemedView style={styles.container}>
			<Stack.Screen
				options={{
					title: map.name,
					headerShown: true,
					headerTitleAlign: 'center',
				}}
			/>

			<View style={styles.editorContainer}>
				{/* Toolbar */}
				<View style={styles.toolbar}>
					{tools.map((tool) => (
						<TouchableOpacity
							key={tool.id}
							style={[styles.toolBtn, activeTool === tool.id && styles.toolBtnActive]}
							testID={`tool-${tool.id}`}
							accessibilityLabel={`${tool.name} tool`}
							onPress={() => {
								setActiveTool(tool.id);
								setShowSidebar(true);
							}}
						>
							<ExpoIcon
								icon={tool.icon}
								size={20}
								color={activeTool === tool.id ? '#FFF' : '#3B2F1B'}
							/>
						</TouchableOpacity>
					))}
				</View>

				{/* Main Canvas Area */}
				<View
					ref={canvasContainerRef}
					style={styles.canvasScroll}
					onLayout={(event) => {
						const { width, height } = event.nativeEvent.layout;
						setCanvasContainerSize({ width, height });
					}}
				>
					<EditorCanvas
						map={map}
						gridConfig={gridConfig}
						activeTool={activeTool}
						tiles={tiles}
						objects={objects}
						onTileClick={handleTileClick}
						selectedTileKey={selectedTileKey}
						containerSize={canvasContainerSize}
						panOffset={panOffset}
						panStartRef={panStartRef}
						setPanOffset={setPanOffset}
						zoom={zoom}
						setZoom={setZoom}
						isPanning={isPanning}
						setIsPanning={setIsPanning}
						minZoom={MIN_ZOOM}
						maxZoom={MAX_ZOOM}
					/>
				</View>

				{/* Sidebar / Properties Panel */}
				{showSidebar && (
					<View style={styles.sidebar}>
						<View style={styles.sidebarHeader}>
							<ThemedText style={styles.sidebarTitle}>
								{tools.find((t) => t.id === activeTool)?.name} Properties
							</ThemedText>
							<TouchableOpacity onPress={() => setShowSidebar(false)}>
								<ExpoIcon icon="Feather:x" size={20} color="#6B5B3D" />
							</TouchableOpacity>
						</View>

						<ScrollView
							style={styles.sidebarContent}
							contentContainerStyle={styles.sidebarContentContainer}
						>
							{activeTool === 'select' && (
								<View>
									{!selectedTile ? (
										<View>
											<ThemedText style={styles.helperText}>Select a tile to edit properties.</ThemedText>
											<View style={styles.divider} />
											<ThemedText style={styles.sectionTitle} testID="map-settings-label">Map Settings</ThemedText>

											<View style={styles.inputGroup}>
												<ThemedText style={styles.label}>Background Image</ThemedText>
												<TouchableOpacity style={styles.pickerBtn} onPress={() => setBgPickerVisible(true)}>
													<ThemedText>Choose from Library</ThemedText>
												</TouchableOpacity>
												{map.background_image_url && (
													<Image source={{ uri: map.background_image_url }} style={styles.previewImage} resizeMode="contain" />
												)}
											</View>

											<View style={styles.inputGroup}>
												<ThemedText style={styles.label}>Cover Image</ThemedText>
												<TouchableOpacity style={styles.pickerBtn} onPress={() => setCoverPickerVisible(true)}>
													<ThemedText>Choose from Library</ThemedText>
												</TouchableOpacity>
												{map.cover_image_url && (
													<Image source={{ uri: map.cover_image_url }} style={styles.previewImage} resizeMode="contain" />
												)}
											</View>
										</View>
									) : (
										<View>
											<TilePropertyEditor
												key={selectedTileKey}
												compact
												properties={tileDataToProperties(selectedTile)}
												onChange={(props) => {
													updateSelectedTile(propertiesToTileData(props));
												}}
												onClose={() => setSelectedTileKey(null)}
											/>
											<TouchableOpacity
												style={styles.deleteBtn}
												testID="clear-tile-button"
												onPress={() => {
													const next = { ...tiles };
													delete next[selectedTileKey!];
													setTiles(next);
													setSelectedTileKey(null);
												}}
											>
												<ThemedText style={{ color: '#FFF' }}>Clear Tile</ThemedText>
											</TouchableOpacity>
										</View>
									)}
								</View>
							)}

							{activeTool === 'grid' && (
								<View>
									<View style={styles.inputGroup}>
										<ThemedText style={styles.label}>Grid Size (px)</ThemedText>
										<TextInput
											style={styles.input}
											value={String(gridConfig.size)}
											testID="grid-size-input"
											onChangeText={(text) =>
												setGridConfig({ ...gridConfig, size: parseInt(text) || 64 })
											}
											keyboardType="numeric"
										/>
									</View>
									<View style={styles.row}>
										<View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
											<ThemedText style={styles.label}>Columns</ThemedText>
											<TextInput
												style={styles.input}
												value={String(gridConfig.columns)}
												testID="grid-columns-input"
												onChangeText={(text) =>
													setGridConfig({ ...gridConfig, columns: parseInt(text) || 1 })
												}
												keyboardType="numeric"
											/>
										</View>
										<View style={[styles.inputGroup, { flex: 1 }]}>
											<ThemedText style={styles.label}>Rows</ThemedText>
											<TextInput
												style={styles.input}
												value={String(gridConfig.rows)}
												testID="grid-rows-input"
												onChangeText={(text) =>
													setGridConfig({ ...gridConfig, rows: parseInt(text) || 1 })
												}
												keyboardType="numeric"
											/>
										</View>
									</View>

									<View style={styles.row}>
										<View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
											<ThemedText style={styles.label}>Offset X</ThemedText>
											<TextInput
												style={styles.input}
												value={String(gridConfig.offsetX)}
												testID="grid-offset-x-input"
												onChangeText={(text) =>
													setGridConfig({ ...gridConfig, offsetX: parseInt(text) || 0 })
												}
												keyboardType="numeric"
											/>
										</View>
										<View style={[styles.inputGroup, { flex: 1 }]}>
											<ThemedText style={styles.label}>Offset Y</ThemedText>
											<TextInput
												style={styles.input}
												value={String(gridConfig.offsetY)}
												testID="grid-offset-y-input"
												onChangeText={(text) =>
													setGridConfig({ ...gridConfig, offsetY: parseInt(text) || 0 })
												}
												keyboardType="numeric"
											/>
										</View>
									</View>
								</View>
							)}

							{activeTool === 'terrain' && (
								<View>
									<ThemedText style={styles.sectionTitle}>Terrain Type</ThemedText>
									<View style={styles.terrainGrid}>
										{TERRAIN_TYPES.map(type => (
											<TouchableOpacity
												key={type.id}
												style={[
													styles.terrainOption,
													activeTerrain === type.id && styles.terrainOptionActive,
												]}
												testID={`terrain-option-${type.id}`}
												onPress={() => setActiveTerrain(type.id)}
											>
												<View style={[styles.terrainColor, { backgroundColor: type.color }]} />
												<ThemedText style={styles.terrainLabel}>{type.label}</ThemedText>
											</TouchableOpacity>
										))}
									</View>
								</View>
							)}

							{activeTool === 'object' && (
								<View>
									<ThemedText style={styles.sectionTitle}>Add Object</ThemedText>
									<ImageUploader
										testID="image-uploader"
										onChange={handleAddObject}
										placeholder="Upload Object/Mini"
									/>
									{objects.length > 0 && (
										<View style={{ marginTop: 20 }}>
											<ThemedText style={styles.sectionTitle}>Placed Objects</ThemedText>
											{objects.map((obj, idx) => (
												<View key={obj.id || idx} style={styles.objectItem}>
													<Image source={{ uri: obj.image_url }} style={styles.objectThumb} />
													<View style={{ flex: 1 }}>
														<View style={styles.row}>
															<ThemedText style={{ fontSize: 12 }}>X:</ThemedText>
															<TextInput
																style={[styles.input, { padding: 4, height: 30, width: 50, marginLeft: 4 }]}
																value={String(obj.x)}
																testID={`object-x-input-${idx}`}
																onChangeText={(t) => {
																	const newObjs = [...objects];
																	newObjs[idx].x = parseInt(t) || 0;
																	setObjects(newObjs);
																}}
																keyboardType="numeric"
															/>
															<ThemedText style={{ fontSize: 12, marginLeft: 8 }}>Y:</ThemedText>
															<TextInput
																style={[styles.input, { padding: 4, height: 30, width: 50, marginLeft: 4 }]}
																value={String(obj.y)}
																testID={`object-y-input-${idx}`}
																onChangeText={(t) => {
																	const newObjs = [...objects];
																	newObjs[idx].y = parseInt(t) || 0;
																	setObjects(newObjs);
																}}
																keyboardType="numeric"
															/>
														</View>
													</View>
													<TouchableOpacity onPress={() => {
														const newObjs = [...objects];
														newObjs.splice(idx, 1);
														setObjects(newObjs);
													}} testID={`remove-object-${idx}`}>
														<ExpoIcon icon="Feather:trash-2" size={16} color="#8B2323" />
													</TouchableOpacity>
												</View>
											))}
										</View>
									)}
								</View>
							)}

							{activeTool === 'properties' && (
								<View>
									<ThemedText style={styles.sectionTitle} testID="map-settings-label">Map Properties</ThemedText>

									<View style={styles.inputGroup}>
										<ThemedText style={styles.label}>Background Image</ThemedText>
										<TouchableOpacity style={styles.pickerBtn} onPress={() => setBgPickerVisible(true)}>
											<ThemedText>Choose from Library</ThemedText>
										</TouchableOpacity>
										{map.background_image_url && (
											<Image source={{ uri: map.background_image_url }} style={styles.previewImage} resizeMode="contain" />
										)}
									</View>

									<View style={styles.inputGroup}>
										<ThemedText style={styles.label}>Cover Image</ThemedText>
										<TouchableOpacity style={styles.pickerBtn} onPress={() => setCoverPickerVisible(true)}>
											<ThemedText>Choose from Library</ThemedText>
										</TouchableOpacity>
										{map.cover_image_url && (
											<Image source={{ uri: map.cover_image_url }} style={styles.previewImage} resizeMode="contain" />
										)}
									</View>
								</View>
							)}
						</ScrollView>
					</View>
				)}
			</View>

			<MediaLibraryModal
				visible={bgPickerVisible}
				onClose={() => setBgPickerVisible(false)}
				onSelect={(url) => setMap({ ...map!, background_image_url: url })}
			/>

			<MediaLibraryModal
				visible={coverPickerVisible}
				onClose={() => setCoverPickerVisible(false)}
				onSelect={(url) => setMap({ ...map!, cover_image_url: url })}
			/>

			<TouchableOpacity
				style={styles.fab}
				onPress={handleSave}
				disabled={saving}
				accessibilityLabel="Save Map"
				testID="save-map"
			>
				{saving ? (
					<ActivityIndicator size="small" color="#FFF" testID="saving-indicator" />
				) : (
					<ExpoIcon icon="Feather:save" size={24} color="#FFF" />
				)}
			</TouchableOpacity>
		</ThemedView>
	);
};

export default MapEditorScreen;

const EditorCanvas = ({
	map,
	gridConfig,
	activeTool,
	tiles,
	objects,
	onTileClick,
	selectedTileKey,
	containerSize,
	panOffset,
	panStartRef,
	setPanOffset,
	zoom,
	setZoom,
	isPanning,
	setIsPanning,
	minZoom,
	maxZoom,
}: {
	map: MapData;
	gridConfig: { size: number; offsetX: number; offsetY: number; columns: number; rows: number };
	activeTool: string;
	tiles: Record<string, TileData>;
	objects: any[];
	onTileClick: (x: number, y: number) => void;
	selectedTileKey: string | null;
	containerSize: { width: number; height: number };
	panOffset: { x: number; y: number };
	panStartRef: React.MutableRefObject<{ x: number; y: number }>;
	setPanOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
	zoom: number;
	setZoom: React.Dispatch<React.SetStateAction<number>>;
	isPanning: boolean;
	setIsPanning: React.Dispatch<React.SetStateAction<boolean>>;
	minZoom: number;
	maxZoom: number;
}) => {
	const width = gridConfig.columns * gridConfig.size;
	const height = gridConfig.rows * gridConfig.size;
	// Add padding around the map for easier editing
	const padding = 100;
	const canvasWidth = (width + gridConfig.offsetX + padding) * zoom;
	const canvasHeight = (height + gridConfig.offsetY + padding) * zoom;

	// Calculate pan bounds accounting for zoom
	const mapWidthPx = (width + gridConfig.offsetX) * zoom;
	const mapHeightPx = (height + gridConfig.offsetY) * zoom;
	const maxPanX = Math.max(0, mapWidthPx - containerSize.width);
	const maxPanY = Math.max(0, mapHeightPx - containerSize.height);

	// Margin for panning past edges - scales inversely with zoom
	// When zoomed out (zoom < 1), we need more margin to see edges
	// When zoomed in (zoom > 1), we need less margin
	// Base margin of 200px at zoom = 1, scales proportionally
	const BASE_PAN_MARGIN = 200;
	const PAN_MARGIN = BASE_PAN_MARGIN / Math.max(zoom, 0.1); // Prevent division by zero, cap at reasonable minimum

	const clampPan = (value: number, containerSize: number, mapSize: number) => {
		const max = Math.max(0, mapSize - containerSize);
		// Allow panning up to PAN_MARGIN pixels past the normal bounds
		// Margin scales with zoom level to ensure edges are always visible
		const minValue = -PAN_MARGIN;
		const maxValue = max + PAN_MARGIN;
		return Math.max(minValue, Math.min(maxValue, value));
	};

	const clampZoom = (value: number) => {
		return Math.max(minZoom, Math.min(maxZoom, value));
	};

	// Zoom functions
	const handleZoomIn = () => {
		setZoom(prev => clampZoom(prev + 0.25));
	};

	const handleZoomOut = () => {
		setZoom(prev => clampZoom(prev - 0.25));
	};

	const handleZoomReset = () => {
		setZoom(1);
		setPanOffset({ x: 0, y: 0 });
	};

	const handleZoomToFit = () => {
		const scaleX = containerSize.width / (width + gridConfig.offsetX);
		const scaleY = containerSize.height / (height + gridConfig.offsetY);
		const newZoom = clampZoom(Math.min(scaleX, scaleY) * 0.9); // 90% to add some padding
		setZoom(newZoom);
		setPanOffset({ x: 0, y: 0 });
	};

	// Create gestures for pan and zoom
	// Enable panning in select or grid mode when:
	// 1. Map is larger than container (normal case), OR
	// 2. We have a meaningful margin that allows panning past edges (when zoomed out)
	const enablePanning = (activeTool === 'select' || activeTool === 'grid') &&
		(mapWidthPx > containerSize.width || mapHeightPx > containerSize.height || PAN_MARGIN > 50);

	const panGesture = Gesture.Pan()
		.enabled(enablePanning)
		.onStart(() => {
			panStartRef.current = panOffset;
			setIsPanning(true);
		})
		.onUpdate((e) => {
			if (!enablePanning) return;
			setPanOffset({
				x: clampPan(panStartRef.current.x - e.translationX, containerSize.width, mapWidthPx),
				y: clampPan(panStartRef.current.y - e.translationY, containerSize.height, mapHeightPx),
			});
		})
		.onEnd(() => {
			setIsPanning(false);
		});

	const pinchStartZoom = useRef(zoom);
	const pinchGesture = Gesture.Pinch()
		.onStart(() => {
			pinchStartZoom.current = zoom;
		})
		.onUpdate((e) => {
			const newZoom = clampZoom(pinchStartZoom.current * e.scale);
			setZoom(newZoom);
		})
		.onEnd(() => {
			// Zoom complete
		});

	const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

	// Mouse wheel zoom and cursor style for web
	const canvasRef = useRef<View>(null);

	useEffect(() => {
		if (Platform.OS !== 'web') return;

		const handleWheel = (e: WheelEvent) => {
			e.preventDefault();
			const delta = e.deltaY > 0 ? -0.1 : 0.1;
			setZoom(prev => clampZoom(prev + delta));
		};

		const element = canvasRef.current;
		if (element) {
			const domNode = (element as any)._nativeNode || element;
			if (domNode && typeof domNode.addEventListener === 'function') {
				domNode.addEventListener('wheel', handleWheel, { passive: false });
				return () => {
					domNode.removeEventListener('wheel', handleWheel);
				};
			}
		}
	}, [zoom, minZoom, maxZoom]);

	// Set cursor style for web
	useEffect(() => {
		if (Platform.OS !== 'web') return;

		const cursorStyle = isPanning ? 'grabbing' : (enablePanning ? 'grab' : 'default');
		const element = canvasRef.current;
		if (element) {
			const domNode = (element as any)._nativeNode || element;
			if (domNode && typeof domNode.style !== 'undefined') {
				domNode.style.cursor = cursorStyle;
			}
		}
	}, [isPanning, enablePanning]);

	const renderGrid = () => {
		const lines = [];
		const scaledSize = gridConfig.size * zoom;
		const scaledOffsetX = gridConfig.offsetX * zoom;
		const scaledOffsetY = gridConfig.offsetY * zoom;
		const scaledWidth = width * zoom;
		const scaledHeight = height * zoom;

		// Vertical lines
		for (let i = 0; i <= gridConfig.columns; i++) {
			const x = i * scaledSize + scaledOffsetX;
			lines.push(
				<Line
					key={`v-${i}`}
					x1={x}
					y1={scaledOffsetY}
					x2={x}
					y2={scaledHeight + scaledOffsetY}
					stroke="rgba(0,0,0,0.4)"
					strokeWidth={1 / Math.max(1, zoom)}
				/>,
			);
		}
		// Horizontal lines
		for (let i = 0; i <= gridConfig.rows; i++) {
			const y = i * scaledSize + scaledOffsetY;
			lines.push(
				<Line
					key={`h-${i}`}
					x1={scaledOffsetX}
					y1={y}
					x2={scaledWidth + scaledOffsetX}
					y2={y}
					stroke="rgba(0,0,0,0.4)"
					strokeWidth={1 / Math.max(1, zoom)}
				/>,
			);
		}
		return lines;
	};

	const renderTiles = () => {
		const scaledSize = gridConfig.size * zoom;
		const scaledOffsetX = gridConfig.offsetX * zoom;
		const scaledOffsetY = gridConfig.offsetY * zoom;

		return Object.entries(tiles).map(([key, tile]) => {
			const x = (tile.x * gridConfig.size + gridConfig.offsetX) * zoom;
			const y = (tile.y * gridConfig.size + gridConfig.offsetY) * zoom;
			const terrainDef = TERRAIN_TYPES.find(t => t.id === tile.terrain);
			const color = terrainDef?.color || 'rgba(100, 100, 100, 0.3)';
			const isSelected = selectedTileKey === key;

			return (
				<Rect
					key={key}
					x={x}
					y={y}
					width={scaledSize}
					height={scaledSize}
					fill={color}
					stroke={isSelected ? '#00FFFF' : undefined}
					strokeWidth={isSelected ? 2 / Math.max(1, zoom) : 0}
				/>
			);
		});
	};

	const renderSelection = () => {
		if (!selectedTileKey) return null;
		const [gx, gy] = selectedTileKey.split(',').map(Number);
		const scaledSize = gridConfig.size * zoom;
		const scaledOffsetX = gridConfig.offsetX * zoom;
		const scaledOffsetY = gridConfig.offsetY * zoom;
		const x = (gx * gridConfig.size + gridConfig.offsetX) * zoom;
		const y = (gy * gridConfig.size + gridConfig.offsetY) * zoom;
		return (
			<Rect
				x={x}
				y={y}
				width={scaledSize}
				height={scaledSize}
				fill="transparent"
				stroke="#00FFFF"
				strokeWidth={2 / Math.max(1, zoom)}
			/>
		);
	};

	const handlePress = (e: any) => {
		// Handle web vs native event coordinates
		let x = e.nativeEvent.locationX;
		let y = e.nativeEvent.locationY;

		if (Platform.OS === 'web') {
			x = e.nativeEvent.offsetX;
			y = e.nativeEvent.offsetY;
		}

		// Adjust for zoom and grid offset
		// NOTE: We do NOT add panOffset here because the TouchableOpacity is already positioned
		// with left: -panOffset.x, top: -panOffset.y, so event coordinates are already in the
		// "panned" coordinate space relative to the positioned element
		const adjX = x / zoom - gridConfig.offsetX;
		const adjY = y / zoom - gridConfig.offsetY;

		if (adjX < 0 || adjY < 0) return;

		const gx = Math.floor(adjX / gridConfig.size);
		const gy = Math.floor(adjY / gridConfig.size);

		if (gx >= 0 && gx < gridConfig.columns && gy >= 0 && gy < gridConfig.rows) {
			onTileClick(gx, gy);
		}
	};

	return (
		<View
			ref={canvasRef}
			style={{
				width: containerSize.width || canvasWidth,
				height: containerSize.height || canvasHeight,
				overflow: 'hidden',
				backgroundColor: '#000',
			}}
		>
			<GestureDetector gesture={composedGesture}>
				<View style={{ flex: 1 }}>
					<TouchableOpacity
						testID="editor-canvas"
						activeOpacity={1}
						onPress={handlePress}
						style={{
							width: canvasWidth,
							height: canvasHeight,
							backgroundColor: '#000',
							position: 'absolute',
							left: -panOffset.x,
							top: -panOffset.y,
						}}
					>
						{/* Background Layer - extend to cover padding area */}
						{map.background_image_url && (
							<Image
								source={{ uri: map.background_image_url }}
								style={{
									position: 'absolute',
									top: Math.max(0, (gridConfig.offsetY - padding) * zoom),
									left: Math.max(0, (gridConfig.offsetX - padding) * zoom),
									width: (width + padding * 2) * zoom,
									height: (height + padding * 2) * zoom,
									resizeMode: 'cover',
								}}
							/>
						)}

						<Svg
							height={canvasHeight}
							width={canvasWidth}
							style={{ position: 'absolute', top: 0, left: 0 }}
							pointerEvents="none"
						>
							{renderGrid()}
							{renderTiles()}
							{renderSelection()}
						</Svg>

						{objects.map((obj, idx) => (
							<Image
								key={obj.id || idx}
								source={{ uri: obj.image_url }}
								style={{
									position: 'absolute',
									left: (obj.x + gridConfig.offsetX) * zoom,
									top: (obj.y + gridConfig.offsetY) * zoom,
									width: gridConfig.size * zoom,
									height: gridConfig.size * zoom,
								}}
							/>
						))}
					</TouchableOpacity>
				</View>
			</GestureDetector>

			{/* Zoom Controls */}
			<View style={styles.zoomControls}>
				<TouchableOpacity style={styles.zoomButton} onPress={handleZoomIn}>
					<ExpoIcon icon="Feather:plus" size={16} color="#3B2F1B" />
				</TouchableOpacity>
				<TouchableOpacity style={styles.zoomButton} onPress={handleZoomOut}>
					<ExpoIcon icon="Feather:minus" size={16} color="#3B2F1B" />
				</TouchableOpacity>
				<TouchableOpacity style={styles.zoomButton} onPress={handleZoomReset}>
					<ExpoIcon icon="Feather:rotate-cw" size={16} color="#3B2F1B" />
				</TouchableOpacity>
				<TouchableOpacity style={styles.zoomButton} onPress={handleZoomToFit}>
					<ExpoIcon icon="Feather:maximize-2" size={16} color="#3B2F1B" />
				</TouchableOpacity>
				<ThemedText style={styles.zoomLevel}>{Math.round(zoom * 100)}%</ThemedText>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F5E6D3',
	},
	center: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	editorContainer: {
		flex: 1,
		flexDirection: 'row',
	},
	toolbar: {
		width: 50,
		backgroundColor: '#E2D3B3',
		borderRightWidth: 1,
		borderRightColor: '#C1B296',
		alignItems: 'center',
		paddingVertical: 10,
		gap: 10,
	},
	toolBtn: {
		width: 40,
		height: 40,
		borderRadius: 8,
		backgroundColor: '#FFF9EF',
		alignItems: 'center',
		justifyContent: 'center',
	},
	toolBtnActive: {
		backgroundColor: '#8B6914',
	},
	canvasScroll: {
		flex: 1,
		backgroundColor: '#333',
		overflow: 'hidden',
	},
	sidebar: {
		width: 250,
		backgroundColor: '#FFF9EF',
		borderLeftWidth: 1,
		borderLeftColor: '#E2D3B3',
	},
	sidebarHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#E2D3B3',
	},
	sidebarTitle: {
		fontWeight: 'bold',
		color: '#3B2F1B',
	},
	sidebarContent: {
		padding: 10,
	},
	sidebarContentContainer: {
		paddingRight: 20,
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: 'bold',
		color: '#3B2F1B',
		marginTop: 8,
		marginBottom: 8,
	},
	inputGroup: {
		marginBottom: 12,
	},
	label: {
		fontSize: 12,
		color: '#6B5B3D',
		marginBottom: 4,
	},
	input: {
		backgroundColor: '#FFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 4,
		padding: 8,
		fontSize: 14,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	terrainGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	terrainOption: {
		width: '48%',
		flexDirection: 'row',
		alignItems: 'center',
		padding: 8,
		backgroundColor: '#FFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 4,
		gap: 8,
	},
	terrainOptionActive: {
		borderColor: '#8B6914',
		backgroundColor: '#F5E6D3',
	},
	terrainColor: {
		width: 16,
		height: 16,
		borderRadius: 4,
		borderWidth: 1,
		borderColor: '#000',
	},
	terrainLabel: {
		fontSize: 12,
		color: '#3B2F1B',
	},
	helperText: {
		fontSize: 12,
		color: '#6B5B3D',
		marginTop: 8,
		fontStyle: 'italic',
	},
	objectItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 8,
		backgroundColor: '#FFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 4,
		marginBottom: 8,
		gap: 8,
	},
	objectThumb: {
		width: 32,
		height: 32,
		borderRadius: 4,
		backgroundColor: '#333',
	},
	pickerBtn: {
		backgroundColor: '#FFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		padding: 8,
		borderRadius: 4,
		alignItems: 'center',
		marginBottom: 8,
	},
	previewImage: {
		width: '100%',
		height: 100,
		backgroundColor: '#222',
		borderRadius: 4,
	},
	switchRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
		backgroundColor: '#FFF',
		padding: 8,
		borderRadius: 4,
		borderWidth: 1,
		borderColor: '#E2D3B3',
	},
	deleteBtn: {
		backgroundColor: '#8B2323',
		padding: 10,
		borderRadius: 4,
		alignItems: 'center',
		marginTop: 10,
	},
	divider: {
		height: 1,
		backgroundColor: '#E2D3B3',
		marginVertical: 12,
	},
	fab: {
		position: 'absolute',
		bottom: 24,
		right: 24,
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: '#8B6914',
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 4,
		zIndex: 100,
	},
	zoomControls: {
		position: 'absolute',
		top: 10,
		right: 10,
		backgroundColor: '#FFF9EF',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		padding: 4,
		zIndex: 1000,
		flexDirection: 'column',
		gap: 4,
	},
	zoomButton: {
		width: 32,
		height: 32,
		backgroundColor: '#FFF',
		borderRadius: 4,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: '#E2D3B3',
	},
	zoomLevel: {
		fontSize: 10,
		color: '#3B2F1B',
		textAlign: 'center',
		paddingHorizontal: 4,
		paddingVertical: 2,
	},
});
