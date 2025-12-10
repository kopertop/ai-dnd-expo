import { ExpoConfig } from 'expo/config';

// Expo automatically loads .env files, so process.env should be available here
// We put these in extra so they're accessible via Constants.expoConfig.extra
// This works for static exports where process.env is not replaced in the bundle
// NOTE: API keys should NOT be included here - they should only be used server-side
const env = {
	apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || '',
	googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
	ollamaBaseUrl: process.env.EXPO_PUBLIC_OLLAMA_BASE_URL || '',
	ttsBaseUrl: process.env.EXPO_PUBLIC_TTS_BASE_URL || '',
};

const now = new Date();
const buildVersion = `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}.${now.getHours()}`;

const config: { expo: ExpoConfig } = {
	expo: {
		name: 'ai-dnd-expo',
		slug: 'ai-dnd-expo',
		scheme: 'aidndexpo',
		version: require('./package.json').version,
		orientation: 'portrait',
		icon: './assets/images/icon.png',
		userInterfaceStyle: 'light',
		newArchEnabled: true,
		owner: 'kopertop',
		experiments: {
			typedRoutes: true,
		},
		assetBundlePatterns: [
			'**/*',
			'assets/**/*',
		],
		plugins: [
			'expo-font',
			'expo-web-browser',
			'expo-router',
			'expo-asset',
			'expo-secure-store',
			[
				'expo-splash-screen',
				{
					image: './assets/images/splash-icon.png',
					imageWidth: 200,
					resizeMode: 'contain',
					backgroundColor: '#ffffff',
				},
			],
			'expo-audio',
			'expo-speech-recognition',
		],
		splash: {
			image: './assets/images/splash-icon.png',
			resizeMode: 'contain',
			backgroundColor: '#ffffff',
		},
		ios: {
			usesAppleSignIn: true,
			supportsTablet: true,
			bundleIdentifier: 'org.coredumped.ai-dnd',
			buildNumber: buildVersion,
			infoPlist: {
				ITSAppUsesNonExemptEncryption: false,
				NSPhotoLibraryUsageDescription: 'Used to save and upload images of your character and game world.',
			},
			entitlements: {
				'aps-environment': 'production',
				'com.apple.developer.applesignin': ['Default'],
			},
		},
		web: {
			favicon: './assets/images/favicon.png',
			bundler: 'metro',
			output: 'static',
			// Cloudflare Pages configuration
			baseUrl: '/',
			// Ensure vector icons work on web
			build: {
				babel: {
					include: ['@expo/vector-icons'],
				},
			},
			// Add font preloading for better performance
			preload: {
				fonts: [
					'Ionicons',
					'MaterialIcons',
					'MaterialCommunityIcons',
					'FontAwesome',
					'FontAwesome5',
					'Feather',
				],
			},
		},
		extra: {
			router: {},
			eas: {
				projectId: 'f082f538-7adb-4504-a251-729b293f0cf6',
			},
			// Environment variables accessible via Constants.expoConfig.extra
			// This works for static exports where process.env is not replaced
			// NOTE: API keys are excluded - they should only be used server-side
			apiBaseUrl: env.apiBaseUrl,
			googleClientId: env.googleClientId,
			ollamaBaseUrl: env.ollamaBaseUrl,
			ttsBaseUrl: env.ttsBaseUrl,
		},
		updates: {
			url: 'https://u.expo.dev/f082f538-7adb-4504-a251-729b293f0cf6',
		},
	},
};

export default config;
