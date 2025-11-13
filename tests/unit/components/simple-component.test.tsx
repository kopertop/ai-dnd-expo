import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	assertNoConsoleErrors,
	renderWithProviders,
	waitForAsyncUpdates,
} from '@/tests/utils/render-helpers';

// Simple test component to verify the testing infrastructure works
const TestComponent: React.FC<{ message?: string }> = ({ message = 'Hello World' }) => {
	return <div data-testid="test-component">{message}</div>;
};

describe('Simple Component Test', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		assertNoConsoleErrors();
	});

	describe('Basic functionality', () => {
		it('should render without crashing', async () => {
			const { container } = renderWithProviders(<TestComponent />);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should display default message', async () => {
			const { getByText } = renderWithProviders(<TestComponent />);

			await waitForAsyncUpdates();

			expect(getByText('Hello World')).toBeTruthy();
		});

		it('should display custom message', async () => {
			const { getByText } = renderWithProviders(<TestComponent message="Custom Message" />);

			await waitForAsyncUpdates();

			expect(getByText('Custom Message')).toBeTruthy();
		});

		it('should have correct test id', async () => {
			const { getByTestId } = renderWithProviders(<TestComponent />);

			await waitForAsyncUpdates();

			expect(getByTestId('test-component')).toBeTruthy();
		});
	});
});
