import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import RouteShell from '~/components/route-shell';
import { currentUserQueryOptions } from '~/utils/auth';
import { deleteImage, fetchAdminImages, updateImage, uploadImage } from '~/utils/images';

import type { UploadedImageCategory } from '@/shared/workers/db';

const CATEGORIES: Array<{ label: string; value: UploadedImageCategory }> = [
	{ label: 'Character', value: 'Character' },
	{ label: 'Object', value: 'Object' },
	{ label: 'Map', value: 'Map' },
	{ label: 'World', value: 'World' },
	{ label: 'Other', value: 'Other' },
];

const formatDate = (timestamp: number) => {
	try {
		return new Date(timestamp).toLocaleString();
	} catch {
		return String(timestamp);
	}
};

const Modal: React.FC<{
	title: string;
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
}> = ({ title, isOpen, onClose, children }) => {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
				<div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
					<div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
						{title}
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
					>
						Close
					</button>
				</div>
				<div className="max-h-[75vh] overflow-auto p-4">{children}</div>
			</div>
		</div>
	);
};

const AdminImages: React.FC = () => {
	const userQuery = useSuspenseQuery(currentUserQueryOptions());
	const user = userQuery.data;
	const isAdmin = user?.is_admin === true;

	const queryClient = useQueryClient();
	const [categoryFilter, setCategoryFilter] = React.useState<UploadedImageCategory | 'All'>('All');
	const [search, setSearch] = React.useState('');

	const [editTarget, setEditTarget] = React.useState<{
		id: string;
		public_url: string;
		filename: string;
		title: string | null;
		description: string | null;
		category: UploadedImageCategory;
		is_public: number;
	} | null>(null);

	const [uploadForm, setUploadForm] = React.useState<{
		file: File | null;
		title: string;
		description: string;
		category: UploadedImageCategory;
	}>({
		file: null,
		title: '',
		description: '',
		category: 'Other',
	});

	const imagesQuery = useQuery({
		queryKey: ['admin-images', categoryFilter],
		queryFn: () =>
			fetchAdminImages({
				data: {
					category: categoryFilter === 'All' ? undefined : categoryFilter,
					limit: 200,
					offset: 0,
				},
			}),
		enabled: isAdmin,
	});

	const images = imagesQuery.data ?? [];
	const filteredImages = React.useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return images;
		return images.filter((img) => {
			const title = img.title ?? '';
			return (
				title.toLowerCase().includes(q) ||
				img.filename.toLowerCase().includes(q) ||
				img.id.toLowerCase().includes(q)
			);
		});
	}, [images, search]);

	const updateMutation = useMutation({
		mutationFn: async (payload: {
			id: string;
			title?: string | null;
			description?: string | null;
			category?: UploadedImageCategory;
			is_public?: boolean | number;
		}) => updateImage({ data: payload }),
		onSuccess: async () => {
			setEditTarget(null);
			await queryClient.invalidateQueries({ queryKey: ['admin-images'] });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (payload: { id: string }) =>
			deleteImage({ data: { path: `/images/${payload.id}` } }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ['admin-images'] });
		},
	});

	const uploadMutation = useMutation({
		mutationFn: async (payload: {
			file: File;
			title?: string;
			description?: string;
			category: UploadedImageCategory;
		}) =>
			uploadImage({
				data: {
					file: payload.file,
					title: payload.title || undefined,
					description: payload.description || undefined,
					image_type: 'both',
					category: payload.category,
				},
			}),
		onSuccess: async () => {
			setUploadForm((prev) => ({ ...prev, file: null, title: '', description: '' }));
			await queryClient.invalidateQueries({ queryKey: ['admin-images'] });
		},
	});

	const handleDelete = async (id: string) => {
		const confirmed = window.confirm('Delete this image? This action cannot be undone.');
		if (!confirmed) return;
		await deleteMutation.mutateAsync({ id });
	};

	if (!isAdmin) {
		return (
			<RouteShell
				title="Images"
				description="Upload and curate image assets."
			>
				<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
					Access denied. You must be an admin to manage images.
				</div>
			</RouteShell>
		);
	}

	return (
		<RouteShell
			title="Images"
			description="Upload and curate image assets."
		>
			<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div className="flex flex-wrap items-end gap-3">
					<label className="block">
						<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
							Category
						</div>
						<select
							value={categoryFilter}
							onChange={(e) =>
								setCategoryFilter(e.target.value as UploadedImageCategory | 'All')
							}
							className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
						>
							<option value="All">All</option>
							{CATEGORIES.map((c) => (
								<option key={c.value} value={c.value}>
									{c.label}
								</option>
							))}
						</select>
					</label>

					<label className="block">
						<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
							Search
						</div>
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Title, filename, id…"
							className="w-64 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
						/>
					</label>
				</div>

				{imagesQuery.isFetching ? (
					<div className="text-xs text-slate-500">Loading…</div>
				) : null}
			</div>

			<div className="mt-4 rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
				<div className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
					Upload Image
				</div>
				<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
					<label className="block">
						<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
							File
						</div>
						<input
							type="file"
							accept="image/*"
							disabled={uploadMutation.isPending}
							onChange={(e) => {
								const file = e.target.files?.[0] ?? null;
								setUploadForm((prev) => ({ ...prev, file }));
							}}
							className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
						/>
					</label>

					<label className="block">
						<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
							Title
						</div>
						<input
							value={uploadForm.title}
							onChange={(e) => setUploadForm((prev) => ({ ...prev, title: e.target.value }))}
							className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
							placeholder="Optional"
						/>
					</label>

					<label className="block">
						<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
							Category
						</div>
						<select
							value={uploadForm.category}
							onChange={(e) =>
								setUploadForm((prev) => ({ ...prev, category: e.target.value as UploadedImageCategory }))
							}
							className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
						>
							{CATEGORIES.map((c) => (
								<option key={c.value} value={c.value}>
									{c.label}
								</option>
							))}
						</select>
					</label>

					<div className="flex items-end">
						<button
							type="button"
							disabled={!uploadForm.file || uploadMutation.isPending}
							onClick={async () => {
								if (!uploadForm.file) return;
								await uploadMutation.mutateAsync({
									file: uploadForm.file,
									title: uploadForm.title.trim() || undefined,
									description: uploadForm.description.trim() || undefined,
									category: uploadForm.category,
								});
							}}
							className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
						>
							{uploadMutation.isPending ? 'Uploading…' : 'Upload'}
						</button>
					</div>
				</div>

				<label className="mt-3 block">
					<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
						Description
					</div>
					<textarea
						value={uploadForm.description}
						onChange={(e) => setUploadForm((prev) => ({ ...prev, description: e.target.value }))}
						rows={2}
						className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
						placeholder="Optional"
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

			{imagesQuery.isError ? (
				<div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
					{imagesQuery.error instanceof Error
						? imagesQuery.error.message
						: 'Failed to load images'}
				</div>
			) : (
				<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{filteredImages.length === 0 ? (
						<div className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
							No images found.
						</div>
					) : null}

					{filteredImages.map((image) => {
						const category = (image.category ?? 'Other') as UploadedImageCategory;
						return (
							<div
								key={image.id}
								className="rounded-lg border border-slate-200 bg-white/80 shadow-sm dark:border-slate-700 dark:bg-slate-900/40"
							>
								<div className="aspect-square w-full overflow-hidden rounded-t-lg bg-slate-100 dark:bg-slate-800">
									<img
										src={image.public_url}
										alt={image.title ?? image.filename}
										className="h-full w-full object-contain"
									/>
								</div>

								<div className="space-y-2 p-3">
									<div className="flex items-start justify-between gap-2">
										<div className="min-w-0">
											<div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
												{image.title || image.filename}
											</div>
											<div className="mt-1 truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
												{image.id}
											</div>
										</div>

										<span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
											{category}
										</span>
									</div>

									<div className="grid gap-1 text-[11px] text-slate-600 dark:text-slate-300">
										<div>
											Type: <span className="font-semibold">{image.image_type}</span>
										</div>
										<div>
											Owner: <span className="font-mono">{image.user_id}</span>
										</div>
										<div>
											Created: <span className="font-mono">{formatDate(image.created_at)}</span>
										</div>
									</div>

									<div className="flex items-center justify-between gap-2 pt-1">
										<button
											type="button"
											onClick={() =>
												setEditTarget({
													id: image.id,
													public_url: image.public_url,
													filename: image.filename,
													title: image.title,
													description: image.description,
													category,
													is_public: image.is_public,
												})
											}
											className="rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
										>
											Edit
										</button>

										<button
											type="button"
											onClick={() => handleDelete(image.id)}
											disabled={deleteMutation.isPending}
											className="rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-60"
										>
											Delete
										</button>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			<Modal
				title="Edit Image"
				isOpen={editTarget !== null}
				onClose={() => setEditTarget(null)}
			>
				{editTarget ? (
					<div className="space-y-4">
						<img
							src={editTarget.public_url}
							alt={editTarget.title ?? editTarget.filename}
							className="h-56 w-full rounded-md border border-slate-200 object-contain dark:border-slate-700"
						/>

						<label className="block">
							<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
								Title
							</div>
							<input
								value={editTarget.title ?? ''}
								onChange={(e) =>
									setEditTarget((prev) =>
										prev ? { ...prev, title: e.target.value } : prev,
									)
								}
								className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
							/>
						</label>

						<label className="block">
							<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
								Description
							</div>
							<textarea
								value={editTarget.description ?? ''}
								onChange={(e) =>
									setEditTarget((prev) =>
										prev ? { ...prev, description: e.target.value } : prev,
									)
								}
								rows={3}
								className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
							/>
						</label>

						<div className="grid gap-3 sm:grid-cols-2">
							<label className="block">
								<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
									Category
								</div>
								<select
									value={editTarget.category}
									onChange={(e) =>
										setEditTarget((prev) =>
											prev
												? { ...prev, category: e.target.value as UploadedImageCategory }
												: prev,
										)
									}
									className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
								>
									{CATEGORIES.map((c) => (
										<option key={c.value} value={c.value}>
											{c.label}
										</option>
									))}
								</select>
							</label>

							<label className="flex items-center gap-3 pt-6">
								<input
									type="checkbox"
									checked={editTarget.is_public === 1}
									onChange={(e) =>
										setEditTarget((prev) =>
											prev ? { ...prev, is_public: e.target.checked ? 1 : 0 } : prev,
										)
									}
									className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
								/>
								<span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
									Public
								</span>
							</label>
						</div>

						{updateMutation.isError ? (
							<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
								{updateMutation.error instanceof Error
									? updateMutation.error.message
									: 'Failed to update image'}
							</div>
						) : null}

						<div className="flex items-center justify-end gap-2">
							<button
								type="button"
								onClick={() => setEditTarget(null)}
								className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
							>
								Cancel
							</button>
							<button
								type="button"
								disabled={updateMutation.isPending}
								onClick={async () => {
									await updateMutation.mutateAsync({
										id: editTarget.id,
										title: editTarget.title?.trim() ? editTarget.title.trim() : null,
										description: editTarget.description?.trim()
											? editTarget.description.trim()
											: null,
										category: editTarget.category,
										is_public: editTarget.is_public,
									});
								}}
								className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-60"
							>
								{updateMutation.isPending ? 'Saving…' : 'Save'}
							</button>
						</div>
					</div>
				) : null}
			</Modal>
		</RouteShell>
	);
};

export const Route = createFileRoute('/admin/images')({
	component: AdminImages,
});
