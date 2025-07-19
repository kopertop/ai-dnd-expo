import { act, renderHook } from '@testing-library/react-native';
import React from 'react';
import { vi } from 'vitest';

/**
 * Hook testing utilities for consistent hook testing patterns
 */

/**
 * Render a hook with optional wrapper component
 */
export const renderHookWithWrapper = <T extends any[], R>(
	hook: (props: T) => R,
	options?: {
		wrapper?: React.ComponentType<{ children: React.ReactNode }>;
		initialProps?: T;
	},
) => {
	return renderHook(hook, {
		wrapper: options?.wrapper,
		initialProps: options?.initialProps,
	});
};

/**
 * Wait for async updates in hooks
 */
export const waitForHookUpdate = async (callback?: () => void | Promise<void>) => {
	await act(async () => {
		if (callback) {
			await callback();
		}
		// Allow any pending promises to resolve
		await new Promise(resolve => setTimeout(resolve, 0));
	});
};

/**
 * Create a mock provider wrapper for context-based hooks
 */
export const createMockProvider = <T>(
	Context: React.Context<T>,
	value: T,
): React.ComponentType<{ children: React.ReactNode }> => {
	return function ({ children }) {
		return React.createElement(Context.Provider, { value }, children);
	};
};

/**
 * Simulate async operations with proper act wrapping
 */
export const simulateAsyncOperation = async (operation: () => Promise<void>) => {
	await act(async () => {
		await operation();
	});
};

/**
 * Create a spy that can be used in hook tests
 */
export const createHookSpy = <T extends (...args: any[]) => any>(
	implementation?: T,
): T & {
	mockImplementation: (impl: T) => void;
	mockResolvedValue: (value: any) => void;
	mockRejectedValue: (error: any) => void;
} => {
	const spy = vi.fn(implementation) as any;
	spy.mockImplementation = (impl: T) => spy.mockImplementation(impl);
	spy.mockResolvedValue = (value: any) => spy.mockResolvedValue(value);
	spy.mockRejectedValue = (error: any) => spy.mockRejectedValue(error);
	return spy;
};

/**
 * Wait for a condition to be true with timeout
 */
export const waitForCondition = async (
	condition: () => boolean,
	timeout = 5000,
	interval = 100,
): Promise<void> => {
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		if (condition()) {
			return;
		}
		await new Promise(resolve => setTimeout(resolve, interval));
	}

	throw new Error(`Condition not met within ${timeout}ms`);
};

/**
 * Test performance of hook operations
 */
export const measureHookPerformance = async <T>(
	operation: () => Promise<T>,
): Promise<{ result: T; duration: number }> => {
	const startTime = performance.now();
	const result = await operation();
	const endTime = performance.now();

	return {
		result,
		duration: endTime - startTime,
	};
};
