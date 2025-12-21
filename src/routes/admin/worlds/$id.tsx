import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import * as React from 'react';

import ImageChooser from '~/components/image-chooser';
import RouteShell from '~/components/route-shell';
import { currentUserQueryOptions } from '~/utils/auth';
import { deleteWorld, fetchWorld, saveWorld } from '~/utils/worlds';

import type { WorldRow } from '@/shared/workers/db';

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

const AdminWorldDetail: React.FC = () => {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const isNew = id === 'create';
	const userQuery = useSuspenseQuery(currentUserQueryOptions());
	const user = userQuery.data;
	const isAdmin = user?.is_admin === true;

	const worldQuery = useQuery({
		queryKey: ['world', id],
		queryFn: () => fetchWorld({ data: { id } }),
		enabled: isAdmin && !isNew,
	});

	const [slugTouched, setSlugTouched] = React.useState(false);
	const [formData, setFormData] = React.useState<Partial<WorldRow>>({
		name: '',
		slug: '',
		description: '',
		image_url: '',
		is_public: 0,
	});

	React.useEffect(() => {
		if (worldQuery.data) {
			setFormData({
				...worldQuery.data,
				description: worldQuery.data.description ?? '',
				image_url: worldQuery.data.image_url ?? '',
			});
		}
	}, [worldQuery.data]);

	const saveMutation = useMutation({
		mutationFn: async (payload: Partial<WorldRow>) => saveWorld({ data: payload }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ['worlds'] });
			navigate({ to: '/admin/worlds' });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (payload: { id: string }) => deleteWorld({ data: payload }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ['worlds'] });
			navigate({ to: '/admin/worlds' });
		},
	});

	if (!isAdmin) {
		return (
			<RouteShell
				title="World"
				description="World configuration and metadata."
			>
				<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
					Access denied. You must be an admin to manage worlds.
				</div>
			</RouteShell>
		);
	}

	if (!isNew && worldQuery.isLoading) {
		return (
			<RouteShell
				title="World"
				description="World configuration and metadata."
			>
				<div className="text-sm text-slate-600 dark:text-slate-300">
					Loading world…
				</div>
			</RouteShell>
		);
	}

	if (!isNew && worldQuery.data === null) {
		return (
			<RouteShell
				title="World"
				description="World configuration and metadata."
			>
				<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
					World not found.
				</div>
			</RouteShell>
		);
	}

	const handleSave = async () => {
		if (!formData.name?.trim() || !formData.slug?.trim()) {
			return;
		}

		const payload: Partial<WorldRow> = {
			...formData,
			id: isNew ? undefined : id,
			slug: formData.slug?.trim(),
			name: formData.name?.trim(),
			description: formData.description?.trim() ? formData.description.trim() : null,
			image_url: formData.image_url?.trim() ? formData.image_url.trim() : null,
			is_public: formData.is_public ? 1 : 0,
		};

		await saveMutation.mutateAsync(payload);
	};

	const handleDelete = async () => {
		if (isNew) return;
		const confirmed = window.confirm(
			'Delete this world? This action cannot be undone.',
		);
		if (!confirmed) return;
		await deleteMutation.mutateAsync({ id });
	};

	return (
		<RouteShell
			title={isNew ? 'Create World' : 'Edit World'}
			description="World configuration and metadata."
		>
			<div className="space-y-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => navigate({ to: '/admin/worlds' })}
							className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
						>
							Back
						</button>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						{!isNew ? (
							<button
								type="button"
								onClick={handleDelete}
								disabled={deleteMutation.isPending}
								className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-60"
							>
								{deleteMutation.isPending ? 'Deleting…' : 'Delete'}
							</button>
						) : null}

						<button
							type="button"
							onClick={handleSave}
							disabled={saveMutation.isPending || !formData.name?.trim() || !formData.slug?.trim()}
							className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-60"
						>
							{saveMutation.isPending ? 'Saving…' : 'Save'}
						</button>
					</div>
				</div>

				{saveMutation.isError ? (
					<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
						{saveMutation.error instanceof Error
							? saveMutation.error.message
							: 'Failed to save world'}
					</div>
				) : null}

				<div className="grid gap-6 lg:grid-cols-2">
					<div className="space-y-4">
						<label className="block">
							<div className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
								Name <span className="text-red-600">*</span>
							</div>
							<input
								value={formData.name ?? ''}
								onChange={(e) => {
									const nextName = e.target.value;
									setFormData((prev) => ({ ...prev, name: nextName }));
									if (isNew && !slugTouched) {
										setFormData((prev) => ({ ...prev, slug: slugify(nextName) }));
									}
								}}
								className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
								placeholder="e.g. Faerûn"
							/>
						</label>

						<label className="block">
							<div className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
								Slug <span className="text-red-600">*</span>
							</div>
							<input
								value={formData.slug ?? ''}
								onChange={(e) => {
									setSlugTouched(true);
									setFormData((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }));
								}}
								className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
								placeholder="e.g. faerun"
							/>
							<div className="mt-1 text-xs text-slate-500">
								Unique identifier used in URLs.
							</div>
						</label>

						<label className="block">
							<div className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
								Description
							</div>
							<textarea
								value={formData.description ?? ''}
								onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
								rows={6}
								className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
								placeholder="Describe the world…"
							/>
						</label>

						<label className="flex items-center gap-3">
							<input
								type="checkbox"
								checked={formData.is_public === 1}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, is_public: e.target.checked ? 1 : 0 }))
								}
								className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
							/>
							<span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
								Publicly Visible
							</span>
						</label>
					</div>

					<div className="space-y-4">
						<ImageChooser
							value={formData.image_url ?? null}
							onChange={(url) => setFormData((prev) => ({ ...prev, image_url: url }))}
							category="World"
							title="World Cover Image"
							placeholder="No cover image set"
						/>
					</div>
				</div>
			</div>
		</RouteShell>
	);
};

export const Route = createFileRoute('/admin/worlds/$id')({
	component: AdminWorldDetail,
});
