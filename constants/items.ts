import { Item } from '../types/items';


// Only export ITEM_LIST and any data/constants, all types/schemas are now in types/.

// Example item list
export const ITEM_LIST: Item[] = [
	{
		id: 'healing_potion',
		name: 'Healing Potion',
		description: 'Restores 10 HP.',
		icon: require('../assets/images/gear-slot/inventory.png'),
		slot: 'none',
		usable: true,
	},
	{
		id: 'iron_helmet',
		name: 'Iron Helmet',
		description: 'A sturdy iron helmet.',
		icon: require('../assets/images/gear-slot/helmet.png'),
		slot: 'helmet',
		usable: false,
		stats: { CON: 1 },
	},
	{
		id: 'leather_boots',
		name: 'Leather Boots',
		description: 'Lightweight boots for quick movement.',
		icon: require('../assets/images/gear-slot/boots.png'),
		slot: 'boots',
		usable: false,
		stats: { DEX: 1 },
	},
];
