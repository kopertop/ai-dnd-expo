import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ClassChooser } from '@/components/class-chooser';
import { assertNoConsoleErrors, renderWithProviders, waitForAsyncUpdates } from '@/tests/utils/render-helpers';

describe('ClassChooser', () => {
	let mockOnSelect: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockOnSelect = vi.fn();
	});

	afterEach(() => {
		assertNoConsoleErrors();
	});

	describe('Component rendering', () => {
		it('should render without crashing', async () => {
			const { container } = renderWithProviders(
				<ClassChooser onSelect={mockOnSelect} />,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should display the title', async () => {
			const { getByText } = renderWithProviders(
				<ClassChooser onSelect={mockOnSelect} />,
			);

			await waitForAsyncUpdates();

			expect(getByText('Choose Your Class')).toBeTruthy();
		});

		it('should display class options', async () => {
			const { getByText } = renderWithProviders(
				<ClassChooser onSelect={mockOnSelect} />,
			);

			await waitForAsyncUpdates();

			// Should show at least some class names
			expect(getByText('Fighter')).toBeTruthy();
			expect(getByText('Wizard')).toBeTruthy();
		});
	});

	describe('Layout and styling', () => {
		it('should render scroll view', async () => {
			const { getByTestId } = renderWithProviders(
				<ClassChooser onSelect={mockOnSelect} />,
			);

			await waitForAsyncUpdates();

			expect(getByTestId('scroll-view')).toBeTruthy();
		});

		it('should render class cards with proper structure', async () => {
			const { container } = renderWithProviders(
				<ClassChooser onSelect={mockOnSelect} />,
			);

			await waitForAsyncUpdates();

			// Should have images for each class
			const images = container?.querySelectorAll('img[alt="class-image"]');
			expect(images?.length).toBeGreaterThan(0);
		});
	});

	describe('Props handling', () => {
		it('should handle missing onSelect prop gracefully', async () => {
			const { container } = renderWithProviders(
				<ClassChooser onSelect={undefined as any} />,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should accept onSelect callback', async () => {
			const { container } = renderWithProviders(
				<ClassChooser onSelect={mockOnSelect} />,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
			expect(mockOnSelect).toBeInstanceOf(Function);
		});
	});

	describe('Edge cases', () => {
		it('should handle component lifecycle properly', async () => {
			const { container, unmount } = renderWithProviders(
				<ClassChooser onSelect={mockOnSelect} />,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();

			// Should unmount without errors
			unmount();
		});
	});
});
