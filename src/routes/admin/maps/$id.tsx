import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const AdminMapDetail: React.FC = () => {
	const { id } = Route.useParams();

	return (
		<RouteShell
			title="Map Detail"
			description="Edit map settings and assets."
		>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				Map ID: {id}
			</p>
		</RouteShell>
	);
};

export const Route = createFileRoute('/admin/maps/$id')({
	component: AdminMapDetail,
});
