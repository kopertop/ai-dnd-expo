import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const AdminWorldDetail: React.FC = () => {
	const { id } = Route.useParams();

	return (
		<RouteShell
			title="World Detail"
			description="World configuration and metadata."
		>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				World ID: {id}
			</p>
		</RouteShell>
	);
};

export const Route = createFileRoute('/admin/worlds/$id')({
	component: AdminWorldDetail,
});
