import { Stack, useLocalSearchParams, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
	Switch,
} from 'react-native';

import { ExpoIcon } from '@/components/expo-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchAPI } from '@/lib/fetch';
import { ImageUploader } from '@/components/image-uploader';

interface World {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	image_url: string | null;
	is_public: number;
}

const WorldEditScreen: React.FC = () => {
	const { id } = useLocalSearchParams<{ id: string }>();
	const isNew = id === 'create';
	const [loading, setLoading] = useState(!isNew);
	const [saving, setSaving] = useState(false);

	const [formData, setFormData] = useState<Partial<World>>({
		name: '',
		slug: '',
		description: '',
		is_public: 0,
		image_url: '',
	});

	useEffect(() => {
		if (!isNew && id) {
			loadWorld(id);
		}
	}, [id]);

	const loadWorld = async (worldId: string) => {
		try {
			setLoading(true);
			const data = await fetchAPI<World>(`/api/worlds/${worldId}`);
			setFormData(data);
		} catch (error) {
			Alert.alert('Error', 'Failed to load world details');
			router.back();
		} finally {
			setLoading(false);
		}
	};

	const handleSave = async () => {
		if (!formData.name || !formData.slug) {
			Alert.alert('Error', 'Name and Slug are required');
			return;
		}

		try {
			setSaving(true);
			await fetchAPI('/api/worlds', {
				method: 'POST',
				body: JSON.stringify(formData),
			});
			Alert.alert('Success', 'World saved successfully', [
				{ text: 'OK', onPress: () => router.back() },
			]);
		} catch (error: any) {
			Alert.alert('Error', error.message || 'Failed to save world');
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (isNew) return;

		Alert.alert(
			'Delete World',
			'Are you sure you want to delete this world? This action cannot be undone.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						try {
							setSaving(true);
							await fetchAPI(`/api/worlds/${id}`, { method: 'DELETE' });
							router.back();
						} catch (error: any) {
							Alert.alert('Error', error.message || 'Failed to delete world');
							setSaving(false);
						}
					},
				},
			],
		);
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
					title: isNew ? 'Create World' : 'Edit World',
					headerRight: () => (
						<TouchableOpacity onPress={handleSave} disabled={saving}>
							{saving ? (
								<ActivityIndicator size="small" color="#3B2F1B" />
							) : (
								<ThemedText style={styles.saveButton}>Save</ThemedText>
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
								slug: isNew ? text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : prev.slug,
							}));
						}}
						placeholder="e.g. Faerun"
						placeholderTextColor="#999"
					/>
				</View>

				<View style={styles.formGroup}>
					<ThemedText style={styles.label}>Slug</ThemedText>
					<TextInput
						style={styles.input}
						value={formData.slug}
						onChangeText={(text) => setFormData(prev => ({ ...prev, slug: text.toLowerCase() }))}
						placeholder="e.g. faerun"
						placeholderTextColor="#999"
						autoCapitalize="none"
					/>
					<ThemedText style={styles.helperText}>Unique identifier used in URLs</ThemedText>
				</View>

				<View style={styles.formGroup}>
					<ThemedText style={styles.label}>Description</ThemedText>
					<TextInput
						style={[styles.input, styles.textArea]}
						value={formData.description || ''}
						onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
						placeholder="Describe the world..."
						placeholderTextColor="#999"
						multiline
						numberOfLines={4}
						textAlignVertical="top"
					/>
				</View>

				<View style={styles.formGroup}>
					<ThemedText style={styles.label}>World Cover Image</ThemedText>
					<ImageUploader
						value={formData.image_url}
						onChange={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
						placeholder="Upload World Cover"
					/>
				</View>

				<View style={styles.switchRow}>
					<ThemedText style={styles.label}>Publicly Visible</ThemedText>
					<Switch
						value={formData.is_public === 1}
						onValueChange={(val) => setFormData(prev => ({ ...prev, is_public: val ? 1 : 0 }))}
						trackColor={{ false: '#767577', true: '#8B6914' }}
						thumbColor={formData.is_public ? '#f4f3f4' : '#f4f3f4'}
					/>
				</View>

				{!isNew && (
					<TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
						<ExpoIcon icon="Feather:trash-2" size={20} color="#FFF" />
						<ThemedText style={styles.deleteButtonText}>Delete World</ThemedText>
					</TouchableOpacity>
				)}
			</ScrollView>
		</ThemedView>
	);
};

export default WorldEditScreen;

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
	textArea: {
		minHeight: 100,
	},
	helperText: {
		fontSize: 12,
		color: '#8B6914',
		marginTop: 4,
	},
	switchRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 24,
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#E2D3B3',
	},
	saveButton: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 16,
	},
	deleteButton: {
		backgroundColor: '#8B2323',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
		borderRadius: 8,
		marginTop: 20,
		gap: 8,
	},
	deleteButtonText: {
		color: '#FFF',
		fontWeight: 'bold',
		fontSize: 16,
	},
});
