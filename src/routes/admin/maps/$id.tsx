import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';
import { currentUserQueryOptions } from '~/utils/auth';
import { uploadImage } from '~/utils/images';
import { fetchMap, saveMap } from '~/utils/maps';
import { worldsQueryOptions } from '~/utils/worlds';

import type { UploadedImageCategory } from '@/shared/workers/db';

type ToolId = 'properties' | 'grid' | 'objects' | 'terrain';

type ObjectToken = {
	id?: string;
	label?: string | null;
	image_url?: string | null;
	x: number;
	y: number;
	metadata?: Record<string, unknown> | null;
};

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

const clampInt = (value: number, min: number, max: number) =>
	Math.max(min, Math.min(max, Math.floor(value)));

const buildGridLines = (args: {
	width: number;
	height: number;
	columns: number;
	rows: number;
	offsetX: number;
	offsetY: number;
}) => {
	const { width, height, columns, rows, offsetX, offsetY } = args;
	const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
	if (columns <= 0 || rows <= 0) return lines;

	const cellWidth = width / columns;
	const cellHeight = height / rows;

	for (let x = 0; x <= columns; x++) {
		const xPos = x * cellWidth + offsetX;
		lines.push({ x1: xPos, y1: 0, x2: xPos, y2: height });
	}
	for (let y = 0; y <= rows; y++) {
		const yPos = y * cellHeight + offsetY;
		lines.push({ x1: 0, y1: yPos, x2: width, y2: yPos });
	}
	return lines;
};

const AdminMapDetail: React.FC = () => {
	const { id } = Route.useParams();
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

	const mapQuery = useQuery({
		queryKey: ['map', id],
		queryFn: () => fetchMap({ data: { id } }),
		enabled: isAdmin,
	});

	const [activeTool, setActiveTool] = React.useState<ToolId>('properties');
	const [slugTouched, setSlugTouched] = React.useState(false);
	const [showGrid, setShowGrid] = React.useState(true);
	const [savingError, setSavingError] = React.useState<string | null>(null);

	const [formData, setFormData] = React.useState({
		name: '',
		slug: '',
		description: '',
		world_id: '',
		background_image_url: '',
		cover_image_url: '',
		grid_size: 100,
		grid_offset_x: 0,
		grid_offset_y: 0,
		grid_columns: 40,
		grid_rows: 30,
	});
	const [objects, setObjects] = React.useState<ObjectToken[]>([]);

	const imgRef = React.useRef<HTMLImageElement | null>(null);
	const [canvasSize, setCanvasSize] = React.useState({ width: 0, height: 0 });

	React.useEffect(() => {
		const map = mapQuery.data;
		if (!map) return;

		setFormData((prev) => ({
			...prev,
			name: map.name ?? '',
			slug: map.slug ?? '',
			description: map.description ?? '',
			world_id: map.world_id ?? '',
			background_image_url: map.background_image_url ?? '',
			cover_image_url: map.cover_image_url ?? '',
			grid_size: map.grid_size ?? 100,
			grid_offset_x: map.grid_offset_x ?? 0,
			grid_offset_y: map.grid_offset_y ?? 0,
			grid_columns: map.grid_columns ?? map.width ?? 40,
			grid_rows: map.height ?? 30,
		}));

		const tokenRows = Array.isArray(map.tokens) ? map.tokens : [];
		setObjects(
			tokenRows.map((t) => ({
				id: typeof t.id === 'string' ? t.id : undefined,
				label: typeof t.label === 'string' ? t.label : null,
				image_url: typeof t.image_url === 'string' ? t.image_url : null,
				x: typeof t.x === 'number' ? t.x : 0,
				y: typeof t.y === 'number' ? t.y : 0,
				metadata: typeof t.metadata === 'object' && t.metadata ? (t.metadata as Record<string, unknown>) : null,
			})),
		);
	}, [mapQuery.data]);

	React.useEffect(() => {
		const img = imgRef.current;
		if (!img) return;

		const update = () => {
			const rect = img.getBoundingClientRect();
			setCanvasSize({
				width: Math.max(0, rect.width),
				height: Math.max(0, rect.height),
			});
		};

		update();

		let ro: ResizeObserver | null = null;
		if (typeof ResizeObserver !== 'undefined') {
			ro = new ResizeObserver(update);
			ro.observe(img);
		}

		window.addEventListener('resize', update);
		return () => {
			window.removeEventListener('resize', update);
			ro?.disconnect();
		};
	}, [formData.background_image_url, formData.cover_image_url]);

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
	});

	const saveMutation = useMutation({
		mutationFn: async () => {
			setSavingError(null);
			const payload = {
				id,
				name: formData.name.trim(),
				slug: formData.slug.trim(),
				description: formData.description.trim() ? formData.description.trim() : null,
				world_id: formData.world_id || null,
				background_image_url: formData.background_image_url || null,
				cover_image_url: formData.cover_image_url || null,
				grid_size: formData.grid_size,
				grid_columns: formData.grid_columns,
				grid_offset_x: formData.grid_offset_x,
				grid_offset_y: formData.grid_offset_y,
				width: formData.grid_columns,
				height: formData.grid_rows,
				tokens: objects.map((t) => ({
					id: t.id,
					label: t.label ?? 'Object',
					image_url: t.image_url ?? null,
					x: t.x,
					y: t.y,
					metadata: t.metadata ?? {},
				})),
			};

			return await saveMap({ data: payload });
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ['maps'] });
			await queryClient.invalidateQueries({ queryKey: ['map', id] });
		},
		onError: (error) => {
			setSavingError(error instanceof Error ? error.message : 'Failed to save map');
		},
	});

	const canSave = formData.name.trim().length > 0 && formData.slug.trim().length > 0;

	const gridColumns = clampInt(formData.grid_columns, 1, 400);
	const gridRows = clampInt(formData.grid_rows, 1, 400);
	const offsetX = formData.grid_size
		? (formData.grid_offset_x / formData.grid_size) * (canvasSize.width / gridColumns)
		: 0;
	const offsetY = formData.grid_size
		? (formData.grid_offset_y / formData.grid_size) * (canvasSize.height / gridRows)
		: 0;
	const gridLines = showGrid
		? buildGridLines({
			width: canvasSize.width,
			height: canvasSize.height,
			columns: gridColumns,
			rows: gridRows,
			offsetX,
			offsetY,
		})
		: [];

	if (!isAdmin) {
		return (
			<RouteShell
				title="Map Editor"
				description="Edit map settings and assets."
			>
				<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
					Access denied. You must be an admin to manage maps.
				</div>
			</RouteShell>
		);
	}

	if (mapQuery.isLoading) {
		return (
			<RouteShell
				title="Map Editor"
				description="Edit map settings and assets."
			>
				<div className="text-sm text-slate-600 dark:text-slate-300">Loading map…</div>
			</RouteShell>
		);
	}

	if (!mapQuery.data) {
		return (
			<RouteShell
				title="Map Editor"
				description="Edit map settings and assets."
			>
				<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
					Map not found.
				</div>
			</RouteShell>
		);
	}

	return (
		<RouteShell
			title={`Map: ${formData.name || id}`}
			description="Edit map settings and assets."
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<button
					type="button"
					onClick={() => navigate({ to: '/admin/maps' })}
					className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
				>
					Back
				</button>

				<div className="flex items-center gap-2">
					<button
						type="button"
						disabled={!canSave || saveMutation.isPending}
						onClick={() => saveMutation.mutate()}
						className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-60"
					>
						{saveMutation.isPending ? 'Saving…' : 'Save'}
					</button>
				</div>
			</div>

			{savingError ? (
				<div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
					{savingError}
				</div>
			) : null}

			<div className="mt-6 grid gap-4 lg:grid-cols-[280px_1fr]">
				<div className="space-y-3 rounded-lg border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
					<div className="flex flex-wrap gap-2">
						{(
							[
								{ id: 'properties', label: 'Properties' },
								{ id: 'grid', label: 'Grid' },
								{ id: 'objects', label: 'Objects' },
								{ id: 'terrain', label: 'Terrain' },
							] as const
						).map((tool) => (
							<button
								key={tool.id}
								type="button"
								onClick={() => setActiveTool(tool.id)}
								className={`rounded-md px-3 py-2 text-xs font-semibold transition ${
									activeTool === tool.id
										? 'bg-amber-600 text-white'
										: 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
								}`}
							>
								{tool.label}
							</button>
						))}
					</div>

					{activeTool === 'properties' ? (
						<div className="space-y-3">
							<label className="block">
								<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
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
								/>
							</label>

							<label className="block">
								<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
									Slug <span className="text-red-600">*</span>
								</div>
								<input
									value={formData.slug}
									onChange={(e) => {
										setSlugTouched(true);
										setFormData((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }));
									}}
									className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
								/>
							</label>

							<label className="block">
								<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
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
								<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
									World
								</div>
								<select
									value={formData.world_id}
									onChange={(e) => setFormData((prev) => ({ ...prev, world_id: e.target.value }))}
									className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
								>
									<option value="">None</option>
									{worlds.map((w) => (
										<option key={w.id} value={w.id}>
											{w.name}
										</option>
									))}
								</select>
							</label>

							<div className="grid gap-3">
								<div>
									<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
										Background Image
									</div>
									<input
										value={formData.background_image_url}
										onChange={(e) => setFormData((prev) => ({ ...prev, background_image_url: e.target.value }))}
										className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
										placeholder="https://…"
									/>
									<input
										type="file"
										accept="image/*"
										disabled={uploadMutation.isPending}
										onChange={async (e) => {
											const file = e.target.files?.[0];
											if (!file) return;
											const image = await uploadMutation.mutateAsync({
												file,
												title: formData.name.trim() || undefined,
												category: 'Map',
											});
											setFormData((prev) => ({ ...prev, background_image_url: image.public_url }));
											e.target.value = '';
										}}
										className="mt-2 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
									/>
								</div>

								<div>
									<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
										Cover Image
									</div>
									<input
										value={formData.cover_image_url}
										onChange={(e) => setFormData((prev) => ({ ...prev, cover_image_url: e.target.value }))}
										className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
										placeholder="https://…"
									/>
									<input
										type="file"
										accept="image/*"
										disabled={uploadMutation.isPending}
										onChange={async (e) => {
											const file = e.target.files?.[0];
											if (!file) return;
											const image = await uploadMutation.mutateAsync({
												file,
												title: formData.name.trim() || undefined,
												category: 'Map',
											});
											setFormData((prev) => ({ ...prev, cover_image_url: image.public_url }));
											e.target.value = '';
										}}
										className="mt-2 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
									/>
								</div>
							</div>
						</div>
					) : null}

					{activeTool === 'grid' ? (
						<div className="space-y-3">
							<label className="flex items-center gap-2">
								<input
									type="checkbox"
									checked={showGrid}
									onChange={(e) => setShowGrid(e.target.checked)}
									className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
								/>
								<span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
									Show grid overlay
								</span>
							</label>

							<div className="grid gap-3 sm:grid-cols-2">
								<label className="block">
									<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
										Grid Size (px)
									</div>
									<input
										type="number"
										value={formData.grid_size}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												grid_size: parseInt(e.target.value, 10) || 100,
											}))
										}
										className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
									/>
								</label>

								<label className="block">
									<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
										Columns
									</div>
									<input
										type="number"
										value={formData.grid_columns}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												grid_columns: parseInt(e.target.value, 10) || 40,
											}))
										}
										className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
									/>
								</label>

								<label className="block">
									<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
										Rows
									</div>
									<input
										type="number"
										value={formData.grid_rows}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												grid_rows: parseInt(e.target.value, 10) || 30,
											}))
										}
										className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
									/>
								</label>

								<label className="block">
									<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
										Offset X (px)
									</div>
									<input
										type="number"
										value={formData.grid_offset_x}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												grid_offset_x: parseInt(e.target.value, 10) || 0,
											}))
										}
										className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
									/>
								</label>

								<label className="block">
									<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
										Offset Y (px)
									</div>
									<input
										type="number"
										value={formData.grid_offset_y}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												grid_offset_y: parseInt(e.target.value, 10) || 0,
											}))
										}
										className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
									/>
								</label>
							</div>
						</div>
					) : null}

					{activeTool === 'objects' ? (
						<div className="space-y-3">
							<div className="flex items-center justify-between gap-2">
								<div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
									Objects
								</div>
								<button
									type="button"
									onClick={() =>
										setObjects((prev) => [
											...prev,
											{ id: `temp_${Date.now()}`, label: 'Object', image_url: null, x: 0, y: 0, metadata: {} },
										])
									}
									className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
								>
									Add
								</button>
							</div>

							<div className="space-y-3">
								{objects.length === 0 ? (
									<div className="text-sm text-slate-500">No objects placed.</div>
								) : null}
								{objects.map((obj, idx) => (
									<div
										key={obj.id ?? idx}
										className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"
									>
										<div className="flex items-start justify-between gap-2">
											<div className="min-w-0">
												<div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
													Object {idx + 1}
												</div>
											</div>
											<button
												type="button"
												onClick={() =>
													setObjects((prev) => prev.filter((_, i) => i !== idx))
												}
												className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-500"
											>
												Remove
											</button>
										</div>

										<label className="mt-2 block">
											<div className="mb-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
												Label
											</div>
											<input
												value={obj.label ?? ''}
												onChange={(e) => {
													const value = e.target.value;
													setObjects((prev) => {
														const next = [...prev];
														next[idx] = { ...next[idx], label: value };
														return next;
													});
												}}
												className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
											/>
										</label>

										<label className="mt-2 block">
											<div className="mb-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
												Image URL
											</div>
											<input
												value={obj.image_url ?? ''}
												onChange={(e) => {
													const value = e.target.value;
													setObjects((prev) => {
														const next = [...prev];
														next[idx] = { ...next[idx], image_url: value };
														return next;
													});
												}}
												className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
												placeholder="https://…"
											/>
											<input
												type="file"
												accept="image/*"
												disabled={uploadMutation.isPending}
												onChange={async (e) => {
													const file = e.target.files?.[0];
													if (!file) return;
													const image = await uploadMutation.mutateAsync({
														file,
														title: obj.label ?? undefined,
														category: 'Object',
													});
													setObjects((prev) => {
														const next = [...prev];
														next[idx] = { ...next[idx], image_url: image.public_url };
														return next;
													});
													e.target.value = '';
												}}
												className="mt-2 block w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
											/>
										</label>

										<div className="mt-3 grid gap-3 sm:grid-cols-2">
											<label className="block">
												<div className="mb-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
													X
												</div>
												<input
													type="number"
													value={obj.x}
													onChange={(e) => {
														const x = parseInt(e.target.value, 10) || 0;
														setObjects((prev) => {
															const next = [...prev];
															next[idx] = { ...next[idx], x };
															return next;
														});
													}}
													className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
												/>
											</label>
											<label className="block">
												<div className="mb-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
													Y
												</div>
												<input
													type="number"
													value={obj.y}
													onChange={(e) => {
														const y = parseInt(e.target.value, 10) || 0;
														setObjects((prev) => {
															const next = [...prev];
															next[idx] = { ...next[idx], y };
															return next;
														});
													}}
													className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
												/>
											</label>
										</div>

										{obj.image_url ? (
											<img
												src={obj.image_url}
												alt={obj.label ?? 'Object'}
												className="mt-3 h-24 w-full rounded-md border border-slate-200 object-contain dark:border-slate-700"
											/>
										) : null}
									</div>
								))}
							</div>
						</div>
					) : null}

					{activeTool === 'terrain' ? (
						<div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
							Terrain painting UI is pending migration. The current editor focuses on map properties, grid alignment, and object tokens.
						</div>
					) : null}
				</div>

				<div className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
					<div className="mb-3 flex items-center justify-between gap-3">
						<div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
							Canvas Preview
						</div>
						<div className="text-xs text-slate-500">
							{gridColumns}×{gridRows}
						</div>
					</div>

					{formData.background_image_url || formData.cover_image_url ? (
						<div className="relative inline-block max-w-full">
							<img
								ref={imgRef}
								src={formData.background_image_url || formData.cover_image_url}
								alt="Map background"
								className="max-h-[70vh] max-w-full rounded-md border border-slate-200 object-contain dark:border-slate-700"
							/>

							{showGrid && canvasSize.width > 0 && canvasSize.height > 0 ? (
								<svg
									className="pointer-events-none absolute inset-0"
									width={canvasSize.width}
									height={canvasSize.height}
									viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
								>
									{gridLines.map((l, idx) => (
										<line
											key={idx}
											x1={l.x1}
											y1={l.y1}
											x2={l.x2}
											y2={l.y2}
											stroke="rgba(255, 255, 255, 0.35)"
											strokeWidth={1}
										/>
									))}
								</svg>
							) : null}

							{canvasSize.width > 0 && canvasSize.height > 0
								? objects
									.filter((o) => o.image_url)
									.map((o, idx) => {
										const cellWidth = canvasSize.width / gridColumns;
										const cellHeight = canvasSize.height / gridRows;
										const left = (o.x + 0.5) * cellWidth;
										const top = (o.y + 0.5) * cellHeight;
										return (
											<img
												key={`${o.id ?? idx}-overlay`}
												src={o.image_url as string}
												alt={o.label ?? 'Object'}
												className="pointer-events-none absolute h-[32px] w-[32px] -translate-x-1/2 -translate-y-1/2 rounded-sm border border-black/40 bg-white/30 object-contain"
												style={{
													left,
													top,
												}}
											/>
										);
									})
								: null}
						</div>
					) : (
						<div className="flex h-64 items-center justify-center rounded-md border border-dashed border-slate-200 bg-white text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-500">
							Set a background image to preview the grid.
						</div>
					)}
				</div>
			</div>
		</RouteShell>
	);
};

export const Route = createFileRoute('/admin/maps/$id')({
	component: AdminMapDetail,
});
