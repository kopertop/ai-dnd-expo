/**
 * Platform-specific mocks for React Native and Expo APIs
 * These mocks ensure tests run consistently across different environments
 */

import { vi } from 'vitest';

/**
 * Mock React Native Platform API
 */
export const mockPlatform = {
	OS: 'ios' as const,
	Version: '15.0',
	isPad: false,
	isTesting: true,
	select: vi.fn((options: any) => options.ios || options.default),
	constants: {},
	// Test utilities
	setOS: (os: 'ios' | 'android' | 'web') => {
		(mockPlatform as any).OS = os;
	},
	reset: () => {
		(mockPlatform as any).OS = 'ios';
		mockPlatform.isPad = false;
		vi.clearAllMocks();
	},
};

/**
 * Mock React Native Dimensions API
 */
export const mockDimensions = {
	get: vi.fn().mockReturnValue({ width: 375, height: 812 }),
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
	// Test utilities
	setDimensions: (width: number, height: number) => {
		mockDimensions.get.mockReturnValue({ width, height });
	},
	simulateOrientationChange: (landscape: boolean = false) => {
		const dimensions = landscape ? { width: 812, height: 375 } : { width: 375, height: 812 };
		mockDimensions.get.mockReturnValue(dimensions);

		// Simulate event callback
		const listeners = mockDimensions.addEventListener.mock.calls
			.filter(([event]) => event === 'change')
			.map(([, callback]) => callback);

		listeners.forEach(callback => callback(dimensions));
	},
	reset: () => {
		vi.clearAllMocks();
		mockDimensions.get.mockReturnValue({ width: 375, height: 812 });
	},
};

/**
 * Mock React Native Alert API
 */
export const mockAlert = {
	alert: vi.fn(),
	prompt: vi.fn(),
	// Test utilities
	simulateAlertResponse: (buttonIndex: number = 0) => {
		const lastCall = mockAlert.alert.mock.calls[mockAlert.alert.mock.calls.length - 1];
		if (lastCall && lastCall[2] && lastCall[2][buttonIndex]) {
			const button = lastCall[2][buttonIndex];
			if (button.onPress) button.onPress();
		}
	},
	reset: () => {
		vi.clearAllMocks();
	},
};

/**
 * Mock React Native StyleSheet API
 */
export const mockStyleSheet = {
	create: vi.fn(styles => styles),
	flatten: vi.fn(style => style),
	compose: vi.fn((style1, style2) => ({ ...style1, ...style2 })),
	hairlineWidth: 1,
	absoluteFill: {
		position: 'absolute',
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
	},
	reset: () => {
		vi.clearAllMocks();
	},
};

/**
 * Mock React Native Linking API
 */
export const mockLinking = {
	openURL: vi.fn().mockResolvedValue(true),
	canOpenURL: vi.fn().mockResolvedValue(true),
	getInitialURL: vi.fn().mockResolvedValue(null),
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
	// Test utilities
	simulateDeepLink: (url: string) => {
		const listeners = mockLinking.addEventListener.mock.calls
			.filter(([event]) => event === 'url')
			.map(([, callback]) => callback);

		listeners.forEach(callback => callback({ url }));
	},
	reset: () => {
		vi.clearAllMocks();
		mockLinking.canOpenURL.mockResolvedValue(true);
		mockLinking.getInitialURL.mockResolvedValue(null);
	},
};

/**
 * Mock Expo Constants API
 */
export const mockExpoConstants = {
	expoConfig: {
		name: 'AI D&D Test App',
		slug: 'ai-dnd-test',
		version: '1.0.0',
	},
	platform: {
		ios: {
			platform: 'ios',
			model: 'iPhone',
		},
	},
	isDevice: false,
	deviceName: 'Test Device',
	reset: () => {
		// Constants don't typically need resetting
	},
};

/**
 * Mock Expo Font API
 */
export const mockExpoFont = {
	loadAsync: vi.fn().mockResolvedValue(undefined),
	isLoaded: vi.fn().mockReturnValue(true),
	isLoading: vi.fn().mockReturnValue(false),
	// Test utilities
	simulateLoadingError: (error: Error) => {
		mockExpoFont.loadAsync.mockRejectedValueOnce(error);
	},
	reset: () => {
		vi.clearAllMocks();
		mockExpoFont.isLoaded.mockReturnValue(true);
		mockExpoFont.isLoading.mockReturnValue(false);
	},
};

/**
 * Mock Expo Image API
 */
export const mockExpoImage = {
	Image: vi.fn(({ children, ...props }) => ({ type: 'Image', props, children })),
	// Test utilities
	reset: () => {
		vi.clearAllMocks();
	},
};

/**
 * Mock React Native SVG
 */
export const mockReactNativeSVG = {
	Svg: vi.fn(({ children, ...props }) => ({ type: 'Svg', props, children })),
	Circle: vi.fn(props => ({ type: 'Circle', props })),
	Path: vi.fn(props => ({ type: 'Path', props })),
	G: vi.fn(({ children, ...props }) => ({ type: 'G', props, children })),
	Rect: vi.fn(props => ({ type: 'Rect', props })),
	Text: vi.fn(({ children, ...props }) => ({ type: 'SvgText', props, children })),
	Line: vi.fn(props => ({ type: 'Line', props })),
	Polygon: vi.fn(props => ({ type: 'Polygon', props })),
	reset: () => {
		vi.clearAllMocks();
	},
};

/**
 * Centralized platform mock manager
 */
export class PlatformMockManager {
	static setupAll(): void {
		this.setupReactNative();
		this.setupExpo();
		this.setupSVG();
	}

	static setupReactNative(): void {
		// Use vi.mock('react-native', () => ({ ... })) in test files
	}

	static setupExpo(): void {
		// Use vi.mock('expo-constants', () => ({ ... })) in test files
	}

	static setupSVG(): void {
		// Use vi.mock('react-native-svg', () => ({ ... })) in test files
	}

	static resetAll(): void {
		mockPlatform.reset();
		mockDimensions.reset();
		mockAlert.reset();
		mockStyleSheet.reset();
		mockLinking.reset();
		mockExpoConstants.reset();
		mockExpoFont.reset();
		mockExpoImage.reset();
		mockReactNativeSVG.reset();
	}
}

// Export individual mocks
export {
	mockAlert as AlertMock,
	mockDimensions as DimensionsMock,
	mockExpoConstants as ExpoConstantsMock,
	mockExpoFont as ExpoFontMock,
	mockExpoImage as ExpoImageMock,
	mockLinking as LinkingMock,
	mockPlatform as PlatformMock,
	mockReactNativeSVG as SVGMock,
	mockStyleSheet as StyleSheetMock,
};
