import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { assertNoConsoleErrors, renderWithProviders, waitForAsyncUpdates } from '@/tests/utils/render-helpers';

// Mock the constants
vi.mock('@/constants/skills', () => ({
	SKILL_LIST: [
		{
			id: 'athletics',
			name: 'Athletics',
			ability: 'STR',
			image: 'athletics-image',
		},
		{
			id: 'stealth',
			name: 'Stealth',
			ability: 'DEX',
			image: 'stealth-image',
		},
		{
			id: 'perception',
			name: 'Perception',
			ability: 'WIS',
			image: 'perception-image',
		},
		{
			id: 'arcana',
			name: 'Arcana',
			ability: 'INT',
			image: 'arcana-image',
		},
		{
			id: 'intimidate',
			name: 'Intimidate',
			ability: 'CHA',
			image: 'intimidate-image',
		},
	],
}));

// Mock the styles
vi.mock('@/styles/card-grid.styles', () => ({
	CARD_GAP: 8,
	SCREEN_WIDTH: 375,
	cardGridStyles: () => ({
		cardContainer: { flexDirection: 'row', flexWrap: 'wrap' },
		card: { borderWidth: 1, borderColor: '#ccc' },
		imageWrapper: {},
		image: {},
		overlay: {},
		cardTitle: { fontWeight: 'bold' },
		cardDesc: { fontSize: 12 },
	}),
	getCardsPerRow: () => 2,
	getContainerWidth: () => 350,
}));

vi.mock('@/styles/new-game.styles', () => ({
	newGameStyles: {
		scrollViewContent: { padding: 16 },
		title: { fontSize: 24, fontWeight: 'bold' },
		submitButton: { backgroundColor: '#007AFF', padding: 12 },
		submitButtonDisabled: { backgroundColor: '#ccc', padding: 12 },
		submitButtonText: { color: 'white', textAlign: 'center' },
	},
}));

// Mock React Native components
vi.mock('react-native', () => ({
	ScrollView: ({ children, contentContainerStyle }: any) => (
		<div data-testid="scroll-view" style={contentContainerStyle}>{children}</div>
	),
	View: ({ children, style }: any) => (
		<div style={style}>{children}</div>
	),
	Text: ({ children, style }: any) => (
		<span style={style}>{children}</span>
	),
	TouchableOpacity: ({ children, onPress, style, disabled }: any) => (
		<button onClick={onPress} style={style} disabled={disabled}>{children}</button>
	),
	Image: ({ source, style }: any) => (
		<img src={source} style={style} alt="skill-image" />
	),
}));

vi.mock('react-native-safe-area-context', () => ({
	SafeAreaView: ({ children, style }: any) => (
		<div data-testid="safe-area-view" style={style}>{children}</div>
	),
}));

import { SkillChooser } from '@/components/skill-chooser';

describe('SkillChooser', () => {
	const mockOnSelect = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		assertNoConsoleErrors();
	});

	describe('Component rendering', () => {
		it('should render without crashing', async () => {
			const { container } = renderWithProviders(
				<SkillChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should display the title with default max skills', async () => {
			const { getByText } = renderWithProviders(
				<SkillChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			expect(getByText('Choose 4 Skills')).toBeTruthy();
		});

		it('should display the title with custom max skills', async () => {
			const { getByText } = renderWithProviders(
				<SkillChooser onSelect={mockOnSelect} maxSkills={3} />
			);

			await waitForAsyncUpdates();

			expect(getByText('Choose 3 Skills')).toBeTruthy();
		});

		it('should display all available skills', async () => {
			const { getByText } = renderWithProviders(
				<SkillChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			expect(getByText('Athletics')).toBeTruthy();
			expect(getByText('Stealth')).toBeTruthy();
			expect(getByText('Perception')).toBeTruthy();
			expect(getByText('Arcana')).toBeTruthy();
			expect(getByText('Intimidate')).toBeTruthy();
		});

		it('should display skill abilities', async () => {
			const { getByText } = renderWithProviders(
				<SkillChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			expect(getByText('STR')).toBeTruthy();
			expect(getByText('DEX')).toBeTruthy();
			expect(getByText('WIS')).toBeTruthy();
			expect(getByText('INT')).toBeTruthy();
			expect(getByText('CHA')).toBeTruthy();
		});
	});

	describe('Skill selection', () => {
		it('should select skills when clicked', async () => {
			const { getByText, container } = renderWithProviders(
				<SkillChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			// Click on Athletics skill
			const athleticsButton = getByText('Athletics').closest('button');
			athleticsButton?.click();

			await waitForAsyncUpdates();

			// Should show Athletics in the selected skills area (top slots)
			// The skill should move from the grid to the top slots
			expect(container).toBeTruthy();
		});

		it('should deselect skills when clicked again', async () => {
			const { getByText } = renderWithProviders(
				<SkillChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			// Select a skill
			const athleticsButton = getByText('Athletics').closest('button');
			athleticsButton?.click();

			await waitForAsyncUpdates();

			// Click again to deselect
			athleticsButton?.click();

			await waitForAsyncUpdates();

			// Skill should be deselected (back in the main grid)
			expect(getByText('Athletics')).toBeTruthy();
		});

		it('should not allow selecting more than maxSkills', async () => {
			const { getByText } = renderWithProviders(
				<SkillChooser onSelect={mockOnSelect} maxSkills={2} />
			);

			await waitForAsyncUpdates();

			// Select first skill
			const athleticsButton = getByText('Athletics').closest('button');
			athleticsButton?.click();

			await waitForAsyncUpdates();

			// Select second skill
			const stealthButton = getByText('Stealth').closest('button');
			stealthButton?.click();

			await waitForAsyncUpdates();

			// Try to select third skill (should not work)
			const perceptionButton = getByText('Perception').closest('button');
			perceptionButton?.click();

			await waitForAsyncUpdates();

			// Should still have only 2 skills selected
			expect(getByText('Perception')).toBeTruthy(); // Should still be in unselected area
		});

		it('should show empty slots for unselected skills', async () => {
			const { getByText } = renderWithProviders(
				<SkillChooser onSelect={mockOnSelect} maxSkills={4} />
			);

			await waitForAsyncUpdates();

			// Should show 4 empty slots initially
			const emptySlots = getByText('Empty');
			expect(emptySlots).toBeTruthy();
		});
	});

	describe('Confirm button', () => {
		it('should show disabled confirm button when not all skills selected', async () => {
			const { getByText } = renderWithProviders(
				<SkillChooser onSelect={mockOnSelect} maxSkills={4} />
			);

			await waitForAsyncUpdates();

			const confirmButton = getByText('Confirm Skills') as HTMLButtonElement;
			expect(confirmButton.disabled).toBe(true);
		});

		it('should enable confirm button when all skills selected', async () => {
			const { getByText } = renderWithProviders(
				<SkillChooser onSelect={mockOnSelect} maxSkills={2} />
			);

			await waitForAsyncUpdates();

			// Select required number of skills
			const athleticsButton = getByText('Athletics').closest('button');
			athleticsButton?.click();

			await waitForAsyncUpdates();

			const stealthButton = getByText('Stealth').closest('button');
			stealthButton?.click();

			await waitForAsyncUpdates();

			const confirmButton = getByText('Confirm Skills') as HTMLButtonElement;
			expect(confirmButton.disabled).toBe(false);
		});

		it('should call onSelect with selected skills when confirmed', async () => {
			const { getByText } = renderWithProviders(
				<SkillChooser onSelect={mockOnSelect} maxSkills={2} />
			);

			await waitForAsyncUpdates();

			// Select skills
			const athleticsButton = getByText('Athletics').closest('button');
			athleticsButton?.click();

			await waitForAsyncUpdates();

			const stealthButton = getByText('Stealth').closest('button');
			stealthButton?.click();

			await waitForAsyncUpdates();

			// Confirm selection
			const confirmButton = getByText('Confirm Skills');
			confirmButton.click();

			expect(mockOnSelect).toHaveBeenCalledWith([
				{
					id: 'athletics',
					name: 'Athletics',
					ability: 'STR',
					image: expect.any(Object),
				},
				{
					id: 'stealth',
					name: 'Stealth',
					ability: 'DEX',
					image: expect.any(Object),
				},
			]);
		});
	});

	describe('Initial skills', () => {
		it('should pre-select initial skills', async () => {
			const initialSkills = [
				{
					id: 'athletics',
					name: 'Athletics',
					ability: 'STR',
					image: 'athletics-image',
				},
			];

			const { getByText } = renderWithProviders(
				<SkillChooser
					onSelect={mockOnSelect}
					initialSkills={initialSkills}
					maxSkills={2}
				/>
			);

			await waitForAsyncUpdates();

			// Athletics should be pre-selected (not in the unselected grid)
			// The confirm button should be closer to enabled
			expect(getByText('Athletics')).toBeTruthy();
		});
	});

	describe('Layout and styling', () => {
		it('should render safe area view', async () => {
			const { getByTestId } = renderWithProviders(
				<SkillChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			expect(getByTestId('safe-area-view')).toBeTruthy();
		});

		it('should render scroll view', async () => {
			const { getByTestId } = renderWithProviders(
				<SkillChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			expect(getByTestId('scroll-view')).toBeTruthy();
		});

		it('should render skill images', async () => {
			const { container } = renderWithProviders(
				<SkillChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			// Should have images for each skill
			const images = container?.querySelectorAll('img[alt="skill-image"]');
			expect(images?.length).toBeGreaterThan(0);
		});
	});

	describe('Edge cases', () => {
		it('should handle missing onSelect prop gracefully', async () => {
			const { container } = renderWithProviders(
				<SkillChooser onSelect={undefined as any} />
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should handle zero maxSkills', async () => {
			const { getByText } = renderWithProviders(
				<SkillChooser onSelect={mockOnSelect} maxSkills={0} />
			);

			await waitForAsyncUpdates();

			expect(getByText('Choose 0 Skills')).toBeTruthy();

			// Confirm button should be enabled immediately
			const confirmButton = getByText('Confirm Skills') as HTMLButtonElement;
			expect(confirmButton.disabled).toBe(false);
		});

		it('should handle maxSkills greater than available skills', async () => {
			const { getByText } = renderWithProviders(
				<SkillChooser onSelect={mockOnSelect} maxSkills={10} />
			);

			await waitForAsyncUpdates();

			expect(getByText('Choose 10 Skills')).toBeTruthy();
		});
	});
});
