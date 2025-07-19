import React from 'react';
import { Text } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Collapsible } from '@/components/collapsible';
import {
	assertNoConsoleErrors,
	renderWithProviders,
	waitForAsyncUpdates,
} from '@/tests/utils/render-helpers';

describe('Collapsible', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		assertNoConsoleErrors();
	});

	describe('Component rendering', () => {
		it('should render without crashing', async () => {
			const { container } = renderWithProviders(
				<Collapsible title="Test Title">
					<Text>Test Content</Text>
				</Collapsible>,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should display the title', async () => {
			const { getByText } = renderWithProviders(
				<Collapsible title="My Collapsible">
					<Text>Content</Text>
				</Collapsible>,
			);

			await waitForAsyncUpdates();

			expect(getByText('My Collapsible')).toBeTruthy();
		});

		it('should render chevron icon', async () => {
			const { getByTestId } = renderWithProviders(
				<Collapsible title="Test Title">
					<Text>Content</Text>
				</Collapsible>,
			);

			await waitForAsyncUpdates();

			const icon = getByTestId('icon-symbol');
			expect(icon).toBeTruthy();
		});
	});

	describe('Content rendering', () => {
		it('should render simple text content', async () => {
			const { getByText } = renderWithProviders(
				<Collapsible title="Test Title">
					<Text>Simple text content</Text>
				</Collapsible>,
			);

			await waitForAsyncUpdates();

			expect(getByText('Simple text content')).toBeTruthy();
		});

		it('should render complex JSX content', async () => {
			const { getByText } = renderWithProviders(
				<Collapsible title="Test Title">
					<div>
						<Text>Complex</Text>
						<Text>Content</Text>
					</div>
				</Collapsible>,
			);

			await waitForAsyncUpdates();

			expect(getByText('Complex')).toBeTruthy();
			expect(getByText('Content')).toBeTruthy();
		});

		it('should render multiple children', async () => {
			const { getByText } = renderWithProviders(
				<Collapsible title="Test Title">
					<Text>First Child</Text>
					<Text>Second Child</Text>
				</Collapsible>,
			);

			await waitForAsyncUpdates();

			expect(getByText('First Child')).toBeTruthy();
			expect(getByText('Second Child')).toBeTruthy();
		});
	});

	describe('Props handling', () => {
		it('should handle different titles', async () => {
			const { getByText } = renderWithProviders(
				<Collapsible title="Custom Title">
					<Text>Content</Text>
				</Collapsible>,
			);

			await waitForAsyncUpdates();

			expect(getByText('Custom Title')).toBeTruthy();
		});

		it('should handle empty title', async () => {
			const { container } = renderWithProviders(
				<Collapsible title="">
					<Text>Content</Text>
				</Collapsible>,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});
	});

	describe('Edge cases', () => {
		it('should handle no children', async () => {
			const { getByText } = renderWithProviders(<Collapsible title="Empty Collapsible" />);

			await waitForAsyncUpdates();

			expect(getByText('Empty Collapsible')).toBeTruthy();
		});

		it('should handle null children', async () => {
			const { getByText } = renderWithProviders(
				<Collapsible title="Null Children">{null}</Collapsible>,
			);

			await waitForAsyncUpdates();

			expect(getByText('Null Children')).toBeTruthy();
		});

		it('should handle component lifecycle properly', async () => {
			const { container, unmount } = renderWithProviders(
				<Collapsible title="Test">
					<Text>Content</Text>
				</Collapsible>,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();

			// Should unmount without errors
			unmount();
		});
	});
});
