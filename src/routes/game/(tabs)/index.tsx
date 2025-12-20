import { Link, createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const GameIndex: React.FC = () => {
	return (
		<RouteShell
			title="Game Session"
			description="Jump into the active session view."
		>
			<div className="flex flex-wrap gap-3">
				<Link
					to="/game/map"
					className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
				>
					Map
				</Link>
				<Link
					to="/game/character"
					className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100"
				>
					Character
				</Link>
				<Link
					to="/game/settings"
					className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100"
				>
					Settings
				</Link>
			</div>
		</RouteShell>
	);
};

export const Route = createFileRoute('/game/(tabs)/')({
	component: GameIndex,
});
