import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';
import { currentUserQueryOptions } from '~/utils/auth';
import { uploadImage } from '~/utils/images';
import { saveMap } from '~/utils/maps';
import { worldsQueryOptions } from '~/utils/worlds';

import type { UploadedImageCategory } from '@/shared/workers/db';

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

const AdminMapCreate: React.FC = () => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const userQuery = useSuspenseQuery(currentUserQueryOptions());
	const user = userQuery.data;
	const isAdmin = user?.is_admin === true;

	const worldsQuery = useQuery({
		...worldsQueryOptions(),
		enabled: isAdmin,
	});
	const worlds = worldsQuery.data ?? [];

	const [slugTouched, setSlugTouched] = React.useState(false);
	const [formData, setFormData] = React.useState({
		name: '',
		slug: '',
		description: '',
		world_id: '',
		background_image_url: '',
		grid_size: 100,
		grid_columns: 40,
		grid_rows: 30,
		default_terrain_type: 'stone',
	});

	React.useEffect(() => {
		if (!formData.world_id && worlds.length > 0) {
			setFormData((prev) => ({ ...prev, world_id: worlds[0].id }));
		}
	}, [formData.world_id, worlds]);

	const uploadMutation = useMutation({
		mutationFn: async (payload: { file: File; title?: string; category: UploadedImageCategory }) =>
			uploadImage({
				data: {
					file: payload.file,
					title: payload.title,
					image_type: 'both',
					category: payload.category,
				},
			}),
		onSuccess: (image) => {
			setFormData((prev) => ({ ...prev, background_image_url: image.public_url }));
		},
	});

	const createMutation = useMutation({
		mutationFn: async () =>
			saveMap({
				data: {
					name: formData.name.trim(),
					slug: formData.slug.trim(),
					description: formData.description.trim() ? formData.description.trim() : null,
					world_id: formData.world_id || null,
					background_image_url: formData.background_image_url || null,
					grid_size: formData.grid_size,
					grid_columns: formData.grid_columns,
					grid_offset_x: 0,
					grid_offset_y: 0,
					width: formData.grid_columns,
					height: formData.grid_rows,
					default_terrain: { type: formData.default_terrain_type },
					fog_of_war: [],
					terrain_layers: [],
					metadata: {},
					is_generated: 0,
				},
			}),
		onSuccess: async (result) => {
			await queryClient.invalidateQueries({ queryKey: ['maps'] });
			navigate({ to: '/admin/maps/$id', params: { id: result.id } });
		},
	});

	if (!isAdmin) {
		return (
			<RouteShell
				title="Create Map"
				description="Build a new map for a world."
			>
				<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
					Access denied. You must be an admin to create maps.
				</div>
			</RouteShell>
		);
	}

	return (
		<RouteShell
			title="Create Map"
			description="Build a new map for a world."
		>
			<div className="space-y-6">
				<div className="flex items-center justify-between gap-3">
					<button
						type="button"
						onClick={() => navigate({ to: '/admin/maps' })}
						className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
					>
						Back
					</button>

					<button
						type="button"
						disabled={createMutation.isPending || !formData.name.trim() || !formData.slug.trim()}
						onClick={() => createMutation.mutate()}
						className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-60"
					>
						{createMutation.isPending ? 'Creating…' : 'Create Map'}
					</button>
				</div>

				{createMutation.isError ? (
					<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
						{createMutation.error instanceof Error
							? createMutation.error.message
							: 'Failed to create map'}
					</div>
				) : null}

				<div className="grid gap-6 lg:grid-cols-2">
					<div className="space-y-4">
						<label className="block">
							<div className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
								Name <span className="text-red-600">*</span>
							</div>
							<input
								value={formData.name}
								onChange={(e) => {
									const nextName = e.target.value;
									setFormData((prev) => ({ ...prev, name: nextName }));
									if (!slugTouched) {
										setFormData((prev) => ({ ...prev, slug: slugify(nextName) }));
									}
								}}
								className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
								placeholder="e.g. Goblin Caves"
							/>
						</label>

						<label className="block">
							<div className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
								Slug <span className="text-red-600">*</span>
							</div>
							<input
								value={formData.slug}
								onChange={(e) => {
									setSlugTouched(true);
									setFormData((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }));
								}}
								className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
								placeholder="e.g. goblin-caves"
							/>
						</label>

						<label className="block">
							<div className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
								Description
							</div>
							<textarea
								value={formData.description}
								onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
								rows={4}
								className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
							/>
						</label>

						<label className="block">
							<div className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
								World
							</div>
							<select
								value={formData.world_id}
								onChange={(e) => setFormData((prev) => ({ ...prev, world_id: e.target.value }))}
								className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
							>
								{worlds.length === 0 ? (
									<option value="">No worlds available</option>
								) : (
									worlds.map((w) => (
										<option key={w.id} value={w.id}>
											{w.name}
										</option>
									))
								)}
							</select>
						</label>
					</div>

					<div className="space-y-4">
						<div className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
							<div className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
								Background Image
							</div>

							{formData.background_image_url ? (
								<img
									src={formData.background_image_url}
									alt="Map background"
									className="mb-3 h-48 w-full rounded-md border border-slate-200 object-contain dark:border-slate-700"
								/>
							) : (
								<div className="mb-3 flex h-48 items-center justify-center rounded-md border border-dashed border-slate-200 bg-white text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-500">
									No background image set.
								</div>
							)}

							<label className="block">
								<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
									Image URL
								</div>
								<input
									value={formData.background_image_url}
									onChange={(e) => setFormData((prev) => ({ ...prev, background_image_url: e.target.value }))}
									className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
									placeholder="https://…"
								/>
							</label>

							<label className="mt-3 block">
								<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
									Upload Image
								</div>
								<input
									type="file"
									accept="image/*"
									disabled={uploadMutation.isPending}
									onChange={async (e) => {
										const file = e.target.files?.[0];
										if (!file) return;
										await uploadMutation.mutateAsync({
											file,
											title: formData.name.trim() || undefined,
											category: 'Map',
										});
										e.target.value = '';
									}}
									className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
								/>
							</label>

							{uploadMutation.isError ? (
								<div className="mt-2 text-sm text-red-600">
									{uploadMutation.error instanceof Error
										? uploadMutation.error.message
										: 'Failed to upload image'}
								</div>
							) : null}
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							<label className="block">
								<div className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
									Grid Size (px)
								</div>
								<input
									type="number"
									value={formData.grid_size}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, grid_size: parseInt(e.target.value, 10) || 100 }))
									}
									className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
								/>
							</label>

							<label className="block">
								<div className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
									Default Terrain
								</div>
								<select
									value={formData.default_terrain_type}
									onChange={(e) => setFormData((prev) => ({ ...prev, default_terrain_type: e.target.value }))}
									className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
								>
									<option value="stone">Stone</option>
									<option value="grass">Grass</option>
									<option value="water">Water</option>
									<option value="dirt">Dirt</option>
									<option value="sand">Sand</option>
								</select>
							</label>

							<label className="block">
								<div className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
									Grid Columns
								</div>
								<input
									type="number"
									value={formData.grid_columns}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, grid_columns: parseInt(e.target.value, 10) || 40 }))
									}
									className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
								/>
							</label>

							<label className="block">
								<div className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
									Grid Rows
								</div>
								<input
									type="number"
									value={formData.grid_rows}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, grid_rows: parseInt(e.target.value, 10) || 30 }))
									}
									className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
								/>
							</label>
						</div>
					</div>
				</div>
			</div>
		</RouteShell>
	);
};

export const Route = createFileRoute('/admin/maps/create')({
	component: AdminMapCreate,
});
