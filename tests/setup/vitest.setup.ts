import React from 'react';
import { vi } from 'vitest';

// Define global __DEV__ for Expo modules
(global as any).__DEV__ = true;

// Mock React Native modules that don't work in test environment
vi.mock('react-native', () => ({
	// Core components
	View: ({ children, ...props }: any) => React.createElement('div', props, children),
	Text: ({ children, ...props }: any) => React.createElement('span', props, children),
	ScrollView: ({ children, ...props }: any) =>
		React.createElement('div', { ...props, 'data-testid': 'scroll-view' }, children),
	TouchableOpacity: ({ children, onPress, ...props }: any) =>
		React.createElement('button', { ...props, onClick: onPress }, children),
	TextInput: (props: any) => React.createElement('input', props),
	Image: (props: any) => React.createElement('img', { ...props, alt: props.alt || 'image' }),
	SafeAreaView: ({ children, ...props }: any) =>
		React.createElement('div', { ...props, 'data-testid': 'safe-area-view' }, children),

	// Platform
	Platform: {
		OS: 'ios',
		select: vi.fn((options: any) => options.ios || options.default),
	},

	// Dimensions
	Dimensions: {
		get: vi.fn().mockReturnValue({ width: 375, height: 812 }),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	},

	// StyleSheet
	StyleSheet: {
		create: vi.fn((styles: any) => styles),
		flatten: vi.fn((style: any) => style),
	},

	// Alert
	Alert: {
		alert: vi.fn(),
	},

	// Color scheme
	useColorScheme: vi.fn().mockReturnValue('light'),
}));

// Mock Expo modules
vi.mock('expo-speech', () => ({
	speak: vi.fn(),
	stop: vi.fn(),
	pause: vi.fn(),
	resume: vi.fn(),
	isSpeaking: vi.fn().mockResolvedValue(false),
}));

vi.mock('expo-speech-recognition', () => ({
	requestPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
	getPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
	getSupportedLocales: vi.fn().mockResolvedValue(['en-US']),
	start: vi.fn(),
	stop: vi.fn(),
	abort: vi.fn(),
}));

vi.mock('expo-router', () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		back: vi.fn(),
		canGoBack: vi.fn().mockReturnValue(false),
	}),
	useLocalSearchParams: () => ({}),
	usePathname: () => '/',
	useSegments: () => [],
	router: {
		push: vi.fn(),
		replace: vi.fn(),
		back: vi.fn(),
		canGoBack: vi.fn().mockReturnValue(false),
	},
	Link: ({ children }: { children: React.ReactNode }) => children,
	Redirect: () => null,
}));

vi.mock('expo-audio', () => ({
	Audio: {
		Sound: {
			createAsync: vi.fn().mockResolvedValue({
				sound: {
					playAsync: vi.fn(),
					pauseAsync: vi.fn(),
					stopAsync: vi.fn(),
					unloadAsync: vi.fn(),
					setIsLoopingAsync: vi.fn(),
					setVolumeAsync: vi.fn(),
				},
			}),
		},
		setAudioModeAsync: vi.fn(),
	},
}));

vi.mock('expo-haptics', () => ({
	impactAsync: vi.fn(),
	notificationAsync: vi.fn(),
	selectionAsync: vi.fn(),
}));

vi.mock('expo-file-system', () => ({
	documentDirectory: '/mock/documents/',
	makeDirectoryAsync: vi.fn(),
	readAsStringAsync: vi.fn(),
	writeAsStringAsync: vi.fn(),
	copyAsync: vi.fn(),
	getInfoAsync: vi.fn(),
	downloadAsync: vi.fn(),
	createDownloadResumable: vi.fn(),
}));

vi.mock('cactus-react-native', () => ({
	CactusVLM: {
		init: vi.fn(),
	},
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
	getAllKeys: vi.fn().mockResolvedValue([]),
	multiGet: vi.fn().mockResolvedValue([]),
	multiSet: vi.fn(),
	multiRemove: vi.fn(),
}));

// Mock React Native Gesture Handler
vi.mock('react-native-gesture-handler', () => ({
	GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
	PanGestureHandler: ({ children }: { children: React.ReactNode }) => children,
	TapGestureHandler: ({ children }: { children: React.ReactNode }) => children,
	State: {},
	Directions: {},
}));

// Mock React Native Reanimated
vi.mock('react-native-reanimated', () => ({
	default: {
		View: ({ children }: { children: React.ReactNode }) => children,
		Text: ({ children }: { children: React.ReactNode }) => children,
		ScrollView: ({ children }: { children: React.ReactNode }) => children,
	},
	useSharedValue: vi.fn(() => ({ value: 0 })),
	useAnimatedStyle: vi.fn(() => ({})),
	withTiming: vi.fn(value => value),
	withSpring: vi.fn(value => value),
	runOnJS: vi.fn(fn => fn),
}));

// Mock React Native SVG
vi.mock('react-native-svg', () => ({
	Svg: ({ children }: { children: React.ReactNode }) => children,
	Circle: () => null,
	Path: () => null,
	G: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Skia
vi.mock('@shopify/react-native-skia', () => ({
	Canvas: ({ children }: { children: React.ReactNode }) => children,
	useCanvasRef: vi.fn(() => ({ current: null })),
	Circle: () => null,
	Path: () => null,
	Group: ({ children }: { children: React.ReactNode }) => children,
}));

// Note: Hook mocks removed - we test actual behavior instead of mocking our own code

// Import and setup enhanced external dependency mocks
import { MockManager } from '../unit/__mocks__/external-dependencies';

// Mock the specific problematic vector icons file to avoid JSX parsing issues
vi.mock('@expo/vector-icons/build/createIconSet', () => ({
	default: vi.fn(() => vi.fn(() => null)),
}));

// Also mock the main vector icons module
vi.mock('@expo/vector-icons', () => ({
	Feather: vi.fn(() => null),
	FontAwesome: vi.fn(() => null),
	MaterialIcons: vi.fn(() => null),
	Ionicons: vi.fn(() => null),
	AntDesign: vi.fn(() => null),
	Entypo: vi.fn(() => null),
	EvilIcons: vi.fn(() => null),
	Foundation: vi.fn(() => null),
	MaterialCommunityIcons: vi.fn(() => null),
	Octicons: vi.fn(() => null),
	Zocial: vi.fn(() => null),
	SimpleLineIcons: vi.fn(() => null),
}));

// Setup all external dependency mocks
MockManager.setupAll();

// Global test utilities
global.console = {
	...console,
	// Suppress console.warn and console.error in tests unless explicitly needed
	warn: vi.fn(),
	error: vi.fn(),
	log: vi.fn(), // Also suppress console.log in tests
};

// Mock performance API for performance testing
global.performance = {
	...performance,
	now: vi.fn(() => Date.now()),
};

// Setup DOM environment
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation(query => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(), // deprecated
		removeListener: vi.fn(), // deprecated
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));
