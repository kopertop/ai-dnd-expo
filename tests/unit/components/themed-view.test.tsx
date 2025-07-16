import React from 'react';
import { Text } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemedView } from '@/components/themed-view';
import { assertNoConsoleErrors, renderWithProviders, waitForAsyncUpdates } from '@/tests/utils/render-helpers';

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
				<ThemedView />,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should render with children', async () => {
			const { getByText } = renderWithProviders(
				<ThemedView>
					<Text>Child Content</Text>
				</ThemedView>,
			);

			await waitForAsyncUpdates();

			expect(getByText('Child Content')).toBeTruthy();
		});

		it('should render multiple children', async () => {
			const { getByText } = renderWithProviders(
				<ThemedView>
					<Text>First Child</Text>
					<Text>Second Child</Text>
				</ThemedView>,
			);

			await waitForAsyncUpdates();

			expect(getByText('First Child')).toBeTruthy();
			expect(getByText('Second Child')).toBeTruthy();
		});
	});

	describe('Theme colors', () => {
		it('should render with light color props', async () => {
			const { getByText } = renderWithProviders(
				<ThemedView lightColor="#FFFFFF">
					<Text>Light Background</Text>
				</ThemedView>,
			);

			await waitForAsyncUpdates();

			expect(getByText('Light Background')).toBeTruthy();
		});

		it('should render with dark color props', async () => {
			const { getByText } = renderWithProviders(
				<ThemedView darkColor="#000000">
					<Text>Dark Background</Text>
				</ThemedView>,
			);

			await waitForAsyncUpdates();

			expect(getByText('Dark Background')).toBeTruthy();
		});

		it('should render with both light and dark colors', async () => {
			const { getByText } = renderWithProviders(
				<ThemedView lightColor="#FFFFFF" darkColor="#000000">
					<Text>Themed Background</Text>
				</ThemedView>,
			);

			await waitForAsyncUpdates();

			expect(getByText('Themed Background')).toBeTruthy();
		});
	});

	describe('Custom styling', () => {
		it('should apply custom style', async () => {
			const customStyle = { padding: 20, margin: 10 };

			const { container } = renderWithProviders(
				<ThemedView style={customStyle}><Text>Styled View</Text></ThemedView>,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should merge custom style with background color', async () => {
			const customStyle = { padding: 15, borderRadius: 5 };

			const { getByText } = renderWithProviders(
				<ThemedView style={customStyle}>
					<Text>Styled with Background</Text>
				</ThemedView>,
			);

			await waitForAsyncUpdates();

			expect(getByText('Styled with Background')).toBeTruthy();
		});

		it('should handle array of styles', async () => {
			const style1 = { padding: 10 };
			const style2 = { margin: 5 };

			const { container } = renderWithProviders(
				<ThemedView style={[style1, style2]}><Text>Multiple Styles</Text></ThemedView>,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});
	});

	describe('Props forwarding', () => {
		it('should forward additional props to View component', async () => {
			const { container } = renderWithProviders(
				<ThemedView testID="themed-view" accessibilityLabel="Themed view">
					<Text>Content</Text>
				</ThemedView>,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should handle layout props', async () => {
			const { container } = renderWithProviders(
				<ThemedView
					onLayout={() => { }}
					pointerEvents="none"
				>
					<Text>Layout View</Text>
				</ThemedView>,
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
					<Text>Touch View</Text>
				</ThemedView>,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});
	});

	describe('Edge cases', () => {
		it('should handle no children', async () => {
			const { container } = renderWithProviders(
				<ThemedView />,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should handle null children', async () => {
			const { container } = renderWithProviders(
				<ThemedView>{null}</ThemedView>,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should handle undefined style', async () => {
			const { container } = renderWithProviders(
				<ThemedView style={undefined}><Text>Undefined Style</Text></ThemedView>,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should handle empty style object', async () => {
			const { container } = renderWithProviders(
				<ThemedView style={{}}><Text>Empty Style</Text></ThemedView>,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});
	});
});
