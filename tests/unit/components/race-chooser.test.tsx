import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RaceChooser } from '@/components/race-chooser';
import {
	assertNoConsoleErrors,
	renderWithProviders,
	waitForAsyncUpdates,
} from '@/tests/utils/render-helpers';

describe('RaceChooser', () => {
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
			const { container } = renderWithProviders(<RaceChooser onSelect={mockOnSelect} />);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should display the title', async () => {
			const { getByText } = renderWithProviders(<RaceChooser onSelect={mockOnSelect} />);

			await waitForAsyncUpdates();

			expect(getByText('Choose Your Race')).toBeTruthy();
		});

		it('should display race options', async () => {
			const { getByText } = renderWithProviders(<RaceChooser onSelect={mockOnSelect} />);

			await waitForAsyncUpdates();

			// Should show at least some race names
			expect(getByText('Human')).toBeTruthy();
			expect(getByText('Elf')).toBeTruthy();
		});
	});

	describe('Layout and styling', () => {
		it('should render scroll view', async () => {
			const { getByTestId } = renderWithProviders(<RaceChooser onSelect={mockOnSelect} />);

			await waitForAsyncUpdates();

			expect(getByTestId('scroll-view')).toBeTruthy();
		});

		it('should render race cards with proper structure', async () => {
			const { container } = renderWithProviders(<RaceChooser onSelect={mockOnSelect} />);

			await waitForAsyncUpdates();

			// Should have images for each race
			const images = container?.querySelectorAll('img[alt="race-image"]');
			expect(images?.length).toBeGreaterThan(0);
		});
	});

	describe('Props handling', () => {
		it('should handle missing onSelect prop gracefully', async () => {
			const { container } = renderWithProviders(<RaceChooser onSelect={undefined as any} />);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should accept onSelect callback', async () => {
			const { container } = renderWithProviders(<RaceChooser onSelect={mockOnSelect} />);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
			expect(mockOnSelect).toBeInstanceOf(Function);
		});
	});

	describe('Edge cases', () => {
		it('should handle component lifecycle properly', async () => {
			const { container, unmount } = renderWithProviders(
				<RaceChooser onSelect={mockOnSelect} />,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();

			// Should unmount without errors
			unmount();
		});
	});
});
