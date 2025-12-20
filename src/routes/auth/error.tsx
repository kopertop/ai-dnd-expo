import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const AuthError: React.FC = () => {
	const errorMessage =
		typeof window !== 'undefined'
			? new URLSearchParams(window.location.search).get('error')
			: null;

	return (
		<RouteShell
			title="Sign-in error"
			description="There was a problem completing authentication."
		>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				{errorMessage || 'Please try signing in again.'}
			</p>
		</RouteShell>
	);
};

export const Route = createFileRoute('/auth/error')({
	component: AuthError,
});
