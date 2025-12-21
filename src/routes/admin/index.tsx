import { Link, createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const AdminIndex: React.FC = () => {
	return (
		<RouteShell
			title="Admin"
			description="Manage worlds, maps, and assets."
		>
			<div className="flex flex-wrap gap-3">
				<Link
					to="/admin/sql"
					className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100"
				>
					SQL
				</Link>
				<Link
					to="/admin/worlds"
					className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100"
				>
					Worlds
				</Link>
				<Link
					to="/admin/maps"
					className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100"
				>
					Maps
				</Link>
				<Link
					to="/admin/images"
					className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100"
				>
					Images
				</Link>
			</div>
		</RouteShell>
	);
};

export const Route = createFileRoute('/admin/')({
	component: AdminIndex,
});
