import * as React from 'react';

import type { GearSlot } from '@/types/stats';
import { getItemIcon as getItemIconPath } from '~/utils/item-icons';

type EquipmentSelectorModalProps = {
	isOpen: boolean;
	slot: GearSlot | null;
	availableItems: any[];
	currentEquippedItemId: string | null;
	onSelect: (itemId: string | null) => void;
	onClose: () => void;
};

export const EquipmentSelectorModal: React.FC<EquipmentSelectorModalProps> = ({
	isOpen,
	slot,
	availableItems,
	currentEquippedItemId,
	onSelect,
	onClose,
}) => {
	const getEquipmentIcon = React.useCallback((itemId: string) => {
		if (typeof window === 'undefined') return null;

		try {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const equipmentSpritesheet = require('@/components/equipment-spritesheet');
			return equipmentSpritesheet.getEquipmentIcon(itemId);
		} catch {
			return null;
		}
	}, []);

	const getItemIcon = (item: any): string | null => {
		if (!item) return null;

		// First try the public folder mapping
		const publicPath = getItemIconPath(item);
		if (publicPath) {
			return publicPath;
		}

		// Fallback: try item.icon
		if (item.icon && typeof item.icon === 'string') {
			if (item.icon.startsWith('http') || item.icon.startsWith('/')) {
				return item.icon;
			}
		}
		if (item.icon && typeof item.icon === 'object' && 'uri' in item.icon) {
			return item.icon.uri;
		}

		// Last resort: try legacy equipment icon lookup
		if (item.id) {
			const icon = getEquipmentIcon(item.id);
			if (typeof icon === 'string') return icon;
			if (icon && typeof icon === 'object' && 'uri' in icon) {
				return icon.uri;
			}
		}

		return null;
	};

	if (!isOpen || !slot) return null;

	const slotLabel = slot.charAt(0).toUpperCase() + slot.slice(1).replace(/([A-Z])/g, ' $1');

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
			onClick={onClose}
		>
			<div
				className="relative max-h-[80vh] w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
					<h3 className="text-sm font-bold text-slate-900">Select {slotLabel}</h3>
				</div>

				{/* Content */}
				<div className="max-h-[60vh] overflow-y-auto p-4">
					<div className="grid grid-cols-4 gap-2">
						{/* None option */}
						<button
							type="button"
							onClick={() => {
								onSelect(null);
								onClose();
							}}
							className={`group relative flex aspect-square flex-col items-center justify-center rounded-lg border-2 transition-all ${
								currentEquippedItemId === null
									? 'border-amber-400 bg-amber-50'
									: 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
							}`}
							title="None (Unequip)"
						>
							<svg
								className="h-8 w-8 text-slate-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
							>
								<circle cx="12" cy="12" r="10" />
								<path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" />
							</svg>
							<div className="mt-1 text-[10px] font-semibold text-slate-700">None</div>
						</button>

						{/* Available items */}
						{availableItems.map((item: any) => {
							const itemIcon = getItemIcon(item);
							const isEquipped = item.id === currentEquippedItemId;

							return (
								<button
									key={item.id}
									type="button"
									onClick={() => {
										onSelect(item.id);
										onClose();
									}}
									className={`group relative flex aspect-square flex-col items-center justify-center rounded-lg border-2 transition-all ${
										isEquipped
											? 'border-amber-400 bg-amber-50'
											: 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
									}`}
									title={item.name}
								>
									<div className="flex h-full w-full items-center justify-center overflow-hidden">
										{itemIcon ? (
											<img
												src={itemIcon}
												alt={item.name}
												className="h-full w-full object-cover"
											/>
										) : (
											<div className="text-xl text-slate-400">📦</div>
										)}
									</div>
									{isEquipped && (
										<div className="absolute right-1 top-1 flex h-3 w-3 items-center justify-center rounded-full bg-amber-600 text-[7px] font-bold text-white">
											E
										</div>
									)}
									{/* Hover tooltip */}
									<div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 opacity-0 transition-opacity group-hover:opacity-100">
										<div className="px-2 py-1 text-center text-xs font-semibold text-white">
											{item.name}
										</div>
									</div>
								</button>
							);
						})}
					</div>
				</div>

				{/* Footer */}
				<div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
					<button
						type="button"
						onClick={onClose}
						className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	);
};
