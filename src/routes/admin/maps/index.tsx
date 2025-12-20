import { Link, createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const AdminMapsIndex: React.FC = () => {
	return (
		<RouteShell
			title="Maps"
			description="Manage maps and encounter layouts."
		>
			<div className="flex flex-wrap gap-3">
				<Link
					to="/admin/maps/create"
					className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
				>
					Create Map
				</Link>
			</div>
		</RouteShell>
	);
};

export const Route = createFileRoute('/admin/maps/')({
	component: AdminMapsIndex,
});
