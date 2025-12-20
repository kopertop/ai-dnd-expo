import { Link, createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const CharactersIndex: React.FC = () => {
	return (
		<RouteShell
			title="Characters"
			description="Review your roster and jump into creation."
		>
			<div className="flex flex-wrap gap-3">
				<Link
					to="/new-character"
					className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
				>
					Create Character
				</Link>
			</div>
		</RouteShell>
	);
};

export const Route = createFileRoute('/characters/')({
	component: CharactersIndex,
});
