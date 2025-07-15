import { vi } from 'vitest';

// Mock external dependencies for service tests
vi.mock('cactus-react-native', () => ({
	CactusClient: vi.fn().mockImplementation(() => ({
		generateText: vi.fn().mockResolvedValue({
			text: 'Mock AI response',
			usage: { totalTokens: 10 },
		}),
		isAvailable: vi.fn().mockReturnValue(true),
		configure: vi.fn(),
	})),
}));

// Mock AsyncStorage for service tests
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

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock console methods for cleaner test output
global.console = {
	...console,
	warn: vi.fn(),
	error: vi.fn(),
	log: vi.fn(),
};

// Mock timers
vi.useFakeTimers();
