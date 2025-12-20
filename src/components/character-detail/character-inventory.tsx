import * as React from 'react';

import type { Character } from '@/types/character';
import { getItemIcon as getItemIconPath } from '~/utils/item-icons';

type CharacterInventoryProps = {
	character: Character;
	onItemClick?: (item: any) => void;
};

export const CharacterInventory: React.FC<CharacterInventoryProps> = ({ character, onItemClick }) => {
	const getEquipmentIcon = React.useCallback((itemId: string) => {
		// Try to get icon from equipment-spritesheet (frontend only)
		if (typeof window === 'undefined') return null;

		try {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const equipmentSpritesheet = require('@/components/equipment-spritesheet');
			return equipmentSpritesheet.getEquipmentIcon(itemId);
		} catch {
			return null;
		}
	}, []);

	// Get all equipped item IDs
	const equippedItemIds = React.useMemo(() => {
		const equipped = character.equipped || {};
		return new Set(Object.values(equipped).filter(Boolean) as string[]);
	}, [character.equipped]);

	// Sort inventory: equipped items first, then others
	const sortedInventory = React.useMemo(() => {
		if (!character.inventory || character.inventory.length === 0) return [];

		const inventory = [...character.inventory];
		return inventory.sort((a, b) => {
			const aEquipped = equippedItemIds.has(a.id);
			const bEquipped = equippedItemIds.has(b.id);

			if (aEquipped && !bEquipped) return -1;
			if (!aEquipped && bEquipped) return 1;
			return 0;
		});
	}, [character.inventory, equippedItemIds]);

	// Fill grid to complete rows (4 columns per row)
	const gridItems = React.useMemo(() => {
		const items = [...sortedInventory];
		const itemsPerRow = 4;
		const totalRows = Math.ceil(items.length / itemsPerRow);
		const totalSlots = totalRows * itemsPerRow;

		// Fill remaining slots with null placeholders
		while (items.length < totalSlots) {
			items.push(null);
		}

		return items;
	}, [sortedInventory]);

	const getItemIcon = (item: any): string | null => {
		// First try the public folder mapping (new approach)
		// This handles base ID extraction internally
		if (item.id) {
			const publicPath = getItemIconPath(item);
			if (publicPath) {
				return publicPath;
			}
		}

		// Fallback: try item.icon (already resolved)
		if (item.icon) {
			if (typeof item.icon === 'string') {
				// If it's already a full URL or starts with /, use it
				if (item.icon.startsWith('http') || item.icon.startsWith('/')) {
					return item.icon;
				}
			}
			if (typeof item.icon === 'object' && 'uri' in item.icon) {
				return item.icon.uri;
			}
			// Sprite sheet references need special handling (TODO)
			if (typeof item.icon === 'object' && 'spritesheet' in item.icon) {
				return null;
			}
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

	if (!character.inventory || character.inventory.length === 0) {
		return (
			<div className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm">
				<h2 className="mb-4 text-sm font-bold text-slate-900">Inventory</h2>
				<p className="text-sm text-slate-500">Pack is empty.</p>
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm">
			<h2 className="mb-4 text-sm font-bold text-slate-900">Inventory</h2>
			<div className="grid grid-cols-4 gap-0 border border-slate-300">
				{gridItems.map((item: any, index: number) => {
					if (!item) {
						// Empty slot
						return (
							<div
								key={`empty-${index}`}
								className="aspect-square border border-slate-200 bg-slate-50"
							/>
						);
					}

					const isEquipped = equippedItemIds.has(item.id);
					const itemIcon = getItemIcon(item);

					const quantity = item.quantity || item.amount || item.count || null;
					const showQuantity = quantity !== null && quantity > 1;

					return (
						<button
							key={item.id}
							type="button"
							onClick={() => onItemClick?.(item)}
							className={`group relative flex aspect-square flex-col items-center justify-center border border-slate-200 transition-all ${
								isEquipped
									? 'border-amber-400 bg-amber-50'
									: 'bg-slate-50 hover:bg-slate-100'
							}`}
						>
							{isEquipped && (
								<div className="absolute right-0.5 top-0.5 z-10 flex h-3 w-3 items-center justify-center bg-amber-600 text-[7px] font-bold text-white">
									E
								</div>
							)}
							{showQuantity && (
								<div className="absolute bottom-0.5 right-0.5 z-10 flex h-4 w-4 items-center justify-center bg-slate-900 text-[9px] font-bold text-white">
									{quantity}
								</div>
							)}
							<div className="absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden">
								{itemIcon ? (
									<img
										src={itemIcon}
										alt={item.name}
										className="h-full w-full object-cover"
									/>
								) : (
									<div className="text-2xl text-slate-400">📦</div>
								)}
							</div>
							{/* Hover tooltip */}
							<div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 opacity-0 transition-opacity group-hover:opacity-100">
								<div className="px-2 py-1 text-center text-xs font-semibold text-white">
									{item.name}
								</div>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
};
