import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const GameModel: React.FC = () => {
	return (
		<RouteShell
			title="AI Model"
			description="Inspect and test the D&D model behavior."
		>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				Model testing tools will move here.
			</p>
		</RouteShell>
	);
};

export const Route = createFileRoute('/game/(tabs)/dnd-model')({
	component: GameModel,
});
