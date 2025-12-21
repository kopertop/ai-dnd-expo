import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';
import { currentUserQueryOptions } from '~/utils/auth';
import { mapsQueryOptions } from '~/utils/maps';

const AdminMapsIndex: React.FC = () => {
	const userQuery = useSuspenseQuery(currentUserQueryOptions());
	const user = userQuery.data;
	const isAdmin = user?.is_admin === true;

	const mapsQuery = useQuery({
		...mapsQueryOptions(),
		enabled: isAdmin,
	});
	const maps = mapsQuery.data ?? [];

	if (!isAdmin) {
		return (
			<RouteShell
				title="Maps"
				description="Manage maps and encounter layouts."
			>
				<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
					Access denied. You must be an admin to manage maps.
				</div>
			</RouteShell>
		);
	}

	return (
		<RouteShell
			title="Maps"
			description="Manage maps and encounter layouts."
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<Link
					to="/admin/maps/create"
					className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
				>
					Create Map
				</Link>

				{mapsQuery.isFetching ? (
					<div className="text-xs text-slate-500">Loading…</div>
				) : null}
			</div>

			{mapsQuery.isError ? (
				<div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
					{mapsQuery.error instanceof Error
						? mapsQuery.error.message
						: 'Failed to load maps'}
				</div>
			) : (
				<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{maps.length === 0 ? (
						<div className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
							No maps found.
						</div>
					) : null}

					{maps.map((map) => (
						<Link
							key={map.id}
							to="/admin/maps/$id"
							params={{ id: map.id }}
							className="group overflow-hidden rounded-lg border border-slate-200 bg-white/80 shadow-sm transition hover:border-amber-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/40"
						>
							<div className="aspect-video w-full bg-slate-100 dark:bg-slate-800">
								{map.cover_image_url ? (
									<img
										src={map.cover_image_url}
										alt={map.name}
										className="h-full w-full object-cover"
									/>
								) : map.background_image_url ? (
									<img
										src={map.background_image_url}
										alt={map.name}
										className="h-full w-full object-cover opacity-90"
									/>
								) : (
									<div className="flex h-full items-center justify-center text-sm text-slate-400 dark:text-slate-500">
										No image
									</div>
								)}
							</div>

							<div className="space-y-2 p-4">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
											{map.name}
										</div>
										<div className="mt-1 truncate font-mono text-xs text-amber-700 dark:text-amber-300">
											{map.slug}
										</div>
									</div>
									{map.world_id ? (
										<span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
											{map.world_id.replace(/^world_/, '')}
										</span>
									) : null}
								</div>

								{map.description ? (
									<p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
										{map.description}
									</p>
								) : (
									<p className="text-sm text-slate-400 dark:text-slate-500">
										No description.
									</p>
								)}
							</div>
						</Link>
					))}
				</div>
			)}
		</RouteShell>
	);
};

export const Route = createFileRoute('/admin/maps/')({
	component: AdminMapsIndex,
});
