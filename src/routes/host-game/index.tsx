import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import * as React from 'react';

import { GameList } from '~/components/game-list';
import RouteShell from '~/components/route-shell';
import { myGamesQueryOptions } from '~/utils/games';

const HostGameIndex: React.FC = () => {
	const navigate = useNavigate();
	const gamesQuery = useSuspenseQuery(myGamesQueryOptions());
	const gamesData = gamesQuery.data || { hostedGames: [], joinedGames: [] };
	const hostedGames = gamesData.hostedGames || [];

	const handleStartNewGame = () => {
		navigate({
			to: '/host-game/$id',
			params: { id: 'new' },
			search: {
				step: 'world' as const,
				worldId: undefined,
				campaignId: undefined,
				locationId: undefined,
			},
		});
	};

	return (
		<RouteShell
			title="Host Game"
			description="Create or resume a hosted multiplayer session."
		>
			<div className="space-y-6">
				<div>
					<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
						Your Hosted Games
					</h2>
					{hostedGames.length === 0 ? (
						<div className="rounded-lg border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800">
							<p className="text-slate-600 dark:text-slate-400">
								No hosted games yet. Start a new adventure to generate an invite code.
							</p>
						</div>
					) : (
						<GameList
							hostedGames={hostedGames}
							joinedGames={[]}
							isLoading={gamesQuery.isLoading}
						/>
					)}
				</div>
				<div>
					<button
						type="button"
						onClick={handleStartNewGame}
						className="w-full rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-500"
					>
						Start a New Game
					</button>
				</div>
			</div>
		</RouteShell>
	);
};

export const Route = createFileRoute('/host-game/')({
	component: HostGameIndex,
});
