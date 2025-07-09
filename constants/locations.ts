import { ImageSourcePropType } from 'react-native';

export interface LocationOption {
	id: string;
	name: string;
	description: string;
	image: ImageSourcePropType;
	isCustom?: boolean;
}

export const LOCATIONS: LocationOption[] = [
	{
		id: 'tavern',
		name: 'Tavern',
		description: 'A bustling inn or tavern, the classic meeting place for adventurers.',
		image: require('../assets/images/locations/tavern.png'),
	},
	{
		id: 'cave',
		name: 'Cave',
		description: 'A dark, mysterious cave, perfect for exploration or hiding.',
		image: require('../assets/images/locations/cave.png'),
	},
	{
		id: 'camp',
		name: 'Camp',
		description: 'A wilderness or military encampment, temporary or permanent.',
		image: require('../assets/images/locations/camp.png'),
	},
	{
		id: 'palace',
		name: 'Palace',
		description: 'A royal palace or castle, full of intrigue and grandeur.',
		image: require('../assets/images/locations/palace.png'),
	},
	{
		id: 'bedroom',
		name: 'Bedroom',
		description: 'A private chamber, perfect for secrets or waking up to adventure.',
		image: require('../assets/images/locations/bedroom.png'),
	},
	{
		id: 'ship',
		name: 'Ship',
		description: 'A sea or air vessel, ready for travel and adventure.',
		image: require('../assets/images/locations/ship.png'),
	},
	{
		id: 'marketplace',
		name: 'Marketplace',
		description: 'A bustling bazaar, full of merchants, thieves, and secrets.',
		image: require('../assets/images/locations/marketplace.png'),
	},
	{
		id: 'temple',
		name: 'Temple',
		description: 'A sacred or profane place of worship, mystery, or quest.',
		image: require('../assets/images/locations/temple.png'),
	},
	{
		id: 'dungeon',
		name: 'Dungeon',
		description: 'A classic crawl, full of danger and ancient secrets.',
		image: require('../assets/images/locations/dungeon.png'),
	},
	{
		id: 'forest',
		name: 'Forest',
		description: 'A mystical or wild grove, home to druids and creatures.',
		image: require('../assets/images/locations/forest.png'),
	},
	{
		id: 'tower',
		name: 'Tower',
		description: 'A wizard’s study or arcane tower, full of magical mysteries.',
		image: require('../assets/images/locations/tower.png'),
	},
	{
		id: 'arena',
		name: 'Arena',
		description: 'A colosseum for combat, spectacle, or intrigue.',
		image: require('../assets/images/locations/arena.png'),
	},
	{
		id: 'library',
		name: 'Library',
		description: 'A place of knowledge, research, or forbidden tomes.',
		image: require('../assets/images/locations/library.png'),
	},
	{
		id: 'smithy',
		name: 'Smithy',
		description: 'A smith\'s forge, for crafting and invention.',
		image: require('../assets/images/locations/smithy.png'),
	},
	{
		id: 'trail',
		name: 'Trail',
		description: 'A trail between two cities, perfect for adventure or exploration.',
		image: require('../assets/images/locations/trail.png'),
	},
	{
		id: 'farm',
		name: 'Farm',
		description: 'A rural homestead or village, simple but full of secrets.',
		image: require('../assets/images/locations/farm.png'),
	},
	{
		id: 'graveyard',
		name: 'Graveyard',
		description: 'A crypt or cemetery, haunted or somber.',
		image: require('../assets/images/locations/graveyard.png'),
	},
	{
		id: 'portal',
		name: 'Portal',
		description: 'A magical gate or teleportation circle, for planar journeys.',
		image: require('../assets/images/locations/portal.png'),
	},
	{
		id: 'custom',
		name: 'Custom',
		description: 'Create your own location! Name and describe your unique starting point.',
		image: require('../assets/images/custom.png'),
		isCustom: true,
	},
];
