import { ExpoIcon } from '@/components/expo-icon';
import { ImageUploader } from '@/components/image-uploader';
import { MediaLibraryModal } from '@/components/media-library-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { apiService } from 'expo-auth-template/frontend';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
	Switch,
} from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

interface TileData {
    x: number;
    y: number;
    terrain: string; // terrain_type
    movement_cost?: number;
    is_blocked?: boolean;
    is_difficult?: boolean;
    provides_cover?: boolean;
    cover_type?: 'half' | 'three-quarters' | 'full';
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
	id: 'select' | 'grid' | 'terrain' | 'object';
	name: string;
	icon: string;
}

const TERRAIN_TYPES = [
	{ id: 'wall', color: 'rgba(0, 0, 0, 0.5)', label: 'Wall', blocked: true },
	{ id: 'water', color: 'rgba(0, 0, 255, 0.3)', label: 'Water', difficult: true },
	{ id: 'difficult', color: 'rgba(255, 165, 0, 0.3)', label: 'Difficult', difficult: true },
    { id: 'cover', color: 'rgba(0, 128, 0, 0.3)', label: 'Cover', cover: true },
];

export default function MapEditorScreen() {
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
                        terrain: t.terrain_type,
                        movement_cost: t.movement_cost,
                        is_blocked: Boolean(t.is_blocked),
                        is_difficult: Boolean(t.is_difficult),
                        provides_cover: Boolean(t.provides_cover),
                        cover_type: t.cover_type,
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
					label: t.label
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

            // Convert tiles record to array
            const tilesArray = Object.values(tiles);

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
					token_type: 'prop'
				}))
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
                        [key]: { x, y, terrain: 'none', movement_cost: 1 }
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
            [selectedTileKey]: { ...prev[selectedTileKey], ...updates }
        }));
    };

	const handleAddObject = (imageUrl: string) => {
		setObjects(prev => [
			...prev,
			{
				id: `temp_${Date.now()}`,
				x: 0,
				y: 0,
				image_url: imageUrl,
				label: 'Object'
			}
		]);
		setActiveTool('object');
        Alert.alert('Object Added', 'Object placed at (0,0).');
	};

	const tools: Tool[] = [
		{ id: 'select', name: 'Select', icon: 'mouse-pointer' },
		{ id: 'grid', name: 'Grid', icon: 'grid' },
		{ id: 'terrain', name: 'Paint', icon: 'brush' },
		{ id: 'object', name: 'Object', icon: 'box' },
	];

	if (loading || !map) {
		return (
			<ThemedView style={styles.center}>
				<ActivityIndicator size="large" color="#8B6914" />
			</ThemedView>
		);
	}

	return (
		<ThemedView style={styles.container}>
			<Stack.Screen
				options={{
					title: map.name,
					headerRight: () => (
						<TouchableOpacity onPress={handleSave} disabled={saving}>
							{saving ? (
								<ActivityIndicator size="small" color="#3B2F1B" />
							) : (
								<ThemedText style={styles.headerBtn}>Save</ThemedText>
							)}
						</TouchableOpacity>
					),
				}}
			/>

			<View style={styles.editorContainer}>
				{/* Toolbar */}
				<View style={styles.toolbar}>
					{tools.map((tool) => (
						<TouchableOpacity
							key={tool.id}
							style={[styles.toolBtn, activeTool === tool.id && styles.toolBtnActive]}
							onPress={() => {
								setActiveTool(tool.id);
								setShowSidebar(true);
							}}
						>
							<ExpoIcon
								icon={`Feather:${tool.icon}` as any}
								size={20}
								color={activeTool === tool.id ? '#FFF' : '#3B2F1B'}
							/>
						</TouchableOpacity>
					))}
				</View>

				{/* Main Canvas Area */}
				<ScrollView style={styles.canvasScroll} horizontal>
					<ScrollView style={styles.canvasScrollVertical}>
						<EditorCanvas
							map={map}
							gridConfig={gridConfig}
							activeTool={activeTool}
							tiles={tiles}
							objects={objects}
							onTileClick={handleTileClick}
                            selectedTileKey={selectedTileKey}
						/>
					</ScrollView>
				</ScrollView>

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

						<ScrollView style={styles.sidebarContent}>
							{activeTool === 'select' && (
								<View>
                                    {!selectedTile ? (
                                        <View>
                                            <ThemedText style={styles.helperText}>Select a tile to edit properties.</ThemedText>
                                            <View style={styles.divider} />
                                            <ThemedText style={styles.sectionTitle}>Map Settings</ThemedText>

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
                                            <ThemedText style={styles.sectionTitle}>Tile ({selectedTile.x}, {selectedTile.y})</ThemedText>

                                            <View style={styles.inputGroup}>
                                                <ThemedText style={styles.label}>Movement Cost</ThemedText>
                                                <TextInput
                                                    style={styles.input}
                                                    value={String(selectedTile.movement_cost ?? 1)}
                                                    onChangeText={(t) => updateSelectedTile({ movement_cost: parseFloat(t) || 1 })}
                                                    keyboardType="numeric"
                                                />
                                            </View>

                                            <View style={styles.switchRow}>
                                                <ThemedText>Blocked</ThemedText>
                                                <Switch
                                                    value={selectedTile.is_blocked}
                                                    onValueChange={(v) => updateSelectedTile({ is_blocked: v })}
                                                />
                                            </View>

                                            <View style={styles.switchRow}>
                                                <ThemedText>Difficult Terrain</ThemedText>
                                                <Switch
                                                    value={selectedTile.is_difficult}
                                                    onValueChange={(v) => updateSelectedTile({ is_difficult: v })}
                                                />
                                            </View>

                                            <View style={styles.switchRow}>
                                                <ThemedText>Provides Cover</ThemedText>
                                                <Switch
                                                    value={selectedTile.provides_cover}
                                                    onValueChange={(v) => updateSelectedTile({ provides_cover: v })}
                                                />
                                            </View>

                                            <View style={styles.inputGroup}>
                                                <ThemedText style={styles.label}>Terrain Type (Tag)</ThemedText>
                                                <TextInput
                                                    style={styles.input}
                                                    value={selectedTile.terrain || ''}
                                                    onChangeText={(t) => updateSelectedTile({ terrain: t })}
                                                />
                                            </View>

                                            <TouchableOpacity
                                                style={styles.deleteBtn}
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
													activeTerrain === type.id && styles.terrainOptionActive
												]}
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
											        }}>
												        <ExpoIcon icon="Feather:trash-2" size={16} color="#8B2323" />
											        </TouchableOpacity>
										        </View>
									        ))}
								        </View>
							        )}
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
		</ThemedView>
	);
}

function EditorCanvas({
	map,
	gridConfig,
	activeTool,
	tiles,
	objects,
	onTileClick,
    selectedTileKey
}: {
	map: MapData;
	gridConfig: { size: number; offsetX: number; offsetY: number; columns: number; rows: number };
	activeTool: string;
	tiles: Record<string, TileData>;
	objects: any[];
	onTileClick: (x: number, y: number) => void;
    selectedTileKey: string | null;
}) {
	const width = gridConfig.columns * gridConfig.size;
	const height = gridConfig.rows * gridConfig.size;

	const renderGrid = () => {
		const lines = [];
		// Vertical lines
		for (let i = 0; i <= gridConfig.columns; i++) {
			const x = i * gridConfig.size + gridConfig.offsetX;
			lines.push(
				<Line
					key={`v-${i}`}
					x1={x}
					y1={gridConfig.offsetY}
					x2={x}
					y2={height + gridConfig.offsetY}
					stroke="rgba(0,0,0,0.3)"
					strokeWidth="1"
				/>
			);
		}
		// Horizontal lines
		for (let i = 0; i <= gridConfig.rows; i++) {
			const y = i * gridConfig.size + gridConfig.offsetY;
			lines.push(
				<Line
					key={`h-${i}`}
					x1={gridConfig.offsetX}
					y1={y}
					x2={width + gridConfig.offsetX}
					y2={y}
					stroke="rgba(0,0,0,0.3)"
					strokeWidth="1"
				/>
			);
		}
		return lines;
	};

	const renderTiles = () => {
		return Object.entries(tiles).map(([key, tile]) => {
			const x = tile.x * gridConfig.size + gridConfig.offsetX;
			const y = tile.y * gridConfig.size + gridConfig.offsetY;
			const terrainDef = TERRAIN_TYPES.find(t => t.id === tile.terrain);
			const color = terrainDef?.color || 'rgba(100, 100, 100, 0.3)';
            const isSelected = selectedTileKey === key;

			return (
				<Rect
					key={key}
					x={x}
					y={y}
					width={gridConfig.size}
					height={gridConfig.size}
					fill={color}
                    stroke={isSelected ? '#00FFFF' : undefined}
                    strokeWidth={isSelected ? 2 : 0}
				/>
			);
		});
	};

    const renderSelection = () => {
        if (!selectedTileKey) return null;
        const [gx, gy] = selectedTileKey.split(',').map(Number);
        const x = gx * gridConfig.size + gridConfig.offsetX;
        const y = gy * gridConfig.size + gridConfig.offsetY;
        return (
            <Rect
                x={x}
                y={y}
                width={gridConfig.size}
                height={gridConfig.size}
                fill="transparent"
                stroke="#00FFFF"
                strokeWidth={2}
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

		const adjX = x - gridConfig.offsetX;
		const adjY = y - gridConfig.offsetY;

		if (adjX < 0 || adjY < 0) return;

		const gx = Math.floor(adjX / gridConfig.size);
		const gy = Math.floor(adjY / gridConfig.size);

		if (gx < gridConfig.columns && gy < gridConfig.rows) {
			onTileClick(gx, gy);
		}
	};

	return (
		<TouchableOpacity
			testID="editor-canvas"
			activeOpacity={1}
			onPress={handlePress}
			style={{
				width: width + 200,
				height: height + 200,
				backgroundColor: '#222',
				position: 'relative',
			}}
		>
			{/* Background Layer */}
			{map.background_image_url && (
				<Image
                    pointerEvents="none"
					source={{ uri: map.background_image_url }}
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						width: width,
						height: height,
						resizeMode: 'stretch',
						opacity: 0.8
					}}
				/>
			)}

			<Svg height="100%" width="100%" style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
				{renderGrid()}
				{renderTiles()}
                {renderSelection()}
			</Svg>

			{objects.map((obj, idx) => (
				<Image
                    pointerEvents="none"
					key={obj.id || idx}
					source={{ uri: obj.image_url }}
					style={{
						position: 'absolute',
						left: obj.x + gridConfig.offsetX,
						top: obj.y + gridConfig.offsetY,
						width: gridConfig.size,
						height: gridConfig.size,
					}}
				/>
			))}
		</TouchableOpacity>
	);
}

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
	headerBtn: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 16,
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
	},
	canvasScrollVertical: {
		flex: 1,
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
});
