import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import * as React from 'react';

import { InviteCodeInput } from '~/components/invite-code-input';
import RouteShell from '~/components/route-shell';

const JoinGame: React.FC = () => {
	const navigate = useNavigate();
	const search = useSearch({ from: '/join-game' });
	const [loading, setLoading] = React.useState(false);

	// Handle URL parameter for direct links
	React.useEffect(() => {
		if (search.code && typeof search.code === 'string') {
			const normalizedCode = search.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
			if (normalizedCode.length === 6) {
				navigate({ to: `/game/$invite-code`, params: { 'invite-code': normalizedCode } });
			}
		}
	}, [search.code, navigate]);

	const handleInviteCodeSubmit = async (code: string) => {
		setLoading(true);
		try {
			// Navigate to game route with invite code
			await navigate({ to: '/game/$invite-code', params: { 'invite-code': code } });
		} finally {
			setLoading(false);
		}
	};

	return (
		<RouteShell
			title="Join Game"
			description="Enter an invite code to join a session."
		>
			<div className="flex items-center justify-center min-h-[400px]">
				<InviteCodeInput onSubmit={handleInviteCodeSubmit} loading={loading} />
			</div>
		</RouteShell>
	);
};

export const Route = createFileRoute('/join-game')({
	component: JoinGame,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			code: (search.code as string) || undefined,
		};
	},
});
