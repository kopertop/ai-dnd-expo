import { ExpoIcon } from '@/components/expo-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchAPI } from '@/lib/fetch';
import { Stack, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';

interface MapItem {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	world_id: string | null;
	background_image_url: string | null;
}

export default function MapsListScreen() {
	const [maps, setMaps] = useState<MapItem[]>([]);
	const [loading, setLoading] = useState(true);

	const loadMaps = async () => {
		try {
			setLoading(true);
			const data = await fetchAPI<{ maps: MapItem[] }>('/api/maps');
			setMaps(data.maps);
		} catch (error) {
			console.error('Failed to load maps:', error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadMaps();
	}, []);

	const renderItem = ({ item }: { item: MapItem }) => (
		<TouchableOpacity
			style={styles.card}
			onPress={() => router.push(`/admin/maps/${item.id}`)}
		>
			<View style={styles.cardContent}>
				<ThemedText style={styles.cardTitle}>{item.name}</ThemedText>
				<ThemedText style={styles.cardSubtitle}>{item.slug}</ThemedText>
				{item.world_id && (
					<ThemedText style={styles.worldTag}>
						<ExpoIcon icon="Feather:globe" size={12} color="#6B5B3D" /> {item.world_id.replace('world_', '')}
					</ThemedText>
				)}
			</View>
			<ExpoIcon icon="Feather:chevron-right" size={20} color="#6B5B3D" />
		</TouchableOpacity>
	);

	return (
		<ThemedView style={styles.container}>
			<Stack.Screen
				options={{
					title: 'Maps',
					headerRight: () => (
						<TouchableOpacity onPress={() => router.push('/admin/maps/create')}>
							<ExpoIcon icon="Feather:plus" size={24} color="#3B2F1B" />
						</TouchableOpacity>
					),
				}}
			/>

			{loading ? (
				<View style={styles.center}>
					<ActivityIndicator size="large" color="#8B6914" />
				</View>
			) : (
				<FlatList
					data={maps}
					keyExtractor={(item) => item.id}
					renderItem={renderItem}
					contentContainerStyle={styles.listContent}
					ListEmptyComponent={
						<View style={styles.center}>
							<ThemedText>No maps found.</ThemedText>
						</View>
					}
				/>
			)}
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
		padding: 24,
	},
	listContent: {
		padding: 16,
	},
	card: {
		backgroundColor: '#FFF9EF',
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2,
	},
	cardContent: {
		flex: 1,
		marginRight: 12,
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#3B2F1B',
		marginBottom: 4,
	},
	cardSubtitle: {
		fontSize: 14,
		color: '#8B6914',
		marginBottom: 4,
		fontFamily: 'monospace',
	},
	worldTag: {
		fontSize: 12,
		color: '#6B5B3D',
		marginTop: 4,
	},
});
