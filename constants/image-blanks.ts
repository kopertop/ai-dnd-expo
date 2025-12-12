import { ImageSourcePropType } from 'react-native';

export interface ImageBlank {
	id: string;
	name: string;
	source: ImageSourcePropType;
	filename: string;
	description?: string;
}

export const IMAGE_BLANKS: ImageBlank[] = [
	{
		id: 'dragonborn',
		name: 'Dragonborn',
		source: require('@/assets/images/characters/dragonborn/dragonborn-blank.png'),
		filename: 'dragonborn-blank.png',
		description: 'Base template for Dragonborn characters',
	},
	{
		id: 'dwarf',
		name: 'Dwarf',
		source: require('@/assets/images/characters/dwarf/dwarf-blank.png'),
		filename: 'dwarf-blank.png',
		description: 'Base template for Dwarf characters',
	},
	{
		id: 'elf',
		name: 'Elf',
		source: require('@/assets/images/characters/elf/elf-blank.png'),
		filename: 'elf-blank.png',
		description: 'Base template for Elf characters',
	},
	{
		id: 'human',
		name: 'Human',
		source: require('@/assets/images/characters/human/human-blank.png'),
		filename: 'human-blank.png',
		description: 'Base template for Human characters',
	},
	{
		id: 'tiefling',
		name: 'Tiefling',
		source: require('@/assets/images/characters/tiefling/tiefling-blank.png'),
		filename: 'tiefling-blank.png',
		description: 'Base template for Tiefling characters',
	},
];

export const REFERENCE_IMAGE = {
	id: 'goblin-reference',
	name: 'Goblin Example',
	source: require('@/assets/images/characters/goblin/goblin-archer.png'),
	filename: 'goblin-reference.png',
	description: 'Example of ideal camera angle, lighting, and transparency',
};
