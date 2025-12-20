import * as React from 'react';

import type { Character } from '@/types/character';
import type { GearSlot } from '@/types/stats';
import { getItemIcon as getItemIconPath } from '~/utils/item-icons';
import { EquipmentSelectorModal } from './equipment-selector-modal';

type CharacterEquipmentProps = {
	character: Character;
	onEquip?: (slot: GearSlot, itemId: string | null) => void;
	readOnly?: boolean;
};

export const CharacterEquipment: React.FC<CharacterEquipmentProps> = ({ character, onEquip, readOnly = false }) => {
	const [selectedSlot, setSelectedSlot] = React.useState<GearSlot | null>(null);

	const getEquipmentItem = (slot: GearSlot) => {
		const itemId = character.equipped?.[slot];
		if (!itemId) return null;
		const item = (character.inventory || []).find((i: any) => i.id === itemId);
		return item || null;
	};

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

	const handleSlotClick = (slot: GearSlot) => {
		if (readOnly) return;
		setSelectedSlot(slot);
	};

	const handleSelectItem = (itemId: string | null) => {
		if (selectedSlot) {
			onEquip?.(selectedSlot, itemId);
		}
		setSelectedSlot(null);
	};

	// Get available items for a slot (items that match the slot type)
	const getAvailableItemsForSlot = (slot: GearSlot) => {
		if (!character.inventory) return [];
		return character.inventory.filter((item: any) => {
			// Items should have a slot property that matches
			// For accessory slot, also allow items without a slot (misc items)
			if (slot === 'accessory') {
				return !item.slot || item.slot === 'accessory' || item.slot === 'none';
			}
			return item.slot === slot;
		});
	};

	// For rings, we'll use a simple approach - in a real implementation, you'd track ring1/ring2 separately
	const ring1Item = getEquipmentItem('accessory');
	const ring2Item = getEquipmentItem('accessory');

	return (
		<div className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm">
			<h2 className="mb-4 text-sm font-bold text-slate-900">Equipment</h2>

			{/* Character silhouette layout - RPG style */}
			<div className="relative mx-auto max-w-sm">
				<div className="grid grid-cols-5 gap-1">
					{/* Left column - Main Hand */}
					<div className="col-span-1 flex flex-col items-center justify-center">
						<EquipmentSlot
							slot="mainHand"
							item={getEquipmentItem('mainHand')}
							getIcon={getEquipmentIcon}
							onClick={() => handleSlotClick('mainHand')}
						/>
					</div>

					{/* Center column - Head, Chest, Legs, Boots */}
					<div className="col-span-3 flex flex-col items-center gap-1">
						{/* Helmet */}
						<EquipmentSlot
							slot="helmet"
							item={getEquipmentItem('helmet')}
							getIcon={getEquipmentIcon}
							onClick={() => handleSlotClick('helmet')}
						/>

						{/* Chest */}
						<EquipmentSlot
							slot="chest"
							item={getEquipmentItem('chest')}
							getIcon={getEquipmentIcon}
							onClick={() => handleSlotClick('chest')}
						/>

						{/* Legs */}
						<EquipmentSlot
							slot="legs"
							item={getEquipmentItem('legs')}
							getIcon={getEquipmentIcon}
							onClick={() => handleSlotClick('legs')}
						/>

						{/* Boots */}
						<EquipmentSlot
							slot="boots"
							item={getEquipmentItem('boots')}
							getIcon={getEquipmentIcon}
							onClick={() => handleSlotClick('boots')}
						/>
					</div>

					{/* Right column - Off Hand */}
					<div className="col-span-1 flex flex-col items-center justify-center">
						<EquipmentSlot
							slot="offHand"
							item={getEquipmentItem('offHand')}
							getIcon={getEquipmentIcon}
							onClick={() => handleSlotClick('offHand')}
						/>
					</div>
				</div>

				{/* Arms - Below main hand/off hand, positioned on sides */}
				<div className="mt-1 grid grid-cols-5 gap-1">
					<div className="col-span-1 flex justify-center">
						<EquipmentSlot
							slot="arms"
							item={getEquipmentItem('arms')}
							getIcon={getEquipmentIcon}
							onClick={() => handleSlotClick('arms')}
						/>
					</div>
					<div className="col-span-3" /> {/* Spacer for center column */}
					<div className="col-span-1 flex justify-center">
						<EquipmentSlot
							slot="arms"
							item={getEquipmentItem('arms')}
							getIcon={getEquipmentIcon}
							onClick={() => handleSlotClick('arms')}
						/>
					</div>
				</div>

				{/* Rings - Bottom row, centered */}
				<div className="mt-3 flex justify-center gap-1">
					<EquipmentSlot
						slot="accessory"
						item={ring1Item}
						getIcon={getEquipmentIcon}
						label="Ring 1"
						onClick={() => handleSlotClick('accessory')}
					/>
					<EquipmentSlot
						slot="accessory"
						item={ring2Item}
						getIcon={getEquipmentIcon}
						label="Ring 2"
						onClick={() => handleSlotClick('accessory')}
					/>
				</div>
			</div>

			{/* Equipment Selector Modal */}
			<EquipmentSelectorModal
				isOpen={selectedSlot !== null}
				slot={selectedSlot}
				availableItems={selectedSlot ? getAvailableItemsForSlot(selectedSlot) : []}
				currentEquippedItemId={selectedSlot ? character.equipped?.[selectedSlot] || null : null}
				onSelect={handleSelectItem}
				onClose={() => setSelectedSlot(null)}
			/>
		</div>
	);
};

type EquipmentSlotProps = {
	slot: GearSlot;
	item: any | null;
	getIcon: (itemId: string) => any;
	label?: string;
	onClick: () => void;
};

// Map gear slots to their placeholder images
const GEAR_SLOT_PLACEHOLDERS: Record<string, string> = {
	helmet: '/assets/images/gear-slot/helmet.png',
	chest: '/assets/images/gear-slot/chest.png',
	arms: '/assets/images/gear-slot/left-arm.png', // Using left-arm as default
	legs: '/assets/images/gear-slot/legs.png',
	boots: '/assets/images/gear-slot/boots.png',
	mainHand: '/assets/images/gear-slot/main-hand.png',
	offHand: '/assets/images/gear-slot/off-hand.png',
	accessory: '/assets/images/gear-slot/inventory.png', // Using inventory as placeholder for rings/accessories
};

const EquipmentSlot: React.FC<EquipmentSlotProps> = ({ slot, item, getIcon, label, onClick }) => {
	const slotLabel = label || slot.charAt(0).toUpperCase() + slot.slice(1).replace(/([A-Z])/g, ' $1');

	// Get placeholder icon for empty slots
	const placeholderIcon = GEAR_SLOT_PLACEHOLDERS[slot] || null;

	// Get icon from item or icon resolver
	const itemIcon = React.useMemo(() => {
		if (!item) return placeholderIcon;

		// First try the public folder mapping (new approach)
		const publicPath = getItemIconPath(item);
		if (publicPath) {
			return publicPath;
		}

		// Fallback: try item.icon (already resolved)
		if (item.icon) {
			// Handle different icon formats
			if (typeof item.icon === 'string') {
				// If it's already a full URL or starts with /, use it
				if (item.icon.startsWith('http') || item.icon.startsWith('/')) {
					return item.icon;
				}
			}
			if (typeof item.icon === 'object' && 'spritesheet' in item.icon) {
				// Sprite sheet reference - TODO: implement sprite rendering for web
				return null;
			}
			// ImageSourcePropType (require() result) - in web, try to extract URL
			if (item.icon && typeof item.icon === 'object' && 'uri' in item.icon) {
				return item.icon.uri;
			}
		}

		// Last resort: try legacy equipment icon lookup
		if (item.id) {
			const icon = getIcon(item.id);
			if (typeof icon === 'string') return icon;
			if (icon && typeof icon === 'object' && 'uri' in icon) {
				return icon.uri;
			}
			// Handle sprite sheet reference from getIcon
			if (icon && typeof icon === 'object' && 'spritesheet' in icon) {
				// TODO: implement sprite rendering
				return null;
			}
		}

		return null;
	}, [item, getIcon, placeholderIcon]);

	return (
		<div className="flex flex-col items-center gap-1">
			<button
				type="button"
				onClick={onClick}
				className="group relative flex h-20 w-20 items-center justify-center rounded-lg border-2 border-slate-300 bg-gradient-to-br from-slate-100 to-slate-200 transition-all hover:border-slate-400 hover:from-slate-200 hover:to-slate-300 hover:shadow-md"
				title={item?.name || slotLabel}
			>
				{itemIcon ? (
					<img
						src={itemIcon}
						alt={item?.name || slotLabel}
						className={`h-full w-full ${item ? 'object-contain p-1' : 'object-cover opacity-60'}`}
					/>
				) : item ? (
					<div className="text-center">
						<div className="text-[10px] font-semibold text-slate-800 line-clamp-2 leading-tight px-1">
							{item.name}
						</div>
					</div>
				) : (
					<div className="text-xl text-slate-400 group-hover:text-slate-500">-</div>
				)}
			</button>
			<div className="text-center">
				<div className="text-[10px] font-semibold text-slate-700">{slotLabel}</div>
			</div>
		</div>
	);
};
