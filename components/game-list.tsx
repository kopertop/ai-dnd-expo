import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import type { HostedGameSummary, JoinedGameSummary } from '@/types/api/multiplayer-api';

type GameListProps = {
	hostedGames: HostedGameSummary[];
	joinedGames: JoinedGameSummary[];
	isLoading?: boolean;
	currentUserId?: string;
};

type GameItem = (HostedGameSummary | JoinedGameSummary) & {
	isHosted: boolean;
};

const getStatusColor = (status: string) => {
	switch (status) {
		case 'active':
			return '#10B981'; // green
		case 'waiting':
			return '#F59E0B'; // amber
		case 'completed':
			return '#64748B'; // slate
		case 'cancelled':
			return '#EF4444'; // red
		default:
			return '#64748B';
	}
};

const formatDate = (timestamp: number) => {
	const date = new Date(timestamp);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return 'Just now';
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;
	return date.toLocaleDateString();
};

const isGameActive = (game: GameItem) => {
	return game.status === 'active' || game.status === 'waiting';
};

const GameListItem: React.FC<{ game: GameItem; currentUserId?: string }> = ({ game, currentUserId }) => {
	const isActive = isGameActive(game);
	const isHost = game.isHosted && game.hostId === currentUserId;
	const statusColor = getStatusColor(game.status);

	const handlePress = () => {
		if (isHost) {
			if (game.status === 'waiting') {
				router.push(`/host-game/${game.inviteCode}`);
			} else {
				router.replace(`/multiplayer-game?inviteCode=${game.inviteCode}&hostId=${game.hostId}`);
			}
		} else {
			router.push(`/game/${game.inviteCode}`);
		}
	};

	return (
		<TouchableOpacity
			style={[
				styles.gameCard,
				isActive && styles.activeGameCard,
			]}
			onPress={handlePress}
		>
			<View style={styles.gameCardContent}>
				<View style={styles.gameCardHeader}>
					<ThemedText style={styles.gameTitle}>
						{game.quest.title || game.quest.name || 'Untitled Quest'}
					</ThemedText>
					{isActive && <View style={styles.activeIndicator} />}
				</View>
				<View style={styles.gameCardMeta}>
					<View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
						<ThemedText style={[styles.statusText, { color: statusColor }]}>
							{game.status}
						</ThemedText>
					</View>
					<ThemedText style={styles.inviteCode}>{game.inviteCode}</ThemedText>
					{isHost && (
						<ThemedText style={styles.hostLabel}>Host</ThemedText>
					)}
					{'characterName' in game && game.characterName && (
						<ThemedText style={styles.characterName}>
							as {game.characterName}
						</ThemedText>
					)}
				</View>
				<ThemedText style={styles.gameLocation}>
					{game.world} • {game.startingArea}
				</ThemedText>
				<ThemedText style={styles.gameDate}>{formatDate(game.updatedAt)}</ThemedText>
			</View>
		</TouchableOpacity>
	);
};

export const GameList: React.FC<GameListProps> = ({ hostedGames, joinedGames, isLoading, currentUserId }) => {
	const sortedGames = useMemo(() => {
		const allGames: GameItem[] = [
			...hostedGames.map(g => ({ ...g, isHosted: true })),
			...joinedGames.map(g => ({ ...g, isHosted: false })),
		];

		return allGames.sort((a, b) => {
			// Active games first
			const aActive = isGameActive(a);
			const bActive = isGameActive(b);
			if (aActive !== bActive) return aActive ? -1 : 1;
			// Then by updatedAt descending
			return b.updatedAt - a.updatedAt;
		});
	}, [hostedGames, joinedGames]);

	if (isLoading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#8B6914" />
				<ThemedText style={styles.loadingText}>Loading games...</ThemedText>
			</View>
		);
	}

	if (sortedGames.length === 0) {
		return (
			<ThemedView style={styles.emptyContainer}>
				<ThemedText style={styles.emptyText}>No games yet. Create a new game to get started!</ThemedText>
			</ThemedView>
		);
	}

	return (
		<View style={styles.listContainer}>
			{sortedGames.map(game => (
				<GameListItem key={game.id} game={game} currentUserId={currentUserId} />
			))}
		</View>
	);
};

const styles = StyleSheet.create({
	listContainer: {
		gap: 12,
	},
	gameCard: {
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		backgroundColor: 'rgba(255, 255, 255, 0.6)',
		overflow: 'hidden',
	},
	activeGameCard: {
		borderColor: '#F59E0B',
		backgroundColor: 'rgba(245, 158, 11, 0.1)',
	},
	gameCardContent: {
		padding: 16,
	},
	gameCardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	gameTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#3B2F1B',
		flex: 1,
	},
	activeIndicator: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#F59E0B',
		marginLeft: 8,
	},
	gameCardMeta: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		alignItems: 'center',
		gap: 8,
		marginBottom: 8,
	},
	statusBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
	},
	statusText: {
		fontSize: 12,
		fontWeight: '600',
	},
	inviteCode: {
		fontSize: 12,
		fontFamily: 'monospace',
		color: '#6B5B3D',
	},
	hostLabel: {
		fontSize: 12,
		color: '#8B6914',
		fontWeight: '600',
	},
	characterName: {
		fontSize: 12,
		color: '#6B5B3D',
	},
	gameLocation: {
		fontSize: 12,
		color: '#6B5B3D',
		marginBottom: 4,
	},
	gameDate: {
		fontSize: 11,
		color: '#8B6914',
	},
	loadingContainer: {
		padding: 32,
		alignItems: 'center',
		gap: 12,
	},
	loadingText: {
		color: '#6B5B3D',
	},
	emptyContainer: {
		padding: 32,
		alignItems: 'center',
	},
	emptyText: {
		color: '#6B5B3D',
		textAlign: 'center',
	},
});
