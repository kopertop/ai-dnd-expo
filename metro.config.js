const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for package.json exports and deep node_modules imports
config.resolver = {
	...config.resolver,
	// Allow deep imports from node_modules
	unstable_enablePackageExports: true,
	resolveRequest: (context, moduleName, platform) => {
		// Handle better-auth/client subpath export
		if (moduleName === 'better-auth/client' || moduleName.startsWith('better-auth/dist/client')) {
			const filePath = path.resolve(
				__dirname,
				'node_modules/better-auth/dist/client/index.cjs'
			);
			return {
				filePath,
				type: 'sourceFile',
			};
		}
		// Handle better-auth-cloudflare/client subpath export
		if (moduleName === 'better-auth-cloudflare/client' || moduleName.startsWith('better-auth-cloudflare/dist/client')) {
			const filePath = path.resolve(
				__dirname,
				'node_modules/better-auth-cloudflare/dist/client.cjs'
			);
			return {
				filePath,
				type: 'sourceFile',
			};
		}
		// Default resolution
		return context.resolveRequest(context, moduleName, platform);
	},
};

module.exports = config;
