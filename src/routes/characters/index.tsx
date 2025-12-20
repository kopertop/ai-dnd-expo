import { useSuspenseQuery } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';
import { charactersQueryOptions } from '~/utils/characters';

const CharactersIndex: React.FC = () => {
	const charactersQuery = useSuspenseQuery(charactersQueryOptions());
	const characters = charactersQuery.data;

	return (
		<RouteShell
			title="Characters"
			description="Review your roster and jump into creation."
		>
			<div className="flex items-center justify-between gap-4">
				<p className="text-sm text-slate-600 dark:text-slate-300">
					Manage your roster and pick a hero for adventures.
				</p>
				<Link
					to="/new-character"
					className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
				>
					Create Character
				</Link>
			</div>
			<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{characters.length === 0 ? (
					<div className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
						No characters yet. Create your first hero to get started.
					</div>
				) : null}
				{characters.map((character) => (
					<Link
						key={character.id}
						to="/characters/$id"
						params={{ id: character.id }}
						className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm transition hover:border-amber-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/40"
					>
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-900">
								{character.name.slice(0, 1).toUpperCase()}
							</div>
							<div>
								<div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
									{character.name}
								</div>
								<div className="text-xs text-slate-500 dark:text-slate-400">
									{character.race} {character.class}
								</div>
							</div>
						</div>
					</Link>
				))}
			</div>
		</RouteShell>
	);
};

export const Route = createFileRoute('/characters/')({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(charactersQueryOptions());
	},
	component: CharactersIndex,
});
