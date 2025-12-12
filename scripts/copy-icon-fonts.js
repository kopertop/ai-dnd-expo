#!/usr/bin/env node
/**
 * Copy icon fonts from node_modules to dist/assets/fonts for Cloudflare Pages deployment
 * Since Cloudflare Pages doesn't upload node_modules, we need to copy the fonts manually
 */

const fs = require('fs');
const path = require('path');

const fontsDir = path.join(__dirname, '../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts');
const distFontsDir = path.join(__dirname, '../dist/assets/fonts');
const assetsFontsDir = path.join(__dirname, '../assets/fonts');

// Fonts we need based on what's used in the app
const requiredFonts = [
	'Feather.ttf',
	'Ionicons.ttf',
	'MaterialIcons.ttf',
	'MaterialCommunityIcons.ttf',
	'FontAwesome.ttf',
	'FontAwesome5_Brands.ttf',
	'FontAwesome5_Solid.ttf',
	'FontAwesome5_Regular.ttf',
];

// Create directories if they don't exist
if (!fs.existsSync(distFontsDir)) {
	fs.mkdirSync(distFontsDir, { recursive: true });
}
if (!fs.existsSync(assetsFontsDir)) {
	fs.mkdirSync(assetsFontsDir, { recursive: true });
}

// Copy each font file to both locations
let copied = 0;
let skipped = 0;

for (const font of requiredFonts) {
	const sourcePath = path.join(fontsDir, font);
	const distDestPath = path.join(distFontsDir, font);
	const assetsDestPath = path.join(assetsFontsDir, font);

	if (fs.existsSync(sourcePath)) {
		// Copy to dist for deployment
		fs.copyFileSync(sourcePath, distDestPath);
		// Also copy to assets so require() can find them during build
		fs.copyFileSync(sourcePath, assetsDestPath);
		console.log(`✓ Copied ${font}`);
		copied++;
	} else {
		console.log(`⚠ Skipped ${font} (not found)`);
		skipped++;
	}
}

console.log(`\nDone! Copied ${copied} fonts to dist/assets/fonts and assets/fonts, skipped ${skipped} missing fonts.`);




