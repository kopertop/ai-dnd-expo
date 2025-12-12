import { ExpoIcon } from '@/components/expo-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchAPI } from '@/lib/fetch';
import { Stack, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';

interface World {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	image_url: string | null;
	is_public: number;
}

export default function WorldsListScreen() {
	const [worlds, setWorlds] = useState<World[]>([]);
	const [loading, setLoading] = useState(true);

	const loadWorlds = async () => {
		try {
			setLoading(true);
			const data = await fetchAPI<World[]>('/api/worlds');
			setWorlds(data);
		} catch (error) {
			console.error('Failed to load worlds:', error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadWorlds();
	}, []);

	const renderItem = ({ item }: { item: World }) => (
		<TouchableOpacity
			style={styles.card}
			onPress={() => router.push(`/admin/worlds/${item.id}`)}
		>
			<View style={styles.cardContent}>
				<View style={styles.cardHeader}>
					<ThemedText style={styles.cardTitle}>{item.name}</ThemedText>
					{item.is_public === 1 && (
						<View style={styles.badge}>
							<ThemedText style={styles.badgeText}>Public</ThemedText>
						</View>
					)}
				</View>
				<ThemedText style={styles.cardSubtitle}>{item.slug}</ThemedText>
				{item.description && (
					<ThemedText numberOfLines={2} style={styles.cardDescription}>
						{item.description}
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
					title: 'Worlds',
					headerRight: () => null,
				}}
			/>

			{loading ? (
				<View style={styles.center}>
					<ActivityIndicator size="large" color="#8B6914" />
				</View>
			) : (
				<>
					<FlatList
						data={worlds}
						keyExtractor={(item) => item.id}
						renderItem={renderItem}
						contentContainerStyle={styles.listContent}
						ListEmptyComponent={
							<View style={styles.center}>
								<ThemedText>No worlds found.</ThemedText>
							</View>
						}
					/>
					<TouchableOpacity
						style={styles.fab}
						onPress={() => router.push('/admin/worlds/create')}
						accessibilityLabel="Create World"
					>
						<ExpoIcon icon="Feather:plus" size={24} color="#FFF" />
					</TouchableOpacity>
				</>
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
		paddingBottom: 96,
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
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#3B2F1B',
		marginRight: 8,
	},
	cardSubtitle: {
		fontSize: 14,
		color: '#8B6914',
		marginBottom: 4,
		fontFamily: 'monospace',
	},
	cardDescription: {
		fontSize: 14,
		color: '#6B5B3D',
	},
	badge: {
		backgroundColor: '#D4EDDA',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
		borderWidth: 1,
		borderColor: '#C3E6CB',
	},
	badgeText: {
		fontSize: 10,
		color: '#155724',
		fontWeight: 'bold',
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
