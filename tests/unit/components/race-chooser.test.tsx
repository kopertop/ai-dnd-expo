import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { assertNoConsoleErrors, renderWithProviders, waitForAsyncUpdates } from '@/tests/utils/render-helpers';

// Mock the constants
vi.mock('@/constants/races', () => ({
	RACES: [
		{
			id: 'human',
			name: 'Human',
			description: 'Versatile and ambitious',
			image: 'human-image',
			isCustom: false,
		},
		{
			id: 'elf',
			name: 'Elf',
			description: 'Graceful and long-lived',
			image: 'elf-image',
			isCustom: false,
		},
		{
			id: 'custom',
			name: 'Custom',
			description: 'Create your own race',
			image: 'custom-image',
			isCustom: true,
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
		scrollViewContent: {},
		title: { fontSize: 24, fontWeight: 'bold' },
		sectionBox: { padding: 16 },
		label: { fontSize: 16 },
		input: { borderWidth: 1, padding: 8 },
		textArea: { height: 80 },
		submitButton: { backgroundColor: '#007AFF', padding: 12 },
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
	TouchableOpacity: ({ children, onPress, style }: any) => (
		<button onClick={onPress} style={style}>{children}</button>
	),
	Image: ({ source, style }: any) => (
		<img src={source} style={style} alt="race-image" />
	),
	TextInput: ({ value, onChangeText, placeholder, style, multiline }: any) => (
		multiline ?
			<textarea
				value={value}
				onChange={(e) => onChangeText?.(e.target.value)}
				placeholder={placeholder}
				style={style}
			/> :
			<input
				type="text"
				value={value}
				onChange={(e) => onChangeText?.(e.target.value)}
				placeholder={placeholder}
				style={style}
			/>
	),
}));

import { RaceChooser } from '@/components/race-chooser';

describe('RaceChooser', () => {
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
				<RaceChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should display the title', async () => {
			const { getByText } = renderWithProviders(
				<RaceChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			expect(getByText('Choose Your Race')).toBeTruthy();
		});

		it('should display all race options', async () => {
			const { getByText } = renderWithProviders(
				<RaceChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			expect(getByText('Human')).toBeTruthy();
			expect(getByText('Elf')).toBeTruthy();
			expect(getByText('Custom')).toBeTruthy();
		});

		it('should display race descriptions', async () => {
			const { getByText } = renderWithProviders(
				<RaceChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			expect(getByText('Versatile and ambitious')).toBeTruthy();
			expect(getByText('Graceful and long-lived')).toBeTruthy();
			expect(getByText('Create your own race')).toBeTruthy();
		});
	});

	describe('Race selection', () => {
		it('should call onSelect when a non-custom race is selected', async () => {
			const { getByText } = renderWithProviders(
				<RaceChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			const humanButton = getByText('Human').closest('button');
			humanButton?.click();

			expect(mockOnSelect).toHaveBeenCalledWith({
				id: 'human',
				name: 'Human',
				description: 'Versatile and ambitious',
				image: expect.any(Object),
				isCustom: false,
			});
		});

		it('should show custom form when custom race is selected', async () => {
			const { getByText, queryByText } = renderWithProviders(
				<RaceChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			// Initially, custom form should not be visible
			expect(queryByText('Race Name')).toBeNull();

			// Click custom race
			const customButton = getByText('Custom').closest('button');
			customButton?.click();

			await waitForAsyncUpdates();

			// Custom form should now be visible
			expect(getByText('Race Name')).toBeTruthy();
			expect(getByText('Description')).toBeTruthy();
		});

		it('should not call onSelect immediately when custom race is selected', async () => {
			const { getByText } = renderWithProviders(
				<RaceChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			const customButton = getByText('Custom').closest('button');
			customButton?.click();

			expect(mockOnSelect).not.toHaveBeenCalled();
		});
	});

	describe('Custom race creation', () => {
		it('should show custom form with input fields', async () => {
			const { getByText, getByPlaceholderText } = renderWithProviders(
				<RaceChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			// Click custom race to show form
			const customButton = getByText('Custom').closest('button');
			customButton?.click();

			await waitForAsyncUpdates();

			expect(getByPlaceholderText('Enter race name')).toBeTruthy();
			expect(getByPlaceholderText('Describe your race')).toBeTruthy();
			expect(getByText('Create Race')).toBeTruthy();
		});

		it('should handle input changes in custom form', async () => {
			const { getByText, getByPlaceholderText } = renderWithProviders(
				<RaceChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			// Show custom form
			const customButton = getByText('Custom').closest('button');
			customButton?.click();

			await waitForAsyncUpdates();

			// Type in the inputs
			const nameInput = getByPlaceholderText('Enter race name') as HTMLInputElement;
			const descInput = getByPlaceholderText('Describe your race') as HTMLTextAreaElement;

			nameInput.value = 'Dragonborn';
			nameInput.dispatchEvent(new Event('change', { bubbles: true }));

			descInput.value = 'Descendants of dragons';
			descInput.dispatchEvent(new Event('change', { bubbles: true }));

			expect(nameInput.value).toBe('Dragonborn');
			expect(descInput.value).toBe('Descendants of dragons');
		});

		it('should create custom race when form is submitted with valid data', async () => {
			const { getByText, getByPlaceholderText } = renderWithProviders(
				<RaceChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			// Show custom form
			const customButton = getByText('Custom').closest('button');
			customButton?.click();

			await waitForAsyncUpdates();

			// Fill in the form
			const nameInput = getByPlaceholderText('Enter race name') as HTMLInputElement;
			const descInput = getByPlaceholderText('Describe your race') as HTMLTextAreaElement;

			nameInput.value = 'Dragonborn';
			nameInput.dispatchEvent(new Event('change', { bubbles: true }));

			descInput.value = 'Descendants of dragons';
			descInput.dispatchEvent(new Event('change', { bubbles: true }));

			// Submit the form
			const createButton = getByText('Create Race');
			createButton.click();

			expect(mockOnSelect).toHaveBeenCalledWith({
				id: 'custom',
				name: 'Dragonborn',
				description: 'Descendants of dragons',
				image: expect.any(Object),
				isCustom: true,
			});
		});

		it('should not create custom race when form is submitted with empty data', async () => {
			const { getByText } = renderWithProviders(
				<RaceChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			// Show custom form
			const customButton = getByText('Custom').closest('button');
			customButton?.click();

			await waitForAsyncUpdates();

			// Submit the form without filling it
			const createButton = getByText('Create Race');
			createButton.click();

			expect(mockOnSelect).not.toHaveBeenCalled();
		});
	});

	describe('Layout and styling', () => {
		it('should render scroll view', async () => {
			const { getByTestId } = renderWithProviders(
				<RaceChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			expect(getByTestId('scroll-view')).toBeTruthy();
		});

		it('should render race cards with proper structure', async () => {
			const { container } = renderWithProviders(
				<RaceChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			// Should have images for each race
			const images = container?.querySelectorAll('img[alt="race-image"]');
			expect(images?.length).toBe(3); // Human, Elf, Custom
		});
	});

	describe('Edge cases', () => {
		it('should handle missing onSelect prop gracefully', async () => {
			const { container } = renderWithProviders(
				<RaceChooser onSelect={undefined as any} />
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should handle empty race list', async () => {
			// Mock empty races
			vi.doMock('@/constants/races', () => ({
				RACES: [],
			}));

			const { getByText } = renderWithProviders(
				<RaceChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			expect(getByText('Choose Your Race')).toBeTruthy();
		});

		it('should handle race selection with elf', async () => {
			const { getByText } = renderWithProviders(
				<RaceChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			const elfButton = getByText('Elf').closest('button');
			elfButton?.click();

			expect(mockOnSelect).toHaveBeenCalledWith({
				id: 'elf',
				name: 'Elf',
				description: 'Graceful and long-lived',
				image: expect.any(Object),
				isCustom: false,
			});
		});
	});
});
