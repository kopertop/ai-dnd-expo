import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const AdminMapCreate: React.FC = () => {
	return (
		<RouteShell
			title="Create Map"
			description="Build a new map for a world."
		>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				Map creation UI will move here.
			</p>
		</RouteShell>
	);
};

export const Route = createFileRoute('/admin/maps/create')({
	component: AdminMapCreate,
});
