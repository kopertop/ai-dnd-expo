import { createFileRoute, redirect } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const AuthCallback: React.FC = () => {
	return (
		<RouteShell
			title="Completing sign in"
			description="Redirecting to the login handler."
		>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				If the redirect does not complete, visit the login page directly.
			</p>
		</RouteShell>
	);
};

export const Route = createFileRoute('/auth/callback')({
	beforeLoad: ({ location }) => {
		throw redirect({
			to: '/login',
			search: location.search,
		});
	},
	component: AuthCallback,
});
