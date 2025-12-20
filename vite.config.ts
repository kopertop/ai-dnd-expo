import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';
import viteReact from '@vitejs/plugin-react';

export default defineConfig({
	server: {
		port: 8081,
	},
	envPrefix: ['VITE_', 'EXPO_PUBLIC_', 'GOOGLE_CLIENT_ID'],
	plugins: [
		tsConfigPaths({
			projects: ['./tsconfig.json'],
		}),
		tanstackStart(),
		viteReact(),
	],
});
