import { Link, Outlet, createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

const GameTabsLayout: React.FC = () => {
	return (
		<div className="border-b border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/60">
			<nav className="mx-auto flex max-w-5xl gap-4 px-6 py-3 text-sm font-semibold">
				<Link
					to="/game"
					activeProps={{ className: 'text-amber-600' }}
					activeOptions={{ exact: true }}
				>
					Chat
				</Link>
				<Link
					to="/game/character"
					activeProps={{ className: 'text-amber-600' }}
				>
					Character
				</Link>
				<Link
					to="/game/map"
					activeProps={{ className: 'text-amber-600' }}
				>
					Map
				</Link>
				<Link
					to="/game/dnd-model"
					activeProps={{ className: 'text-amber-600' }}
				>
					AI Model
				</Link>
				<Link
					to="/game/settings"
					activeProps={{ className: 'text-amber-600' }}
				>
					Settings
				</Link>
			</nav>
			<Outlet />
		</div>
	);
};

export const Route = createFileRoute('/game/(tabs)')({
	component: GameTabsLayout,
});
