import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
        Image,
        LayoutChangeEvent,
        PanResponder,
        StyleSheet,
        Text,
        TouchableOpacity,
        View,
} from 'react-native';

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
        movementRange?: Record<string, number> | null;
        movementPath?: Array<{ x: number; y: number }> | null;
}

const terrainColors: Record<string, string> = {
        water: '#7FD1F7',
        ocean: '#5BB3E1',
        lake: '#7FC8F8',
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

const keyFor = (x: number, y: number) => `${x},${y}`;

const InteractiveMapComponent: React.FC<InteractiveMapProps> = ({
        map,
        isEditable = false,
        onTilePress,
        onTileDrag,
        onTileDragEnd,
        onTokenPress,
        highlightTokenId,
        movementRange,
        movementPath,
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
        const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
        const panStart = useRef({ x: 0, y: 0 });
        const [viewport, setViewport] = useState({ width: 0, height: 0 });
        const panOffsetRef = useRef(panOffset);

        useEffect(() => {
                panOffsetRef.current = panOffset;
        }, [panOffset]);

        const mapPixelWidth = (map?.width ?? 0) * TILE_SIZE;
        const mapPixelHeight = (map?.height ?? 0) * TILE_SIZE;

        const clampOffset = useCallback(
                (next: { x: number; y: number }) => {
                        if (!map) return next;

                        const minX = Math.min(0, viewport.width - mapPixelWidth);
                        const minY = Math.min(0, viewport.height - mapPixelHeight);

                        return {
                                x: Math.max(minX, Math.min(0, next.x)),
                                y: Math.max(minY, Math.min(0, next.y)),
                        };
                },
                [map, mapPixelHeight, mapPixelWidth, viewport.height, viewport.width],
        );

        useEffect(() => {
                setPanOffset(current => clampOffset(current));
        }, [clampOffset]);

        const handleLayout = useCallback((event: LayoutChangeEvent) => {
                const { width, height } = event.nativeEvent.layout;
                setViewport({ width, height });
        }, []);

        const panResponder = useMemo(
                () =>
                        PanResponder.create({
                                onMoveShouldSetPanResponder: (_, gesture) =>
                                        Math.abs(gesture.dx) + Math.abs(gesture.dy) > 8 && !isDragging,
                                onPanResponderGrant: () => {
                                        panStart.current = panOffsetRef.current;
                                },
                                onPanResponderMove: (_, gesture) => {
                                        setPanOffset(
                                                clampOffset({
                                                        x: panStart.current.x + gesture.dx,
                                                        y: panStart.current.y + gesture.dy,
                                                }),
                                        );
                                },
                                onPanResponderRelease: () => {
                                        panStart.current = panOffsetRef.current;
                                },
                                onPanResponderTerminate: () => {
                                        panStart.current = panOffsetRef.current;
                                },
                        }),
                [clampOffset, isDragging],
        );

        const movementPathKeys = useMemo(() => {
                if (!movementPath?.length) return new Set<string>();
                return new Set(movementPath.map(cell => keyFor(cell.x, cell.y)));
        }, [movementPath]);

        const startDrag = (x: number, y: number) => {
                if (!onTileDrag) {
                        return;
                }

                setIsDragging(true);
                const key = `${x}-${y}`;
                lastDragKey.current = key;
                onTileDrag(x, y);
        };

        const continueDrag = (x: number, y: number) => {
                if (!isDragging || !onTileDrag) {
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

        if (!map) {
                return (
                        <View style={styles.emptyState}>
                                <Text style={styles.emptyTitle}>No map selected</Text>
                                <Text style={styles.emptySubtitle}>The DM can configure a map from the host view.</Text>
                        </View>
                );
        }

        return (
                <View style={styles.wrapper} onLayout={handleLayout}>
                        <View style={styles.viewport} {...panResponder.panHandlers}>
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
                                                                const tileKey = keyFor(x, y);
                                                                const canEdit = isEditable && Boolean(onTilePress);
                                                                const movementCost = movementRange?.[tileKey];
                                                                const inMovementRange = typeof movementCost !== 'undefined';
                                                                const inPath = movementPathKeys.has(tileKey);
                                                                const baseTerrain = cell?.terrain?.toLowerCase?.();
                                                                const isBlockedTerrain =
                                                                        baseTerrain === 'water' ||
                                                                        baseTerrain === 'mountain' ||
                                                                        baseTerrain === 'cliff' ||
                                                                        baseTerrain === 'impassable' ||
                                                                        baseTerrain === 'impassible';

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
                                                                                        inPath && styles.pathHighlight,
                                                                                        inMovementRange && styles.movementHighlight,
                                                                                        isBlockedTerrain && styles.blockedTile,
                                                                                ]}
                                                                                activeOpacity={canEdit || onTilePress ? 0.7 : 1}
                                                                                disabled={!onTilePress && !isEditable}
                                                                                onPress={() => onTilePress?.(x, y)}
                                                                                onPressIn={() => isEditable && startDrag(x, y)}
                                                                                onPressOut={endDrag}
                                                                                onMouseEnter={() => continueDrag(x, y)}
                                                                        >
                                                                                {inMovementRange && (
                                                                                        <View style={styles.movementBadge}>
                                                                                                {typeof movementCost === 'number' && Number.isFinite(movementCost) && (
                                                                                                        <Text style={styles.movementText} numberOfLines={1}>
                                                                                                                {movementCost.toFixed(1)}
                                                                                                        </Text>
                                                                                                )}
                                                                                        </View>
                                                                                )}
                                                                                {inPath && <View style={styles.pathDot} />}
                                                                                {isBlockedTerrain && <Text style={styles.blockedText}>×</Text>}
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
        viewport: {
                width: '100%',
                overflow: 'hidden',
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
                alignItems: 'center',
                justifyContent: 'center',
        },
        blockedTile: {
                opacity: 0.85,
        },
        blockedText: {
                color: '#2F1B10',
                fontWeight: 'bold',
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
        movementHighlight: {
                borderColor: '#4B9CDB',
                borderWidth: 1,
        },
        movementBadge: {
                position: 'absolute',
                bottom: 1,
                right: 1,
                backgroundColor: 'rgba(75, 156, 219, 0.85)',
                paddingHorizontal: 2,
                paddingVertical: 1,
                borderRadius: 2,
        },
        movementText: {
                fontSize: 8,
                color: '#0F1C2E',
                fontWeight: '600',
        },
        pathHighlight: {
                borderColor: '#FFD447',
                borderWidth: 2,
        },
        pathDot: {
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: '#FFD447',
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
