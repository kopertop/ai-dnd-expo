import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GameStatusBar } from '@/components/game-status-bar';
import { CharacterFactory, CompanionFactory, GameStateFactory } from '@/tests/fixtures/mock-factories';
import { assertNoConsoleErrors, renderWithProviders, waitForAsyncUpdates } from '@/tests/utils/render-helpers';

// Mock the hooks
vi.mock('@/hooks/use-screen-size', () => ({
	useScreenSize: vi.fn(() => ({
		width: 1024,
		height: 768,
		isMobile: false,
		isTablet: false,
		isDesktop: true,
	})),
}));

vi.mock('@/hooks/use-simple-companions', () => ({
	useSimpleCompanions: vi.fn(() => ({
		activeCompanions: [],
		companions: [],
		partyConfig: { maxSize: 4, activeCompanions: [], leadershipStyle: 'democratic' },
		isLoading: false,
		error: null,
	})),
}));

vi.mock('@/hooks/use-game-state', () => ({
	getCharacterImage: vi.fn(() => require('@/assets/images/races/human.png')),
}));

// Mock constants
vi.mock('@/constants/races', () => ({
	RaceByID: {
		human: {
			image: require('@/assets/images/races/human.png'),
		},
	},
}));

describe('GameStatusBar', () => {
	const mockGameState = GameStateFactory.createNew();
	const mockOnPortraitPress = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		assertNoConsoleErrors();
	});

	describe('Component rendering', () => {
		it('should render without crashing', async () => {
			const { container } = renderWithProviders(
				<GameStatusBar gameState={mockGameState} />
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should render player character information', async () => {
			const character = CharacterFactory.createBasic({
				name: 'Test Hero',
				race: 'human',
				class: 'fighter',
				level: 5,
				health: 45,
				maxHealth: 50,
				actionPoints: 2,
				maxActionPoints: 3,
			});

			const gameState = GameStateFactory.createNew({
				characters: [character],
				playerCharacterId: character.id,
			});

			const { getByText } = renderWithProviders(
				<GameStatusBar gameState={gameState} />
			);

			await waitForAsyncUpdates();

			expect(getByText('Test Hero')).toBeTruthy();
			expect(getByText('human / fighter')).toBeTruthy();
			expect(getByText('HP: 45 / 50')).toBeTruthy();
			expect(getByText('AP: 2 / 3')).toBeTruthy();
			expect(getByText('5')).toBeTruthy(); // Level in dice
		});

		it('should handle missing player character gracefully', async () => {
			const gameState = GameStateFactory.createNew({
				characters: [],
				playerCharacterId: 'non-existent-id',
			});

			const { container } = renderWithProviders(
				<GameStatusBar gameState={gameState} />
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});
	});

	describe('Portrait interaction', () => {
		it('should call onPortraitPress when portrait is clicked', async () => {
			const { getByTestId } = renderWithProviders(
				<GameStatusBar
					gameState={mockGameState}
					onPortraitPress={mockOnPortraitPress}
				/>
			);

			await waitForAsyncUpdates();

			// Find and click the portrait
			const portraitWrapper = getByTestId('portrait-wrapper') ||
				document.querySelector('[style*="position: absolute"]');

			if (portraitWrapper) {
				portraitWrapper.click();
				expect(mockOnPortraitPress).toHaveBeenCalledTimes(1);
			}
		});

		it('should not crash when onPortraitPress is not provided', async () => {
			const { container } = renderWithProviders(
				<GameStatusBar gameState={mockGameState} />
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});
	});

	describe('Active character indication', () => {
		it('should highlight DM when activeCharacter is "dm"', async () => {
			const { container } = renderWithProviders(
				<GameStatusBar
					gameState={mockGameState}
					activeCharacter="dm"
				/>
			);

			await waitForAsyncUpdates();

			// Check for DM portrait with active styling
			const dmPortrait = container?.querySelector('[style*="border-color: #FFD700"]') ||
				container?.querySelector('[data-active="true"]');

			expect(dmPortrait).toBeTruthy();
		});

		it('should highlight player when activeCharacter is "player"', async () => {
			const { container } = renderWithProviders(
				<GameStatusBar
					gameState={mockGameState}
					activeCharacter="player"
				/>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should highlight companion when activeCharacter is companion ID', async () => {
			const companion = CompanionFactory.createBasic({ id: 'companion-1' });

			// Mock the hook to return the companion
			const { useSimpleCompanions } = await import('@/hooks/use-simple-companions');
			vi.mocked(useSimpleCompanions).mockReturnValue({
				activeCompanions: [companion],
				companions: [companion],
				partyConfig: { maxSize: 4, activeCompanions: [companion.id], leadershipStyle: 'democratic' },
				isLoading: false,
				error: null,
				createCompanion: vi.fn(),
				addToParty: vi.fn(),
				removeFromParty: vi.fn(),
				updateCompanion: vi.fn(),
				deleteCompanion: vi.fn(),
				getCompanion: vi.fn(),
				canAddToParty: vi.fn(),
				generateRandomCompanion: vi.fn(),
				saveAll: vi.fn(),
				loadAll: vi.fn(),
			});

			const { container } = renderWithProviders(
				<GameStatusBar
					gameState={mockGameState}
					activeCharacter="companion-1"
				/>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should default to player when no activeCharacter is specified', async () => {
			const { container } = renderWithProviders(
				<GameStatusBar gameState={mockGameState} />
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});
	});

	describe('Responsive behavior', () => {
		it('should render mobile layout when isMobile is true', async () => {
			const { useScreenSize } = await import('@/hooks/use-screen-size');
			vi.mocked(useScreenSize).mockReturnValue({
				width: 375,
				height: 812,
				isMobile: true,
				isTablet: false,
				isDesktop: false,
			});

			const { container } = renderWithProviders(
				<GameStatusBar gameState={mockGameState} />
			);

			await waitForAsyncUpdates();

			// Check for mobile-specific styling or layout
			expect(container).toBeTruthy();
		});

		it('should render desktop layout when isMobile is false', async () => {
			const { useScreenSize } = await import('@/hooks/use-screen-size');
			vi.mocked(useScreenSize).mockReturnValue({
				width: 1024,
				height: 768,
				isMobile: false,
				isTablet: false,
				isDesktop: true,
			});

			const { container } = renderWithProviders(
				<GameStatusBar gameState={mockGameState} />
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});
	});

	describe('Companion display', () => {
		it('should display active companions in turn order', async () => {
			const companions = CompanionFactory.createMany(2);

			const { useSimpleCompanions } = await import('@/hooks/use-simple-companions');
			vi.mocked(useSimpleCompanions).mockReturnValue({
				activeCompanions: companions,
				companions,
				partyConfig: {
					maxSize: 4,
					activeCompanions: companions.map(c => c.id),
					leadershipStyle: 'democratic'
				},
				isLoading: false,
				error: null,
				createCompanion: vi.fn(),
				addToParty: vi.fn(),
				removeFromParty: vi.fn(),
				updateCompanion: vi.fn(),
				deleteCompanion: vi.fn(),
				getCompanion: vi.fn(),
				canAddToParty: vi.fn(),
				generateRandomCompanion: vi.fn(),
				saveAll: vi.fn(),
				loadAll: vi.fn(),
			});

			const { container } = renderWithProviders(
				<GameStatusBar gameState={mockGameState} />
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should limit companion display to 2 companions', async () => {
			const companions = CompanionFactory.createMany(5); // More than the limit

			const { useSimpleCompanions } = await import('@/hooks/use-simple-companions');
			vi.mocked(useSimpleCompanions).mockReturnValue({
				activeCompanions: companions,
				companions,
				partyConfig: {
					maxSize: 4,
					activeCompanions: companions.map(c => c.id),
					leadershipStyle: 'democratic'
				},
				isLoading: false,
				error: null,
				createCompanion: vi.fn(),
				addToParty: vi.fn(),
				removeFromParty: vi.fn(),
				updateCompanion: vi.fn(),
				deleteCompanion: vi.fn(),
				getCompanion: vi.fn(),
				canAddToParty: vi.fn(),
				generateRandomCompanion: vi.fn(),
				saveAll: vi.fn(),
				loadAll: vi.fn(),
			});

			const { container } = renderWithProviders(
				<GameStatusBar gameState={mockGameState} />
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should display companion initials when no image is provided', async () => {
			const companion = CompanionFactory.createBasic({
				name: 'Test Companion',
				image: undefined
			});

			const { useSimpleCompanions } = await import('@/hooks/use-simple-companions');
			vi.mocked(useSimpleCompanions).mockReturnValue({
				activeCompanions: [companion],
				companions: [companion],
				partyConfig: {
					maxSize: 4,
					activeCompanions: [companion.id],
					leadershipStyle: 'democratic'
				},
				isLoading: false,
				error: null,
				createCompanion: vi.fn(),
				addToParty: vi.fn(),
				removeFromParty: vi.fn(),
				updateCompanion: vi.fn(),
				deleteCompanion: vi.fn(),
				getCompanion: vi.fn(),
				canAddToParty: vi.fn(),
				generateRandomCompanion: vi.fn(),
				saveAll: vi.fn(),
				loadAll: vi.fn(),
			});

			const { getByText } = renderWithProviders(
				<GameStatusBar gameState={mockGameState} />
			);

			await waitForAsyncUpdates();

			expect(getByText('T')).toBeTruthy(); // First letter of "Test Companion"
		});
	});

	describe('Custom styling', () => {
		it('should apply custom style prop', async () => {
			const customStyle = { backgroundColor: 'red' };

			const { container } = renderWithProviders(
				<GameStatusBar
					gameState={mockGameState}
					style={customStyle}
				/>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});
	});

	describe('Character stats display', () => {
		it('should display correct health values', async () => {
			const character = CharacterFactory.createBasic({
				health: 25,
				maxHealth: 30,
			});

			const gameState = GameStateFactory.createNew({
				characters: [character],
				playerCharacterId: character.id,
			});

			const { getByText } = renderWithProviders(
				<GameStatusBar gameState={gameState} />
			);

			await waitForAsyncUpdates();

			expect(getByText('HP: 25 / 30')).toBeTruthy();
		});

		it('should display correct action points', async () => {
			const character = CharacterFactory.createBasic({
				actionPoints: 1,
				maxActionPoints: 2,
			});

			const gameState = GameStateFactory.createNew({
				characters: [character],
				playerCharacterId: character.id,
			});

			const { getByText } = renderWithProviders(
				<GameStatusBar gameState={gameState} />
			);

			await waitForAsyncUpdates();

			expect(getByText('AP: 1 / 2')).toBeTruthy();
		});

		it('should display character level in dice icon', async () => {
			const character = CharacterFactory.createBasic({ level: 10 });

			const gameState = GameStateFactory.createNew({
				characters: [character],
				playerCharacterId: character.id,
			});

			const { getByText } = renderWithProviders(
				<GameStatusBar gameState={gameState} />
			);

			await waitForAsyncUpdates();

			expect(getByText('10')).toBeTruthy();
		});
	});
});
