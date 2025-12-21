import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import * as React from 'react';

import { currentUserQueryOptions } from '~/utils/auth';
import { fetchAdminImages, uploadImageClient } from '~/utils/images';

import type { UploadedImageCategory } from '@/shared/workers/db';

interface ImageChooserProps {
	value?: string | null;
	onChange: (url: string) => void;
	category: UploadedImageCategory;
	title?: string;
	placeholder?: string;
	className?: string;
}

const ImageChooser: React.FC<ImageChooserProps> = ({
	value,
	onChange,
	category,
	title,
	placeholder = 'No image selected',
	className = '',
}) => {
	const queryClient = useQueryClient();
	const userQuery = useSuspenseQuery(currentUserQueryOptions());
	const user = userQuery.data;
	const isAdmin = user?.is_admin === true;

	const [showModal, setShowModal] = React.useState(false);
	const [isDragging, setIsDragging] = React.useState(false);
	const uploadFileRef = React.useRef<File | null>(null);

	const imagesQuery = useQuery({
		queryKey: ['admin-images', category],
		queryFn: () =>
			fetchAdminImages({
				data: {
					category,
					limit: 200,
					offset: 0,
				},
			}),
		enabled: isAdmin && showModal,
	});

	const images = imagesQuery.data ?? [];

	const uploadMutation = useMutation({
		mutationFn: async (payload: { file: File; title?: string }) => {
			return await uploadImageClient({
				file: payload.file,
				title: payload.title,
				image_type: 'both',
				category,
			});
		},
		onSuccess: (image) => {
			onChange(image.public_url);
			setShowModal(false);
			uploadFileRef.current = null;
			queryClient.invalidateQueries({ queryKey: ['admin-images', category] });
		},
	});

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		e.target.value = '';
		uploadFileRef.current = file;
		await uploadMutation.mutateAsync({
			file,
			title: undefined,
		});
	};

	const handleDragEnter = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDrop = async (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);

		const files = e.dataTransfer.files;
		if (files && files.length > 0) {
			const file = files[0];
			if (file.type.startsWith('image/')) {
				uploadFileRef.current = file;
				await uploadMutation.mutateAsync({
					file,
					title: undefined,
				});
			}
		}
	};


	const handleSelectFromLibrary = (url: string) => {
		onChange(url);
		setShowModal(false);
	};

	return (
		<>
			<div className={className}>
				{title ? (
					<div className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
						{title}
					</div>
				) : null}

				{/* Clickable Preview */}
				<button
					type="button"
					onClick={() => setShowModal(true)}
					className="w-full rounded-md border border-slate-200 bg-white transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
				>
					{value ? (
						<img
							src={value}
							alt="Preview"
							className="h-48 w-full rounded-md object-contain"
						/>
					) : (
						<div className="flex h-48 items-center justify-center rounded-md border border-dashed border-slate-200 bg-white text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-500">
							{placeholder}
						</div>
					)}
				</button>
			</div>

			{/* Modal */}
			{showModal ? (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
					onClick={() => setShowModal(false)}
				>
					<div
						className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl dark:bg-slate-900"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Header */}
						<div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
							<h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
								Select Image ({category})
							</h2>
							<button
								type="button"
								onClick={() => setShowModal(false)}
								className="rounded-md px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
							>
								Close
							</button>
						</div>

						{/* Content */}
						<div className="max-h-[calc(90vh-120px)] overflow-y-auto p-6">
							{/* Upload Section */}
							<div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
								<h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">
									Upload New Image
								</h3>
								<div className="space-y-3">
									<div
										onDragEnter={handleDragEnter}
										onDragOver={handleDragOver}
										onDragLeave={handleDragLeave}
										onDrop={handleDrop}
										className={`rounded-lg border-2 border-dashed p-6 transition-colors ${
											isDragging
												? 'border-amber-500 bg-amber-50 dark:border-amber-400 dark:bg-amber-900/20'
												: 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900'
										}`}
									>
										<label className="block cursor-pointer">
											<div className="text-center">
												<div className="mb-2 text-2xl">📤</div>
												<div className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
													{isDragging ? 'Drop image here' : 'Click to select or drag and drop'}
												</div>
												<div className="text-xs text-slate-500 dark:text-slate-400">
													PNG, JPG, or GIF up to 10MB
												</div>
											</div>
											<input
												type="file"
												accept="image/*"
												disabled={uploadMutation.isPending}
												onChange={handleFileSelect}
												className="hidden"
											/>
										</label>
									</div>
									{uploadMutation.isPending ? (
										<div className="mt-3 text-center text-sm text-slate-600 dark:text-slate-400">
											Uploading…
										</div>
									) : null}
									{uploadMutation.isError ? (
										<div className="mt-3 text-sm text-red-600">
											{uploadMutation.error instanceof Error
												? uploadMutation.error.message
												: 'Failed to upload image'}
										</div>
									) : null}
								</div>
							</div>

							{/* Library Section */}
							<div>
								<h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">
									Select from Library
								</h3>
								{imagesQuery.isLoading ? (
									<div className="py-8 text-center text-sm text-slate-500">
										Loading images…
									</div>
								) : images.length === 0 ? (
									<div className="py-8 text-center text-sm text-slate-500">
										No images found in {category} category.
									</div>
								) : (
									<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
										{images.map((image) => (
											<button
												key={image.id}
												type="button"
												onClick={() => handleSelectFromLibrary(image.public_url)}
												className="group rounded-lg border border-slate-200 bg-white/80 shadow-sm transition-all hover:border-amber-500 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/40"
											>
												<div className="aspect-square w-full overflow-hidden rounded-t-lg bg-slate-100 dark:bg-slate-800">
													<img
														src={image.public_url}
														alt={image.title ?? image.filename}
														className="h-full w-full object-contain transition-transform group-hover:scale-105"
													/>
												</div>
												<div className="p-3">
													<div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
														{image.title || image.filename}
													</div>
													{image.title ? (
														<div className="mt-1 truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
															{image.filename}
														</div>
													) : null}
												</div>
											</button>
										))}
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			) : null}
		</>
	);
};

export default ImageChooser;
