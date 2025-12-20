import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const NewCharacterStep: React.FC = () => {
	const { _splat } = Route.useParams();

	return (
		<RouteShell
			title="New Character"
			description="Continue character creation."
		>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				Selection path: {_splat || 'root'}
			</p>
		</RouteShell>
	);
};

export const Route = createFileRoute('/new-character/$')({
	component: NewCharacterStep,
});
