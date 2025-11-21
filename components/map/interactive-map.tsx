import React, { memo, useMemo, useRef, useState } from 'react';
import { Dimensions, Image, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { MapState, MapToken } from '@/types/multiplayer-map';

const TILE_SIZE = 28;

interface InteractiveMapProps {
        map?: MapState | null;
        isEditable?: boolean;
        onTilePress?: (x: number, y: number) => void;
        onTileDrag?: (x: number, y: number) => void;
        onTileDragEnd?: () => void;
        onTokenPress?: (token: MapToken) => void;
        highlightTokenId?: string;
        reachableTiles?: Array<{ x: number; y: number; cost: number }>;
        pathTiles?: Array<{ x: number; y: number }>;
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
        onTileDrag,
        onTileDragEnd,
        onTokenPress,
        highlightTokenId,
        reachableTiles,
        pathTiles,
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

        const [isDragging, setIsDragging] = useState(false);
        const lastDragKey = useRef<string | null>(null);
        const [containerSize, setContainerSize] = useState<{ width: number; height: number }>(() => ({
                width: Dimensions.get('window').width,
                height: Dimensions.get('window').height / 2,
        }));
        const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
        const panStartRef = useRef({ x: 0, y: 0 });

        const startDrag = (x: number, y: number) => {
                if (!onTileDrag || !isEditable) {
                        return;
                }

                setIsDragging(true);
                const key = `${x}-${y}`;
                lastDragKey.current = key;
                onTileDrag(x, y);
        };

        const continueDrag = (x: number, y: number) => {
                if (!isDragging || !onTileDrag || !isEditable) {
                        return;
                }

                const key = `${x}-${y}`;
                if (lastDragKey.current === key) {
                        return;
                }

                lastDragKey.current = key;
                onTileDrag(x, y);
        };

        const endDrag = () => {
                if (!isDragging) {
                        return;
                }

                setIsDragging(false);
                lastDragKey.current = null;
                onTileDragEnd?.();
        };

        const reachableLookup = useMemo(() => {
                const lookup = new Map<string, number>();
                reachableTiles?.forEach(tile => {
                        lookup.set(`${tile.x}-${tile.y}`, tile.cost);
                });
                return lookup;
        }, [reachableTiles]);

        const pathLookup = useMemo(() => new Set(pathTiles?.map(tile => `${tile.x}-${tile.y}`)), [pathTiles]);

        const renderTokenContent = (token: MapToken) => {
                const icon = token.icon || token.metadata?.icon;
                const isImageIcon = typeof icon === 'string' && (icon.startsWith('http') || icon.startsWith('data:'));

                if (isImageIcon) {
                        return <Image source={{ uri: icon }} style={styles.tokenImage} />;
                }

                if (typeof icon === 'string' && icon.trim().length > 0) {
                        return (
                                <Text style={[styles.tokenLabel, styles.tokenEmoji]} numberOfLines={1}>
                                        {icon.trim()}
                                </Text>
                        );
                }

                return (
                        <Text style={styles.tokenLabel} numberOfLines={1}>
                                {token.label?.slice(0, 2).toUpperCase() || 'T'}
                        </Text>
                );
        };

        const mapWidthPx = (map?.width ?? 0) * TILE_SIZE;
        const mapHeightPx = (map?.height ?? 0) * TILE_SIZE;

        const clampPan = (value: number, viewport: number, content: number) => {
                if (content <= viewport) {
                        return 0;
                }

                const min = viewport - content;
                return Math.min(0, Math.max(min, value));
        };

        const enablePanning = mapWidthPx > containerSize.width || mapHeightPx > containerSize.height;

        const panResponder = useMemo(
                () =>
                        PanResponder.create({
                                onStartShouldSetPanResponder: () => enablePanning && !isEditable,
                                onMoveShouldSetPanResponder: (_, gestureState) =>
                                        enablePanning && !isEditable && (Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6),
                                onPanResponderGrant: () => {
                                        panStartRef.current = panOffset;
                                },
                                onPanResponderMove: (_, gestureState) => {
                                        if (!enablePanning) {
                                                return;
                                        }

                                        setPanOffset({
                                                x: clampPan(panStartRef.current.x + gestureState.dx, containerSize.width, mapWidthPx),
                                                y: clampPan(panStartRef.current.y + gestureState.dy, containerSize.height, mapHeightPx),
                                        });
                                },
                        }),
                [enablePanning, isEditable, containerSize.width, containerSize.height, mapWidthPx, mapHeightPx, panOffset],
        );

        if (!map) {
                return (
                        <View style={styles.emptyState}>
                                <Text style={styles.emptyTitle}>No map selected</Text>
                                <Text style={styles.emptySubtitle}>The DM can configure a map from the host view.</Text>
                        </View>
                );
        }

        return (
                <View
                        style={styles.wrapper}
                        onLayout={event => setContainerSize(event.nativeEvent.layout)}
                        {...(enablePanning ? panResponder.panHandlers : {})}
                >
                        <View style={styles.panSurface}>
                                <View
                                        style={[
                                                styles.gridContainer,
                                                {
                                                        width: map.width * TILE_SIZE,
                                                        height: map.height * TILE_SIZE,
                                                        transform: [
                                                                { translateX: panOffset.x },
                                                                { translateY: panOffset.y },
                                                        ],
                                                },
                                        ]}
                                >
                                        {normalizedTerrain.map((row, y) => (
                                                <View key={`row-${y}`} style={styles.row}>
                                                        {row.map((cell, x) => {
                                                                const key = `${x}-${y}`;
                                                                const canInteract = Boolean(onTilePress);
                                                                const isReachable = reachableLookup.has(key);
                                                                const isPathTile = pathLookup.has(key);

                                                                return (
                                                                        <TouchableOpacity
                                                                                key={`tile-${x}-${y}`}
                                                                                style={[
                                                                                        styles.tile,
                                                                                        {
                                                                                                width: TILE_SIZE,
                                                                                                height: TILE_SIZE,
                                                                                                backgroundColor: terrainColor(
                                                                                                        cell?.terrain,
                                                                                                ),
                                                                                                borderColor: isPathTile
                                                                                                        ? '#FFD447'
                                                                                                        : styles.tile.borderColor,
                                                                                                borderWidth: isPathTile
                                                                                                        ? 2
                                                                                                        : styles.tile.borderWidth,
                                                                                        },
                                                                                ]}
                                                                                activeOpacity={canInteract ? 0.7 : 1}
                                                                                disabled={!canInteract && !isEditable}
                                                                                onPress={() => onTilePress?.(x, y)}
                                                                                onPressIn={() => startDrag(x, y)}
                                                                                onPressOut={endDrag}
                                                                                onMouseEnter={() => continueDrag(x, y)}
                                                                        >
                                                                                {isReachable && (
                                                                                        <View style={styles.rangeBadge}>
                                                                                                <Text style={styles.rangeText}>
                                                                                                        {reachableLookup.get(key)?.toFixed(1)}
                                                                                                </Text>
                                                                                        </View>
                                                                                )}
                                                                        </TouchableOpacity>
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
                                                                {renderTokenContent(token)}
                                                        </TouchableOpacity>
                                                ))}
                                        </View>
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
                width: '100%',
        },
        panSurface: {
                flex: 1,
                width: '100%',
                alignItems: 'center',
                justifyContent: 'center',
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
        rangeBadge: {
                backgroundColor: 'rgba(255, 212, 71, 0.85)',
                paddingHorizontal: 4,
                paddingVertical: 1,
                borderRadius: 4,
                alignSelf: 'flex-end',
                margin: 2,
        },
        rangeText: {
                fontSize: 10,
                fontWeight: '700',
                color: '#1F130A',
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
        tokenEmoji: {
                fontSize: 16,
        },
        tokenImage: {
                width: 20,
                height: 20,
                resizeMode: 'contain',
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
