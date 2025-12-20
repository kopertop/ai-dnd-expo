import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';
import { charactersQueryOptions } from '~/utils/characters';

const CharacterDetail: React.FC = () => {
	const { id } = Route.useParams();
	const charactersQuery = useSuspenseQuery(charactersQueryOptions());
	const character = charactersQuery.data.find((item) => item.id === id);

	if (!character) {
		return (
			<RouteShell
				title="Character"
				description="Character detail view"
			>
				<p className="text-sm text-slate-600 dark:text-slate-300">
					Character not found.
				</p>
			</RouteShell>
		);
	}

	return (
		<RouteShell
			title={character.name}
			description={`${character.race} ${character.class}`}
		>
			<div className="grid gap-4 md:grid-cols-2">
				<div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
					<div><span className="font-semibold text-slate-700">Trait:</span> {character.trait || 'None'}</div>
					<div><span className="font-semibold text-slate-700">Level:</span> {character.level}</div>
					<div><span className="font-semibold text-slate-700">Health:</span> {character.health}/{character.maxHealth}</div>
					<div><span className="font-semibold text-slate-700">Action Points:</span> {character.actionPoints}/{character.maxActionPoints}</div>
				</div>
				<div className="rounded-md border border-slate-200 bg-white/80 p-3 text-xs text-slate-500">
					<div className="font-semibold text-slate-600">Background</div>
					<p className="mt-1">{character.description || 'No background provided.'}</p>
				</div>
			</div>
		</RouteShell>
	);
};

export const Route = createFileRoute('/characters/$id')({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(charactersQueryOptions());
	},
	component: CharacterDetail,
});
