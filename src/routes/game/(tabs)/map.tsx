import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const GameMap: React.FC = () => {
	return (
		<RouteShell
			title="Map"
			description="Explore the active encounter map."
		>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				Map rendering and token controls will be wired up here.
			</p>
		</RouteShell>
	);
};

export const Route = createFileRoute('/game/(tabs)/map')({
	component: GameMap,
});
