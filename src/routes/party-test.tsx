import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const PartyTest: React.FC = () => {
	return (
		<RouteShell
			title="Party Test"
			description="Internal multiplayer testing space."
		>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				Testing tools will be surfaced here.
			</p>
		</RouteShell>
	);
};

export const Route = createFileRoute('/party-test')({
	component: PartyTest,
});
