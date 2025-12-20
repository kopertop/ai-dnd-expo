import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import { PortraitSelectorModal } from '~/components/portrait-selector-modal';
import RouteShell from '~/components/route-shell';
import { currentUserQueryOptions, updateUser } from '~/utils/auth';
import { deleteImage, uploadedImagesQueryOptions, uploadImage } from '~/utils/images';

const Settings: React.FC = () => {
	const queryClient = useQueryClient();
	const userQuery = useSuspenseQuery(currentUserQueryOptions());
	const user = userQuery.data;

	const uploadedImagesQuery = useSuspenseQuery(uploadedImagesQueryOptions('both'));
	const uploadedImages = uploadedImagesQuery.data || [];

	const [isPortraitModalOpen, setIsPortraitModalOpen] = React.useState(false);
	const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);

	if (!user) {
		return (
			<RouteShell
				title="Settings"
				description="Manage your account settings"
			>
				<p className="text-sm text-slate-600 dark:text-slate-300">
					Please sign in to access settings.
				</p>
			</RouteShell>
		);
	}

	const handlePortraitSelect = async (imageUrl: string) => {
		try {
			await updateUser({
				data: {
					picture: imageUrl,
				},
			});
			await queryClient.invalidateQueries({ queryKey: ['current-user'] });
			setIsPortraitModalOpen(false);
		} catch (error) {
			console.error('Failed to update portrait:', error);
			alert(`Failed to update portrait: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	};

	const handleImageUpload = async (file: File) => {
		try {
			const uploaded = await uploadImage({
				data: {
					file,
					image_type: 'both',
				},
			});
			await queryClient.invalidateQueries({ queryKey: uploadedImagesQueryOptions('both').queryKey });
			await handlePortraitSelect(uploaded.public_url);
			setIsUploadModalOpen(false);
		} catch (error) {
			console.error('Failed to upload image:', error);
			alert(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	};

	const handleDeleteImage = async (imageId: string) => {
		try {
			await deleteImage({
				data: {
					path: `/images/${imageId}`,
				},
			});
			await queryClient.invalidateQueries({ queryKey: uploadedImagesQueryOptions('both').queryKey });
		} catch (error) {
			console.error('Failed to delete image:', error);
			alert(`Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	};

	return (
		<RouteShell
			title="Settings"
			description="Manage your account settings and profile"
		>
			<div className="space-y-6">
				{/* Profile Section */}
				<div className="rounded-lg border border-slate-200 bg-white/80 p-6 shadow-sm">
					<h2 className="mb-4 text-lg font-bold text-slate-900">Profile</h2>

					<div className="space-y-4">
						{/* Profile Picture */}
						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">
								Profile Picture
							</label>
							<button
								type="button"
								onClick={() => setIsPortraitModalOpen(true)}
								className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 transition-all hover:border-slate-300 hover:bg-slate-100"
							>
								<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-100">
									{user.picture ? (
										<img
											src={user.picture}
											alt={user.name || user.email}
											className="h-full w-full rounded-full object-cover"
										/>
									) : (
										<span className="text-2xl font-semibold text-slate-400">
											{(user.name || user.email || 'U').charAt(0).toUpperCase()}
										</span>
									)}
								</div>
								<div className="flex-1 text-left">
									<div className="text-sm font-semibold text-slate-900">Click to change</div>
									<div className="text-xs text-slate-500">
										Select a portrait or upload a new image
									</div>
								</div>
							</button>
						</div>

						{/* User Info */}
						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">Name</label>
							<div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
								{user.name || 'Not set'}
							</div>
						</div>

						<div>
							<label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
							<div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
								{user.email}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Portrait Selector Modal */}
			<PortraitSelectorModal
				isOpen={isPortraitModalOpen}
				onClose={() => setIsPortraitModalOpen(false)}
				onSelect={handlePortraitSelect}
				uploadedImages={uploadedImages}
				onUploadClick={() => {
					setIsPortraitModalOpen(false);
					setIsUploadModalOpen(true);
				}}
				onDeleteImage={handleDeleteImage}
				isAdmin={false}
			/>

			{/* Image Upload Modal */}
			{isUploadModalOpen && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
					onClick={() => setIsUploadModalOpen(false)}
				>
					<div
						className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="mb-4 flex items-center justify-between">
							<h3 className="text-lg font-bold text-slate-900">Upload Portrait</h3>
							<button
								type="button"
								onClick={() => setIsUploadModalOpen(false)}
								className="text-slate-400 hover:text-slate-600"
							>
								×
							</button>
						</div>
						<label className="mb-4 block">
							<div className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 transition-colors hover:border-slate-400 hover:bg-slate-100">
								<div className="text-center">
									<div className="mb-2 text-2xl">📤</div>
									<div className="text-sm font-semibold text-slate-700">Click to select image</div>
									<div className="mt-1 text-xs text-slate-500">PNG, JPG, or GIF up to 10MB</div>
								</div>
							</div>
							<input
								type="file"
								accept="image/*"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) {
										handleImageUpload(file);
									}
								}}
								className="hidden"
							/>
						</label>
						<div className="flex justify-end gap-3">
							<button
								type="button"
								onClick={() => setIsUploadModalOpen(false)}
								className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</RouteShell>
	);
};

export const Route = createFileRoute('/settings')({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(currentUserQueryOptions());
		await context.queryClient.ensureQueryData(uploadedImagesQueryOptions('both'));
	},
	component: Settings,
});
