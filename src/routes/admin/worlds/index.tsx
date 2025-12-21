import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';
import { currentUserQueryOptions } from '~/utils/auth';
import { worldsQueryOptions } from '~/utils/worlds';

const AdminWorldsIndex: React.FC = () => {
	const userQuery = useSuspenseQuery(currentUserQueryOptions());
	const user = userQuery.data;
	const isAdmin = user?.is_admin === true;

	const worldsQuery = useQuery({
		...worldsQueryOptions(),
		enabled: isAdmin,
	});
	const worlds = worldsQuery.data ?? [];

	if (!isAdmin) {
		return (
			<RouteShell
				title="Worlds"
				description="Create and manage game worlds."
			>
				<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
					Access denied. You must be an admin to manage worlds.
				</div>
			</RouteShell>
		);
	}

	return (
		<RouteShell
			title="Worlds"
			description="Create and manage game worlds."
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<Link
					to="/admin/worlds/$id"
					params={{ id: 'create' }}
					className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
				>
					Create World
				</Link>

				{worldsQuery.isFetching ? (
					<div className="text-xs text-slate-500">Loading…</div>
				) : null}
			</div>

			{worldsQuery.isError ? (
				<div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
					{worldsQuery.error instanceof Error
						? worldsQuery.error.message
						: 'Failed to load worlds'}
				</div>
			) : (
				<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{worlds.length === 0 ? (
						<div className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
							No worlds found.
						</div>
					) : null}

					{worlds.map((world) => (
						<Link
							key={world.id}
							to="/admin/worlds/$id"
							params={{ id: world.id }}
							className="group rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm transition hover:border-amber-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/40"
						>
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									<div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
										{world.name}
									</div>
									<div className="mt-1 truncate font-mono text-xs text-amber-700 dark:text-amber-300">
										{world.slug}
									</div>
								</div>

								{world.is_public === 1 ? (
									<span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
										Public
									</span>
								) : null}
							</div>

							{world.description ? (
								<p className="mt-3 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">
									{world.description}
								</p>
							) : (
								<p className="mt-3 text-sm text-slate-400 dark:text-slate-500">
									No description.
								</p>
							)}
						</Link>
					))}
				</div>
			)}
		</RouteShell>
	);
};

export const Route = createFileRoute('/admin/worlds/')({
	component: AdminWorldsIndex,
});
