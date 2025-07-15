import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock React Native modules that don't work in test environment
vi.mock('react-native', async () => {
	const RN = (await vi.importActual('react-native')) as Record<string, unknown>;

	return {
		...RN,
		NativeModules: {
			...((RN?.NativeModules as Record<string, unknown>) || {}),
			ExpoSpeech: {
				speak: vi.fn(),
				stop: vi.fn(),
				pause: vi.fn(),
				resume: vi.fn(),
				isSpeaking: vi.fn().mockResolvedValue(false),
			},
			ExpoSpeechRecognition: {
				requestPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
				getPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
				getSupportedLocales: vi.fn().mockResolvedValue(['en-US']),
				start: vi.fn(),
				stop: vi.fn(),
				abort: vi.fn(),
			},
		},
		Platform: {
			OS: 'ios',
			select: vi.fn(options => options.ios || options.default),
		},
		Dimensions: {
			get: vi.fn().mockReturnValue({ width: 375, height: 812 }),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		},
		StyleSheet: {
			create: vi.fn(styles => styles),
			flatten: vi.fn(style => style),
		},
		Alert: {
			alert: vi.fn(),
		},
	};
});

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

// Mock Cactus React Native
vi.mock('cactus-react-native', () => ({
	CactusClient: vi.fn().mockImplementation(() => ({
		generateText: vi.fn().mockResolvedValue({
			text: 'Mock AI response',
			usage: { totalTokens: 10 },
		}),
		isAvailable: vi.fn().mockReturnValue(true),
	})),
}));

// Global test utilities
global.console = {
	...console,
	// Suppress console.warn and console.error in tests unless explicitly needed
	warn: vi.fn(),
	error: vi.fn(),
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
