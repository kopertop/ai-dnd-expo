import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const AdminImages: React.FC = () => {
	return (
		<RouteShell
			title="Admin Images"
			description="Upload and curate image assets."
		>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				Image upload tooling will be migrated here.
			</p>
		</RouteShell>
	);
};

export const Route = createFileRoute('/admin/images')({
	component: AdminImages,
});
