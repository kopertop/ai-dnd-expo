import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const GameInvite: React.FC = () => {
	const params = Route.useParams();
	const inviteCode = params['invite-code'];

	return (
		<RouteShell
			title="Join Game"
			description="Invite code entrypoint for multiplayer games."
		>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				Invite code: {inviteCode}
			</p>
		</RouteShell>
	);
};

export const Route = createFileRoute('/game/$invite-code')({
	component: GameInvite,
});
