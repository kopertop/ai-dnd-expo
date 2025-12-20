import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const Sql: React.FC = () => {
	return (
		<RouteShell
			title="SQL Console"
			description="Internal data inspection tools."
		>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				SQL console tooling will be ported here.
			</p>
		</RouteShell>
	);
};

export const Route = createFileRoute('/sql')({
	component: Sql,
});
