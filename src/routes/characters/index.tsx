import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';
import { currentUserQueryOptions } from '~/utils/auth';
import { allCharactersQueryOptions, charactersQueryOptions, cloneCharacter } from '~/utils/characters';

const CharactersIndex: React.FC = () => {
	const [activeTab, setActiveTab] = React.useState<'my' | 'all'>('my');
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const userQuery = useSuspenseQuery(currentUserQueryOptions());
	const user = userQuery.data;
	const isAdmin = user?.is_admin === true;

	const myCharactersQuery = useSuspenseQuery(charactersQueryOptions());
	const myCharacters = myCharactersQuery.data || [];

	const allCharactersQuery = useQuery(allCharactersQueryOptions());
	const allCharacters = allCharactersQuery.data || [];

	const cloneMutation = useMutation({
		mutationFn: cloneCharacter,
		onSuccess: (clonedCharacter) => {
			queryClient.invalidateQueries({ queryKey: ['characters'] });
			// Navigate to character creation with pre-filled data
			navigate({
				to: '/new-character',
				search: {
					mode: 'character',
					clonedData: JSON.stringify(clonedCharacter),
				},
			});
		},
	});

	const handleClone = async (characterId: string, e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		try {
			await cloneMutation.mutateAsync({ characterId });
		} catch (error) {
			console.error('Failed to clone character:', error);
		}
	};

	const myCharacterIds = new Set(myCharacters.map(c => c.id));
	const otherCharacters = allCharacters.filter(c => !myCharacterIds.has(c.id));
	const characters = activeTab === 'my' ? myCharacters : otherCharacters;

	return (
		<RouteShell
			title="Characters"
			description="Review your roster and jump into creation."
		>
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-2">
					<button
						onClick={() => setActiveTab('my')}
						className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
							activeTab === 'my'
								? 'bg-amber-600 text-white'
								: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
						}`}
					>
						My Characters
					</button>
					<button
						onClick={() => setActiveTab('all')}
						className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
							activeTab === 'all'
								? 'bg-amber-600 text-white'
								: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
						}`}
					>
						Other Characters
					</button>
				</div>
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
				{characters.map((character) => {
					const isOwned = myCharacterIds.has(character.id);
					const showCloneButton = activeTab === 'all' && !isAdmin && !isOwned;

					return (
						<div
							key={character.id}
							className="group relative rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm transition hover:border-amber-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/40"
						>
							<Link
								to="/characters/$id"
								params={{ id: character.id }}
								className="flex items-center gap-3"
							>
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-900">
									{character.icon ? (
										<img
											src={character.icon}
											alt={character.name}
											className="h-full w-full rounded-full object-cover"
										/>
									) : (
										character.name.slice(0, 1).toUpperCase()
									)}
								</div>
								<div className="flex-1">
									<div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
										{character.name}
									</div>
									<div className="text-xs text-slate-500 dark:text-slate-400">
										{character.race} {character.class}
									</div>
									{activeTab === 'all' && (character.owner_email || character.owner_id) && (
										<div className="mt-1 text-xs text-slate-400 dark:text-slate-500">
											Created by {character.owner_email || character.owner_id}
										</div>
									)}
								</div>
							</Link>
							{showCloneButton && (
								<button
									onClick={(e) => handleClone(character.id, e)}
									disabled={cloneMutation.isPending}
									className="absolute right-2 top-2 rounded border border-amber-600 bg-transparent px-2 py-1 text-xs font-semibold text-amber-600 transition hover:bg-amber-50 disabled:opacity-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
								>
									{cloneMutation.isPending ? 'Cloning...' : 'Clone'}
								</button>
							)}
						</div>
					);
				})}
			</div>
		</RouteShell>
	);
};

export const Route = createFileRoute('/characters/')({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(charactersQueryOptions());
		await context.queryClient.ensureQueryData(currentUserQueryOptions());
	},
	component: CharactersIndex,
});
