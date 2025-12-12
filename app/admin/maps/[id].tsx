import { ExpoIcon } from '@/components/expo-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchAPI } from '@/lib/fetch';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Dimensions,
	Image,
	PanResponder,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
	Platform,
} from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { ImageUploader } from '@/components/image-uploader';

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
	default_terrain?: Record<string, string>;
	tokens?: any[];
}

interface Tool {
	id: 'select' | 'grid' | 'terrain' | 'object';
	name: string;
	icon: string;
}

const TERRAIN_TYPES = [
	{ id: 'wall', color: 'rgba(0, 0, 0, 0.5)', label: 'Wall' },
	{ id: 'water', color: 'rgba(0, 0, 255, 0.3)', label: 'Water' },
	{ id: 'difficult', color: 'rgba(255, 165, 0, 0.3)', label: 'Difficult' },
];

export default function MapEditorScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const [map, setMap] = useState<MapData | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [activeTool, setActiveTool] = useState<Tool['id']>('select');
	const [showSidebar, setShowSidebar] = useState(true);
	const [activeTerrain, setActiveTerrain] = useState('wall');

	// Grid configuration state (local for instant preview)
	const [gridConfig, setGridConfig] = useState({
		size: 64,
		offsetX: 0,
		offsetY: 0,
		columns: 20,
		rows: 20,
	});

	const [tiles, setTiles] = useState<Record<string, string>>({});
	const [objects, setObjects] = useState<any[]>([]);

	useEffect(() => {
		if (id) loadMap(id);
	}, [id]);

	const loadMap = async (mapId: string) => {
		try {
			setLoading(true);
			const data = await fetchAPI<MapData>(`/api/maps/${mapId}`);
			setMap(data);

			// Load Grid Config
			setGridConfig({
				size: data.grid_size || 64,
				offsetX: data.grid_offset_x || 0,
				offsetY: data.grid_offset_y || 0,
				columns: data.grid_columns || 20,
				rows: Math.floor((data.height || 20)),
			});

			// Load Tiles
			if (data.default_terrain) {
				setTiles(data.default_terrain);
			}

			// Load Objects (Tokens)
			if (data.tokens && Array.isArray(data.tokens)) {
				// Transform tokens to objects format
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
			Alert.alert('Error', 'Failed to load map');
			router.back();
		} finally {
			setLoading(false);
		}
	};

	const handleSave = async () => {
		if (!map) return;
		try {
			setSaving(true);

			// Prepare payload
			const payload = {
				...map,
				grid_size: gridConfig.size,
				grid_offset_x: gridConfig.offsetX,
				grid_offset_y: gridConfig.offsetY,
				grid_columns: gridConfig.columns,
				width: gridConfig.columns,
				height: gridConfig.rows,
				// Save Painted Tiles
				default_terrain: tiles,
				// Save Placed Objects
				tokens: objects.map(obj => ({
					id: typeof obj.id === 'string' && obj.id.startsWith('temp_') ? undefined : obj.id, // New tokens get new IDs
					x: obj.x,
					y: obj.y,
					image_url: obj.image_url,
					label: obj.label || 'Object',
					token_type: 'prop'
				}))
			};

			await fetchAPI(`/api/maps`, {
				method: 'POST',
				body: JSON.stringify(payload),
			});

			Alert.alert('Success', 'Map saved');
			// Reload to get generated IDs if needed
			loadMap(map.id);
		} catch (error: any) {
			Alert.alert('Error', error.message);
		} finally {
			setSaving(false);
		}
	};

	const handleTileClick = (x: number, y: number) => {
		if (activeTool !== 'terrain') return;
		const key = `${x},${y}`;
		setTiles(prev => {
			const next = { ...prev };
			if (next[key] === activeTerrain) {
				delete next[key];
			} else {
				next[key] = activeTerrain;
			}
			return next;
		});
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
		Alert.alert('Object Added', 'Object placed at (0,0). Saving will persist it.');
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
									<ThemedText style={styles.sectionTitle}>Map Details</ThemedText>
									<View style={styles.inputGroup}>
										<ThemedText style={styles.label}>Background Image</ThemedText>
										<ImageUploader
											value={map.background_image_url}
											onChange={(url) => setMap({ ...map, background_image_url: url })}
											placeholder="Upload Background"
										/>
									</View>
									<View style={styles.inputGroup}>
										<ThemedText style={styles.label}>Cover Icon (for lists)</ThemedText>
										<ImageUploader
											value={map.cover_image_url}
											onChange={(url) => setMap({ ...map, cover_image_url: url })}
											placeholder="Upload Cover Icon"
										/>
									</View>
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
									<ThemedText style={styles.helperText}>
										Click on the grid to toggle terrain.
									</ThemedText>
								</View>
							)}

							{activeTool === 'object' && (
								<View>
									<ThemedText style={styles.sectionTitle}>Add Object</ThemedText>
									<ImageUploader
										onChange={handleAddObject}
										placeholder="Upload Object/Mini"
									/>
									<ThemedText style={styles.helperText}>
										Uploaded objects will appear on the map at (0,0).
									</ThemedText>
								</View>
							)}

							{/* List Objects for Editing coordinates manually (since no drag yet) */}
							{activeTool === 'object' && objects.length > 0 && (
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
						</ScrollView>
					</View>
				)}
			</View>
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
}: {
	map: MapData;
	gridConfig: { size: number; offsetX: number; offsetY: number; columns: number; rows: number };
	activeTool: string;
	tiles: Record<string, string>;
	objects: any[];
	onTileClick: (x: number, y: number) => void;
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
		return Object.entries(tiles).map(([key, type]) => {
			const [gx, gy] = key.split(',').map(Number);
			const x = gx * gridConfig.size + gridConfig.offsetX;
			const y = gy * gridConfig.size + gridConfig.offsetY;
			const terrainDef = TERRAIN_TYPES.find(t => t.id === type);

			return (
				<Rect
					key={key}
					x={x}
					y={y}
					width={gridConfig.size}
					height={gridConfig.size}
					fill={terrainDef?.color || 'rgba(0,0,0,0.5)'}
				/>
			);
		});
	};

	// We use a touchable overlay for grid interaction
	const handlePress = (e: any) => {
		if (activeTool !== 'terrain') return;

		const { locationX, locationY } = e.nativeEvent;

		// Adjust for offset
		const adjX = locationX - gridConfig.offsetX;
		const adjY = locationY - gridConfig.offsetY;

		if (adjX < 0 || adjY < 0) return;

		const gx = Math.floor(adjX / gridConfig.size);
		const gy = Math.floor(adjY / gridConfig.size);

		if (gx < gridConfig.columns && gy < gridConfig.rows) {
			onTileClick(gx, gy);
		}
	};

	return (
		<TouchableOpacity
			activeOpacity={1}
			onPress={handlePress}
			style={{
				width: width + 200, // Extra space
				height: height + 200,
				backgroundColor: '#222',
				position: 'relative',
			}}
		>
			{/* Background Layer */}
			{map.background_image_url && (
				<Image
					source={{ uri: map.background_image_url }}
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						width: width, // Match grid dimensions so grid overlays correctly
						height: height,
						resizeMode: 'stretch', // Or 'cover'/'contain' depending on preference, 'stretch' ensures it fills the grid
						opacity: 0.8
					}}
				/>
			)}

			{/* Grid & Tile Layer */}
			<Svg height="100%" width="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
				{renderGrid()}
				{renderTiles()}
			</Svg>

			{/* Objects Layer */}
			{objects.map((obj, idx) => (
				<Image
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
});
