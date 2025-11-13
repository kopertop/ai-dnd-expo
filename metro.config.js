const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add web-specific resolver to stub native modules
config.resolver = {
	...config.resolver,
	resolveRequest: (context, moduleName, platform) => {
		// Stub native-only modules for web
		if (platform === 'web') {
			const nativeModules = [
				'cactus-react-native',
				'onnxruntime-react-native',
				'expo-speech-recognition',
			];

			if (nativeModules.includes(moduleName)) {
				return {
					type: 'empty',
					filePath: require.resolve('./adapters/web-stubs.js'),
				};
			}
		}

		// Default resolution
		return context.resolveRequest(context, moduleName, platform);
	},
};

module.exports = config;

