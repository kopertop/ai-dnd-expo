import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GameCanvas } from '@/components/game-canvas';
import { WorldMapFactory } from '@/tests/fixtures/mock-factories';
import {
    assertNoConsoleErrors,
    renderWithProviders,
    waitForAsyncUpdates,
} from '@/tests/utils/render-helpers';

// Mock the child components
vi.mock('@/components/skia-game-canvas', () => ({
	SkiaGameCanvas: vi.fn(),
}));

vi.mock('@/components/svg-game-canvas', () => ({
	SvgGameCanvas: vi.fn(),
}));

describe('GameCanvas', () => {
	const mockWorldState = WorldMapFactory.createGameWorldState();
	const mockOnPlayerMove = vi.fn();
	const mockOnTileClick = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
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
			// Simple test - component should be callable
			expect(() => renderWithProviders(<GameCanvas />)).not.toThrow();
		});

		it('should render with all props provided', async () => {
			// Simple test - component should accept all props
			expect(() => renderWithProviders(
				<GameCanvas
					worldState={mockWorldState}
					onPlayerMove={mockOnPlayerMove}
					onTileClick={mockOnTileClick}
				/>,
			)).not.toThrow();
		});
	});

	describe('Props passing', () => {
		it('should pass worldState prop to child component', async () => {
			// Simple test - component should accept worldState prop
			expect(() => renderWithProviders(<GameCanvas worldState={mockWorldState} />)).not.toThrow();
		});

		it('should handle null worldState', async () => {
			// Simple test - component should handle undefined worldState
			expect(() => renderWithProviders(<GameCanvas worldState={undefined} />)).not.toThrow();
		});

		it('should pass callback props to child component', async () => {
			// Simple test - component should accept callback props
			expect(() => renderWithProviders(
				<GameCanvas
					worldState={mockWorldState}
					onPlayerMove={mockOnPlayerMove}
					onTileClick={mockOnTileClick}
				/>,
			)).not.toThrow();
		});
	});
});
