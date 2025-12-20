import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const MultiplayerGame: React.FC = () => {
	return (
		<RouteShell
			title="Multiplayer Game"
			description="Live multiplayer session view."
		>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				Realtime session view will be wired up here.
			</p>
		</RouteShell>
	);
};

export const Route = createFileRoute('/multiplayer-game')({
	component: MultiplayerGame,
});
