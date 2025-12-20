import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const AdminWorldsIndex: React.FC = () => {
	return (
		<RouteShell
			title="Worlds"
			description="Create and manage game worlds."
		>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				World management UI will be wired up here.
			</p>
		</RouteShell>
	);
};

export const Route = createFileRoute('/admin/worlds/')({
	component: AdminWorldsIndex,
});
