import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SkillChooser } from '@/components/skill-chooser';
import {
	assertNoConsoleErrors,
	renderWithProviders,
	waitForAsyncUpdates,
} from '@/tests/utils/render-helpers';

describe('SkillChooser', () => {
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
			const { container } = renderWithProviders(<SkillChooser onSelect={mockOnSelect} />);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should display the title with default max skills', async () => {
			const { getByText } = renderWithProviders(<SkillChooser onSelect={mockOnSelect} />);

			await waitForAsyncUpdates();

			expect(getByText('Choose 4 Skills')).toBeTruthy();
		});

		it('should display the title with custom max skills', async () => {
			const { getByText } = renderWithProviders(
				<SkillChooser onSelect={mockOnSelect} maxSkills={3} />,
			);

			await waitForAsyncUpdates();

			expect(getByText('Choose 3 Skills')).toBeTruthy();
		});

		it('should display skill options', async () => {
			const { getByText } = renderWithProviders(<SkillChooser onSelect={mockOnSelect} />);

			await waitForAsyncUpdates();

			// Should show at least some skill names
			expect(getByText('Athletics')).toBeTruthy();
			expect(getByText('Stealth')).toBeTruthy();
		});

		it('should display confirm button', async () => {
			const { getByText } = renderWithProviders(<SkillChooser onSelect={mockOnSelect} />);

			await waitForAsyncUpdates();

			expect(getByText('Confirm Skills')).toBeTruthy();
		});
	});

	describe('Layout and styling', () => {
		it('should render safe area view', async () => {
			const { getByTestId } = renderWithProviders(<SkillChooser onSelect={mockOnSelect} />);

			await waitForAsyncUpdates();

			expect(getByTestId('safe-area-view')).toBeTruthy();
		});

		it('should render scroll view', async () => {
			const { getByTestId } = renderWithProviders(<SkillChooser onSelect={mockOnSelect} />);

			await waitForAsyncUpdates();

			expect(getByTestId('scroll-view')).toBeTruthy();
		});

		it('should render skill images', async () => {
			const { container } = renderWithProviders(<SkillChooser onSelect={mockOnSelect} />);

			await waitForAsyncUpdates();

			// Should have images for each skill
			const images = container?.querySelectorAll('img[alt="skill-image"]');
			expect(images?.length).toBeGreaterThan(0);
		});
	});

	describe('Props handling', () => {
		it('should handle missing onSelect prop gracefully', async () => {
			const { container } = renderWithProviders(<SkillChooser onSelect={undefined as any} />);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should accept maxSkills prop', async () => {
			const { getByText } = renderWithProviders(
				<SkillChooser onSelect={mockOnSelect} maxSkills={2} />,
			);

			await waitForAsyncUpdates();

			expect(getByText('Choose 2 Skills')).toBeTruthy();
		});

		it('should accept initialSkills prop', async () => {
			const initialSkills = [
				{ id: 'athletics', name: 'Athletics', ability: 'STR' },
				{ id: 'stealth', name: 'Stealth', ability: 'DEX' },
			];
			const { container } = renderWithProviders(
				<SkillChooser onSelect={mockOnSelect} initialSkills={initialSkills} />,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});
	});

	describe('Edge cases', () => {
		it('should handle zero maxSkills', async () => {
			const { getByText } = renderWithProviders(
				<SkillChooser onSelect={mockOnSelect} maxSkills={0} />,
			);

			await waitForAsyncUpdates();

			expect(getByText('Choose 0 Skills')).toBeTruthy();
		});

		it('should handle large maxSkills', async () => {
			const { getByText } = renderWithProviders(
				<SkillChooser onSelect={mockOnSelect} maxSkills={10} />,
			);

			await waitForAsyncUpdates();

			expect(getByText('Choose 10 Skills')).toBeTruthy();
		});

		it('should handle component lifecycle properly', async () => {
			const { container, unmount } = renderWithProviders(
				<SkillChooser onSelect={mockOnSelect} />,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();

			// Should unmount without errors
			unmount();
		});
	});
});
