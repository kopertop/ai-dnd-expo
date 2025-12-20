import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const NewCharacterIndex: React.FC = () => {
	return (
		<RouteShell
			title="New Character"
			description="Start a new character build."
		>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				Character creation flow will be wired into TanStack Start.
			</p>
		</RouteShell>
	);
};

export const Route = createFileRoute('/new-character/')({
	component: NewCharacterIndex,
});
