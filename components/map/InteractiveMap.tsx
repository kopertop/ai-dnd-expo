import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { MapState, MapToken } from '@/types/multiplayer-map';

const TILE_SIZE = 28;

interface InteractiveMapProps {
	map?: MapState | null;
	isEditable?: boolean;
	onTilePress?: (x: number, y: number) => void;
	onTokenPress?: (token: MapToken) => void;
	highlightTokenId?: string;
}

const terrainColors: Record<string, string> = {
        water: '#7FD1F7',
        grass: '#7FB77E',
        forest: '#2D4A22',
        mountain: '#8B7355',
        impassible: '#4B4844',
        impassable: '#4B4844',
        desert: '#C2B280',
        sand: '#FFD700',
        stone: '#B0A8B9',
        gravel: '#A89F91',
        road: '#C8A97E',
        dirt: '#8B4513',
        mud: '#6E431C',
        snow: '#FFF9F5',
        ice: '#DFF3FF',
        tundra: '#C8D3C0',
        swamp: '#556B2F',
        marsh: '#667E52',
        cobblestone: '#9E8FA4',
        plaza: '#D7C3A3',
        market: '#C6A15E',
        fountain: '#9BD7E8',
        pit: '#2F1B10',
        doorway: '#A58A6B',
        bridge: '#C1B199',
        dock: '#7E5E3B',
        harbor: '#7E5E3B',
        cliff: '#7A654B',
        hill: '#A4A77D',
        beach: '#F4E2B4',
        path: '#BBA37A',
        tree: '#3E6B4B',
        wall: '#4A4A4A',
        pillar: '#B6B6B6',
        ruins: '#7F6A6A',
        rubble: '#7D7063',
        lava: '#F05D23',
};

const terrainColor = (terrain?: string) => {
        const normalizedTerrain = terrain?.trim().toLowerCase();
        return normalizedTerrain ? terrainColors[normalizedTerrain] ?? '#D9D4C5' : '#D9D4C5';
};

const InteractiveMapComponent: React.FC<InteractiveMapProps> = ({
	map,
	isEditable = false,
	onTilePress,
	onTokenPress,
	highlightTokenId,
}) => {
	const normalizedTerrain = useMemo(() => {
		if (!map) {
			return [];
		}

		if (map.terrain && map.terrain.length === map.height) {
			return map.terrain;
		}

		return Array.from({ length: map.height }, () =>
			Array.from({ length: map.width }, () => ({ terrain: map.defaultTerrain ?? 'stone' })),
		);
	}, [map]);

	if (!map) {
		return (
			<View style={styles.emptyState}>
				<Text style={styles.emptyTitle}>No map selected</Text>
				<Text style={styles.emptySubtitle}>The DM can configure a map from the host view.</Text>
			</View>
		);
	}

	return (
		<View style={styles.wrapper}>
			<View
				style={[
					styles.gridContainer,
					{ width: map.width * TILE_SIZE, height: map.height * TILE_SIZE },
				]}
			>
				{normalizedTerrain.map((row, y) => (
                                        <View key={`row-${y}`} style={styles.row}>
                                                {row.map((cell, x) => {
                                                        const canEdit = isEditable && Boolean(onTilePress);

                                                        return (
                                                                <TouchableOpacity
                                                                        key={`tile-${x}-${y}`}
                                                                        style={[
                                                                                styles.tile,
                                                                                {
                                                                                        width: TILE_SIZE,
                                                                                        height: TILE_SIZE,
                                                                                        backgroundColor: terrainColor(cell?.terrain),
                                                                                },
                                                                        ]}
                                                                        activeOpacity={canEdit ? 0.7 : 1}
                                                                        disabled={!canEdit}
                                                                        onPress={() => onTilePress?.(x, y)}
                                                                />
                                                        );
                                                })}
                                        </View>
				))}
				<View
					pointerEvents={isEditable ? 'none' : 'auto'}
					style={[StyleSheet.absoluteFill, styles.tokenLayer]}
				>
					{map.tokens?.map(token => (
						<TouchableOpacity
							key={token.id}
							style={[
								styles.token,
								{
									left: token.x * TILE_SIZE,
									top: token.y * TILE_SIZE,
									width: TILE_SIZE,
									height: TILE_SIZE,
									borderColor:
                                                                                token.id === highlightTokenId
                                                                                	? '#FFD447'
                                                                                	: token.color || '#3B2F1B',
								},
							]}
							onPress={() => onTokenPress?.(token)}
							disabled={!onTokenPress}
						>
							<Text style={styles.tokenLabel} numberOfLines={1}>
								{token.label?.slice(0, 2).toUpperCase() || 'T'}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			</View>
		</View>
	);
};

InteractiveMapComponent.displayName = 'InteractiveMap';

export const InteractiveMap = memo(InteractiveMapComponent);

const styles = StyleSheet.create({
	wrapper: {
		padding: 12,
		alignItems: 'center',
	},
	gridContainer: {
		position: 'relative',
		borderWidth: 1,
		borderColor: '#CAB08A',
		backgroundColor: '#1F130A',
	},
	row: {
		flexDirection: 'row',
	},
	tile: {
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(0, 0, 0, 0.1)',
	},
	tokenLayer: {
		position: 'absolute',
	},
	token: {
		position: 'absolute',
		borderWidth: 2,
		borderRadius: 4,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(255, 255, 255, 0.8)',
	},
	tokenLabel: {
		fontSize: 12,
		fontWeight: 'bold',
		color: '#1F130A',
	},
	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		padding: 24,
		borderRadius: 8,
		backgroundColor: 'rgba(0, 0, 0, 0.05)',
	},
	emptyTitle: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#3B2F1B',
	},
	emptySubtitle: {
		marginTop: 4,
		fontSize: 14,
		color: '#6B5B3D',
		textAlign: 'center',
	},
});

