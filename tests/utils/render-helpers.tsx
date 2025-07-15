import React from 'react';
import { expect, vi } from 'vitest';

// Define basic types for testing
interface RenderOptions {
	wrapper?: React.ComponentType<any>;
}

interface RenderResult {
	container: any;
	rerender: (ui: React.ReactElement) => void;
	unmount: () => void;
}

/**
 * Mock providers for testing React components
 */
interface MockProvidersProps {
	children: React.ReactNode;
}

const MockProviders: React.FC<MockProvidersProps> = ({ children }) => {
	// Mock any context providers that components might need
	return <>{children}</>;
};

/**
 * Simple render function for testing (without full testing library)
 */
export const renderWithProviders = (
	ui: React.ReactElement,
	options?: Omit<RenderOptions, 'wrapper'>
): RenderResult => {
	// Simple mock implementation for testing infrastructure
	return {
		container: null,
		rerender: vi.fn(),
		unmount: vi.fn(),
	};
};

/**
 * Wait for async updates to complete
 */
export const waitForAsyncUpdates = async (): Promise<void> => {
	await new Promise(resolve => setTimeout(resolve, 0));
};

/**
 * Assert that no console errors occurred during test
 */
export const assertNoConsoleErrors = (): void => {
	expect(console.error).not.toHaveBeenCalled();
};

/**
 * Mock hook factory for consistent hook testing
 */
export const createMockHook = <T,>(hookResult: T): (() => T) => {
	return vi.fn().mockReturnValue(hookResult);
};

/**
 * Mock component factory for testing component interactions
 */
export const createMockComponent = (name: string) => {
	const MockComponent = ({ children, ...props }: any) => (
		React.createElement('div', {
			'data-testid': `mock-${name.toLowerCase()}`,
			...props
		}, children)
	);
	MockComponent.displayName = `Mock${name}`;
	return MockComponent;
};

/**
 * Test utilities for component testing
 */
export const ComponentTestUtils = {
	/**
	 * Simulate user interaction with delay
	 */
	async simulateUserInteraction(callback: () => void, delay = 100): Promise<void> {
		callback();
		await new Promise(resolve => setTimeout(resolve, delay));
	},

	/**
	 * Wait for component to update after state change
	 */
	async waitForUpdate(timeout = 1000): Promise<void> {
		await new Promise(resolve => setTimeout(resolve, timeout));
	},

	/**
	 * Mock async operation with controllable timing
	 */
	createMockAsyncOperation: <T,>(result: T, delay = 100) => {
		return vi.fn().mockImplementation(
			() => new Promise<T>(resolve => setTimeout(() => resolve(result), delay))
		);
	},
};

// Re-export vitest utilities for convenience
export { vi } from 'vitest';
