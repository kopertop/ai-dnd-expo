import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const NewGame: React.FC = () => {
	return (
		<RouteShell
			title="New Game"
			description="Configure a new single-player adventure."
		>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				New game setup will be migrated from Expo.
			</p>
		</RouteShell>
	);
};

export const Route = createFileRoute('/new-game')({
	component: NewGame,
});
