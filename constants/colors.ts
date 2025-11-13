/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
	light: {
		headerText: '#8B2323',
		text: '#11181C',
		background: '#fff',
		tint: tintColorLight,
		icon: '#687076',
		tabIconDefault: '#687076',
		tabIconSelected: tintColorLight,
		// Extended properties for companion/quest systems
		primary: '#C9B037',
		secondary: '#237823',
		success: '#22c55e',
		warning: '#eab308',
		error: '#ef4444',
		backgroundSecondary: '#f8fafc',
		backgroundHighlight: '#FFF9DB',
		textSecondary: '#64748b',
		border: '#e2e8f0',
		primaryTranslucent: '#C9B03720',
		primaryText: '#ffffff',
	},
	dark: {
		headerText: '#C9B037',
		text: '#ECEDEE',
		background: '#151718',
		tint: tintColorDark,
		icon: '#9BA1A6',
		tabIconDefault: '#9BA1A6',
		tabIconSelected: tintColorDark,
		// Extended properties for companion/quest systems
		primary: '#C9B037',
		secondary: '#237823',
		success: '#16a34a',
		warning: '#ca8a04',
		error: '#dc2626',
		backgroundSecondary: '#1f2937',
		backgroundHighlight: '#FFF8E1',
		textSecondary: '#9ca3af',
		border: '#374151',
		primaryTranslucent: '#C9B03720',
		primaryText: '#ffffff',
	},
	// Keep legacy properties for backwards compatibility
	primary: '#C9B037',
	secondary: '#237823',
};
