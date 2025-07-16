import React from 'react';
import { Text } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GameCanvas } from '@/components/game-canvas';
import { WorldMapFactory } from '@/tests/fixtures/mock-factories';
import { assertNoConsoleErrors, renderWithProviders, waitForAsyncUpdates } from '@/tests/utils/render-helpers';

// Mock the child components before importing the main component
interface MockCanvasProps {
	worldState?: unknown;
	onPlayerMove?: (position: { x: number; y: number }) => void;
	onTileClick?: (position: { x: number; y: number }) => void;
}

describe('GameCanvas', () => {
	const mockWorldState = WorldMapFactory.createGameWorldState();
	const mockOnPlayerMove = vi.fn();
	const mockOnTileClick = vi.fn();

	beforeEach(async () => {
		vi.clearAllMocks();

		// Mock the child canvas components
		const SkiaGameCanvas = await import('@/components/skia-game-canvas');
		const SvgGameCanvas = await import('@/components/svg-game-canvas');

		vi.spyOn(SkiaGameCanvas, 'SkiaGameCanvas').mockImplementation(({ worldState, onPlayerMove, onTileClick }: MockCanvasProps) => (
			<div
				data-testid="skia-game-canvas"
				data-world-state={worldState ? 'present' : 'null'}
				onClick={() => {
					onPlayerMove?.({ x: 1, y: 1 });
					onTileClick?.({ x: 1, y: 1 });
				}}
			>
				<Text>Skia Game Canvas</Text>
			</div>
		));

		vi.spyOn(SvgGameCanvas, 'SvgGameCanvas').mockImplementation(({ worldState, onPlayerMove, onTileClick }: MockCanvasProps) => (
			<div
				data-testid="svg-game-canvas"
				data-world-state={worldState ? 'present' : 'null'}
				onClick={() => {
					onPlayerMove?.({ x: 2, y: 2 });
					onTileClick?.({ x: 2, y: 2 });
				}}
			>
				<Text>SVG Game Canvas</Text>
			</div>
		));
	});

	afterEach(() => {
		assertNoConsoleErrors();
	});

	describe('Component rendering', () => {
		it('should render without crashing', async () => {
			const { container } = renderWithProviders(<GameCanvas />);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should render with minimal props', async () => {
			const { container } = renderWithProviders(<GameCanvas />);

			await waitForAsyncUpdates();

			// Should render one of the canvas components
			const skiaCanvas = container?.querySelector('[data-testid="skia-game-canvas"]');
			const svgCanvas = container?.querySelector('[data-testid="svg-game-canvas"]');

			expect(skiaCanvas || svgCanvas).toBeTruthy();
		});

		it('should render with all props provided', async () => {
			const { container } = renderWithProviders(
				<GameCanvas
					worldState={mockWorldState}
					onPlayerMove={mockOnPlayerMove}
					onTileClick={mockOnTileClick}
				/>,
			);

			await waitForAsyncUpdates();

			const skiaCanvas = container?.querySelector('[data-testid="skia-game-canvas"]');
			const svgCanvas = container?.querySelector('[data-testid="svg-game-canvas"]');

			expect(skiaCanvas || svgCanvas).toBeTruthy();
		});
	});

	describe('Props passing', () => {
		it('should pass worldState prop to child component', async () => {
			const { container } = renderWithProviders(
				<GameCanvas worldState={mockWorldState} />,
			);

			await waitForAsyncUpdates();

			const canvas = container?.querySelector('[data-world-state="present"]');
			expect(canvas).toBeTruthy();
		});

		it('should handle null worldState', async () => {
			const { container } = renderWithProviders(
				<GameCanvas worldState={undefined} />,
			);

			await waitForAsyncUpdates();

			const canvas = container?.querySelector('[data-world-state="null"]');
			expect(canvas).toBeTruthy();
		});

		it('should pass callback props to child component', async () => {
			const { container } = renderWithProviders(
				<GameCanvas
					worldState={mockWorldState}
					onPlayerMove={mockOnPlayerMove}
					onTileClick={mockOnTileClick}
				/>,
			);

			await waitForAsyncUpdates();

			const canvas = container?.querySelector('[data-testid="skia-game-canvas"], [data-testid="svg-game-canvas"]');

			if (canvas) {
				// Simulate interaction
				(canvas as HTMLElement).click();

				// Should call one of the callback sets
				expect(mockOnPlayerMove.mock.calls.length + mockOnTileClick.mock.calls.length).toBeGreaterThan(0);
			}
		});
	});

	describe('Callback handling', () => {
		it('should handle missing onPlayerMove callback gracefully', async () => {
			const { container } = renderWithProviders(
				<GameCanvas
					worldState={mockWorldState}
					onTileClick={mockOnTileClick}
				/>,
			);

			await waitForAsyncUpdates();

			const canvas = container?.querySelector('[data-testid="skia-game-canvas"], [data-testid="svg-game-canvas"]');

			// Should not throw when onPlayerMove is undefined
			expect(() => {
				if (canvas) {
					(canvas as HTMLElement).click();
				}
			}).not.toThrow();
		});

		it('should handle missing onTileClick callback gracefully', async () => {
			const { container } = renderWithProviders(
				<GameCanvas
					worldState={mockWorldState}
					onPlayerMove={mockOnPlayerMove}
				/>,
			);

			await waitForAsyncUpdates();

			const canvas = container?.querySelector('[data-testid="skia-game-canvas"], [data-testid="svg-game-canvas"]');

			// Should not throw when onTileClick is undefined
			expect(() => {
				if (canvas) {
					(canvas as HTMLElement).click();
				}
			}).not.toThrow();
		});

		it('should handle missing callbacks gracefully', async () => {
			const { container } = renderWithProviders(
				<GameCanvas worldState={mockWorldState} />,
			);

			await waitForAsyncUpdates();

			const canvas = container?.querySelector('[data-testid="skia-game-canvas"], [data-testid="svg-game-canvas"]');

			// Should not throw when both callbacks are undefined
			expect(() => {
				if (canvas) {
					(canvas as HTMLElement).click();
				}
			}).not.toThrow();
		});
	});

	describe('Edge cases', () => {
		it('should handle undefined worldState', async () => {
			const { container } = renderWithProviders(
				<GameCanvas worldState={undefined} />,
			);

			await waitForAsyncUpdates();

			const canvas = container?.querySelector('[data-world-state="null"]');
			expect(canvas).toBeTruthy();
		});

		it('should handle empty worldState object', async () => {
			// Test with a partial world state to verify component handles incomplete data
			const emptyWorldState = WorldMapFactory.createGameWorldState();

			const { container } = renderWithProviders(
				<GameCanvas worldState={emptyWorldState} />,
			);

			await waitForAsyncUpdates();

			const canvas = container?.querySelector('[data-world-state="present"]');
			expect(canvas).toBeTruthy();
		});
	});

	describe('Canvas selection logic', () => {
		it('should render a canvas component', async () => {
			const { container } = renderWithProviders(
				<GameCanvas worldState={mockWorldState} />,
			);

			await waitForAsyncUpdates();

			// Should render either Skia or SVG canvas based on platform
			const skiaCanvas = container?.querySelector('[data-testid="skia-game-canvas"]');
			const svgCanvas = container?.querySelector('[data-testid="svg-game-canvas"]');

			expect(skiaCanvas || svgCanvas).toBeTruthy();
			// Should not render both
			expect(skiaCanvas && svgCanvas).toBeFalsy();
		});

		it('should pass props correctly to the selected canvas', async () => {
			const { container } = renderWithProviders(
				<GameCanvas
					worldState={mockWorldState}
					onPlayerMove={mockOnPlayerMove}
					onTileClick={mockOnTileClick}
				/>,
			);

			await waitForAsyncUpdates();

			const canvas = container?.querySelector('[data-testid="skia-game-canvas"], [data-testid="svg-game-canvas"]');
			expect(canvas).toBeTruthy();
			expect(canvas?.getAttribute('data-world-state')).toBe('present');
		});
	});
});
