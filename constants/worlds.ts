import { ImageSourcePropType } from 'react-native';

export interface WorldOption {
	id: string;
	name: string;
	description: string;
	image: ImageSourcePropType;
	isCustom?: boolean;
}

export const WORLDS: WorldOption[] = [
	{
		id: 'faerun',
		name: 'Faerûn',
		description: 'The classic Forgotten Realms setting, a land of magic, monsters, and adventure.',
		image: require('../assets/images/worlds/faerun.png'),
	},
	{
		id: 'eberron',
		name: 'Eberron',
		description: 'A world of magic-fueled technology, airships, and intrigue, where anything is possible.',
		image: require('../assets/images/worlds/eberron.png'),
	},
	{
		id: 'underdark',
		name: 'Underdark',
		description: 'A vast, dark, and dangerous subterranean realm filled with drow, mind flayers, and ancient secrets.',
		image: require('../assets/images/worlds/underdark.png'),
	},
	{
		id: 'custom',
		name: 'Custom',
		description: 'Create your own world! Name and describe your unique setting.',
		image: require('../assets/images/worlds/custom.png'),
		isCustom: true,
	},
];
