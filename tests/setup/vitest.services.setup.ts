import { vi } from 'vitest';

// Mock external dependencies for service tests
// Note: Individual test files should use vi.mock() calls in beforeEach hooks
// This file provides global setup for service tests

// Mock React Native
vi.mock('react-native', () => ({
	Platform: {
		OS: 'ios',
		select: (obj) => obj.ios || obj.default,
	},
	AppState: {
		addEventListener: vi.fn().mockImplementation((event, callback) => {
			return {
				remove: vi.fn(),
			};
		}),
	},
}));

// Mock ONNX Runtime
vi.mock('onnxruntime-react-native', () => ({
	InferenceSession: {
		create: vi.fn().mockResolvedValue({
			inputNames: ['input_ids', 'attention_mask'],
			outputNames: ['logits'],
			run: vi.fn().mockResolvedValue({
				logits: {
					data: new Float32Array([0.1, 0.2, 0.7]),
				},
			}),
		}),
	},
	Tensor: vi.fn().mockImplementation((type, data, dims) => ({
		type,
		data,
		dims,
	})),
}));

// Mock fetch for API calls
global.fetch = vi.fn().mockImplementation((url) => {
	return Promise.resolve({
		ok: true,
		arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
		status: 200,
		statusText: 'OK',
	});
});

// Mock console methods for cleaner test output
global.console = {
	...console,
	warn: vi.fn(),
	error: vi.fn(),
	log: vi.fn(),
};

// Mock timers
vi.useFakeTimers();
