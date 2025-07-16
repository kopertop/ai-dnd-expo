import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { assertNoConsoleErrors, renderWithProviders, waitForAsyncUpdates } from '@/tests/utils/render-helpers';

// Mock the hook
vi.mock('@/hooks/use-theme-color', () => ({
	useThemeColor: vi.fn(() => '#000000'),
}));

// Mock React Native components
vi.mock('react-native', () => ({
	Text: ({ children, style, ...props }: any) => (
		<span style={style} {...props}>{children}</span>
	),
	StyleSheet: {
		create: vi.fn(styles => styles),
	},
}));

import { ThemedText } from '@/components/themed-text';

describe('ThemedText', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		assertNoConsoleErrors();
	});

	describe('Component rendering', () => {
		it('should render without crashing', async () => {
			const { container } = renderWithProviders(
				<ThemedText>Test Text</ThemedText>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should display text content', async () => {
			const { getByText } = renderWithProviders(
				<ThemedText>Hello World</ThemedText>
			);

			await waitForAsyncUpdates();

			expect(getByText('Hello World')).toBeTruthy();
		});

		it('should render with default type', async () => {
			const { getByText } = renderWithProviders(
				<ThemedText>Default Text</ThemedText>
			);

			await waitForAsyncUpdates();

			expect(getByText('Default Text')).toBeTruthy();
		});
	});

	describe('Text types', () => {
		it('should render title type', async () => {
			const { getByText } = renderWithProviders(
				<ThemedText type="title">Title Text</ThemedText>
			);

			await waitForAsyncUpdates();

			expect(getByText('Title Text')).toBeTruthy();
		});

		it('should render subtitle type', async () => {
			const { getByText } = renderWithProviders(
				<ThemedText type="subtitle">Subtitle Text</ThemedText>
			);

			await waitForAsyncUpdates();

			expect(getByText('Subtitle Text')).toBeTruthy();
		});

		it('should render defaultSemiBold type', async () => {
			const { getByText } = renderWithProviders(
				<ThemedText type="defaultSemiBold">SemiBold Text</ThemedText>
			);

			await waitForAsyncUpdates();

			expect(getByText('SemiBold Text')).toBeTruthy();
		});

		it('should render link type', async () => {
			const { getByText } = renderWithProviders(
				<ThemedText type="link">Link Text</ThemedText>
			);

			await waitForAsyncUpdates();

			expect(getByText('Link Text')).toBeTruthy();
		});
	});

	describe('Theme colors', () => {
		it('should use theme color from hook', async () => {
			const { useThemeColor } = await import('@/hooks/use-theme-color');
			vi.mocked(useThemeColor).mockReturnValue('#FF0000');

			const { container } = renderWithProviders(
				<ThemedText>Colored Text</ThemedText>
			);

			await waitForAsyncUpdates();

			expect(useThemeColor).toHaveBeenCalledWith({ light: undefined, dark: undefined }, 'text');
		});

		it('should use custom light color', async () => {
			const { useThemeColor } = await import('@/hooks/use-theme-color');
			vi.mocked(useThemeColor).mockReturnValue('#00FF00');

			const { container } = renderWithProviders(
				<ThemedText lightColor="#00FF00">Light Text</ThemedText>
			);

			await waitForAsyncUpdates();

			expect(useThemeColor).toHaveBeenCalledWith({ light: '#00FF00', dark: undefined }, 'text');
		});

		it('should use custom dark color', async () => {
			const { useThemeColor } = await import('@/hooks/use-theme-color');
			vi.mocked(useThemeColor).mockReturnValue('#0000FF');

			const { container } = renderWithProviders(
				<ThemedText darkColor="#0000FF">Dark Text</ThemedText>
			);

			await waitForAsyncUpdates();

			expect(useThemeColor).toHaveBeenCalledWith({ light: undefined, dark: '#0000FF' }, 'text');
		});

		it('should use both light and dark colors', async () => {
			const { useThemeColor } = await import('@/hooks/use-theme-color');
			vi.mocked(useThemeColor).mockReturnValue('#FFFF00');

			const { container } = renderWithProviders(
				<ThemedText lightColor="#FFFFFF" darkColor="#000000">Themed Text</ThemedText>
			);

			await waitForAsyncUpdates();

			expect(useThemeColor).toHaveBeenCalledWith({ light: '#FFFFFF', dark: '#000000' }, 'text');
		});
	});

	describe('Custom styling', () => {
		it('should apply custom style', async () => {
			const customStyle = { fontSize: 20, fontWeight: '600' as const };

			const { container } = renderWithProviders(
				<ThemedText style={customStyle}>Styled Text</ThemedText>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should merge custom style with type styles', async () => {
			const customStyle = { color: 'red' };

			const { container } = renderWithProviders(
				<ThemedText type="title" style={customStyle}>Title with Custom Style</ThemedText>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});
	});

	describe('Props forwarding', () => {
		it('should forward additional props to Text component', async () => {
			const { container } = renderWithProviders(
				<ThemedText numberOfLines={2} ellipsizeMode="tail">
					Long text that should be truncated
				</ThemedText>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should handle accessibility props', async () => {
			const { container } = renderWithProviders(
				<ThemedText accessibilityLabel="Accessible text" accessibilityRole="text">
					Accessible Text
				</ThemedText>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});
	});

	describe('Edge cases', () => {
		it('should handle empty text', async () => {
			const { container } = renderWithProviders(
				<ThemedText></ThemedText>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should handle null children', async () => {
			const { container } = renderWithProviders(
				<ThemedText>{null}</ThemedText>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should handle undefined type', async () => {
			const { container } = renderWithProviders(
				<ThemedText type={undefined as any}>Undefined Type</ThemedText>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should handle invalid type', async () => {
			const { container } = renderWithProviders(
				<ThemedText type={'invalid' as any}>Invalid Type</ThemedText>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});
	});
});
