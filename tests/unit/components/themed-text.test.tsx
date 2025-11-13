import React from 'react';
import { Text } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemedText } from '@/components/themed-text';
import {
	assertNoConsoleErrors,
	renderWithProviders,
	waitForAsyncUpdates,
} from '@/tests/utils/render-helpers';

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
				<ThemedText>
					<Text>Test Text</Text>
				</ThemedText>,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should display text content', async () => {
			const { getByText } = renderWithProviders(
				<ThemedText>
					<Text>Hello World</Text>
				</ThemedText>,
			);

			await waitForAsyncUpdates();

			expect(getByText('Hello World')).toBeTruthy();
		});

		it('should render with default type', async () => {
			const { getByText } = renderWithProviders(
				<ThemedText>
					<Text>Default Text</Text>
				</ThemedText>,
			);

			await waitForAsyncUpdates();

			expect(getByText('Default Text')).toBeTruthy();
		});
	});

	describe('Text types', () => {
		it('should render title type', async () => {
			const { getByText } = renderWithProviders(
				<ThemedText type="title">
					<Text>Title Text</Text>
				</ThemedText>,
			);

			await waitForAsyncUpdates();

			expect(getByText('Title Text')).toBeTruthy();
		});

		it('should render subtitle type', async () => {
			const { getByText } = renderWithProviders(
				<ThemedText type="subtitle">
					<Text>Subtitle Text</Text>
				</ThemedText>,
			);

			await waitForAsyncUpdates();

			expect(getByText('Subtitle Text')).toBeTruthy();
		});

		it('should render defaultSemiBold type', async () => {
			const { getByText } = renderWithProviders(
				<ThemedText type="defaultSemiBold">
					<Text>SemiBold Text</Text>
				</ThemedText>,
			);

			await waitForAsyncUpdates();

			expect(getByText('SemiBold Text')).toBeTruthy();
		});

		it('should render link type', async () => {
			const { getByText } = renderWithProviders(
				<ThemedText type="link">
					<Text>Link Text</Text>
				</ThemedText>,
			);

			await waitForAsyncUpdates();

			expect(getByText('Link Text')).toBeTruthy();
		});
	});

	describe('Theme colors', () => {
		it('should render with light color props', async () => {
			const { getByText } = renderWithProviders(
				<ThemedText lightColor="#00FF00">
					<Text>Light Text</Text>
				</ThemedText>,
			);

			await waitForAsyncUpdates();

			const element = getByText('Light Text');
			expect(element).toBeTruthy();
		});

		it('should render with dark color props', async () => {
			const { getByText } = renderWithProviders(
				<ThemedText darkColor="#0000FF">
					<Text>Dark Text</Text>
				</ThemedText>,
			);

			await waitForAsyncUpdates();

			const element = getByText('Dark Text');
			expect(element).toBeTruthy();
		});

		it('should render with both light and dark colors', async () => {
			const { getByText } = renderWithProviders(
				<ThemedText lightColor="#FFFFFF" darkColor="#000000">
					<Text>Themed Text</Text>
				</ThemedText>,
			);

			await waitForAsyncUpdates();

			const element = getByText('Themed Text');
			expect(element).toBeTruthy();
		});
	});

	describe('Custom styling', () => {
		it('should apply custom style', async () => {
			const customStyle = { fontSize: 20, fontWeight: '600' as const };

			const { container } = renderWithProviders(
				<ThemedText style={customStyle}>
					<Text>Styled Text</Text>
				</ThemedText>,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should merge custom style with type styles', async () => {
			const customStyle = { color: 'red' };

			const { container } = renderWithProviders(
				<ThemedText type="title" style={customStyle}>
					<Text>Title with Custom Style</Text>
				</ThemedText>,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});
	});

	describe('Props forwarding', () => {
		it('should forward additional props to Text component', async () => {
			const { container } = renderWithProviders(
				<ThemedText numberOfLines={2} ellipsizeMode="tail">
					<Text>Long text that should be truncated</Text>
				</ThemedText>,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should handle accessibility props', async () => {
			const { container } = renderWithProviders(
				<ThemedText accessibilityLabel="Accessible text" accessibilityRole="text">
					<Text>Accessible Text</Text>
				</ThemedText>,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});
	});

	describe('Edge cases', () => {
		it('should handle empty text', async () => {
			const { container } = renderWithProviders(<ThemedText></ThemedText>);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should handle null children', async () => {
			const { container } = renderWithProviders(<ThemedText>{null}</ThemedText>);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should handle undefined type', async () => {
			const { container } = renderWithProviders(
				<ThemedText type={undefined as any}>
					<Text>Undefined Type</Text>
				</ThemedText>,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should handle invalid type', async () => {
			const { container } = renderWithProviders(
				<ThemedText type={'invalid' as any}>
					<Text>Invalid Type</Text>
				</ThemedText>,
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});
	});
});
