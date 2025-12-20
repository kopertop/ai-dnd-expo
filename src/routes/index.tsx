import { Link, createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const Home: React.FC = () => {
	return (
		<RouteShell
			title="AI D&D Platform"
			description="Host adventures, manage characters, and jump into a session."
		>
			<div className="flex flex-wrap gap-3">
				<Link
					to="/host-game"
					className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-500"
				>
					Host Game
				</Link>
				<Link
					to="/join-game"
					className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
				>
					Join Game
				</Link>
				<Link
					to="/characters"
					className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100"
				>
					Characters
				</Link>
			</div>
		</RouteShell>
	);
};

export const Route = createFileRoute('/')({
	component: Home,
});
