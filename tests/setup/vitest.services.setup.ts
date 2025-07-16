import { vi } from 'vitest';

// Mock external dependencies for service tests
// Note: Individual test files should use vi.mock() calls in beforeEach hooks
// This file provides global setup for service tests

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
