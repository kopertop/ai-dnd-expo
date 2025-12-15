import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

vi.mock('@testing-library/react-native', () => {
	const React = require('react');
	const { createRoot } = require('react-dom/client');
	const { act } = require('react-dom/test-utils');

	const render = (ui: React.ReactElement) => {
		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);

		act(() => root.render(ui));

		const queryByTestId = (id: string) =>
			container.querySelector(`[data-testid="${id}"]`);
		const getByTestId = (id: string) => {
			const el = queryByTestId(id);
			if (!el) throw new Error(`Unable to find element by testID: ${id}`);
			return el;
		};
		const queryByText = (text: string) =>
			Array.from(container.querySelectorAll('*')).find((el) => el.textContent === text) ||
			null;
		const getByText = (text: string) => {
			const el = queryByText(text);
			if (!el) throw new Error(`Unable to find element with text: ${text}`);
			return el;
		};

		const rerender = (ui: React.ReactElement) => act(() => root.render(ui));
		const unmount = () => act(() => root.unmount());

		return {
			container,
			getByTestId,
			queryByTestId,
			getByText,
			queryByText,
			rerender,
			unmount,
		};
	};

	const press = (element: Element, data?: any) => {
		const locationX = data?.nativeEvent?.locationX ?? 10;
		const locationY = data?.nativeEvent?.locationY ?? 10;
		const event = new MouseEvent('click', {
			bubbles: true,
			cancelable: true,
			clientX: locationX,
			clientY: locationY,
		});
		Object.defineProperty(event, 'offsetX', { value: locationX });
		Object.defineProperty(event, 'offsetY', { value: locationY });
		act(() => {
			element.dispatchEvent(event);
		});
	};

	const changeText = (element: any, value: string) => {
		const handler = (element as any).__onChangeText;
		act(() => {
			if (handler) {
				handler(value);
			}
			element.value = value;
			const inputEvent = new Event('input', { bubbles: true, cancelable: true });
			element.dispatchEvent(inputEvent);
			const changeEvent = new Event('change', { bubbles: true, cancelable: true });
			element.dispatchEvent(changeEvent);
		});
	};

	const valueChange = (element: any, value: any) => {
		const handler = (element as any).__onValueChange;
		act(() => {
			if (handler) {
				handler(value);
			}
			element.value = value;
			element.checked = value;
			const inputEvent = new Event('input', { bubbles: true, cancelable: true });
			element.dispatchEvent(inputEvent);
			const changeEvent = new Event('change', { bubbles: true, cancelable: true });
			element.dispatchEvent(changeEvent);
		});
	};

	const fireEventFn = (element: Element, eventName: string, data?: any) => {
		if (eventName === 'press') return press(element, data);
		if (eventName === 'changeText') return changeText(element as any, data);
		if (eventName === 'valueChange') return valueChange(element as any, data);
		element.dispatchEvent(new Event(eventName, { bubbles: true, cancelable: true }));
	};

	const fireEvent = Object.assign(fireEventFn, {
		press,
		changeText,
		valueChange: (el: Element, value: any) => valueChange(el as any, value),
	});

	const waitFor = async (callback: () => any, { timeout = 2000, interval = 20 } = {}) => {
		const start = Date.now();
		// eslint-disable-next-line no-constant-condition
		while (true) {
			try {
				await callback();
				return;
			} catch (error) {
				if (Date.now() - start >= timeout) throw error;
				await new Promise((resolve) => setTimeout(resolve, interval));
			}
		}
	};

	return { render, fireEvent, waitFor, act };
});

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import MapEditorScreen from '@/app/admin/maps/[id]';

const fetchApiMock = vi.fn();
const paramsMock = vi.fn();

vi.mock('expo-auth-template/frontend', () => ({
	apiService: {
		fetchApi: (...args) => fetchApiMock(...args),
	},
}));

vi.mock('expo-router', () => ({
	Stack: {
		Screen: ({ children }) => children ?? null,
	},
	useLocalSearchParams: () => paramsMock(),
}));

vi.mock('@/components/expo-icon', () => ({
	ExpoIcon: ({ icon, ...props }) => <span data-icon={icon} {...props} />,
}));

	vi.mock('@/components/themed-text', () => ({
		ThemedText: ({ children, ...props }) => (
			<span data-testid={(props as any).testID} {...props}>
				{children}
			</span>
		),
	}));

vi.mock('@/components/themed-view', () => ({
	ThemedView: ({ children, ...props }) => <div {...props}>{children}</div>,
}));

vi.mock('@/components/media-library-modal', () => ({
	MediaLibraryModal: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/components/image-uploader', () => ({
	ImageUploader: ({ onChange, testID, placeholder }) => (
		<button data-testid={testID} onClick={() => onChange('uploaded-url')}>
			{placeholder || 'Upload'}
		</button>
	),
}));

const createDeferred = () => {
	let resolve;
	let reject;
	const promise = new Promise((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
};

const baseMap = {
	id: 'map-1',
	name: 'Dungeon',
	slug: 'dungeon',
	description: null,
	background_image_url: 'bg.png',
	cover_image_url: 'cover.png',
	grid_columns: 2,
	grid_size: 32,
	grid_offset_x: 0,
	grid_offset_y: 0,
	width: 2,
	height: 2,
	world_id: 'world-1',
	tiles: [
		{
			x: 0,
			y: 0,
			terrain_type: 'wall',
			movement_cost: 2,
			is_blocked: true,
			is_difficult: false,
			provides_cover: true,
			cover_type: 'half',
		},
	],
	tokens: [
		{
			id: 'token-1',
			x: 1,
			y: 1,
			image_url: 'object.png',
			label: 'Crate',
		},
	],
};

const buildMap = (overrides = {}) => ({
	...baseMap,
	...overrides,
	tiles: overrides.tiles ?? baseMap.tiles.map((tile) => ({ ...tile })),
	tokens: overrides.tokens ?? baseMap.tokens.map((token) => ({ ...token })),
});

const pressCanvas = (canvas, x = 10, y = 10) => {
	fireEvent.press(canvas, { nativeEvent: { locationX: x, locationY: y } });
};

describe('MapEditorScreen', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fetchApiMock.mockReset();
		paramsMock.mockReset();
		(Alert.alert as any).mockClear?.();
		paramsMock.mockReturnValue({ id: 'map-1' });
	});

	const renderEditor = async (overrides) => {
		fetchApiMock.mockResolvedValueOnce(buildMap(overrides));
		const utils = render(<MapEditorScreen />);

		await waitFor(() => expect(fetchApiMock).toHaveBeenCalled());
		await waitFor(() => expect(utils.queryByTestId('loading-indicator')).toBeNull());

		return utils;
	};

	it('shows loading indicator while fetching data and renders after load', async () => {
		const deferred = createDeferred();
		fetchApiMock.mockReturnValueOnce(deferred.promise);

		const utils = render(<MapEditorScreen />);

		expect(utils.getByTestId('loading-indicator')).toBeTruthy();

		await act(async () => {
			deferred.resolve(buildMap());
		});

		await waitFor(() => expect(utils.queryByTestId('loading-indicator')).toBeNull());
		expect(fetchApiMock).toHaveBeenCalledWith('/maps/map-1');
	});

	it('alerts when map loading fails', async () => {
		fetchApiMock.mockRejectedValueOnce(new Error('network down'));

		render(<MapEditorScreen />);

		await waitFor(() => expect(fetchApiMock).toHaveBeenCalled());
		expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to load map');
	});

	it('switches tools and reveals grid controls', async () => {
		const { getByTestId } = await renderEditor();

		fireEvent.press(getByTestId('tool-grid'));

		await waitFor(() => expect(getByTestId('grid-size-input')).toBeTruthy());
		expect((getByTestId('grid-size-input') as HTMLInputElement).value).toBe('32');
		expect((getByTestId('grid-columns-input') as HTMLInputElement).value).toBe('2');
		expect((getByTestId('grid-rows-input') as HTMLInputElement).value).toBe('2');
	});

	it('paints terrain and exposes painted tile properties on selection', async () => {
		const { getByTestId, queryByTestId } = await renderEditor({ tiles: [] });

		pressCanvas(getByTestId('editor-canvas'), 8, 8);
		await waitFor(() => expect(queryByTestId('movement-cost-input')).not.toBeNull());

		fireEvent.press(getByTestId('tool-terrain'));
		await waitFor(() => expect(getByTestId('terrain-option-water')).toBeTruthy());
		fireEvent.press(getByTestId('terrain-option-water'));
		pressCanvas(getByTestId('editor-canvas'), 8, 8);

		fireEvent.press(getByTestId('tool-select'));
		await waitFor(() => expect(queryByTestId('terrain-type-input')).not.toBeNull());
		expect((getByTestId('terrain-type-input') as HTMLInputElement).value).toBe('water');
		expect((getByTestId('difficult-switch') as HTMLInputElement).checked).toBe(true);
		expect((getByTestId('movement-cost-input') as HTMLInputElement).value).toBe('2');

		fireEvent.press(getByTestId('clear-tile-button'));
		await waitFor(() => expect(queryByTestId('map-settings-label')).not.toBeNull());
	});

	it('adds, edits, and removes objects through the object tool', async () => {
		const { getByTestId, queryByTestId } = await renderEditor({ tokens: [] });
		const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(123);

		fireEvent.press(getByTestId('tool-object'));
		await waitFor(() => expect(getByTestId('image-uploader')).toBeTruthy());
		fireEvent.press(getByTestId('image-uploader'));

		expect(Alert.alert).toHaveBeenCalledWith('Object Added', 'Object placed at (0,0).');

		await waitFor(() => expect(getByTestId('object-x-input-0')).toBeTruthy());
		expect((getByTestId('object-x-input-0') as HTMLInputElement).value).toBe('0');
		fireEvent.changeText(getByTestId('object-x-input-0'), '7');
		fireEvent.changeText(getByTestId('object-y-input-0'), '8');

		expect((getByTestId('object-x-input-0') as HTMLInputElement).value).toBe('7');
		expect((getByTestId('object-y-input-0') as HTMLInputElement).value).toBe('8');

		fireEvent.press(getByTestId('remove-object-0'));
		await waitFor(() => expect(queryByTestId('object-x-input-0')).toBeNull());

		nowSpy.mockRestore();
	});

	it('saves an existing map with updated grid, tiles, and objects', async () => {
		const { getByTestId, queryByTestId } = await renderEditor();

		// Select existing tile and update values
		pressCanvas(getByTestId('editor-canvas'), 5, 5);
		await waitFor(() => expect(getByTestId('movement-cost-input')).toBeTruthy());
		fireEvent.changeText(getByTestId('movement-cost-input'), '3');
		fireEvent(getByTestId('blocked-switch'), 'valueChange', false);
		fireEvent(getByTestId('difficult-switch'), 'valueChange', true);
		fireEvent(getByTestId('cover-switch'), 'valueChange', false);
		fireEvent.changeText(getByTestId('terrain-type-input'), 'custom');

		// Update grid settings
		fireEvent.press(getByTestId('tool-grid'));
		await waitFor(() => expect(getByTestId('grid-size-input')).toBeTruthy());
		fireEvent.changeText(getByTestId('grid-size-input'), '48');
		fireEvent.changeText(getByTestId('grid-columns-input'), '3');
		fireEvent.changeText(getByTestId('grid-rows-input'), '4');
		fireEvent.changeText(getByTestId('grid-offset-x-input'), '2');
		fireEvent.changeText(getByTestId('grid-offset-y-input'), '3');
		await waitFor(() => expect((getByTestId('grid-size-input') as HTMLInputElement).value).toBe('48'));
		await waitFor(() => expect((getByTestId('grid-columns-input') as HTMLInputElement).value).toBe('3'));
		await waitFor(() => expect((getByTestId('grid-rows-input') as HTMLInputElement).value).toBe('4'));

		// Add a new object
		fireEvent.press(getByTestId('tool-object'));
		await waitFor(() => expect(queryByTestId('image-uploader')).not.toBeNull());
		fireEvent.press(getByTestId('image-uploader'));
		fireEvent.changeText(getByTestId('object-x-input-1'), '5');
		fireEvent.changeText(getByTestId('object-y-input-1'), '6');

		fetchApiMock.mockResolvedValueOnce({});

		await act(async () => {
			fireEvent.press(getByTestId('save-map'));
		});

		await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Success', 'Map saved'));

		expect(fetchApiMock).toHaveBeenLastCalledWith('/maps/map-1', expect.objectContaining({ method: 'PATCH' }));

		const payload = JSON.parse(fetchApiMock.mock.calls[1][1].body as string);
		expect(payload.grid_size).toBe(48);
		expect(payload.grid_columns).toBe(3);
		expect(payload.grid_offset_x).toBe(2);
		expect(payload.grid_offset_y).toBe(3);
		expect(payload.width).toBe(3);
		expect(payload.height).toBe(4);

		expect(payload.tiles).toEqual([
			expect.objectContaining({
				x: 0,
				y: 0,
				terrain: 'custom',
				movement_cost: 3,
				is_blocked: false,
				is_difficult: true,
				provides_cover: false,
			}),
		]);

		expect(payload.tokens[0]).toMatchObject({
			id: 'token-1',
			x: 1,
			y: 1,
			image_url: 'object.png',
			label: 'Crate',
			token_type: 'prop',
		});
		expect(payload.tokens[1].id).toBeUndefined();
		expect(payload.tokens[1]).toMatchObject({
			x: 5,
			y: 6,
			image_url: 'uploaded-url',
			label: 'Object',
			token_type: 'prop',
		});
	});

	it('posts a new map and surfaces save errors', async () => {
		paramsMock.mockReturnValue({ id: 'new' });
		fetchApiMock.mockResolvedValueOnce(buildMap({ id: '' }));
		fetchApiMock.mockRejectedValueOnce(new Error('save failed'));

		const { getByTestId, queryByTestId } = render(<MapEditorScreen />);

		await waitFor(() => expect(fetchApiMock).toHaveBeenCalled());
		await waitFor(() => expect(queryByTestId('loading-indicator')).toBeNull());

		await act(async () => {
			fireEvent.press(getByTestId('save-map'));
		});

		await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Error', 'save failed'));
		expect(fetchApiMock).toHaveBeenLastCalledWith('/maps', expect.objectContaining({ method: 'POST' }));
	});
});
