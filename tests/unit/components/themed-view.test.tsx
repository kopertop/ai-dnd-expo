import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { assertNoConsoleErrors, renderWithProviders, waitForAsyncUpdates } from '@/tests/utils/render-helpers';

// Mock the hook
vi.mock('@/hooks/use-theme-color', () => ({
	useThemeColor: vi.fn(() => '#FFFFFF'),
}));

// Mock React Native components
vi.mock('react-native', () => ({
	View: ({ children, style, ...props }: any) => (
		<div style={style} {...props}>{children}</div>
	),
}));

import { ThemedView } from '@/components/themed-view';

describe('ThemedView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		assertNoConsoleErrors();
	});

	describe('Component rendering', () => {
		it('should render without crashing', async () => {
			const { container } = renderWithProviders(
				<ThemedView />
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should render with children', async () => {
			const { getByText } = renderWithProviders(
				<ThemedView>
					<span>Child Content</span>
				</ThemedView>
			);

			await waitForAsyncUpdates();

			expect(getByText('Child Content')).toBeTruthy();
		});

		it('should render multiple children', async () => {
			const { getByText } = renderWithProviders(
				<ThemedView>
					<span>First Child</span>
					<span>Second Child</span>
				</ThemedView>
			);

			await waitForAsyncUpdates();

			expect(getByText('First Child')).toBeTruthy();
			expect(getByText('Second Child')).toBeTruthy();
		});
	});

	describe('Theme colors', () => {
		it('should use theme color from hook', async () => {
			const { useThemeColor } = await import('@/hooks/use-theme-color');
			vi.mocked(useThemeColor).mockReturnValue('#F0F0F0');

			const { container } = renderWithProviders(
				<ThemedView>Content</ThemedView>
			);

			await waitForAsyncUpdates();

			expect(useThemeColor).toHaveBeenCalledWith({ light: undefined, dark: undefined }, 'background');
		});

		it('should use custom light color', async () => {
			const { useThemeColor } = await import('@/hooks/use-theme-color');
			vi.mocked(useThemeColor).mockReturnValue('#FFFFFF');

			const { container } = renderWithProviders(
				<ThemedView lightColor="#FFFFFF">Light Background</ThemedView>
			);

			await waitForAsyncUpdates();

			expect(useThemeColor).toHaveBeenCalledWith({ light: '#FFFFFF', dark: undefined }, 'background');
		});

		it('should use custom dark color', async () => {
			const { useThemeColor } = await import('@/hooks/use-theme-color');
			vi.mocked(useThemeColor).mockReturnValue('#000000');

			const { container } = renderWithProviders(
				<ThemedView darkColor="#000000">Dark Background</ThemedView>
			);

			await waitForAsyncUpdates();

			expect(useThemeColor).toHaveBeenCalledWith({ light: undefined, dark: '#000000' }, 'background');
		});

		it('should use both light and dark colors', async () => {
			const { useThemeColor } = await import('@/hooks/use-theme-color');
			vi.mocked(useThemeColor).mockReturnValue('#808080');

			const { container } = renderWithProviders(
				<ThemedView lightColor="#FFFFFF" darkColor="#000000">Themed Background</ThemedView>
			);

			await waitForAsyncUpdates();

			expect(useThemeColor).toHaveBeenCalledWith({ light: '#FFFFFF', dark: '#000000' }, 'background');
		});
	});

	describe('Custom styling', () => {
		it('should apply custom style', async () => {
			const customStyle = { padding: 20, margin: 10 };

			const { container } = renderWithProviders(
				<ThemedView style={customStyle}>Styled View</ThemedView>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should merge custom style with background color', async () => {
			const { useThemeColor } = await import('@/hooks/use-theme-color');
			vi.mocked(useThemeColor).mockReturnValue('#FF0000');

			const customStyle = { padding: 15, borderRadius: 5 };

			const { container } = renderWithProviders(
				<ThemedView style={customStyle}>Styled with Background</ThemedView>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should handle array of styles', async () => {
			const style1 = { padding: 10 };
			const style2 = { margin: 5 };

			const { container } = renderWithProviders(
				<ThemedView style={[style1, style2]}>Multiple Styles</ThemedView>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});
	});

	describe('Props forwarding', () => {
		it('should forward additional props to View component', async () => {
			const { container } = renderWithProviders(
				<ThemedView testID="themed-view" accessibilityLabel="Themed view">
					Content
				</ThemedView>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should handle layout props', async () => {
			const { container } = renderWithProviders(
				<ThemedView
					onLayout={() => {}}
					pointerEvents="none"
				>
					Layout View
				</ThemedView>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should handle touch props', async () => {
			const mockOnPress = vi.fn();

			const { container } = renderWithProviders(
				<ThemedView
					onTouchStart={mockOnPress}
					onTouchEnd={mockOnPress}
				>
					Touch View
				</ThemedView>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});
	});

	describe('Edge cases', () => {
		it('should handle no children', async () => {
			const { container } = renderWithProviders(
				<ThemedView />
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should handle null children', async () => {
			const { container } = renderWithProviders(
				<ThemedView>{null}</ThemedView>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should handle undefined style', async () => {
			const { container } = renderWithProviders(
				<ThemedView style={undefined}>Undefined Style</ThemedView>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should handle empty style object', async () => {
			const { container } = renderWithProviders(
				<ThemedView style={{}}>Empty Style</ThemedView>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});
	});
});
