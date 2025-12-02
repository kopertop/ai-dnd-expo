import { beforeEach, vi } from 'vitest';

// Ensure __DEV__ is defined for modules that expect it
(globalThis as any).__DEV__ = false;

// Hoisted mocks so modules under test resolve to stubs during transform
vi.mock('react-native', () => ({
	Platform: {
		OS: 'ios',
		select: (obj: any) => obj.ios || obj.default,
	},
	AppState: {
		addEventListener: vi.fn().mockImplementation((_event: any, _callback: any) => ({
			remove: vi.fn(),
		})),
	},
}));

vi.mock('expo-modules-core', () => ({
	NativeModule: class {},
	requireOptionalNativeModule: (_name: string) => undefined,
	UnavailabilityError: class extends Error {},
	Platform: {
		OS: 'web',
	},
}));

vi.mock('expo-file-system', () => ({
	documentDirectory: '/tmp',
	cacheDirectory: '/tmp',
	writeAsStringAsync: vi.fn(),
	readAsStringAsync: vi.fn(),
	getInfoAsync: vi.fn().mockResolvedValue({ exists: true, isDirectory: false }),
	makeDirectoryAsync: vi.fn(),
	readDirectoryAsync: vi.fn().mockResolvedValue([]),
	downloadAsync: vi.fn().mockResolvedValue({ uri: '/tmp/mock.onnx' }),
	deleteAsync: vi.fn(),
	getFreeDiskStorageAsync: vi.fn().mockResolvedValue(1024 * 1024 * 1024),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
	default: {
		getItem: vi.fn(),
		setItem: vi.fn(),
		removeItem: vi.fn(),
		clear: vi.fn(),
		getAllKeys: vi.fn().mockResolvedValue([]),
		multiGet: vi.fn().mockResolvedValue([]),
		multiSet: vi.fn(),
		multiRemove: vi.fn(),
	},
}));

vi.mock('onnxruntime-react-native', () => ({}));

// Additional per-test cleanup/mocking
beforeEach(() => {
	vi.useFakeTimers();
});

// Mock fetch for API calls
global.fetch = vi.fn().mockImplementation((_url: any) => Promise.resolve({
	ok: true,
	arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
	status: 200,
	statusText: 'OK',
}));

// Mock console methods for cleaner test output
global.console = {
	...console,
	warn: vi.fn(),
	error: vi.fn(),
	log: vi.fn(),
};
