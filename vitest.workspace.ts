import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
	'./vitest.config.ts', // Frontend/unit tests (jsdom)
	'./vitest.services.config.ts', // Services/node tests
	'./vitest.api.config.ts', // API/Workers tests
]);
