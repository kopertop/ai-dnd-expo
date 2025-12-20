import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const HostGameDetail: React.FC = () => {
	const { id } = Route.useParams();

	return (
		<RouteShell
			title="Host Game"
			description="Session details for the host."
		>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				Session ID: {id}
			</p>
		</RouteShell>
	);
};

export const Route = createFileRoute('/host-game/$id')({
	component: HostGameDetail,
});
