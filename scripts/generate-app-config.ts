#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';

async function generateAppConfig() {
	try {
		console.log('🔧 Generating app.json from app.ts...');

		// Import the TypeScript config using dynamic import
		const appConfigModule = await import(path.resolve('./app.ts'));
		const configFunction = appConfigModule.default;

		// Create a mock config context
		const mockContext = {
			config: {},
		};

		// Execute the config function
		const config = configFunction(mockContext);

		// Wrap in expo object structure expected by app.json
		const appJson = {
			expo: config,
		};

		// Write to app.json
		fs.writeFileSync('./app.json', JSON.stringify(appJson, null, 2));

		console.log('✅ Successfully generated app.json from app.ts');
	} catch (error: any) {
		console.error('❌ Failed to generate app.json:', error.message);
		process.exit(1);
	}
}

generateAppConfig();
