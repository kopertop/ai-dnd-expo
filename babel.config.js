export default function (api) {
	api.cache(true);
	return {
		presets: ['babel-preset-expo'],
		plugins: [
			'babel-plugin-transform-import-meta',
			// Transform process.env.EXPO_PUBLIC_* variables at build time
			// This ensures they're replaced in static exports
			[
				'babel-plugin-transform-inline-environment-variables',
				{
					include: [
						'EXPO_PUBLIC_API_BASE_URL',
						'EXPO_PUBLIC_GOOGLE_CLIENT_ID',
						'EXPO_PUBLIC_OLLAMA_BASE_URL',
						'EXPO_PUBLIC_OLLAMA_API_KEY',
						'EXPO_PUBLIC_TTS_BASE_URL',
					],
				},
			],
			// Reanimated plugin must be last
			'react-native-reanimated/plugin',
		],
	};
}
