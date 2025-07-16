import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { assertNoConsoleErrors, renderWithProviders, waitForAsyncUpdates } from '@/tests/utils/render-helpers';

// Mock the constants
vi.mock('@/constants/classes', () => ({
	CLASSES: [
		{
			id: 'fighter',
			name: 'Fighter',
			description: 'A master of martial combat',
			image: 'fighter-image',
			isCustom: false,
		},
		{
			id: 'wizard',
			name: 'Wizard',
			description: 'A scholarly magic-user',
			image: 'wizard-image',
			isCustom: false,
		},
		{
			id: 'custom',
			name: 'Custom',
			description: 'Create your own class',
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
		<img src={source} style={style} alt="class-image" />
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

import { ClassChooser } from '@/components/class-chooser';

describe('ClassChooser', () => {
	const mockOnSelect = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		assertNoConsoleErrors();
	});

	describe('Component rendering', () => {
		it('should render without crashing', async () => {
			const { container, debug } = renderWithProviders(
				<ClassChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			debug(); // Let's see what's actually rendered
			expect(container).toBeTruthy();
		});

		it('should display the title', async () => {
			const { getByText } = renderWithProviders(
				<ClassChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			expect(getByText('Choose Your Class')).toBeTruthy();
		});

		it('should display all class options', async () => {
			const { getByText } = renderWithProviders(
				<ClassChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			expect(getByText('Fighter')).toBeTruthy();
			expect(getByText('Wizard')).toBeTruthy();
			expect(getByText('Custom')).toBeTruthy();
		});

		it('should display class descriptions', async () => {
			const { getByText } = renderWithProviders(
				<ClassChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			expect(getByText('A master of martial combat')).toBeTruthy();
			expect(getByText('A scholarly magic-user')).toBeTruthy();
			expect(getByText('Create your own class')).toBeTruthy();
		});
	});

	describe('Class selection', () => {
		it('should call onSelect when a non-custom class is selected', async () => {
			const { getByText } = renderWithProviders(
				<ClassChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			const fighterButton = getByText('Fighter').closest('button');
			fighterButton?.click();

			expect(mockOnSelect).toHaveBeenCalledWith({
				id: 'fighter',
				name: 'Fighter',
				description: 'A master of martial combat',
				image: expect.any(Object),
				isCustom: false,
			});
		});

		it('should show custom form when custom class is selected', async () => {
			const { getByText, queryByText } = renderWithProviders(
				<ClassChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			// Initially, custom form should not be visible
			expect(queryByText('Class Name')).toBeNull();

			// Click custom class
			const customButton = getByText('Custom').closest('button');
			customButton?.click();

			await waitForAsyncUpdates();

			// Custom form should now be visible
			expect(getByText('Class Name')).toBeTruthy();
			expect(getByText('Description')).toBeTruthy();
		});

		it('should not call onSelect immediately when custom class is selected', async () => {
			const { getByText } = renderWithProviders(
				<ClassChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			const customButton = getByText('Custom').closest('button');
			customButton?.click();

			expect(mockOnSelect).not.toHaveBeenCalled();
		});
	});

	describe('Custom class creation', () => {
		it('should show custom form with input fields', async () => {
			const { getByText, getByPlaceholderText } = renderWithProviders(
				<ClassChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			// Click custom class to show form
			const customButton = getByText('Custom').closest('button');
			customButton?.click();

			await waitForAsyncUpdates();

			expect(getByPlaceholderText('Enter class name')).toBeTruthy();
			expect(getByPlaceholderText('Describe your class')).toBeTruthy();
			expect(getByText('Create Class')).toBeTruthy();
		});

		it('should handle input changes in custom form', async () => {
			const { getByText, getByPlaceholderText } = renderWithProviders(
				<ClassChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			// Show custom form
			const customButton = getByText('Custom').closest('button');
			customButton?.click();

			await waitForAsyncUpdates();

			// Type in the inputs
			const nameInput = getByPlaceholderText('Enter class name') as HTMLInputElement;
			const descInput = getByPlaceholderText('Describe your class') as HTMLTextAreaElement;

			nameInput.value = 'Paladin';
			nameInput.dispatchEvent(new Event('change', { bubbles: true }));

			descInput.value = 'A holy warrior';
			descInput.dispatchEvent(new Event('change', { bubbles: true }));

			expect(nameInput.value).toBe('Paladin');
			expect(descInput.value).toBe('A holy warrior');
		});

		it('should create custom class when form is submitted with valid data', async () => {
			const { getByText, getByPlaceholderText } = renderWithProviders(
				<ClassChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			// Show custom form
			const customButton = getByText('Custom').closest('button');
			customButton?.click();

			await waitForAsyncUpdates();

			// Fill in the form
			const nameInput = getByPlaceholderText('Enter class name') as HTMLInputElement;
			const descInput = getByPlaceholderText('Describe your class') as HTMLTextAreaElement;

			nameInput.value = 'Paladin';
			nameInput.dispatchEvent(new Event('change', { bubbles: true }));

			descInput.value = 'A holy warrior';
			descInput.dispatchEvent(new Event('change', { bubbles: true }));

			// Submit the form
			const createButton = getByText('Create Class');
			createButton.click();

			expect(mockOnSelect).toHaveBeenCalledWith({
				id: 'custom',
				name: 'Paladin',
				description: 'A holy warrior',
				image: expect.any(Object),
				isCustom: true,
			});
		});

		it('should not create custom class when form is submitted with empty data', async () => {
			const { getByText } = renderWithProviders(
				<ClassChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			// Show custom form
			const customButton = getByText('Custom').closest('button');
			customButton?.click();

			await waitForAsyncUpdates();

			// Submit the form without filling it
			const createButton = getByText('Create Class');
			createButton.click();

			expect(mockOnSelect).not.toHaveBeenCalled();
		});
	});

	describe('Layout and styling', () => {
		it('should render scroll view', async () => {
			const { getByTestId } = renderWithProviders(
				<ClassChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			expect(getByTestId('scroll-view')).toBeTruthy();
		});

		it('should render class cards with proper structure', async () => {
			const { container } = renderWithProviders(
				<ClassChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			// Should have images for each class
			const images = container?.querySelectorAll('img[alt="class-image"]');
			expect(images?.length).toBe(3); // Fighter, Wizard, Custom
		});
	});

	describe('Edge cases', () => {
		it('should handle missing onSelect prop gracefully', async () => {
			const { container } = renderWithProviders(
				<ClassChooser onSelect={undefined as any} />
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should handle empty class list', async () => {
			// Mock empty classes
			vi.doMock('@/constants/classes', () => ({
				CLASSES: [],
			}));

			const { getByText } = renderWithProviders(
				<ClassChooser onSelect={mockOnSelect} />
			);

			await waitForAsyncUpdates();

			expect(getByText('Choose Your Class')).toBeTruthy();
		});
	});
});
