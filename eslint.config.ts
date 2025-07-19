import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fixupConfigRules, fixupPluginRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { defineConfig } from 'eslint/config';
import _import from 'eslint-plugin-import';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactNative from 'eslint-plugin-react-native';
// @ts-ignore - No type definitions available for eslint-plugin-react-native
import unicorn from 'eslint-plugin-unicorn';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all,
});

export default defineConfig([
	{
		ignores: [
			'**/node_modules/',
			'**/babel.config.js',
			'**/metro.config.js',
			'**/.eslintrc.js',
			'**/node_modules/',
			'**/build/',
			'**/dist/',
			'**/.expo/',
			'.wrangler/',
			'**/babel.config.js',
			'**/metro.config.js',
			'**/*.config.js',
			'**/.eslintcache',
			'**/*.d.ts',
			'**/*.mjs',
			'**/*.cjs',
			'**/*.js',
		],
	},
	{
		...fixupConfigRules(
			compat.extends(
				'eslint:recommended',
				'plugin:react/recommended',
				'plugin:react-hooks/recommended',
				'plugin:@typescript-eslint/recommended',
			),
		)[0],

		plugins: {
			react: fixupPluginRules(react),
			'react-hooks': fixupPluginRules(reactHooks),
			// @ts-ignore - Type compatibility issues with TypeScript ESLint plugin
			'@typescript-eslint': fixupPluginRules(typescriptEslint),
			import: fixupPluginRules(_import),
			'react-native': reactNative,
			unicorn,
			'unused-imports': unusedImports,
		},

		languageOptions: {
			globals: {
				...Object.fromEntries(
					Object.entries(globals.browser).map(([k, v]) => [k.trim(), v]),
				),
				...globals.node,
				...reactNative.environments['react-native']['react-native'],
			},

			parser: tsParser,
			ecmaVersion: 'latest',
			sourceType: 'module',

			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},

		settings: {
			react: {
				version: 'detect',
			},
		},

		rules: {
			indent: ['error', 'tab', { SwitchCase: 1 }],

			'unicorn/filename-case': [
				'error',
				{
					cases: {
						kebabCase: true,
					},
				},
			],

			'@typescript-eslint/no-unused-vars': 'warn',
			'unused-imports/no-unused-imports': 'warn',

			// Do not allow using default exports (always use named exports)
			'import/no-default-export': 'off',

			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: 'uuid',
							message:
								'Please use the custom ID generator from "../utils/id-generator" instead of uuid.',
						},
					],

					patterns: ['uuid/*', '*/uuid'],
				},
			],

			'react/jsx-uses-react': 'error',
			'react/jsx-uses-vars': 'error',
			'react-hooks/rules-of-hooks': 'error',
			'react-hooks/exhaustive-deps': 'warn',
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/no-non-null-assertion': 'warn',
			'@typescript-eslint/strict-boolean-expressions': 'off',
			'react-native/no-raw-text': [
				'error',
				{
					skip: ['ThemedText'],
				},
			],
			'react-native/no-inline-styles': 'off',

			'react/function-component-definition': [
				'error',
				{
					namedComponents: 'arrow-function',
				},
			],

			'import/order': [
				'error',
				{
					groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
					'newlines-between': 'always',

					alphabetize: {
						order: 'asc',
						caseInsensitive: true,
					},
				},
			],

			'no-console': [
				'warn',
				{
					allow: ['warn', 'error'],
				},
			],

			quotes: [
				'error',
				'single',
				{
					avoidEscape: true,
				},
			],

			'comma-dangle': ['error', 'always-multiline'],
			semi: ['error', 'always'],
		},
	},
	{
		files: ['**/*.ts', '**/*.tsx'],
		ignores: ['tests/**/*'],
		languageOptions: {
			parserOptions: {
				project: './tsconfig.json',
				tsconfigRootDir: __dirname,
			},
		},
		rules: {
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/no-require-imports': 'off',
		},
	},
	{
		files: ['eslint.config.ts'],
		rules: {
			'import/no-default-export': 'off', // Allow default export for ESLint config
		},
	},
	{
		files: ['tests/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
		ignores: ['**/vitest.setup.ts'],
		rules: {
			'no-restricted-syntax': [
				'error',
				{
					selector:
						'CallExpression[callee.object.name="vi"][callee.property.name="mock"]',
					message: 'Use vi.spyOn within beforeEach hooks instead',
				},
			],
		},
	},
]);
