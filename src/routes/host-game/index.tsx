import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const HostGameIndex: React.FC = () => {
	return (
		<RouteShell
			title="Host Game"
			description="Create or resume a hosted multiplayer session."
		>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				Hosting tools will be migrated from the Expo flow.
			</p>
		</RouteShell>
	);
};

export const Route = createFileRoute('/host-game/')({
	component: HostGameIndex,
});
