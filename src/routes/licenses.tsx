import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const Licenses: React.FC = () => {
	return (
		<RouteShell
			title="Licenses"
			description="Open source acknowledgements."
		>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				License details will be listed here.
			</p>
		</RouteShell>
	);
};

export const Route = createFileRoute('/licenses')({
	component: Licenses,
});
