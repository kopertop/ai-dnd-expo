import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useRouteContext } from '@tanstack/react-router';
import * as React from 'react';

import { deleteGame } from '~/utils/games';

import type { HostedGameSummary, JoinedGameSummary } from '~/types/api/multiplayer-api';

type GameListProps = {
	hostedGames: HostedGameSummary[];
	joinedGames: JoinedGameSummary[];
	isLoading?: boolean;
};

type GameItem = (HostedGameSummary | JoinedGameSummary) & {
	isHosted: boolean;
};

const getStatusBadgeClass = (status: string) => {
	switch (status) {
		case 'active':
			return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
		case 'waiting':
			return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
		case 'completed':
			return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
		case 'cancelled':
			return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
		default:
			return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
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

const GameListItem: React.FC<{ game: GameItem; currentUserId?: string; currentUserIsAdmin?: boolean }> = ({ game, currentUserId, currentUserIsAdmin }) => {
	const queryClient = useQueryClient();
	const isActive = isGameActive(game);
	const isHost = game.isHosted && game.hostId === currentUserId;
	const canDelete = isHost || currentUserIsAdmin;
	const gameUrl = isHost
		? game.status === 'waiting'
			? `/host-game/${game.inviteCode}`
			: `/multiplayer-game?inviteCode=${game.inviteCode}&hostId=${game.hostId}`
		: `/game/${game.inviteCode}`;

	const deleteGameMutation = useMutation({
		mutationFn: deleteGame,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['games', 'me'] });
		},
		onError: (error) => {
			alert(error instanceof Error ? error.message : 'Failed to delete game');
		},
	});

	const handleDelete = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (!confirm('Are you sure you want to delete this game? This action cannot be undone.')) {
			return;
		}
		deleteGameMutation.mutate({ data: { inviteCode: game.inviteCode } });
	};

	return (
		<div
			className={`block rounded-lg border p-4 transition hover:shadow-md ${
				isActive
					? 'border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-900/20'
					: 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50'
			}`}
		>
			<div className="flex items-start justify-between gap-4">
				<Link
					to={gameUrl}
					className="flex-1 min-w-0"
				>
					<div className="flex items-center gap-2 mb-2">
						<h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
							{game.quest.title || game.quest.name || 'Untitled Quest'}
						</h3>
						{isActive && (
							<span className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
						)}
					</div>
					<div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
						<span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeClass(game.status)}`}>
							{game.status}
						</span>
						<span className="font-mono text-xs">{game.inviteCode}</span>
						{isHost && <span className="text-amber-700 dark:text-amber-400">Host</span>}
						{'characterName' in game && game.characterName && (
							<span className="text-slate-500 dark:text-slate-400">
								as {game.characterName}
							</span>
						)}
					</div>
					<div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
						{game.world} • {game.startingArea}
						{isActive && isHost && (
							<span className="ml-2 text-amber-600 dark:text-amber-400">
								• Click to see players
							</span>
						)}
					</div>
				</Link>
				<div className="flex flex-col items-end gap-2 flex-shrink-0">
					<div className="text-xs text-slate-500 dark:text-slate-400">
						{formatDate(game.updatedAt)}
					</div>
					{canDelete && (
						<button
							type="button"
							onClick={handleDelete}
							disabled={deleteGameMutation.isPending}
							className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
							title="Delete game"
						>
							{deleteGameMutation.isPending ? 'Deleting...' : 'Delete'}
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

export const GameList: React.FC<GameListProps> = ({ hostedGames, joinedGames, isLoading }) => {
	const { user } = useRouteContext({ from: '__root__' });
	const currentUserId = user?.id;
	const currentUserIsAdmin = user?.is_admin ?? false;

	const sortedGames = React.useMemo(() => {
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
			<div className="space-y-3">
				<div className="h-20 rounded-lg border border-slate-200 bg-slate-50 animate-pulse dark:border-slate-700 dark:bg-slate-800/50" />
				<div className="h-20 rounded-lg border border-slate-200 bg-slate-50 animate-pulse dark:border-slate-700 dark:bg-slate-800/50" />
			</div>
		);
	}

	if (sortedGames.length === 0) {
		return (
			<div className="text-center py-8 text-slate-500 dark:text-slate-400">
				<p>No games yet. Create a new game to get started!</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{sortedGames.map(game => (
				<GameListItem
					key={game.id}
					game={game}
					currentUserId={currentUserId}
					currentUserIsAdmin={currentUserIsAdmin}
				/>
			))}
		</div>
	);
};
