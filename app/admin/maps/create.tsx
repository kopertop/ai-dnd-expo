import { ExpoIcon } from '@/components/expo-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchAPI } from '@/lib/fetch';
import { Stack, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

interface World {
	id: string;
	name: string;
}

export default function CreateMapScreen() {
	const [worlds, setWorlds] = useState<World[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const [formData, setFormData] = useState({
		name: '',
		slug: '',
		description: '',
		world_id: '',
	});

	useEffect(() => {
		loadWorlds();
	}, []);

	const loadWorlds = async () => {
		try {
			setLoading(true);
			const data = await fetchAPI<World[]>('/api/worlds');
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
			const response = await fetchAPI<{ success: boolean; id: string }>('/api/maps', {
				method: 'POST',
				body: JSON.stringify({
					...formData,
					// Default grid settings
					grid_size: 64,
					grid_columns: 20,
					grid_offset_x: 0,
					grid_offset_y: 0,
					width: 20,
					height: 20,
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
					headerRight: () => (
						<TouchableOpacity onPress={handleCreate} disabled={saving}>
							{saving ? (
								<ActivityIndicator size="small" color="#3B2F1B" />
							) : (
								<ThemedText style={styles.createButton}>Create</ThemedText>
							)}
						</TouchableOpacity>
					),
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
								slug: text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
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
							onValueChange={(itemValue) => setFormData(prev => ({ ...prev, world_id: itemValue }))}
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
			</ScrollView>
		</ThemedView>
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
	createButton: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 16,
	},
});
