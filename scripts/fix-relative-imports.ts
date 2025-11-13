import * as fs from 'fs';

import { glob } from 'glob';

// Patterns to replace relative imports with @/ aliases
const replacements = [
	// Direct parent folder access
	{ from: /from ['"]\.\.\/components\//g, to: "from '@/components/" },
	{ from: /from ['"]\.\.\/hooks\//g, to: "from '@/hooks/" },
	{ from: /from ['"]\.\.\/services\//g, to: "from '@/services/" },
	{ from: /from ['"]\.\.\/types\//g, to: "from '@/types/" },
	{ from: /from ['"]\.\.\/constants\//g, to: "from '@/constants/" },
	{ from: /from ['"]\.\.\/utils\//g, to: "from '@/utils/" },

	// Multi-level parent folder access
	{ from: /from ['"]\.\.\/\.\.\/components\//g, to: "from '@/components/" },
	{ from: /from ['"]\.\.\/\.\.\/hooks\//g, to: "from '@/hooks/" },
	{ from: /from ['"]\.\.\/\.\.\/services\//g, to: "from '@/services/" },
	{ from: /from ['"]\.\.\/\.\.\/types\//g, to: "from '@/types/" },
	{ from: /from ['"]\.\.\/\.\.\/constants\//g, to: "from '@/constants/" },
	{ from: /from ['"]\.\.\/\.\.\/utils\//g, to: "from '@/utils/" },

	// Even deeper nesting (like in tests)
	{ from: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/services\//g, to: "from '@/services/" },
	{ from: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/types\//g, to: "from '@/types/" },
	{ from: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/constants\//g, to: "from '@/constants/" },
	{ from: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/utils\//g, to: "from '@/utils/" },
	{ from: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/hooks\//g, to: "from '@/hooks/" },
	{ from: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/components\//g, to: "from '@/components/" },
];

function fixFileImports(filePath: string): boolean {
	const content = fs.readFileSync(filePath, 'utf8');
	let newContent = content;
	let hasChanges = false;

	replacements.forEach(({ from, to }) => {
		if (from.test(newContent)) {
			newContent = newContent.replace(from, to);
			hasChanges = true;
		}
	});

	if (hasChanges) {
		fs.writeFileSync(filePath, newContent, 'utf8');
		console.log(`Fixed imports in: ${filePath}`);
		return true;
	}

	return false;
}

async function main() {
	// Find all TypeScript/TSX files (excluding node_modules and build directories)
	const files = await glob('**/*.{ts,tsx}', {
		ignore: [
			'**/node_modules/**',
			'**/build/**',
			'**/dist/**',
			'**/.expo/**',
			'**/coverage/**',
		],
	});

	console.log(`Found ${files.length} TypeScript files to check...`);

	let fixedCount = 0;
	files.forEach(file => {
		if (fixFileImports(file)) {
			fixedCount++;
		}
	});

	console.log(`\nFixed relative imports in ${fixedCount} files.`);

	if (fixedCount > 0) {
		console.log('\nRun "npm run lint" to verify all imports are now correct.');
	}
}

main().catch(console.error);
