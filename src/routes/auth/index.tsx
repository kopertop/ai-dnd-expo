import { createFileRoute, redirect } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const AuthIndex: React.FC = () => {
	return (
		<RouteShell
			title="Completing sign in"
			description="Redirecting to the login handler."
		>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				If you are not redirected, return to the login page and try again.
			</p>
		</RouteShell>
	);
};

export const Route = createFileRoute('/auth/')({
	beforeLoad: ({ location }) => {
		throw redirect({
			to: '/login',
			search: location.search,
		});
	},
	component: AuthIndex,
});
