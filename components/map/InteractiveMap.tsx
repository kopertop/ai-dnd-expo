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

const terrainColor = (terrain?: string) => {
	switch (terrain) {
		case 'water':
			return '#7FD1F7';
		case 'grass':
			return '#7FB77E';
		case 'stone':
			return '#B0A8B9';
		case 'lava':
			return '#F05D23';
		default:
			return '#D9D4C5';
	}
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
						{row.map((cell, x) => (
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
								activeOpacity={isEditable ? 0.7 : 1}
								onPress={() => isEditable && onTilePress?.(x, y)}
							/>
						))}
					</View>
				))}
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
									token.id === highlightTokenId ? '#FFD447' : token.color || '#3B2F1B',
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

