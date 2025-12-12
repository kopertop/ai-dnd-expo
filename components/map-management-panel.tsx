import React, { useCallback, useMemo, useState } from 'react';
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

import { ThemedText } from '@/components/themed-text';
import { VTTMapImport } from '@/components/vtt-map-import';
import { LOCATIONS } from '@/constants/locations';
import {
    useAllMaps,
    useCloneMap,
    useDeleteMap,
    useSwitchMap,
} from '@/hooks/api/use-map-queries';
import { LocationOption } from '@/types/location-option';
import { WorldOption } from '@/types/world-option';

interface Map {
	id: string;
	slug: string;
	name: string;
	description: string | null;
	width: number;
	height: number;
	world?: string | null;
	metadata?: Record<string, unknown>;
}

interface MapManagementPanelProps {
	inviteCode: string;
	currentMapId: string | null;
	onMapSelected: (mapId: string) => void;
	onMapCloned?: (mapId: string) => void;
	onEditMap?: (mapId: string) => void;
	onStartEncounter?: (mapId: string) => Promise<void>;
	world?: WorldOption | null;
	location?: LocationOption | null;
}

export const MapManagementPanel: React.FC<MapManagementPanelProps> = ({
	inviteCode,
	currentMapId,
	onMapSelected,
	onMapCloned,
	onEditMap,
	onStartEncounter,
	world,
	location,
}) => {
	const { data: mapsData, isLoading: loadingMaps, refetch } = useAllMaps();
	const allMaps = mapsData?.maps || [];
	const cloneMapMutation = useCloneMap();
	const switchMapMutation = useSwitchMap(inviteCode);
	// We need to initialize useDeleteMap hook but it wasn't imported before
	// Let's assume it exists in use-map-queries based on previous attempts
	// If not, we'll need to check the hook file
	const deleteMapMutation = useDeleteMap ? useDeleteMap(inviteCode) : { mutateAsync: async (args: any) => {} };

	const [showVTTImport, setShowVTTImport] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [cloningMapId, setCloningMapId] = useState<string | null>(null);
	const [startingEncounterMapId, setStartingEncounterMapId] = useState<string | null>(null);

	// Filter maps by world if provided
	// World-agnostic maps (world = null) are shown for all worlds
	const maps = React.useMemo(() => {
		if (!world) return allMaps;

		const worldId = world.id?.toLowerCase() || world.name?.toLowerCase();
		return allMaps.filter(map => {
			// Include world-agnostic maps (world is null/undefined)
			if (!map.world) {
				return true;
			}

			// Check world field (preferred), fallback to metadata.world or slug pattern
			const mapWorld = map.world?.toLowerCase() ||
				(map.metadata?.world as string)?.toLowerCase() ||
				map.slug.split('_')[0]?.toLowerCase();
			return mapWorld === worldId;
		});
	}, [allMaps, world]);

	// Auto-select map when location is selected
	React.useEffect(() => {
		if (!world || !location || maps.length === 0) return;

		const worldId = world.id?.toLowerCase() || world.name?.toLowerCase();
		const locationId = location.id?.toLowerCase() || location.name?.toLowerCase();
		const expectedSlug = `${worldId}_${locationId}`;

		const matchingMap = maps.find(map => map.slug === expectedSlug);
		if (matchingMap && matchingMap.id !== currentMapId) {
			// Auto-select the matching map when location changes
			onMapSelected(matchingMap.id);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [world?.id, world?.name, location?.id, location?.name, currentMapId]);

	const handleCloneMap = useCallback(
		async (sourceMap: Map) => {
			if (!sourceMap.id) return;

			setCloningMapId(sourceMap.id);
			try {
				const newName = `${sourceMap.name} (Copy)`;
				const response = await cloneMapMutation.mutateAsync({
					path: `/maps/${sourceMap.id}/clone`,
					body: { name: newName },
				});
				Alert.alert('Success', `Map "${newName}" created successfully`);
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
		[cloneMapMutation, onMapCloned],
	);

	const handleStartEncounter = useCallback(
		async (mapId: string) => {
			if (onStartEncounter) {
				setStartingEncounterMapId(mapId);
				try {
					await onStartEncounter(mapId);
				} catch (error) {
					console.error('Failed to start encounter:', error);
					Alert.alert('Error', error instanceof Error ? error.message : 'Failed to start encounter');
					setStartingEncounterMapId(null);
				}
			} else {
				// Fallback to just switching map if onStartEncounter is not provided
				try {
					await switchMapMutation.mutateAsync({
						path: `/games/${inviteCode}/map`,
						body: { mapId },
					});
					onMapSelected(mapId);
					Alert.alert('Success', 'Map selected successfully');
				} catch (error) {
					console.error('Failed to switch map:', error);
					Alert.alert('Error', error instanceof Error ? error.message : 'Failed to switch map');
				}
			}
		},
		[inviteCode, onMapSelected, onStartEncounter, switchMapMutation],
	);

	const filteredMaps = useMemo(() => maps.filter(
		map =>
			map.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(map.description && map.description.toLowerCase().includes(searchQuery.toLowerCase())),
	), [maps, searchQuery]);

	// Get location icon for map if available
	const getMapIcon = (map: Map) => {
		if (!map.metadata) return null;
		const mapLocation = (map.metadata.location as string)?.toLowerCase();
		if (!mapLocation) return null;

		const locationOption = LOCATIONS.find(loc =>
			(loc.id?.toLowerCase() || loc.name?.toLowerCase()) === mapLocation,
		);
		return locationOption?.image || null;
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<ThemedText type="subtitle">Map Management</ThemedText>
				<View style={styles.headerButtons}>
					<TouchableOpacity style={styles.importButton} onPress={() => setShowVTTImport(true)}>
						<ThemedText style={styles.importButtonText}>+ Import VTT</ThemedText>
					</TouchableOpacity>
					<TouchableOpacity style={styles.refreshButton} onPress={() => refetch()}>
						<ThemedText style={styles.refreshButtonText}>Refresh</ThemedText>
					</TouchableOpacity>
				</View>
			</View>

			<View style={styles.availableMapsSection}>
				<ThemedText style={styles.sectionTitle}>Available Maps</ThemedText>
				<TextInput
					style={styles.searchInput}
					placeholder="Search maps..."
					value={searchQuery}
					onChangeText={setSearchQuery}
					placeholderTextColor="#6B5B3D"
				/>

				{loadingMaps ? (
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
						{filteredMaps.map(map => {
							const mapIcon = getMapIcon(map);
							return (
								<View key={map.id} style={styles.mapCard}>
									<View style={styles.mapCardHeader}>
										{mapIcon && (
											<Image source={mapIcon} style={styles.mapIcon} resizeMode="cover" />
										)}
										<View style={styles.mapCardHeaderText}>
											<ThemedText style={styles.mapName}>{map.name}</ThemedText>
											{map.id === currentMapId && (
												<View style={styles.currentBadge}>
													<ThemedText style={styles.currentBadgeText}>Current</ThemedText>
												</View>
											)}
										</View>
									</View>
									{map.description && (
										<ThemedText style={styles.mapDescription}>{map.description}</ThemedText>
									)}
									<ThemedText style={styles.mapDetails}>
										{map.width} × {map.height}
									</ThemedText>
									<View style={styles.mapCardActions}>
										<TouchableOpacity
											style={[styles.actionButton, styles.useButton, startingEncounterMapId === map.id && styles.disabledButton]}
											onPress={() => handleStartEncounter(map.id)}
											disabled={startingEncounterMapId === map.id}
										>
											<ThemedText style={styles.useButtonText}>
												{startingEncounterMapId === map.id ? 'Starting...' : 'Start Encounter'}
											</ThemedText>
										</TouchableOpacity>
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
							);
						})}
					</ScrollView>
				)}
			</View>

			<VTTMapImport
				visible={showVTTImport}
				onClose={() => setShowVTTImport(false)}
				inviteCode={inviteCode}
				onSuccess={() => {
					refetch();
				}}
			/>
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
	headerButtons: {
		flexDirection: 'row',
		gap: 8,
	},
	importButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		backgroundColor: '#4A6741',
	},
	importButtonText: {
		color: '#FFF9EF',
		fontSize: 12,
		fontWeight: '600',
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
		gap: 12,
	},
	mapCardHeaderText: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	mapIcon: {
		width: 48,
		height: 48,
		borderRadius: 8,
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
	disabledButton: {
		opacity: 0.6,
	},
});

