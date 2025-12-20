import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import * as React from 'react';

import type { Character } from '@/types/character';
import type { GearSlot, StatKey } from '@/types/stats';
import { STAT_KEYS } from '@/types/stats';
import { calculateAC, calculatePassivePerception, getAbilityModifier } from '@/utils/combat-utils';
import { CharacterAbilities } from '~/components/character-detail/character-abilities';
import { CharacterAttacks } from '~/components/character-detail/character-attacks';
import { CharacterBackground } from '~/components/character-detail/character-background';
import { CharacterCombat } from '~/components/character-detail/character-combat';
import { CharacterEquipment } from '~/components/character-detail/character-equipment';
import { CharacterInventory } from '~/components/character-detail/character-inventory';
import { CharacterSkills } from '~/components/character-detail/character-skills';
import RouteShell from '~/components/route-shell';
import { charactersQueryOptions, deleteCharacter, updateCharacter } from '~/utils/characters';
import { deleteImage, uploadedImagesQueryOptions, uploadImage } from '~/utils/images';

import { PortraitSelectorModal } from '~/components/portrait-selector-modal';

const CharacterDetail: React.FC = () => {
	const { id } = Route.useParams();
	const router = useRouter();
	const queryClient = useQueryClient();
	const charactersQuery = useSuspenseQuery(charactersQueryOptions());
	const character = charactersQuery.data.find((item) => item.id === id);

	const [isSaving, setIsSaving] = React.useState(false);
	const [isDeleting, setIsDeleting] = React.useState(false);
	const [isPortraitModalOpen, setIsPortraitModalOpen] = React.useState(false);
	const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);

	const uploadedImagesQuery = useSuspenseQuery(uploadedImagesQueryOptions('both'));
	const uploadedImages = uploadedImagesQuery.data || [];

	if (!character) {
		return (
			<RouteShell
				title="Character"
				description="Character detail view"
			>
				<p className="text-sm text-slate-600 dark:text-slate-300">
					Character not found.
				</p>
			</RouteShell>
		);
	}

	// Calculate ability modifiers for combat stats
	const abilityMods = React.useMemo(() => {
		return STAT_KEYS.reduce((acc, key) => {
			const score = character.stats?.[key] ?? 10;
			acc[key] = getAbilityModifier(score);
			return acc;
		}, {} as Record<StatKey, number>);
	}, [character.stats]);

	// Calculate combat stats
	const armorClass = React.useMemo(() => calculateAC(character), [character]);
	const initiative = abilityMods.DEX ?? 0;
	const passivePerception = React.useMemo(() => calculatePassivePerception(character), [character]);

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await updateCharacter({
				data: {
					path: `/characters/${character.id}`,
					data: character,
				},
			});
			await queryClient.invalidateQueries({ queryKey: charactersQueryOptions().queryKey });
		} catch (error) {
			console.error('Failed to save character:', error);
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!confirm(`Are you sure you want to delete ${character.name}? This action cannot be undone.`)) {
			return;
		}

		setIsDeleting(true);
		try {
			await deleteCharacter({
				data: {
					path: `/characters/${character.id}`,
				},
			});
			await queryClient.invalidateQueries({ queryKey: charactersQueryOptions().queryKey });
			router.navigate({ to: '/characters' });
		} catch (error) {
			console.error('Failed to delete character:', error);
			alert('Failed to delete character. Please try again.');
		} finally {
			setIsDeleting(false);
		}
	};

	const handleEquip = async (slot: GearSlot, itemId: string | null) => {
		if (!character) return;

		// Ensure we have all slots in the equipped object, preserving existing values
		// Convert undefined to null explicitly to avoid serialization issues
		const currentEquipped = character.equipped || {};
		const updatedEquipped: Record<string, string | null> = {
			helmet: currentEquipped.helmet ?? null,
			chest: currentEquipped.chest ?? null,
			arms: currentEquipped.arms ?? null,
			legs: currentEquipped.legs ?? null,
			boots: currentEquipped.boots ?? null,
			mainHand: currentEquipped.mainHand ?? null,
			offHand: currentEquipped.offHand ?? null,
			accessory: currentEquipped.accessory ?? null,
			none: null, // Always null for 'none' slot
		};
		updatedEquipped[slot] = itemId;

		// Clean up: remove any undefined values and ensure all are null or string
		const cleanedEquipped: Record<string, string | null> = {};
		for (const [key, value] of Object.entries(updatedEquipped)) {
			cleanedEquipped[key] = value === undefined ? null : value;
		}

		// Send only the equipped object as a partial update
		const updates = {
			equipped: cleanedEquipped,
		};

		try {
			await updateCharacter({
				data: {
					path: `/characters/${character.id}`,
					data: updates as Partial<Character>,
				},
			});
			await queryClient.invalidateQueries({ queryKey: charactersQueryOptions().queryKey });
		} catch (error) {
			console.error('Failed to update equipment:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			console.error('Error details:', errorMessage);
			console.error('Full error object:', error);
			alert(`Failed to update equipment: ${errorMessage}`);
		}
	};

	const handlePortraitSelect = async (imageUrl: string) => {
		if (!character) return;

		try {
			await updateCharacter({
				data: {
					path: `/characters/${character.id}`,
					data: { icon: imageUrl } as Partial<Character>,
				},
			});
			await queryClient.invalidateQueries({ queryKey: charactersQueryOptions().queryKey });
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
					image_type: 'character',
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
			title=""
			description=""
		>
			<div className="space-y-6">
				{/* Header Section */}
				<div className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm">
					{/* Avatar */}
					<button
						type="button"
						onClick={() => setIsPortraitModalOpen(true)}
						className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-100 transition-all hover:bg-slate-200 hover:ring-2 hover:ring-amber-400"
						title="Click to change portrait"
					>
						{character.icon ? (
							<img src={character.icon} alt={character.name} className="h-full w-full rounded-full object-cover" />
						) : (
							<span className="text-2xl font-semibold text-slate-400">
								{character.name.charAt(0).toUpperCase()}
							</span>
						)}
					</button>

					{/* Character Info */}
					<div className="flex-1">
						<h1 className="text-2xl font-bold text-slate-900">{character.name}</h1>
						<p className="mt-1 text-sm text-slate-600">
							{character.class} • {character.race} • Level {character.level}
						</p>
						{character.trait && (
							<div className="mt-2 inline-flex items-center gap-1 rounded-full border-2 border-slate-800 bg-red-700 px-3 py-1">
								<span className="text-xs font-semibold text-white">!</span>
								<span className="text-xs font-semibold text-white">{character.trait}</span>
							</div>
						)}
					</div>

					{/* Combat Stats */}
					<div className="flex gap-3">
						<div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-center">
							<div className="text-xs font-semibold text-slate-600">AC</div>
							<div className="mt-1 text-lg font-bold text-slate-900">{armorClass}</div>
						</div>
						<div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-center">
							<div className="text-xs font-semibold text-slate-600">INITIATIVE</div>
							<div className="mt-1 text-lg font-bold text-slate-900">
								{initiative >= 0 ? '+' : ''}{initiative}
							</div>
						</div>
						<div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-center">
							<div className="text-xs font-semibold text-slate-600">PASSIVE PERCEPTION</div>
							<div className="mt-1 text-lg font-bold text-slate-900">{passivePerception}</div>
						</div>
					</div>
				</div>

				{/* Two Column Layout */}
				<div className="grid gap-6 md:grid-cols-2">
					{/* Left Column */}
					<div className="space-y-6">
						<CharacterAbilities character={character} />
						<CharacterSkills character={character} />
						<CharacterBackground character={character} />

						{/* Save Button */}
						<button
							type="button"
							onClick={handleSave}
							disabled={isSaving}
							className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{isSaving ? 'Saving...' : 'Save'}
						</button>
					</div>

					{/* Right Column */}
					<div className="space-y-6">
						<CharacterCombat
							character={character}
							armorClass={armorClass}
							initiative={initiative}
							passivePerception={passivePerception}
						/>
						<CharacterEquipment character={character} onEquip={handleEquip} />
						<CharacterInventory character={character} />
						<CharacterAttacks character={character} />
					</div>
				</div>

				{/* Delete Character Button */}
				<button
					type="button"
					onClick={handleDelete}
					disabled={isDeleting}
					className="w-full rounded-lg bg-red-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{isDeleting ? 'Deleting...' : 'Delete Character'}
				</button>
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
				isAdmin={false} // TODO: Get from user context
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

export const Route = createFileRoute('/characters/$id')({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(charactersQueryOptions());
		await context.queryClient.ensureQueryData(uploadedImagesQueryOptions('both'));
	},
	component: CharacterDetail,
});
