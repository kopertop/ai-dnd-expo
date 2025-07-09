import { ImageSourcePropType } from 'react-native';

export interface ClassOption {
	id: string;
	name: string;
	description: string;
	image: ImageSourcePropType;
	isCustom?: boolean;
}

export const CLASSES: ClassOption[] = [
	{
		id: 'fighter',
		name: 'Fighter',
		description: 'Masters of combat, fighters excel with weapons and armor.',
		// image: require('../assets/images/classes/fighter.png'),
		image: require('../assets/images/custom.png'),
	},
	{
		id: 'rogue',
		name: 'Rogue',
		description: 'Skilled in stealth, thievery, and precision strikes.',
		// image: require('../assets/images/classes/rogue.png'),
		image: require('../assets/images/custom.png'),
	},
	{
		id: 'wizard',
		name: 'Wizard',
		description: 'Arcane masters who wield powerful spells through study.',
		// image: require('../assets/images/classes/wizard.png'),
		image: require('../assets/images/custom.png'),
	},
	{
		id: 'cleric',
		name: 'Cleric',
		description: 'Divine spellcasters who heal allies and smite enemies.',
		// image: require('../assets/images/classes/cleric.png'),
		image: require('../assets/images/custom.png'),
	},
	{
		id: 'ranger',
		name: 'Ranger',
		description: 'Skilled hunters and trackers who protect the wilds.',
		// image: require('../assets/images/classes/ranger.png'),
		image: require('../assets/images/custom.png'),
	},
	{
		id: 'paladin',
		name: 'Paladin',
		description: 'Holy warriors who fight for justice and righteousness.',
		// image: require('../assets/images/classes/paladin.png'),
		image: require('../assets/images/custom.png'),
	},
	{
		id: 'warlock',
		name: 'Warlock',
		description: 'Wielders of dark magic gained through supernatural pacts.',
		// image: require('../assets/images/classes/warlock.png'),
		image: require('../assets/images/custom.png'),
	},
	{
		id: 'warlord',
		name: 'Warlord',
		description: 'Tactical leaders who inspire and command their allies.',
		// image: require('../assets/images/classes/warlord.png'),
		image: require('../assets/images/custom.png'),
	},
	{
		id: 'barbarian',
		name: 'Barbarian',
		description: 'Primal warriors who fight with rage and instinct.',
		// image: require('../assets/images/classes/barbarian.png'),
		image: require('../assets/images/custom.png'),
	},
	{
		id: 'bard',
		name: 'Bard',
		description: 'Charismatic performers who weave magic through music.',
		// image: require('../assets/images/classes/bard.png'),
		image: require('../assets/images/custom.png'),
	},
	{
		id: 'sorcerer',
		name: 'Sorcerer',
		description: 'Innate spellcasters who channel raw magical power.',
		// image: require('../assets/images/classes/sorcerer.png'),
		image: require('../assets/images/custom.png'),
	},
	{
		id: 'druid',
		name: 'Druid',
		description: 'Nature\'s guardians who can shapeshift and command beasts.',
		// image: require('../assets/images/classes/druid.png'),
		image: require('../assets/images/custom.png'),
	},
	{
		id: 'monk',
		name: 'Monk',
		description: 'Disciplined warriors who harness inner power and martial arts.',
		// image: require('../assets/images/classes/monk.png'),
		image: require('../assets/images/custom.png'),
	},
	{
		id: 'artificer',
		name: 'Artificer',
		description: 'Magical inventors who create wondrous items and constructs.',
		// image: require('../assets/images/classes/artificer.png'),
		image: require('../assets/images/custom.png'),
	},
	{
		id: 'custom',
		name: 'Custom',
		description: 'Create your own class! Define your unique abilities and role.',
		image: require('../assets/images/custom.png'),
		isCustom: true,
	},
];
