import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const GameCharacter: React.FC = () => {
	return (
		<RouteShell
			title="Character"
			description="Character sheet and inventory view."
		>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				Character sheet experience will be migrated to TanStack Start.
			</p>
		</RouteShell>
	);
};

export const Route = createFileRoute('/game/(tabs)/character')({
	component: GameCharacter,
});
