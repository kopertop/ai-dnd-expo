import { ExpoConfig } from 'expo/config';

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
		plugins: [
			'expo-font',
			'expo-web-browser',
			'expo-router',
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
		},
		extra: {
			router: {},
			eas: {
				projectId: 'f082f538-7adb-4504-a251-729b293f0cf6',
			},
		},
		updates: {
			url: 'https://u.expo.dev/f082f538-7adb-4504-a251-729b293f0cf6',
		},
	},
};

export default config;
