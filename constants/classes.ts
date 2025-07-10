import { ImageSourcePropType } from 'react-native';

import { StatKey } from '../types/stats';

export interface ClassOption {
	id: string;
	name: string;
	description: string;
	image: ImageSourcePropType;
	isCustom?: boolean;
	primaryStats: StatKey[];
	secondaryStats?: StatKey[];
}

export const CLASSES: ClassOption[] = [
	{
		id: 'fighter',
		name: 'Fighter',
		description: 'Masters of combat, fighters excel with weapons and armor.',
		image: require('../assets/images/classes/fighter.png'),
		primaryStats: ['STR'],
		secondaryStats: ['CON', 'DEX'],
	},
	{
		id: 'rogue',
		name: 'Rogue',
		description: 'Skilled in stealth, thievery, and precision strikes.',
		image: require('../assets/images/classes/rogue.png'),
		primaryStats: ['DEX'],
		secondaryStats: ['INT', 'CHA'],
	},
	{
		id: 'wizard',
		name: 'Wizard',
		description: 'Arcane masters who wield powerful spells through study.',
		image: require('../assets/images/classes/wizard.png'),
		primaryStats: ['INT'],
		secondaryStats: ['CON', 'DEX'],
	},
	{
		id: 'cleric',
		name: 'Cleric',
		description: 'Divine spellcasters who heal allies and smite enemies.',
		image: require('../assets/images/classes/cleric.png'),
		primaryStats: ['WIS'],
		secondaryStats: ['STR', 'CON'],
	},
	{
		id: 'ranger',
		name: 'Ranger',
		description: 'Skilled hunters and trackers who protect the wilds.',
		image: require('../assets/images/classes/ranger.png'),
		primaryStats: ['DEX', 'WIS'],
		secondaryStats: ['CON'],
	},
	{
		id: 'paladin',
		name: 'Paladin',
		description: 'Holy warriors who fight for justice and righteousness.',
		image: require('../assets/images/classes/paladin.png'),
		primaryStats: ['STR', 'CHA'],
		secondaryStats: ['CON', 'WIS'],
	},
	{
		id: 'warlock',
		name: 'Warlock',
		description: 'Wielders of dark magic gained through supernatural pacts.',
		image: require('../assets/images/classes/warlock.png'),
		primaryStats: ['CHA'],
		secondaryStats: ['CON', 'DEX'],
	},
	{
		id: 'barbarian',
		name: 'Barbarian',
		description: 'Primal warriors who fight with rage and instinct.',
		image: require('../assets/images/classes/barbarian.png'),
		primaryStats: ['STR'],
		secondaryStats: ['CON'],
	},
	{
		id: 'bard',
		name: 'Bard',
		description: 'Charismatic performers who weave magic through music.',
		image: require('../assets/images/classes/bard.png'),
		primaryStats: ['CHA'],
		secondaryStats: ['DEX', 'CON'],
	},
	{
		id: 'sorcerer',
		name: 'Sorcerer',
		description: 'Innate spellcasters who channel raw magical power.',
		image: require('../assets/images/classes/sorcerer.png'),
		primaryStats: ['CHA'],
		secondaryStats: ['CON', 'DEX'],
	},
	{
		id: 'druid',
		name: 'Druid',
		description: 'Nature\'s guardians who can shapeshift and command beasts.',
		image: require('../assets/images/classes/druid.png'),
		primaryStats: ['WIS'],
		secondaryStats: ['CON', 'DEX'],
	},
	{
		id: 'monk',
		name: 'Monk',
		description: 'Disciplined warriors who harness inner power and martial arts.',
		image: require('../assets/images/classes/monk.png'),
		primaryStats: ['DEX', 'WIS'],
		secondaryStats: ['CON'],
	},
	{
		id: 'artificer',
		name: 'Artificer',
		description: 'Magical inventors who create wondrous items and constructs.',
		image: require('../assets/images/classes/artificer.png'),
		primaryStats: ['INT'],
		secondaryStats: ['CON', 'DEX'],
	},
	{
		id: 'custom',
		name: 'Custom',
		description: 'Create your own class! Define your unique abilities and role.',
		image: require('../assets/images/custom.png'),
		isCustom: true,
		primaryStats: [],
	},
];
