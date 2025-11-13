const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');

const replacements = [
	{
		file: path.join(root, 'node_modules/zustand/esm/middleware.mjs'),
		before: 'import.meta.env ? import.meta.env.MODE : void 0',
		after: 'typeof process !== "undefined" && process.env ? process.env.NODE_ENV : void 0',
	},
];

function applyReplacement({ file, before, after }) {
	if (!fs.existsSync(file)) {
		console.warn(`[patch] Skipping missing file: ${file}`);
		return;
	}

	const content = fs.readFileSync(file, 'utf8');
	if (content.includes(after)) {
		return;
	}

	if (!content.includes(before)) {
		console.warn(`[patch] Pattern not found in ${file}`);
		return;
	}

	const updated = content.split(before).join(after);
	fs.writeFileSync(file, updated, 'utf8');
	console.log(`[patch] Patched ${file}`);
}

replacements.forEach(applyReplacement);

