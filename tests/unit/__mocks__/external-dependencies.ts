/**
 * External dependency mocks for unit testing
 * This file contains mocks for all external services and APIs
 */

import { vi } from 'vitest';

// Removed legacy provider mocks

/**
 * Mock AsyncStorage with in-memory implementation
 */
export const mockAsyncStorage = (() => {
	const storage = new Map<string, string>();

	return {
		getItem: vi.fn((key: string) => {
			const value = storage.get(key);
			return Promise.resolve(value || null);
		}),
		setItem: vi.fn((key: string, value: string) => {
			storage.set(key, value);
			return Promise.resolve();
		}),
		removeItem: vi.fn((key: string) => {
			storage.delete(key);
			return Promise.resolve();
		}),
		clear: vi.fn(() => {
			storage.clear();
			return Promise.resolve();
		}),
		getAllKeys: vi.fn(() => {
			return Promise.resolve(Array.from(storage.keys()));
		}),
		multiGet: vi.fn((keys: string[]) => {
			const result = keys.map(key => [key, storage.get(key) || null]);
			return Promise.resolve(result);
		}),
		multiSet: vi.fn((keyValuePairs: [string, string][]) => {
			keyValuePairs.forEach(([key, value]) => storage.set(key, value));
			return Promise.resolve();
		}),
		multiRemove: vi.fn((keys: string[]) => {
			keys.forEach(key => storage.delete(key));
			return Promise.resolve();
		}),
		// Test utilities
		_getStorage: () => storage,
		_clear: () => storage.clear(),
		reset: () => {
			storage.clear();
			vi.clearAllMocks();
		},
	};
})();

/**
 * Mock React Navigation functions and hooks
 */
export const mockNavigation = {
	navigate: vi.fn(),
	goBack: vi.fn(),
	push: vi.fn(),
	replace: vi.fn(),
	reset: vi.fn(),
	canGoBack: vi.fn().mockReturnValue(false),
	isFocused: vi.fn().mockReturnValue(true),
	addListener: vi.fn(),
	removeListener: vi.fn(),
	setOptions: vi.fn(),
	getState: vi.fn().mockReturnValue({
		index: 0,
		routes: [{ name: 'Home', key: 'home' }],
	}),
	// Test utilities
	simulateNavigation: (routeName: string, params?: any) => {
		mockNavigation.navigate.mockImplementationOnce((name, navParams) => {
			// Verify navigation was called with expected parameters
			if (name !== routeName) {
				throw new Error(`Expected navigation to ${routeName}, but got ${name}`);
			}
			if (params && JSON.stringify(navParams) !== JSON.stringify(params)) {
				throw new Error(
					`Expected params ${JSON.stringify(params)}, but got ${JSON.stringify(navParams)}`,
				);
			}
		});
	},
	resetMocks: () => {
		vi.clearAllMocks();
		mockNavigation.canGoBack.mockReturnValue(false);
		mockNavigation.isFocused.mockReturnValue(true);
	},
};

/**
 * Mock Expo Router functions
 */
export const mockExpoRouter: any = {
	router: {
		push: vi.fn(),
		replace: vi.fn(),
		back: vi.fn(),
		canGoBack: vi.fn().mockReturnValue(false),
		setParams: vi.fn(),
	},
	useRouter: vi.fn(() => mockExpoRouter.router),
	useLocalSearchParams: vi.fn(() => ({})),
	usePathname: vi.fn(() => '/'),
	useSegments: vi.fn(() => []),
	Link: vi.fn(({ children }) => children),
	Redirect: vi.fn(() => null),
	reset: () => {
		vi.clearAllMocks();
		mockExpoRouter.router.canGoBack.mockReturnValue(false);
		mockExpoRouter.useLocalSearchParams.mockReturnValue({});
		mockExpoRouter.usePathname.mockReturnValue('/');
		mockExpoRouter.useSegments.mockReturnValue([]);
	},
};

/**
 * Mock Apple Speech API
 */
export const mockAppleSpeech = {
	apple: {
		speechModel: vi.fn().mockReturnValue('apple-speech-model'),
	},
	AppleSpeech: {
		getVoices: vi.fn().mockResolvedValue([
			{
				identifier: 'com.apple.voice.compact.en-US.Samantha',
				name: 'Samantha',
				language: 'en-US',
				quality: 'default',
				isPersonalVoice: false,
				isNoveltyVoice: false,
			},
		]),
		generate: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
	},
	// Test utilities
	simulateVoices: (voices: any[]) => {
		mockAppleSpeech.AppleSpeech.getVoices.mockResolvedValueOnce(voices);
	},
	simulateError: (error: Error) => {
		mockAppleSpeech.AppleSpeech.generate.mockRejectedValueOnce(error);
	},
	reset: () => {
		vi.clearAllMocks();
		mockAppleSpeech.AppleSpeech.getVoices.mockResolvedValue([
			{
				identifier: 'com.apple.voice.compact.en-US.Samantha',
				name: 'Samantha',
				language: 'en-US',
				quality: 'default',
				isPersonalVoice: false,
				isNoveltyVoice: false,
			},
		]);
	},
};

/**
 * Mock AI Speech Generation
 */
export const mockAISpeech = {
	experimental_generateSpeech: vi.fn().mockResolvedValue({
		audio: {
			uint8Array: new Uint8Array(1024),
			base64: 'base64-encoded-audio',
		},
	}),
	// Test utilities
	simulateSuccess: (audioData: any) => {
		mockAISpeech.experimental_generateSpeech.mockResolvedValueOnce(audioData);
	},
	simulateError: (error: Error) => {
		mockAISpeech.experimental_generateSpeech.mockRejectedValueOnce(error);
	},
	reset: () => {
		vi.clearAllMocks();
		mockAISpeech.experimental_generateSpeech.mockResolvedValue({
			audio: {
				uint8Array: new Uint8Array(1024),
				base64: 'base64-encoded-audio',
			},
		});
	},
};

/**
 * Mock Expo Speech Recognition API
 */
export const mockExpoSpeechRecognition = {
	requestPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
	getPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
	getSupportedLocales: vi.fn().mockResolvedValue(['en-US', 'en-GB']),
	start: vi.fn().mockResolvedValue(undefined),
	stop: vi.fn().mockResolvedValue(undefined),
	abort: vi.fn().mockResolvedValue(undefined),
	isRecognitionAvailable: vi.fn().mockResolvedValue(true),
	// Test utilities
	simulateRecognition: (text: string) => {
		// Simulate recognition result callback
		const mockCallback = vi.fn();
		mockExpoSpeechRecognition.start.mockImplementationOnce(options => {
			if (options?.onResult) {
				setTimeout(() => options.onResult({ transcript: text, isFinal: true }), 100);
			}
			return Promise.resolve();
		});
	},
	simulatePermissionDenied: () => {
		mockExpoSpeechRecognition.requestPermissionsAsync.mockResolvedValueOnce({ granted: false });
		mockExpoSpeechRecognition.getPermissionsAsync.mockResolvedValueOnce({ granted: false });
	},
	reset: () => {
		vi.clearAllMocks();
		mockExpoSpeechRecognition.requestPermissionsAsync.mockResolvedValue({ granted: true });
		mockExpoSpeechRecognition.getPermissionsAsync.mockResolvedValue({ granted: true });
		mockExpoSpeechRecognition.isRecognitionAvailable.mockResolvedValue(true);
	},
};

/**
 * Mock Expo Audio API
 */
export const mockExpoAudio = {
	Audio: {
		Sound: {
			createAsync: vi.fn().mockResolvedValue({
				sound: {
					playAsync: vi.fn().mockResolvedValue(undefined),
					pauseAsync: vi.fn().mockResolvedValue(undefined),
					stopAsync: vi.fn().mockResolvedValue(undefined),
					unloadAsync: vi.fn().mockResolvedValue(undefined),
					setIsLoopingAsync: vi.fn().mockResolvedValue(undefined),
					setVolumeAsync: vi.fn().mockResolvedValue(undefined),
					getStatusAsync: vi.fn().mockResolvedValue({
						isLoaded: true,
						isPlaying: false,
						positionMillis: 0,
						durationMillis: 30000,
					}),
				},
			}),
		},
		setAudioModeAsync: vi.fn().mockResolvedValue(undefined),
		getAudioModeAsync: vi.fn().mockResolvedValue({
			allowsRecordingIOS: false,
			interruptionModeIOS: 0,
			playsInSilentModeIOS: false,
			staysActiveInBackground: false,
			interruptionModeAndroid: 1,
			shouldDuckAndroid: true,
			playThroughEarpieceAndroid: false,
		}),
	},
	// Test utilities
	simulatePlaybackError: (error: Error) => {
		mockExpoAudio.Audio.Sound.createAsync.mockRejectedValueOnce(error);
	},
	reset: () => {
		vi.clearAllMocks();
	},
};

/**
 * Mock Expo Haptics API
 */
export const mockExpoHaptics = {
	impactAsync: vi.fn().mockResolvedValue(undefined),
	notificationAsync: vi.fn().mockResolvedValue(undefined),
	selectionAsync: vi.fn().mockResolvedValue(undefined),
	// Test utilities
	simulateError: (error: Error) => {
		mockExpoHaptics.impactAsync.mockRejectedValueOnce(error);
	},
	reset: () => {
		vi.clearAllMocks();
	},
};

/**
 * Mock React Native Gesture Handler
 */
export const mockGestureHandler = {
	GestureHandlerRootView: vi.fn(({ children }) => children),
	PanGestureHandler: vi.fn(({ children }) => children),
	TapGestureHandler: vi.fn(({ children }) => children),
	LongPressGestureHandler: vi.fn(({ children }) => children),
	State: {
		UNDETERMINED: 0,
		FAILED: 1,
		BEGAN: 2,
		CANCELLED: 3,
		ACTIVE: 4,
		END: 5,
	},
	Directions: {
		RIGHT: 1,
		LEFT: 2,
		UP: 4,
		DOWN: 8,
	},
	reset: () => {
		vi.clearAllMocks();
	},
};

/**
 * Mock React Native Reanimated
 */
export const mockReanimated = {
	default: {
		View: vi.fn(({ children }) => children),
		Text: vi.fn(({ children }) => children),
		ScrollView: vi.fn(({ children }) => children),
	},
	useSharedValue: vi.fn(initialValue => ({ value: initialValue })),
	useAnimatedStyle: vi.fn(() => ({})),
	withTiming: vi.fn(value => value),
	withSpring: vi.fn(value => value),
	withDelay: vi.fn((delay, animation) => animation),
	runOnJS: vi.fn(fn => fn),
	interpolate: vi.fn(value => value),
	reset: () => {
		vi.clearAllMocks();
	},
};

/**
 * Mock Shopify React Native Skia
 */
export const mockSkia = {
	Canvas: vi.fn(({ children }) => children),
	useCanvasRef: vi.fn(() => ({ current: null })),
	Circle: vi.fn(() => null),
	Path: vi.fn(() => null),
	Group: vi.fn(({ children }) => children),
	Rect: vi.fn(() => null),
	Text: vi.fn(() => null),
	Image: vi.fn(() => null),
	reset: () => {
		vi.clearAllMocks();
	},
};

/**
 * Centralized mock manager for easy setup and teardown
 * Note: This class is kept for compatibility but individual vi.mock calls should be used in test files
 */
export class MockManager {
	static setupAll(): void {
		// Mock setup is now handled by individual vi.mock calls in test files
		// This method is kept for backward compatibility
	}

	static setupAsyncStorage(): void {
		// Use vi.mock('@react-native-async-storage/async-storage', () => ({ ... })) in test files
	}

	static setupNavigation(): void {
		// Use vi.mock('expo-router', () => ({ ... })) in test files
	}

	static setupAppleSpeech(): void {
		// Use vi.mock('@react-native-ai/apple', () => ({ ... })) in test files
	}

	static setupAISpeech(): void {
		// Use vi.mock('ai', () => ({ ... })) in test files
	}

	static setupReactNativeLibraries(): void {
		// Use vi.mock('react-native-gesture-handler', () => ({ ... })) in test files
	}

	static resetAll(): void {
		mockAsyncStorage.reset();
		mockNavigation.reset();
		mockExpoRouter.reset();
		mockAppleSpeech.reset();
		mockAISpeech.reset();
		mockExpoSpeechRecognition.reset();
		mockExpoAudio.reset();
		mockExpoHaptics.reset();
		mockGestureHandler.reset();
		mockReanimated.reset();
		mockSkia.reset();
	}

	static clearAllMocks(): void {
		vi.clearAllMocks();
	}
}

// Export individual mocks for specific use cases
export const AsyncStorageMock = mockAsyncStorage;
export const AudioMock = mockExpoAudio;
export const ExpoRouterMock = mockExpoRouter;
export const GestureHandlerMock = mockGestureHandler;
export const HapticsMock = mockExpoHaptics;
export const NavigationMock = mockNavigation;
export const ReanimatedMock = mockReanimated;
export const SkiaMock = mockSkia;
export const AppleSpeechMock = mockAppleSpeech;
export const AISpeechMock = mockAISpeech;
export const SpeechRecognitionMock = mockExpoSpeechRecognition;
