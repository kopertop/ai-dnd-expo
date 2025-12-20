import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const JoinGame: React.FC = () => {
	return (
		<RouteShell
			title="Join Game"
			description="Enter an invite code to join a session."
		>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				Invite code entry and validation will live here.
			</p>
		</RouteShell>
	);
};

export const Route = createFileRoute('/join-game')({
	component: JoinGame,
});
