module.exports = function (api) {
	api.cache(true);
	return {
		presets: ['babel-preset-expo'],
		plugins: [
			require.resolve('expo-router/babel'),
			'babel-plugin-transform-import-meta',
			// Reanimated plugin must be last
			'react-native-reanimated/plugin',
		],
	};
};

