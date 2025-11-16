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
                if (!map) return [];
                if (map.terrain && map.terrain.length === map.height) {
                        return map.terrain;
                }
                return Array.from({ length: map?.height ?? 0 }, () =>
                        Array.from({ length: map?.width ?? 0 }, () => ({ terrain: 'stone' })),
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
                        <View style={[styles.gridContainer, { width: map.width * TILE_SIZE, height: map.height * TILE_SIZE }]}>
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
                        {isEditable && (
                                <Text style={styles.hint}>Tap tiles to drop markers or reposition tokens.</Text>
                        )}
                </View>
        );
};

export const InteractiveMap = memo(InteractiveMapComponent);

const styles = StyleSheet.create({
        wrapper: {
                padding: 12,
                borderRadius: 16,
                backgroundColor: '#FBF4E3',
                borderWidth: 1,
                borderColor: '#E2D3B3',
        },
        gridContainer: {
                position: 'relative',
        },
        row: {
                flexDirection: 'row',
        },
        tile: {
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: '#CBB79D',
        },
        token: {
                position: 'absolute',
                borderWidth: 2,
                borderRadius: 6,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#1F1300',
        },
        tokenLabel: {
                color: '#F5E6D3',
                fontWeight: '700',
                fontSize: 12,
        },
        hint: {
                marginTop: 8,
                color: '#6B5B3D',
                fontSize: 12,
                textAlign: 'center',
        },
        emptyState: {
                padding: 24,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#E2D3B3',
                alignItems: 'center',
                backgroundColor: '#FFF9EF',
        },
        emptyTitle: {
                fontWeight: '700',
                color: '#3B2F1B',
                marginBottom: 4,
        },
        emptySubtitle: {
                color: '#6B5B3D',
                textAlign: 'center',
        },
});
