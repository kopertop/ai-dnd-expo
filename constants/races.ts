import { ImageSourcePropType } from 'react-native';

import { PartialStatBlock } from '../types/stats';

export interface RaceOption {
	id: string;
	name: string;
	description: string;
	image: ImageSourcePropType;
	isCustom?: boolean;
	statBonuses?: PartialStatBlock;
}

export const RACES: RaceOption[] = [
	{
		id: 'human',
		name: 'Human',
		description: 'Versatile and ambitious, humans are found throughout the world.',
		image: require('../assets/images/races/human.png'),
		statBonuses: { STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 1 },
	},
	{
		id: 'elf',
		name: 'Elf',
		description: 'Graceful, swift, and attuned to nature and magic.',
		image: require('../assets/images/races/elf.png'),
		statBonuses: { DEX: 2 },
	},
	{
		id: 'dwarf',
		name: 'Dwarf',
		description: 'Stout, hardy, and strong, dwarves are known for their resilience.',
		image: require('../assets/images/races/dwarf.png'),
		statBonuses: { CON: 2 },
	},
	{
		id: 'dragonborn',
		name: 'Dragonborn',
		description: 'Proud, honorable warriors with draconic ancestry.',
		image: require('../assets/images/races/dragonborn.png'),
		statBonuses: { STR: 2, CHA: 1 },
	},
	{
		id: 'tiefling',
		name: 'Tiefling',
		description: 'Descendants of infernal pacts, marked by horns and tails.',
		image: require('../assets/images/races/tiefling.png'),
		statBonuses: { CHA: 2, INT: 1 },
	},
	{
		id: 'halfling',
		name: 'Halfling',
		description: 'Small, nimble, and lucky, halflings are cheerful wanderers.',
		image: require('../assets/images/races/halfling.png'),
		statBonuses: { DEX: 2 },
	},
	{
		id: 'half-elf',
		name: 'Half-Elf',
		description: 'Blending human versatility and elven grace.',
		image: require('../assets/images/races/half-elf.png'),
		statBonuses: { CHA: 2, DEX: 1, CON: 1 },
	},
	{
		id: 'half-orc',
		name: 'Half-Orc',
		description: 'Strong and fierce, half-orcs are often misunderstood.',
		image: require('../assets/images/races/half-orc.png'),
		statBonuses: { STR: 2, CON: 1 },
	},
	{
		id: 'gnome',
		name: 'Gnome',
		description: 'Inventive and magical, gnomes are clever tricksters.',
		image: require('../assets/images/races/gnome.png'),
		statBonuses: { INT: 2 },
	},
	{
		id: 'eladrin',
		name: 'Eladrin',
		description: 'Fey-touched elves with strong ties to the arcane.',
		image: require('../assets/images/races/eladrin.png'),
		statBonuses: { DEX: 2, CHA: 1 },
	},
	{
		id: 'custom',
		name: 'Custom',
		description: 'Create your own race! Name and describe your unique ancestry.',
		image: require('../assets/images/custom.png'),
		isCustom: true,
	},
];
