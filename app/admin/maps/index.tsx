import { Picker } from '@react-native-picker/picker';
import { Stack, router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	FlatList,
	Modal,
	Pressable,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';

import { ExpoIcon } from '@/components/expo-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchAPI } from '@/lib/fetch';

interface MapItem {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	world_id: string | null;
	background_image_url: string | null;
}

interface World {
	id: string;
	name: string;
}

type WorldFilterValue = 'all' | 'unassigned' | string;

const MapsListScreen: React.FC = () => {
	const [maps, setMaps] = useState<MapItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [worlds, setWorlds] = useState<World[]>([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [worldFilter, setWorldFilter] = useState<WorldFilterValue>('all');
	const [isWorldFilterOpen, setIsWorldFilterOpen] = useState(false);

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

	const loadWorlds = async () => {
		try {
			const data = await fetchAPI<World[]>('/api/worlds');
			setWorlds(data);
		} catch (error) {
			console.error('Failed to load worlds:', error);
		}
	};

	useEffect(() => {
		loadMaps();
		loadWorlds();
	}, []);

	const worldsById = useMemo(() => {
		const byId: Record<string, World> = {};
		for (const w of worlds) {
			byId[w.id] = w;
		}
		return byId;
	}, [worlds]);

	const distinctWorldIds = useMemo(() => {
		const ids = new Set<string>();
		for (const m of maps) {
			if (m.world_id) ids.add(m.world_id);
		}
		return Array.from(ids).sort((a, b) => {
			const aName = worldsById[a]?.name ?? a;
			const bName = worldsById[b]?.name ?? b;
			return aName.localeCompare(bName);
		});
	}, [maps, worldsById]);

	const filteredMaps = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();

		return maps.filter((m) => {
			if (worldFilter === 'unassigned') {
				if (m.world_id) return false;
			} else if (worldFilter !== 'all') {
				if (m.world_id !== worldFilter) return false;
			}

			if (q.length === 0) return true;

			const worldName = m.world_id ? worldsById[m.world_id]?.name ?? '' : '';
			const haystack = [
				m.name,
				m.slug,
				m.id,
				m.description ?? '',
				m.world_id ?? '',
				worldName,
			]
				.join(' ')
				.toLowerCase();

			return haystack.includes(q);
		});
	}, [maps, searchQuery, worldFilter, worldsById]);

	const filtersAreActive = searchQuery.trim().length > 0 || worldFilter !== 'all';

	const renderItem = ({ item }: { item: MapItem }) => (
		<TouchableOpacity
			style={styles.card}
			onPress={() => router.push(`/admin/maps/${item.id}`)}
		>
			<View style={styles.cardContent}>
				<ThemedText style={styles.cardTitle}>{item.name}</ThemedText>
				<ThemedText style={styles.cardSubtitle}>{item.slug}</ThemedText>
				{item.world_id ? (
					<ThemedText style={styles.worldTag}>
						<ExpoIcon icon="Feather:globe" size={12} color="#6B5B3D" />{' '}
						{worldsById[item.world_id]?.name ?? item.world_id.replace('world_', '')}
					</ThemedText>
				) : (
					<ThemedText style={styles.worldTagMuted}>
						<ExpoIcon icon="Feather:slash" size={12} color="#6B5B3D" /> Unassigned
					</ThemedText>
				)}
				{item.background_image_url ? (
					<ThemedText style={styles.badge}>
						<ExpoIcon icon="Feather:image" size={12} color="#6B5B3D" /> Background
					</ThemedText>
				) : null}
			</View>
			<ExpoIcon icon="Feather:chevron-right" size={20} color="#6B5B3D" />
		</TouchableOpacity>
	);

	return (
		<ThemedView style={styles.container}>
			<Stack.Screen
				options={{
					title: 'Maps',
				}}
			/>

			{loading ? (
				<View style={styles.center}>
					<ActivityIndicator size="large" color="#8B6914" />
				</View>
			) : (
				<>
					<FlatList
						data={filteredMaps}
						keyExtractor={(item) => item.id}
						renderItem={renderItem}
						contentContainerStyle={styles.listContent}
						ListHeaderComponent={
							<View style={styles.controls}>
								<View style={styles.searchRow}>
									<View style={styles.searchGroup}>
										<View style={styles.searchInputContainer}>
											<ExpoIcon icon="Feather:search" size={16} color="#6B5B3D" />
											<TextInput
												style={styles.searchInput}
												value={searchQuery}
												onChangeText={setSearchQuery}
												placeholder="Search maps (name, slug, world, id...)"
												placeholderTextColor="#8B7A63"
												autoCapitalize="none"
												autoCorrect={false}
											/>
											{searchQuery.length > 0 ? (
												<TouchableOpacity
													onPress={() => setSearchQuery('')}
													accessibilityLabel="Clear search"
												>
													<ExpoIcon icon="Feather:x" size={16} color="#6B5B3D" />
												</TouchableOpacity>
											) : null}
										</View>

										<TouchableOpacity
											style={[
												styles.filterButton,
												worldFilter !== 'all' && styles.filterButtonActive,
											]}
											onPress={() => setIsWorldFilterOpen(true)}
											accessibilityLabel="Filter by world"
										>
											<ExpoIcon
												icon="Feather:filter"
												size={16}
												color={worldFilter !== 'all' ? '#3B2F1B' : '#6B5B3D'}
											/>
										</TouchableOpacity>
									</View>
								</View>

								<View style={styles.metaRow}>
									<ThemedText style={styles.metaText}>
										Showing {filteredMaps.length} of {maps.length}
									</ThemedText>
									{filtersAreActive ? (
										<TouchableOpacity
											style={styles.clearButton}
											onPress={() => {
												setSearchQuery('');
												setWorldFilter('all');
											}}
											accessibilityLabel="Clear filters"
										>
											<ThemedText style={styles.clearButtonText}>Clear</ThemedText>
										</TouchableOpacity>
									) : null}
								</View>

								<Modal
									transparent
									visible={isWorldFilterOpen}
									animationType="fade"
									onRequestClose={() => setIsWorldFilterOpen(false)}
								>
									<Pressable
										style={styles.modalBackdrop}
										onPress={() => setIsWorldFilterOpen(false)}
									>
										<Pressable style={styles.modalCard} onPress={() => null}>
											<View style={styles.modalHeader}>
												<ThemedText style={styles.modalTitle}>Filter by world</ThemedText>
												<TouchableOpacity
													onPress={() => setIsWorldFilterOpen(false)}
													accessibilityLabel="Close world filter"
												>
													<ExpoIcon icon="Feather:x" size={18} color="#6B5B3D" />
												</TouchableOpacity>
											</View>

											<View style={styles.pickerContainerModal}>
												<Picker
													selectedValue={worldFilter}
													onValueChange={(val) => setWorldFilter(val)}
													style={styles.picker}
												>
													<Picker.Item label="All worlds" value="all" />
													<Picker.Item label="Unassigned" value="unassigned" />
													{distinctWorldIds.map((id) => (
														<Picker.Item
															key={id}
															label={worldsById[id]?.name ?? id}
															value={id}
														/>
													))}
												</Picker>
											</View>

											<View style={styles.modalFooter}>
												<TouchableOpacity
													style={styles.modalButton}
													onPress={() => setIsWorldFilterOpen(false)}
													accessibilityLabel="Apply world filter"
												>
													<ThemedText style={styles.modalButtonText}>Done</ThemedText>
												</TouchableOpacity>
											</View>
										</Pressable>
									</Pressable>
								</Modal>
							</View>
						}
						ListEmptyComponent={
							<View style={styles.center}>
								<ThemedText>
									{filtersAreActive ? 'No maps match your search/filters.' : 'No maps found.'}
								</ThemedText>
							</View>
						}
					/>
					<TouchableOpacity
						style={styles.fab}
						onPress={() => router.push('/admin/maps/create')}
						accessibilityLabel="Create Map"
					>
						<ExpoIcon icon="Feather:plus" size={24} color="#FFF" />
					</TouchableOpacity>
				</>
			)}
		</ThemedView>
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
		padding: 24,
	},
	listContent: {
		padding: 16,
	},
	controls: {
		marginBottom: 12,
	},
	searchRow: {
		marginBottom: 12,
	},
	searchGroup: {
		flexDirection: 'row',
		alignItems: 'stretch',
	},
	searchInputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		backgroundColor: '#FFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRightWidth: 0,
		paddingHorizontal: 12,
		paddingVertical: 2,
		flex: 1,
		height: 42,
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		color: '#3B2F1B',
		height: 32,
		paddingHorizontal: 5,
		paddingVertical: 0,
	},
	filterButton: {
		width: 46,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#FFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderTopRightRadius: 12,
		borderBottomRightRadius: 12,
	},
	filterButtonActive: {
		backgroundColor: '#F5E6D3',
	},
	picker: {
		width: '100%',
		height: 44,
	},
	metaRow: {
		marginTop: 10,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	metaText: {
		fontSize: 12,
		color: '#6B5B3D',
	},
	clearButton: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		backgroundColor: '#FFF9EF',
	},
	clearButtonText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#3B2F1B',
	},
	modalBackdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.35)',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
	},
	modalCard: {
		width: '100%',
		maxWidth: 520,
		backgroundColor: '#FFF9EF',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		overflow: 'hidden',
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#E2D3B3',
	},
	modalTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#3B2F1B',
	},
	pickerContainerModal: {
		backgroundColor: '#FFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 12,
		margin: 14,
		overflow: 'hidden',
	},
	modalFooter: {
		paddingHorizontal: 14,
		paddingBottom: 14,
	},
	modalButton: {
		alignSelf: 'flex-end',
		paddingHorizontal: 14,
		paddingVertical: 10,
		backgroundColor: '#8B6914',
		borderRadius: 12,
	},
	modalButtonText: {
		color: '#FFF',
		fontWeight: '700',
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
	worldTagMuted: {
		fontSize: 12,
		color: '#8B7A63',
		marginTop: 4,
	},
	badge: {
		fontSize: 12,
		color: '#6B5B3D',
		marginTop: 6,
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

export default MapsListScreen;
