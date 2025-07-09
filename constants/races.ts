import { ImageSourcePropType } from 'react-native';

export interface RaceOption {
	id: string;
	name: string;
	description: string;
	image: ImageSourcePropType;
	isCustom?: boolean;
}

export const RACES: RaceOption[] = [
	{
		id: 'human',
		name: 'Human',
		description: 'Versatile and ambitious, humans are found throughout the world.',
		image: require('../assets/images/races/human.png'),
	},
	{
		id: 'elf',
		name: 'Elf',
		description: 'Graceful, swift, and attuned to nature and magic.',
		image: require('../assets/images/races/elf.png'),
	},
	{
		id: 'dwarf',
		name: 'Dwarf',
		description: 'Stout, hardy, and strong, dwarves are known for their resilience.',
		image: require('../assets/images/races/dwarf.png'),
	},
	{
		id: 'dragonborn',
		name: 'Dragonborn',
		description: 'Proud, honorable warriors with draconic ancestry.',
		image: require('../assets/images/races/dragonborn.png'),
	},
	{
		id: 'tiefling',
		name: 'Tiefling',
		description: 'Descendants of infernal pacts, marked by horns and tails.',
		image: require('../assets/images/races/tiefling.png'),
	},
	{
		id: 'halfling',
		name: 'Halfling',
		description: 'Small, nimble, and lucky, halflings are cheerful wanderers.',
		image: require('../assets/images/races/halfling.png'),
	},
	{
		id: 'half-elf',
		name: 'Half-Elf',
		description: 'Blending human versatility and elven grace.',
		image: require('../assets/images/races/half-elf.png'),
	},
	{
		id: 'half-orc',
		name: 'Half-Orc',
		description: 'Strong and fierce, half-orcs are often misunderstood.',
		image: require('../assets/images/races/half-orc.png'),
	},
	{
		id: 'gnome',
		name: 'Gnome',
		description: 'Inventive and magical, gnomes are clever tricksters.',
		image: require('../assets/images/races/gnome.png'),
	},
	{
		id: 'eladrin',
		name: 'Eladrin',
		description: 'Fey-touched elves with strong ties to the arcane.',
		image: require('../assets/images/races/eladrin.png'),
	},
	{
		id: 'deva',
		name: 'Deva',
		description: 'Immortal spirits reborn in mortal form, wise and mystical.',
		image: require('../assets/images/races/deva.png'),
	},
	{
		id: 'shifter',
		name: 'Shifter',
		description: 'Descendants of lycanthropes, shifters are wild and primal.',
		image: require('../assets/images/races/shifter.png'),
	},
	{
		id: 'goliath',
		name: 'Goliath',
		description: 'Mountain-dwelling giants, strong and competitive.',
		image: require('../assets/images/races/goliath.png'),
	},
	{
		id: 'genasi',
		name: 'Genasi',
		description: 'Elemental beings, each tied to air, earth, fire, or water.',
		image: require('../assets/images/races/genasi.png'),
	},
	{
		id: 'custom',
		name: 'Custom',
		description: 'Create your own race! Name and describe your unique ancestry.',
		image: require('../assets/images/custom.png'),
		isCustom: true,
	},
];
