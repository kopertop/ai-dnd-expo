import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const HostGameMap: React.FC = () => {
	const params = Route.useParams();
	const { id } = params;
	const mapId = params['map-id'];

	return (
		<RouteShell
			title="Host Game Map"
			description="Map configuration for the selected session."
		>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				Session: {id} | Map: {mapId}
			</p>
		</RouteShell>
	);
};

export const Route = createFileRoute('/host-game/$id/$map-id')({
	component: HostGameMap,
});
