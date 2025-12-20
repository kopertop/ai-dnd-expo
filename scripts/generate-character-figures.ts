import * as fs from 'fs';
import * as path from 'path';

import { glob } from 'glob';

const ROOT_DIR = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT_DIR, 'assets/images/characters');
const OUTPUT_FILE = path.join(ROOT_DIR, 'types/character-figure.ts');

function toPascalCase(str: string): string {
	return str
		.split(/[-_]/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join('');
}

function toTitleCase(str: string): string {
	return str
		.split(/[-_]/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(' ');
}

async function main() {
	console.log(`Scanning ${ASSETS_DIR}...`);

	// Find all PNG files recursively
	const files = await glob('**/*.png', { cwd: ASSETS_DIR });

	const entries = files.map((file) => {
		// file is like "elf/elf-mage.png" or "goblin/goblin-archer.png"
		const parts = file.split('/');
		const fileNameWithExt = parts[parts.length - 1];
		const fileName = path.basename(fileNameWithExt, '.png');

		// Determine Category.
		// If directly in characters root, maybe "Misc"? But assuming subfolders.
		// If nested "a/b/c.png", category could be "A:B"?
		// Existing pattern seems to assume 1 level of nesting: "Category/Image.png"

		let category = 'Misc';
		if (parts.length > 1) {
			// Use the immediate parent folder as category, capitalized
			// Or combine all parent folders?
			// Existing: "elf/elf-ranger.png" -> "Elf"
			// Let's use the first folder as the main category for the Key prefix if applicable,
			// but looking at existing "Characters:Elf:ElfRanger", it seems to correspond to Folder:Filename.

			// Let's assume strictly folder structure maps to key segments.
			// But simpler: Folder -> Category.
			const parentDir = parts[parts.length - 2];
			category = toPascalCase(parentDir);
		}

		const namePascal = toPascalCase(fileName);
		const label = toTitleCase(fileName);

		// Construct Key: Characters:<Category>:<Name>
		const key = `Characters:${category}:${namePascal}`;

		// Source path: @/public/assets/images/characters/<file>
		const sourcePath = `@/public/assets/images/characters/${file}`;

		return {
			key,
			label,
			sourcePath,
		};
	});

	// Sort by key to ensure deterministic output
	entries.sort((a, b) => a.key.localeCompare(b.key));

	// Generate File Content
	const lines = [
		'/**',
		' * Character Figure images (icons)',
		' *',
		' * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY',
		' * Run `bunx tsx scripts/generate-character-figures.ts` to update',
		' */',
		'',
		"import { ImageSourcePropType } from 'react-native';",
		'',
		'export type CharacterFigure = {',
		'\tkey: string;',
		'\tlabel: string;',
		'\tsource: ImageSourcePropType;',
		'};',
		'',
		'export const CHARACTER_IMAGE_OPTIONS: Array<CharacterFigure> = [',
	];

	entries.forEach((entry) => {
		lines.push('\t{');
		lines.push(`\t\tkey: '${entry.key}',`);
		lines.push(`\t\tlabel: '${entry.label}',`);
		lines.push(`\t\tsource: require('${entry.sourcePath}'),`);
		lines.push('\t},');
	});

	lines.push('];');
	lines.push(''); // Trailing newline

	const content = lines.join('\n');

	console.log(`Writing to ${OUTPUT_FILE}...`);
	fs.writeFileSync(OUTPUT_FILE, content, 'utf-8');
	console.log('Done.');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

