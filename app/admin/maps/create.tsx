import { Picker } from '@react-native-picker/picker';
import { apiService } from 'expo-auth-template/frontend';
import { Stack, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Image,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';

import { ExpoIcon } from '@/components/expo-icon';
import { MediaLibraryModal } from '@/components/media-library-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
	TERRAIN_TYPES,
	getTerrainDisplayName,
} from '@/constants/terrain-types';

interface World {
	id: string;
	name: string;
}

const CreateMapScreen: React.FC = () => {
	const [worlds, setWorlds] = useState<World[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const [formData, setFormData] = useState({
		name: '',
		slug: '',
		description: '',
		world_id: '',
		background_image_url: '',
		grid_size: 100,
		grid_columns: 40,
		grid_rows: 30,
		default_terrain_type: 'stone',
	});

	const [bgPickerVisible, setBgPickerVisible] = useState(false);

	useEffect(() => {
		loadWorlds();
	}, []);

	const loadWorlds = async () => {
		try {
			setLoading(true);
			const data = await apiService.fetchApi('worlds');
			setWorlds(data);
			if (data.length > 0) {
				setFormData(prev => ({ ...prev, world_id: data[0].id }));
			}
		} catch (error) {
			console.error('Failed to load worlds:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleCreate = async () => {
		if (!formData.name || !formData.slug) {
			Alert.alert('Error', 'Name and Slug are required');
			return;
		}

		try {
			setSaving(true);
			const response = await apiService.fetchApi('maps', {
				method: 'POST',
				body: JSON.stringify({
					...formData,
					grid_offset_x: 0,
					grid_offset_y: 0,
					width: formData.grid_columns,
					height: formData.grid_rows,
					default_terrain: JSON.stringify({ type: formData.default_terrain_type }),
				}),
			});

			// Redirect to the editor
			router.replace(`/admin/maps/${response.id}`);
		} catch (error: any) {
			Alert.alert('Error', error.message || 'Failed to create map');
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
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
					title: 'Create New Map',
					headerTitleAlign: 'center',
					headerRight: () => null,
				}}
			/>

			<ScrollView contentContainerStyle={styles.content}>
				<View style={styles.formGroup}>
					<ThemedText style={styles.label}>Name</ThemedText>
					<TextInput
						style={styles.input}
						value={formData.name}
						onChangeText={(text) => {
							setFormData(prev => ({
								...prev,
								name: text,
								slug: text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
							}));
						}}
						placeholder="e.g. The Red Tavern"
						placeholderTextColor="#999"
					/>
				</View>

				<View style={styles.formGroup}>
					<ThemedText style={styles.label}>Slug</ThemedText>
					<TextInput
						style={styles.input}
						value={formData.slug}
						onChangeText={(text) => setFormData(prev => ({ ...prev, slug: text.toLowerCase() }))}
						placeholder="e.g. the-red-tavern"
						placeholderTextColor="#999"
						autoCapitalize="none"
					/>
				</View>

				<View style={styles.formGroup}>
					<ThemedText style={styles.label}>World</ThemedText>
					<View style={styles.pickerContainer}>
						<Picker
							selectedValue={formData.world_id}
							onValueChange={(itemValue: string) => setFormData(prev => ({ ...prev, world_id: itemValue }))}
							style={styles.picker}
						>
							{worlds.map((world) => (
								<Picker.Item key={world.id} label={world.name} value={world.id} />
							))}
						</Picker>
					</View>
				</View>

				<View style={styles.formGroup}>
					<ThemedText style={styles.label}>Description</ThemedText>
					<TextInput
						style={[styles.input, styles.textArea]}
						value={formData.description}
						onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
						placeholder="Optional description..."
						placeholderTextColor="#999"
						multiline
						numberOfLines={4}
						textAlignVertical="top"
					/>
				</View>

				<View style={styles.formGroup}>
					<ThemedText style={styles.label}>Background Image</ThemedText>
					<TouchableOpacity style={styles.pickerBtn} onPress={() => setBgPickerVisible(true)}>
						<ThemedText>Choose from Library</ThemedText>
					</TouchableOpacity>
					{formData.background_image_url && (
						<Image source={{ uri: formData.background_image_url }} style={styles.previewImage} resizeMode="contain" />
					)}
				</View>

				<View style={styles.formGroup}>
					<ThemedText style={styles.label}>Grid Size (px)</ThemedText>
					<TextInput
						style={styles.input}
						value={String(formData.grid_size)}
						onChangeText={(text) => setFormData(prev => ({ ...prev, grid_size: parseInt(text) || 100 }))}
						placeholder="100"
						placeholderTextColor="#999"
						keyboardType="numeric"
					/>
				</View>

				<View style={styles.row}>
					<View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
						<ThemedText style={styles.label}>Columns</ThemedText>
						<TextInput
							style={styles.input}
							value={String(formData.grid_columns)}
							onChangeText={(text) => setFormData(prev => ({ ...prev, grid_columns: parseInt(text) || 40 }))}
							placeholder="40"
							placeholderTextColor="#999"
							keyboardType="numeric"
						/>
					</View>
					<View style={[styles.formGroup, { flex: 1 }]}>
						<ThemedText style={styles.label}>Rows</ThemedText>
						<TextInput
							style={styles.input}
							value={String(formData.grid_rows)}
							onChangeText={(text) => setFormData(prev => ({ ...prev, grid_rows: parseInt(text) || 30 }))}
							placeholder="30"
							placeholderTextColor="#999"
							keyboardType="numeric"
						/>
					</View>
				</View>

				<View style={styles.formGroup}>
					<ThemedText style={styles.label}>Default Terrain Type</ThemedText>
					<View style={styles.pickerContainer}>
						<Picker
							selectedValue={formData.default_terrain_type}
							onValueChange={(itemValue: string) => setFormData(prev => ({ ...prev, default_terrain_type: itemValue }))}
							style={styles.picker}
						>
							{TERRAIN_TYPES.map((terrain) => (
								<Picker.Item
									key={terrain}
									label={getTerrainDisplayName(terrain)}
									value={terrain}
								/>
							))}
						</Picker>
					</View>
				</View>
			</ScrollView>

			<MediaLibraryModal
				visible={bgPickerVisible}
				onClose={() => setBgPickerVisible(false)}
				onSelect={(url) => setFormData(prev => ({ ...prev, background_image_url: url }))}
			/>

			<TouchableOpacity
				style={styles.fab}
				onPress={handleCreate}
				disabled={saving}
				accessibilityLabel="Create Map"
			>
				{saving ? (
					<ActivityIndicator size="small" color="#FFF" />
				) : (
					<ExpoIcon icon="Feather:save" size={24} color="#FFF" />
				)}
			</TouchableOpacity>
		</ThemedView>
	);
};

export default CreateMapScreen;

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
	content: {
		padding: 20,
	},
	formGroup: {
		marginBottom: 20,
	},
	label: {
		fontSize: 16,
		fontWeight: '600',
		color: '#3B2F1B',
		marginBottom: 8,
	},
	input: {
		backgroundColor: '#FFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 8,
		padding: 12,
		fontSize: 16,
		color: '#3B2F1B',
	},
	pickerContainer: {
		backgroundColor: '#FFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 8,
		overflow: 'hidden',
	},
	picker: {
		width: '100%',
		height: 50,
	},
	textArea: {
		minHeight: 100,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
	pickerBtn: {
		backgroundColor: '#FFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		padding: 12,
		borderRadius: 8,
		alignItems: 'center',
		marginBottom: 8,
	},
	previewImage: {
		width: '100%',
		height: 100,
		backgroundColor: '#222',
		borderRadius: 8,
		marginTop: 8,
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
});
