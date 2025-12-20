import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const GameSettings: React.FC = () => {
	return (
		<RouteShell
			title="Settings"
			description="Configure session settings."
		>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				Session settings controls will appear here.
			</p>
		</RouteShell>
	);
};

export const Route = createFileRoute('/game/(tabs)/settings')({
	component: GameSettings,
});
