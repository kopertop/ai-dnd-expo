import React, { useCallback, useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { multiplayerClient } from '@/services/api/multiplayer-client';

interface Map {
	id: string;
	slug: string;
	name: string;
	description: string | null;
	width: number;
	height: number;
}

interface MapManagementPanelProps {
	inviteCode: string;
	currentMapId: string | null;
	onMapSelected: (mapId: string) => void;
	onMapCloned?: (mapId: string) => void;
	onEditMap?: (mapId: string) => void;
}

export const MapManagementPanel: React.FC<MapManagementPanelProps> = ({
	inviteCode,
	currentMapId,
	onMapSelected,
	onMapCloned,
	onEditMap,
}) => {
	const [maps, setMaps] = useState<Map[]>([]);
	const [loading, setLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [cloningMapId, setCloningMapId] = useState<string | null>(null);

	const loadMaps = useCallback(async () => {
		setLoading(true);
		try {
			const response = await multiplayerClient.getAllMaps();
			setMaps(response.maps || []);
		} catch (error) {
			console.error('Failed to load maps:', error);
			Alert.alert('Error', error instanceof Error ? error.message : 'Failed to load maps');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadMaps();
	}, [loadMaps]);

	const handleCloneMap = useCallback(
		async (sourceMap: Map) => {
			if (!sourceMap.id) return;

			setCloningMapId(sourceMap.id);
			try {
				const newName = `${sourceMap.name} (Copy)`;
				const response = await multiplayerClient.cloneMap(sourceMap.id, newName);
				Alert.alert('Success', `Map "${newName}" created successfully`);
				await loadMaps();
				if (onMapCloned && response.map?.id) {
					onMapCloned(response.map.id);
				}
			} catch (error) {
				console.error('Failed to clone map:', error);
				Alert.alert('Error', error instanceof Error ? error.message : 'Failed to clone map');
			} finally {
				setCloningMapId(null);
			}
		},
		[loadMaps, onMapCloned],
	);

	const handleUseMap = useCallback(
		async (mapId: string) => {
			try {
				await multiplayerClient.switchMap(inviteCode, mapId);
				onMapSelected(mapId);
				Alert.alert('Success', 'Map selected successfully');
			} catch (error) {
				console.error('Failed to switch map:', error);
				Alert.alert('Error', error instanceof Error ? error.message : 'Failed to switch map');
			}
		},
		[inviteCode, onMapSelected],
	);

	const filteredMaps = maps.filter(
		map =>
			map.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(map.description && map.description.toLowerCase().includes(searchQuery.toLowerCase())),
	);

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<ThemedText type="subtitle">Map Management</ThemedText>
				<TouchableOpacity style={styles.refreshButton} onPress={loadMaps}>
					<ThemedText style={styles.refreshButtonText}>Refresh</ThemedText>
				</TouchableOpacity>
			</View>

			{currentMapId && (
				<View style={styles.currentMapSection}>
					<ThemedText style={styles.sectionTitle}>Current Map</ThemedText>
					{maps.find(m => m.id === currentMapId) && (
						<View style={styles.currentMapCard}>
							<ThemedText style={styles.mapName}>
								{maps.find(m => m.id === currentMapId)?.name}
							</ThemedText>
							<ThemedText style={styles.mapDetails}>
								{maps.find(m => m.id === currentMapId)?.width} ×{' '}
								{maps.find(m => m.id === currentMapId)?.height}
							</ThemedText>
							<View style={styles.currentMapActions}>
								{onEditMap && (
									<TouchableOpacity
										style={[styles.actionButton, styles.editButton]}
										onPress={() => onEditMap(currentMapId)}
									>
										<ThemedText style={styles.editButtonText}>Edit</ThemedText>
									</TouchableOpacity>
								)}
								<TouchableOpacity
									style={[styles.actionButton, styles.cloneButton]}
									onPress={() => {
										const map = maps.find(m => m.id === currentMapId);
										if (map) handleCloneMap(map);
									}}
									disabled={cloningMapId === currentMapId}
								>
									<ThemedText style={styles.cloneButtonText}>
										{cloningMapId === currentMapId ? 'Cloning...' : 'Clone'}
									</ThemedText>
								</TouchableOpacity>
							</View>
						</View>
					)}
				</View>
			)}

			<View style={styles.availableMapsSection}>
				<ThemedText style={styles.sectionTitle}>Available Maps</ThemedText>
				<TextInput
					style={styles.searchInput}
					placeholder="Search maps..."
					value={searchQuery}
					onChangeText={setSearchQuery}
					placeholderTextColor="#6B5B3D"
				/>

				{loading ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="small" color="#8B6914" />
						<ThemedText style={styles.loadingText}>Loading maps...</ThemedText>
					</View>
				) : filteredMaps.length === 0 ? (
					<ThemedText style={styles.emptyText}>
						{searchQuery ? 'No maps found matching your search.' : 'No maps available.'}
					</ThemedText>
				) : (
					<ScrollView style={styles.mapsList} nestedScrollEnabled>
						{filteredMaps.map(map => (
							<View key={map.id} style={styles.mapCard}>
								<View style={styles.mapCardHeader}>
									<ThemedText style={styles.mapName}>{map.name}</ThemedText>
									{map.id === currentMapId && (
										<View style={styles.currentBadge}>
											<ThemedText style={styles.currentBadgeText}>Current</ThemedText>
										</View>
									)}
								</View>
								{map.description && (
									<ThemedText style={styles.mapDescription}>{map.description}</ThemedText>
								)}
								<ThemedText style={styles.mapDetails}>
									{map.width} × {map.height}
								</ThemedText>
								<View style={styles.mapCardActions}>
									{map.id !== currentMapId && (
										<TouchableOpacity
											style={[styles.actionButton, styles.useButton]}
											onPress={() => handleUseMap(map.id)}
										>
											<ThemedText style={styles.useButtonText}>Use This Map</ThemedText>
										</TouchableOpacity>
									)}
									{onEditMap && (
										<TouchableOpacity
											style={[styles.actionButton, styles.editButton]}
											onPress={() => onEditMap(map.id)}
										>
											<ThemedText style={styles.editButtonText}>Edit</ThemedText>
										</TouchableOpacity>
									)}
									<TouchableOpacity
										style={[styles.actionButton, styles.cloneButton]}
										onPress={() => handleCloneMap(map)}
										disabled={cloningMapId === map.id}
									>
										<ThemedText style={styles.cloneButtonText}>
											{cloningMapId === map.id ? 'Cloning...' : 'Clone'}
										</ThemedText>
									</TouchableOpacity>
								</View>
							</View>
						))}
					</ScrollView>
				)}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		gap: 16,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	refreshButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		backgroundColor: '#8B6914',
	},
	refreshButtonText: {
		color: '#FFF9EF',
		fontSize: 12,
		fontWeight: '600',
	},
	currentMapSection: {
		gap: 8,
	},
	availableMapsSection: {
		flex: 1,
		gap: 12,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#3B2F1B',
		marginBottom: 8,
	},
	currentMapCard: {
		padding: 16,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: '#C9B037',
		backgroundColor: '#FFF9EF',
		gap: 8,
	},
	mapCard: {
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		backgroundColor: '#FFFFFF',
		marginBottom: 12,
		gap: 8,
	},
	mapCardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	mapName: {
		fontSize: 16,
		fontWeight: '700',
		color: '#3B2F1B',
		flex: 1,
	},
	mapDescription: {
		fontSize: 14,
		color: '#6B5B3D',
	},
	mapDetails: {
		fontSize: 12,
		color: '#8B6914',
	},
	currentBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
		backgroundColor: '#4A6741',
	},
	currentBadgeText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#FFF9EF',
	},
	currentMapActions: {
		flexDirection: 'row',
		gap: 8,
		marginTop: 8,
	},
	mapCardActions: {
		flexDirection: 'row',
		gap: 8,
		marginTop: 8,
	},
	actionButton: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		flex: 1,
		alignItems: 'center',
	},
	useButton: {
		backgroundColor: '#4A6741',
	},
	editButton: {
		backgroundColor: '#8B6914',
	},
	cloneButton: {
		backgroundColor: '#E9D8A6',
	},
	actionButtonText: {
		color: '#1F130A',
		fontSize: 12,
		fontWeight: '600',
	},
	useButtonText: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: '600',
	},
	editButtonText: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: '600',
	},
	cloneButtonText: {
		color: '#1F130A',
		fontSize: 12,
		fontWeight: '600',
	},
	searchInput: {
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		fontSize: 14,
		color: '#3B2F1B',
	},
	mapsList: {
		flex: 1,
	},
	loadingContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 20,
		gap: 12,
	},
	loadingText: {
		color: '#6B5B3D',
		fontSize: 14,
	},
	emptyText: {
		color: '#6B5B3D',
		fontSize: 14,
		textAlign: 'center',
		paddingVertical: 20,
	},
});


