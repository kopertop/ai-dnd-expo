import { useSuspenseQuery } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import { GameList } from '~/components/game-list';
import RouteShell from '~/components/route-shell';
import { myGamesQueryOptions } from '~/utils/games';

const Home: React.FC = () => {
	const gamesQuery = useSuspenseQuery(myGamesQueryOptions());
	const gamesData = gamesQuery.data || { hostedGames: [], joinedGames: [] };

	return (
		<RouteShell
			title="Dungeons & Dragons"
			description="Host adventures, manage characters, and jump into a session."
		>
			<div className="space-y-6">
				<div className="flex flex-wrap gap-3">
					<Link
						to="/host-game"
						className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-500"
					>
						New Game
					</Link>
					<Link
						to="/join-game"
						className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
					>
						Join Game
					</Link>
				</div>
				<div>
					<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
						My Games
					</h2>
					<GameList
						hostedGames={gamesData.hostedGames}
						joinedGames={gamesData.joinedGames}
						isLoading={gamesQuery.isLoading}
					/>
				</div>
			</div>
		</RouteShell>
	);
};

export const Route = createFileRoute('/')({
	component: Home,
});
