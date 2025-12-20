import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';

const CharacterDetail: React.FC = () => {
	const { id } = Route.useParams();

	return (
		<RouteShell
			title="Character"
			description="Character detail view"
		>
			<p className="text-sm text-slate-600 dark:text-slate-300">
				Character ID: {id}
			</p>
		</RouteShell>
	);
};

export const Route = createFileRoute('/characters/$id')({
	component: CharacterDetail,
});
