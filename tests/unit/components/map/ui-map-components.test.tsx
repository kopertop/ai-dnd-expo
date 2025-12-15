import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react-native';
import TestRenderer, { act as rtlAct } from 'react-test-renderer';

import { InteractiveMap } from '@/components/map/interactive-map';
import { TileActionMenu } from '@/components/map/tile-action-menu';
import { TileDetailsModal } from '@/components/map/tile-details-modal';
import { Accordion } from '@/components/ui/accordion';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import TabBarBackground, { useBottomTabOverflow } from '@/components/ui/tab-bar-background';

vi.mock('@/components/expo-icon', () => ({
	ExpoIcon: (props: any) => <div testID="expo-icon" {...props} />,
}));
vi.mock('expo-symbols', () => ({
	SymbolView: (props: any) => <div testID="symbol-view" {...props} />,
}));

vi.mock('@testing-library/react-native', () => {
	const fireEvent = {
		press: (node: any) => node.props.onPress?.({}),
	};

	const render = (element: React.ReactElement) => {
		let renderer!: TestRenderer.ReactTestRenderer;
		rtlAct(() => {
			renderer = TestRenderer.create(element);
		});
		const getByTestId = (testID: string) => renderer.root.findByProps({ testID });
		const getAllByTestId = (matcher: RegExp) =>
			renderer.root.findAll(node => typeof node.props?.testID === 'string' && matcher.test(node.props.testID));
		const getByText = (text: string) => renderer.root.findAll(node => node.children?.includes?.(text)).at(0);
		const queryByText = (text: string) => {
			try {
				return getByText(text);
			} catch {
				return null;
			}
		};

		return {
			getByTestId,
			getAllByTestId,
			getByText,
			queryByText,
			rerender: (ui: React.ReactElement) => renderer.update(ui),
			unmount: () => renderer.unmount(),
		};
	};

	return { render, fireEvent };
});

const buildMap = (overrides: Partial<Parameters<typeof InteractiveMap>[0]['map']> = {}) => ({
	id: 'map-1',
	name: 'Test Map',
	width: 2,
	height: 2,
	terrain: [
		[{ terrain: 'grass' }, { terrain: 'water' }],
		[{ terrain: 'stone' }, { terrain: 'dirt' }],
	],
	tokens: [],
	updatedAt: Date.now(),
	...overrides,
});

describe('InteractiveMap', () => {
	it('renders a grid and triggers tile press callbacks', () => {
		const onTilePress = vi.fn();
		const map = buildMap();
		const { getAllByTestId, getByTestId } = render(
			<InteractiveMap
				map={map}
				onTilePress={onTilePress}
				reachableTiles={[{ x: 0, y: 1, cost: 1 }]}
				isEditable
			/>,
		);

		expect(getAllByTestId(/^map-tile-touchable-/).length).toBeGreaterThanOrEqual(4);

		fireEvent.press(getByTestId('map-tile-touchable-1-0'));
		expect(onTilePress).toHaveBeenCalledWith(1, 0);

		expect(getByTestId('map-tile-reachable-0-1')).toBeTruthy();
	});
});

describe('TileActionMenu', () => {
	it('renders actions and invokes callbacks', () => {
		const onAction = vi.fn();
		const onClose = vi.fn();
		const { getByTestId } = render(
			<TileActionMenu
				visible
				x={1}
				y={2}
				availableActions={['placeNpc', 'clearTile']}
				onAction={onAction}
				onClose={onClose}
			/>,
		);

		fireEvent.press(getByTestId('tile-action-placeNpc'));
		expect(onAction).toHaveBeenCalledWith('placeNpc', 1, 2);
		expect(onClose).toHaveBeenCalled();

		fireEvent.press(getByTestId('tile-action-cancel'));
		expect(onClose).toHaveBeenCalledTimes(2);
	});

	it('shows empty state when no actions available', () => {
		const { getByTestId } = render(
			<TileActionMenu visible x={0} y={0} availableActions={[]} onAction={vi.fn()} onClose={vi.fn()} />,
		);

		expect(getByTestId('tile-action-empty')).toBeTruthy();
	});
});

describe('TileDetailsModal', () => {
	it('hides trap metadata for non-host users', () => {
		const metadata = { trap: 'spikes', safe: 'path' };
		const { getByTestId, queryByText, getByText } = render(
			<TileDetailsModal
				visible
				x={1}
				y={2}
				terrain="stone"
				elevation={3}
				isBlocked={false}
				hasFog
				featureType="trap"
				metadata={metadata}
				isHost={false}
				onClose={vi.fn()}
			/>,
		);

		expect(getByTestId('tile-details-modal')).toBeTruthy();
		expect(queryByText('spikes')).toBeFalsy();
		expect(getByText('safe')).toBeTruthy();
	});

	it('shows full metadata for hosts', () => {
		const metadata = { trap: 'spikes', safe: 'path' };
		const { getByText } = render(
			<TileDetailsModal
				visible
				x={0}
				y={0}
				terrain="grass"
				elevation={0}
				isBlocked={false}
				hasFog={false}
				featureType="trap"
				metadata={metadata}
				isHost
				onClose={vi.fn()}
			/>,
		);

		expect(getByText('trap')).toBeTruthy();
	});
});

describe('UI helpers', () => {
	it('Accordion renders content and toggles', () => {
		const onToggle = vi.fn();
		const { getByText, getByTestId } = render(
			<Accordion title="Section" expanded onToggle={onToggle}>
				<ThemedContent />
			</Accordion>,
		);

		expect(getByText('Details')).toBeTruthy();
		fireEvent.press(getByTestId('accordion-toggle'));
		expect(onToggle).toHaveBeenCalled();
	});

	it('ConfirmModal fires confirm and cancel actions', () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		const { getByTestId } = render(
			<ConfirmModal
				visible
				title="Delete"
				message="Are you sure?"
				onConfirm={onConfirm}
				onCancel={onCancel}
				confirmLabel="Yes"
				cancelLabel="No"
			/>,
		);

		fireEvent.press(getByTestId('confirm-accept'));
		fireEvent.press(getByTestId('confirm-cancel'));
		expect(onConfirm).toHaveBeenCalled();
		expect(onCancel).toHaveBeenCalled();
	});

	it('IconSymbol renders platform-specific icon', () => {
		const { getByTestId } = render(<IconSymbol name="chevron.right" color="#000" size={20} />);
		let iconNode;
		try {
			iconNode = getByTestId('symbol-view');
		} catch {}
		if (!iconNode) {
			try {
				iconNode = getByTestId('expo-icon');
			} catch {}
		}
		expect(iconNode).toBeTruthy();
	});

	it('TabBarBackground shim exposes zero overflow', () => {
		expect(TabBarBackground).toBeUndefined();
		expect(useBottomTabOverflow()).toBe(0);
	});
});

function ThemedContent() {
	return <div>Details</div>;
}
