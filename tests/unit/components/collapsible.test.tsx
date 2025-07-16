import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { assertNoConsoleErrors, renderWithProviders, waitForAsyncUpdates } from '@/tests/utils/render-helpers';

// Mock the hooks
vi.mock('@/hooks/use-color-scheme', () => ({
	useColorScheme: vi.fn(() => 'light'),
}));

// Mock the components
vi.mock('@/components/themed-text', () => ({
	ThemedText: ({ children, type }: any) => (
		<span data-type={type}>{children}</span>
	),
}));

vi.mock('@/components/themed-view', () => ({
	ThemedView: ({ children, style }: any) => (
		<div style={style}>{children}</div>
	),
}));

vi.mock('@/components/ui/icon-symbol', () => ({
	IconSymbol: ({ name, size, weight, color, style }: any) => (
		<span
			data-testid="icon-symbol"
			data-name={name}
			data-size={size}
			data-weight={weight}
			style={{ color, ...style }}
		>
			{name}
		</span>
	),
}));

// Mock constants
vi.mock('@/constants/colors', () => ({
	Colors: {
		light: {
			icon: '#000000',
		},
		dark: {
			icon: '#FFFFFF',
		},
	},
}));

// Mock React Native components
vi.mock('react-native', () => ({
	TouchableOpacity: ({ children, onPress, style, activeOpacity }: any) => (
		<button onClick={onPress} style={style} data-active-opacity={activeOpacity}>
			{children}
		</button>
	),
	StyleSheet: {
		create: vi.fn(styles => styles),
	},
}));

import { Collapsible } from '@/components/collapsible';

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
					<span>Test Content</span>
				</Collapsible>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should display the title', async () => {
			const { getByText } = renderWithProviders(
				<Collapsible title="My Collapsible">
					<span>Content</span>
				</Collapsible>
			);

			await waitForAsyncUpdates();

			expect(getByText('My Collapsible')).toBeTruthy();
		});

		it('should render chevron icon', async () => {
			const { getByTestId } = renderWithProviders(
				<Collapsible title="Test Title">
					<span>Content</span>
				</Collapsible>
			);

			await waitForAsyncUpdates();

			const icon = getByTestId('icon-symbol');
			expect(icon.getAttribute('data-name')).toBe('chevron.right');
		});

		it('should not show content initially (collapsed)', async () => {
			const { queryByText } = renderWithProviders(
				<Collapsible title="Test Title">
					<span>Hidden Content</span>
				</Collapsible>
			);

			await waitForAsyncUpdates();

			expect(queryByText('Hidden Content')).toBeNull();
		});
	});

	describe('Expand/Collapse functionality', () => {
		it('should show content when clicked (expanded)', async () => {
			const { getByText, queryByText } = renderWithProviders(
				<Collapsible title="Test Title">
					<span>Expandable Content</span>
				</Collapsible>
			);

			await waitForAsyncUpdates();

			// Initially hidden
			expect(queryByText('Expandable Content')).toBeNull();

			// Click to expand
			const titleButton = getByText('Test Title').closest('button');
			titleButton?.click();

			await waitForAsyncUpdates();

			// Should now be visible
			expect(getByText('Expandable Content')).toBeTruthy();
		});

		it('should hide content when clicked again (collapsed)', async () => {
			const { getByText, queryByText } = renderWithProviders(
				<Collapsible title="Test Title">
					<span>Toggle Content</span>
				</Collapsible>
			);

			await waitForAsyncUpdates();

			const titleButton = getByText('Test Title').closest('button');

			// Click to expand
			titleButton?.click();
			await waitForAsyncUpdates();
			expect(getByText('Toggle Content')).toBeTruthy();

			// Click to collapse
			titleButton?.click();
			await waitForAsyncUpdates();
			expect(queryByText('Toggle Content')).toBeNull();
		});

		it('should rotate chevron icon when expanded', async () => {
			const { getByText, getByTestId } = renderWithProviders(
				<Collapsible title="Test Title">
					<span>Content</span>
				</Collapsible>
			);

			await waitForAsyncUpdates();

			const icon = getByTestId('icon-symbol');
			const titleButton = getByText('Test Title').closest('button');

			// Initially should have 0deg rotation
			expect(icon.style.transform).toContain('rotate(0deg)');

			// Click to expand
			titleButton?.click();
			await waitForAsyncUpdates();

			// Should now have 90deg rotation
			expect(icon.style.transform).toContain('rotate(90deg)');
		});
	});

	describe('Theme support', () => {
		it('should use light theme colors', async () => {
			const { useColorScheme } = await import('@/hooks/use-color-scheme');
			vi.mocked(useColorScheme).mockReturnValue('light');

			const { getByTestId } = renderWithProviders(
				<Collapsible title="Test Title">
					<span>Content</span>
				</Collapsible>
			);

			await waitForAsyncUpdates();

			const icon = getByTestId('icon-symbol');
			expect(icon.style.color).toBe('#000000');
		});

		it('should use dark theme colors', async () => {
			const { useColorScheme } = await import('@/hooks/use-color-scheme');
			vi.mocked(useColorScheme).mockReturnValue('dark');

			const { getByTestId } = renderWithProviders(
				<Collapsible title="Test Title">
					<span>Content</span>
				</Collapsible>
			);

			await waitForAsyncUpdates();

			const icon = getByTestId('icon-symbol');
			expect(icon.style.color).toBe('#FFFFFF');
		});

		it('should handle null color scheme', async () => {
			const { useColorScheme } = await import('@/hooks/use-color-scheme');
			vi.mocked(useColorScheme).mockReturnValue(null);

			const { getByTestId } = renderWithProviders(
				<Collapsible title="Test Title">
					<span>Content</span>
				</Collapsible>
			);

			await waitForAsyncUpdates();

			const icon = getByTestId('icon-symbol');
			expect(icon.style.color).toBe('#000000'); // Should default to light theme
		});
	});

	describe('Content rendering', () => {
		it('should render simple text content', async () => {
			const { getByText } = renderWithProviders(
				<Collapsible title="Test Title">
					Simple text content
				</Collapsible>
			);

			await waitForAsyncUpdates();

			// Expand to see content
			const titleButton = getByText('Test Title').closest('button');
			titleButton?.click();
			await waitForAsyncUpdates();

			expect(getByText('Simple text content')).toBeTruthy();
		});

		it('should render complex JSX content', async () => {
			const { getByText } = renderWithProviders(
				<Collapsible title="Test Title">
					<div>
						<h3>Complex Content</h3>
						<p>With multiple elements</p>
						<button>And interactive elements</button>
					</div>
				</Collapsible>
			);

			await waitForAsyncUpdates();

			// Expand to see content
			const titleButton = getByText('Test Title').closest('button');
			titleButton?.click();
			await waitForAsyncUpdates();

			expect(getByText('Complex Content')).toBeTruthy();
			expect(getByText('With multiple elements')).toBeTruthy();
			expect(getByText('And interactive elements')).toBeTruthy();
		});

		it('should render multiple children', async () => {
			const { getByText } = renderWithProviders(
				<Collapsible title="Test Title">
					<span>First child</span>
					<span>Second child</span>
					<span>Third child</span>
				</Collapsible>
			);

			await waitForAsyncUpdates();

			// Expand to see content
			const titleButton = getByText('Test Title').closest('button');
			titleButton?.click();
			await waitForAsyncUpdates();

			expect(getByText('First child')).toBeTruthy();
			expect(getByText('Second child')).toBeTruthy();
			expect(getByText('Third child')).toBeTruthy();
		});
	});

	describe('Icon properties', () => {
		it('should render icon with correct properties', async () => {
			const { getByTestId } = renderWithProviders(
				<Collapsible title="Test Title">
					<span>Content</span>
				</Collapsible>
			);

			await waitForAsyncUpdates();

			const icon = getByTestId('icon-symbol');
			expect(icon.getAttribute('data-name')).toBe('chevron.right');
			expect(icon.getAttribute('data-size')).toBe('18');
			expect(icon.getAttribute('data-weight')).toBe('medium');
		});
	});

	describe('Edge cases', () => {
		it('should handle empty title', async () => {
			const { container } = renderWithProviders(
				<Collapsible title="">
					<span>Content</span>
				</Collapsible>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should handle no children', async () => {
			const { getByText } = renderWithProviders(
				<Collapsible title="Empty Collapsible">
				</Collapsible>
			);

			await waitForAsyncUpdates();

			// Expand to see (empty) content
			const titleButton = getByText('Empty Collapsible').closest('button');
			titleButton?.click();
			await waitForAsyncUpdates();

			expect(getByText('Empty Collapsible')).toBeTruthy();
		});

		it('should handle null children', async () => {
			const { getByText } = renderWithProviders(
				<Collapsible title="Null Children">
					{null}
				</Collapsible>
			);

			await waitForAsyncUpdates();

			// Expand to see content
			const titleButton = getByText('Null Children').closest('button');
			titleButton?.click();
			await waitForAsyncUpdates();

			expect(getByText('Null Children')).toBeTruthy();
		});
	});
});
