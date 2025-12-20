import * as React from 'react';

import type { UploadedImage } from '@/hooks/api/use-image-queries';

// Web-compatible character image options (generated from CHARACTER_IMAGE_OPTIONS keys)
const CHARACTER_PORTRAIT_OPTIONS = [
	{ key: 'Characters:Dragonborn:DragonbornBarbarian', label: 'Dragonborn Barbarian' },
	{ key: 'Characters:Dragonborn:DragonbornBlank', label: 'Dragonborn Blank' },
	{ key: 'Characters:Dragonborn:DragonbornCleric', label: 'Dragonborn Cleric' },
	{ key: 'Characters:Dragonborn:DragonbornFighter', label: 'Dragonborn Fighter' },
	{ key: 'Characters:Dragonborn:DragonbornPaladin', label: 'Dragonborn Paladin' },
	{ key: 'Characters:Dragonborn:DragonbornRanger', label: 'Dragonborn Ranger' },
	{ key: 'Characters:Dragonborn:DragonbornRogue', label: 'Dragonborn Rogue' },
	{ key: 'Characters:Dragonborn:DragonbornWarlock', label: 'Dragonborn Warlock' },
	{ key: 'Characters:Dragonborn:DragonbornWizard', label: 'Dragonborn Wizard' },
	{ key: 'Characters:Dwarf:DwarfBlank', label: 'Dwarf Blank' },
	{ key: 'Characters:Eladrin:EladrinBase', label: 'Eladrin Base' },
	{ key: 'Characters:Elf:ElfBlank', label: 'Elf Blank' },
	{ key: 'Characters:Elf:ElfMage', label: 'Elf Mage' },
	{ key: 'Characters:Elf:ElfRanger', label: 'Elf Ranger' },
	{ key: 'Characters:Elf:ElfRogue', label: 'Elf Rogue' },
	{ key: 'Characters:Elf:ElfWarlock', label: 'Elf Warlock' },
	{ key: 'Characters:Elf:ElfWarrior', label: 'Elf Warrior' },
	{ key: 'Characters:Gnome:GnomeBase', label: 'Gnome Base' },
	{ key: 'Characters:Goblin:GoblinArcher', label: 'Goblin Archer' },
	{ key: 'Characters:Goblin:GoblinCleric', label: 'Goblin Cleric' },
	{ key: 'Characters:Goblin:GoblinMage', label: 'Goblin Mage' },
	{ key: 'Characters:Goblin:GoblinRaider', label: 'Goblin Raider' },
	{ key: 'Characters:Goblin:GoblinRogue', label: 'Goblin Rogue' },
	{ key: 'Characters:HalfElf:HalfElfBase', label: 'Half Elf Base' },
	{ key: 'Characters:Halfling:HalflingBase', label: 'Halfling Base' },
	{ key: 'Characters:HalfOrc:HalfOrcBase', label: 'Half Orc Base' },
	{ key: 'Characters:Human:ArchanistMerchant', label: 'Archanist Merchant' },
	{ key: 'Characters:Human:HumanBlank', label: 'Human Blank' },
	{ key: 'Characters:Human:HumanFighter', label: 'Human Fighter' },
	{ key: 'Characters:Tiefling:TieflingBlank', label: 'Tiefling Blank' },
];

type PortraitOption = {
	id: string;
	label: string;
	imageUrl: string;
	type: 'preset' | 'uploaded';
};

type PortraitSelectorModalProps = {
	isOpen: boolean;
	onClose: () => void;
	onSelect: (imageUrl: string, label?: string) => void;
	uploadedImages?: UploadedImage[];
	onUploadClick?: () => void;
	onDeleteImage?: (imageId: string) => void;
	isAdmin?: boolean;
};

export const PortraitSelectorModal: React.FC<PortraitSelectorModalProps> = ({
	isOpen,
	onClose,
	onSelect,
	uploadedImages = [],
	onUploadClick,
	onDeleteImage,
	isAdmin = false,
}) => {
	const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

	const presetOptions: PortraitOption[] = React.useMemo(() => {
		return CHARACTER_PORTRAIT_OPTIONS.map(opt => {
			// Convert key to public path
			// Format: "Characters:Dragonborn:DragonbornBarbarian" -> "/assets/images/characters/dragonborn/dragonborn-barbarian.png"
			// Format: "Characters:HalfElf:HalfElfBase" -> "/assets/images/characters/half-elf/half-elf-base.png"
			const keyParts = opt.key.split(':');
			// Convert category from camelCase to kebab-case (e.g., "HalfElf" -> "half-elf")
			const categoryPart = keyParts[1] || '';
			const category = categoryPart
				.replace(/([A-Z])/g, '-$1')
				.toLowerCase()
				.replace(/^-/, '');
			// Convert "DragonbornBarbarian" to "dragonborn-barbarian"
			const namePart = keyParts[2] || '';
			const filename = namePart
				.replace(/([A-Z])/g, '-$1')
				.toLowerCase()
				.replace(/^-/, '');
			const imageUrl = `/assets/images/characters/${category}/${filename}.png`;

			return {
				id: opt.key,
				label: opt.label,
				imageUrl,
				type: 'preset' as const,
			};
		});
	}, []);

	const uploadedOptions: PortraitOption[] = React.useMemo(() => {
		return uploadedImages.map((img) => ({
			id: img.id,
			label: img.title || img.filename,
			imageUrl: img.public_url,
			type: 'uploaded' as const,
		}));
	}, [uploadedImages]);

	const handleSelect = (option: PortraitOption) => {
		onSelect(option.imageUrl, option.label);
		onClose();
	};

	const handleDeleteClick = (e: React.MouseEvent, imageId: string) => {
		e.stopPropagation();
		setConfirmDeleteId(imageId);
	};

	const performDelete = () => {
		if (confirmDeleteId && onDeleteImage) {
			onDeleteImage(confirmDeleteId);
			setConfirmDeleteId(null);
		}
	};

	if (!isOpen) return null;

	return (
		<>
			<div
				className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
				onClick={onClose}
			>
				<div
					className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Header */}
					<div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
						<h2 className="text-lg font-bold text-slate-900">Choose Portrait</h2>
						<button
							type="button"
							onClick={onClose}
							className="rounded-md px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
						>
							Close
						</button>
					</div>

					{/* Content */}
					<div className="max-h-[calc(90vh-120px)] overflow-y-auto p-6">
						{/* Upload Button */}
						{onUploadClick && (
							<div className="mb-6">
								<button
									type="button"
									onClick={onUploadClick}
									className="w-full rounded-lg bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
								>
									Upload New
								</button>
							</div>
						)}

						{/* Your Uploads */}
						{uploadedOptions.length > 0 && (
							<div className="mb-8">
								<h3 className="mb-3 text-sm font-bold text-slate-900">Your Uploads</h3>
								<div className="grid grid-cols-3 gap-4">
									{uploadedOptions.map((option) => (
										<button
											key={option.id}
											type="button"
											onClick={() => handleSelect(option)}
											className="group relative flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 transition-all hover:border-slate-300 hover:bg-slate-100"
										>
											<div className="relative aspect-square w-full overflow-hidden rounded-md bg-slate-200">
												<img
													src={option.imageUrl}
													alt={option.label}
													className="h-full w-full object-contain"
												/>
												{isAdmin && (
													<button
														type="button"
														onClick={(e) => handleDeleteClick(e, option.id)}
														className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
														title="Delete image"
													>
														×
													</button>
												)}
											</div>
											<span className="text-xs font-semibold text-slate-700">{option.label}</span>
										</button>
									))}
								</div>
							</div>
						)}

						{/* Presets */}
						<div>
							<h3 className="mb-3 text-sm font-bold text-slate-900">Presets</h3>
							<div className="grid grid-cols-6 gap-4">
								{presetOptions.map((option) => (
									<button
										key={option.id}
										type="button"
										onClick={() => handleSelect(option)}
										className="group flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 transition-all hover:border-slate-300 hover:bg-slate-100"
									>
										<div className="aspect-square w-full overflow-hidden rounded-md bg-slate-200">
											<img
												src={option.imageUrl}
												alt={option.label}
												className="h-full w-full object-contain"
											/>
										</div>
										<span className="text-[10px] font-semibold text-slate-700">{option.label}</span>
									</button>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Delete Confirmation Modal */}
			{confirmDeleteId && (
				<div
					className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
					onClick={() => setConfirmDeleteId(null)}
				>
					<div
						className="rounded-lg bg-white p-6 shadow-xl"
						onClick={(e) => e.stopPropagation()}
					>
						<h3 className="mb-2 text-lg font-bold text-slate-900">Delete Image</h3>
						<p className="mb-4 text-sm text-slate-600">
							Are you sure you want to delete this image? This cannot be undone.
						</p>
						<div className="flex gap-3">
							<button
								type="button"
								onClick={performDelete}
								className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
							>
								Delete
							</button>
							<button
								type="button"
								onClick={() => setConfirmDeleteId(null)}
								className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};
