import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TurnBasedChat } from '@/components/turn-based-chat';
import { DMMessage } from '@/services/ai/agents/dungeon-master-agent';
import { CharacterFactory, CompanionFactory } from '@/tests/fixtures/mock-factories';
import { assertNoConsoleErrors, renderWithProviders, waitForAsyncUpdates } from '@/tests/utils/render-helpers';

// Mock the hooks
vi.mock('@/hooks/use-simple-companions', () => ({
	useSimpleCompanions: vi.fn(() => ({
		activeCompanions: [],
		companions: [],
		partyConfig: { maxSize: 4, activeCompanions: [], leadershipStyle: 'democratic' },
		isLoading: false,
		error: null,
	})),
}));

// Mock constants
vi.mock('@/constants/colors', () => ({
	Colors: {
		light: {
			textSecondary: '#666666',
			backgroundSecondary: '#f0f0f0',
			backgroundHighlight: '#e0e0e0',
		},
	},
}));

vi.mock('@/constants/races', () => ({
	RaceByID: {
		human: {
			image: require('@/assets/images/races/human.png'),
		},
	},
}));

vi.mock('@/constants/skills', () => ({
	SKILL_LIST: [
		{ id: 'athletics', name: 'Athletics' },
		{ id: 'perception', name: 'Perception' },
		{ id: 'stealth', name: 'Stealth' },
		{ id: 'investigation', name: 'Investigation' },
	],
}));

// Mock React Native components
vi.mock('react-native', () => ({
	Keyboard: {
		addListener: vi.fn(() => ({ remove: vi.fn() })),
	},
	Dimensions: {
		get: vi.fn(() => ({ width: 375, height: 812 })),
	},
	useWindowDimensions: vi.fn(() => ({
		width: 375,
		height: 812,
		scale: 1,
		fontScale: 1
	})),
	Platform: {
		OS: 'ios',
		select: vi.fn(options => options.ios || options.default),
	},
	StyleSheet: {
		create: vi.fn(styles => styles),
	},
}));

describe('TurnBasedChat', () => {
	const mockPlayerCharacter = CharacterFactory.createBasic({
		name: 'Test Hero',
		race: 'human',
	});

	const mockDMMessages: DMMessage[] = [
		{
			id: 'msg-1',
			content: 'Welcome to the tavern, adventurer!',
			speaker: 'Dungeon Master',
			timestamp: Date.now() - 1000,
			type: 'narration',
		},
		{
			id: 'msg-2',
			content: 'Player: I look around the room.',
			speaker: 'Player',
			timestamp: Date.now() - 500,
			type: 'dialogue',
		},
		{
			id: 'msg-3',
			content: 'You see several patrons drinking and a mysterious figure in the corner.',
			speaker: 'Dungeon Master',
			timestamp: Date.now(),
			type: 'narration',
		},
	];

	const mockOnSendMessage = vi.fn();
	const mockOnTurnChange = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		assertNoConsoleErrors();
	});

	describe('Component rendering', () => {
		it('should render without crashing', async () => {
			const { container } = renderWithProviders(
				<TurnBasedChat
					playerCharacter={mockPlayerCharacter}
					dmMessages={mockDMMessages}
					onSendMessage={mockOnSendMessage}
					activeCharacter="player"
					onTurnChange={mockOnTurnChange}
				/>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should display chat header', async () => {
			const { getByText } = renderWithProviders(
				<TurnBasedChat
					playerCharacter={mockPlayerCharacter}
					dmMessages={mockDMMessages}
					onSendMessage={mockOnSendMessage}
					activeCharacter="player"
					onTurnChange={mockOnTurnChange}
				/>
			);

			await waitForAsyncUpdates();

			expect(getByText('Party Chat')).toBeTruthy();
			expect(getByText("Test Hero's Turn")).toBeTruthy();
		});

		it('should display DM turn indicator when DM is active', async () => {
			const { getByText } = renderWithProviders(
				<TurnBasedChat
					playerCharacter={mockPlayerCharacter}
					dmMessages={mockDMMessages}
					onSendMessage={mockOnSendMessage}
					activeCharacter="dm"
					onTurnChange={mockOnTurnChange}
				/>
			);

			await waitForAsyncUpdates();

			expect(getByText('Waiting for Dungeon Master...')).toBeTruthy();
		});
	});

	describe('Message display', () => {
		it('should display all DM messages', async () => {
			const { getByText } = renderWithProviders(
				<TurnBasedChat
					playerCharacter={mockPlayerCharacter}
					dmMessages={mockDMMessages}
					onSendMessage={mockOnSendMessage}
					activeCharacter="player"
					onTurnChange={mockOnTurnChange}
				/>
			);

			await waitForAsyncUpdates();

			expect(getByText('Welcome to the tavern, adventurer!')).toBeTruthy();
			expect(getByText('I look around the room.')).toBeTruthy();
			expect(getByText('You see several patrons drinking and a mysterious figure in the corner.')).toBeTruthy();
		});

		it('should correctly identify player messages', async () => {
			const { getByText } = renderWithProviders(
				<TurnBasedChat
					playerCharacter={mockPlayerCharacter}
					dmMessages={mockDMMessages}
					onSendMessage={mockOnSendMessage}
					activeCharacter="player"
					onTurnChange={mockOnTurnChange}
				/>
			);

			await waitForAsyncUpdates();

			// Player message should be displayed without "Player:" prefix
			expect(getByText('I look around the room.')).toBeTruthy();
		});

		it('should display speaker names correctly', async () => {
			const { getByText } = renderWithProviders(
				<TurnBasedChat
					playerCharacter={mockPlayerCharacter}
					dmMessages={mockDMMessages}
					onSendMessage={mockOnSendMessage}
					activeCharacter="player"
					onTurnChange={mockOnTurnChange}
				/>
			);

			await waitForAsyncUpdates();

			expect(getByText('Dungeon Master')).toBeTruthy();
			expect(getByText('Test Hero')).toBeTruthy();
		});

		it('should handle empty message list', async () => {
			const { container } = renderWithProviders(
				<TurnBasedChat
					playerCharacter={mockPlayerCharacter}
					dmMessages={[]}
					onSendMessage={mockOnSendMessage}
					activeCharacter="player"
					onTurnChange={mockOnTurnChange}
				/>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});
	});

	describe('Input handling', () => {
		it('should show input field when player is active', async () => {
			const { getByPlaceholderText } = renderWithProviders(
				<TurnBasedChat
					playerCharacter={mockPlayerCharacter}
					dmMessages={mockDMMessages}
					onSendMessage={mockOnSendMessage}
					activeCharacter="player"
					onTurnChange={mockOnTurnChange}
				/>
			);

			await waitForAsyncUpdates();

			expect(getByPlaceholderText('What does Test Hero do?')).toBeTruthy();
		});

		it('should hide input field when DM is active', async () => {
			const { queryByPlaceholderText } = renderWithProviders(
				<TurnBasedChat
					playerCharacter={mockPlayerCharacter}
					dmMessages={mockDMMessages}
					onSendMessage={mockOnSendMessage}
					activeCharacter="dm"
					onTurnChange={mockOnTurnChange}
				/>
			);

			await waitForAsyncUpdates();

			expect(queryByPlaceholderText('What does Test Hero do?')).toBeNull();
		});

		it('should show input field for companion turns', async () => {
			const companion = CompanionFactory.createBasic({
				id: 'companion-1',
				name: 'Test Companion'
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

			const { getByPlaceholderText } = renderWithProviders(
				<TurnBasedChat
					playerCharacter={mockPlayerCharacter}
					dmMessages={mockDMMessages}
					onSendMessage={mockOnSendMessage}
					activeCharacter="companion-1"
					onTurnChange={mockOnTurnChange}
				/>
			);

			await waitForAsyncUpdates();

			expect(getByPlaceholderText('What does Test Companion do?')).toBeTruthy();
		});
	});

	describe('Message sending', () => {
		it('should call onSendMessage when message is sent', async () => {
			const { getByPlaceholderText } = renderWithProviders(
				<TurnBasedChat
					playerCharacter={mockPlayerCharacter}
					dmMessages={mockDMMessages}
					onSendMessage={mockOnSendMessage}
					activeCharacter="player"
					onTurnChange={mockOnTurnChange}
				/>
			);

			await waitForAsyncUpdates();

			const input = getByPlaceholderText('What does Test Hero do?') as HTMLInputElement;

			// Simulate typing and sending
			input.value = 'I attack the goblin';
			input.dispatchEvent(new Event('change', { bubbles: true }));
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

			await waitForAsyncUpdates();

			expect(mockOnSendMessage).toHaveBeenCalledWith('I attack the goblin', 'player');
		});

		it('should not send empty messages', async () => {
			const { getByPlaceholderText } = renderWithProviders(
				<TurnBasedChat
					playerCharacter={mockPlayerCharacter}
					dmMessages={mockDMMessages}
					onSendMessage={mockOnSendMessage}
					activeCharacter="player"
					onTurnChange={mockOnTurnChange}
				/>
			);

			await waitForAsyncUpdates();

			const input = getByPlaceholderText('What does Test Hero do?') as HTMLInputElement;

			// Try to send empty message
			input.value = '';
			input.dispatchEvent(new Event('change', { bubbles: true }));
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

			await waitForAsyncUpdates();

			expect(mockOnSendMessage).not.toHaveBeenCalled();
		});

		it('should not send messages when loading', async () => {
			const { getByPlaceholderText } = renderWithProviders(
				<TurnBasedChat
					playerCharacter={mockPlayerCharacter}
					dmMessages={mockDMMessages}
					onSendMessage={mockOnSendMessage}
					activeCharacter="player"
					onTurnChange={mockOnTurnChange}
					isLoading={true}
				/>
			);

			await waitForAsyncUpdates();

			const input = getByPlaceholderText('What does Test Hero do?') as HTMLInputElement;

			input.value = 'Test message';
			input.dispatchEvent(new Event('change', { bubbles: true }));
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

			await waitForAsyncUpdates();

			expect(mockOnSendMessage).not.toHaveBeenCalled();
		});
	});

	describe('Skill suggestions', () => {
		it('should show skill suggestions based on DM messages', async () => {
			const messagesWithSkillCheck: DMMessage[] = [
				{
					id: 'msg-skill',
					content: 'Make a Perception check to notice hidden details.',
					speaker: 'Dungeon Master',
					timestamp: Date.now(),
					type: 'system',
				},
			];

			const { getByText } = renderWithProviders(
				<TurnBasedChat
					playerCharacter={mockPlayerCharacter}
					dmMessages={messagesWithSkillCheck}
					onSendMessage={mockOnSendMessage}
					activeCharacter="player"
					onTurnChange={mockOnTurnChange}
				/>
			);

			await waitForAsyncUpdates();

			expect(getByText('Roll Perception')).toBeTruthy();
		});

		it('should show initiative suggestion', async () => {
			const messagesWithInitiative: DMMessage[] = [
				{
					id: 'msg-init',
					content: 'Combat begins! Roll for initiative.',
					speaker: 'Dungeon Master',
					timestamp: Date.now(),
					type: 'system',
				},
			];

			const { getByText } = renderWithProviders(
				<TurnBasedChat
					playerCharacter={mockPlayerCharacter}
					dmMessages={messagesWithInitiative}
					onSendMessage={mockOnSendMessage}
					activeCharacter="player"
					onTurnChange={mockOnTurnChange}
				/>
			);

			await waitForAsyncUpdates();

			expect(getByText('Roll Initiative')).toBeTruthy();
		});

		it('should handle suggestion clicks', async () => {
			const messagesWithSkillCheck: DMMessage[] = [
				{
					id: 'msg-skill',
					content: 'Make a Stealth check to move quietly.',
					speaker: 'Dungeon Master',
					timestamp: Date.now(),
					type: 'system',
				},
			];

			const { getByText } = renderWithProviders(
				<TurnBasedChat
					playerCharacter={mockPlayerCharacter}
					dmMessages={messagesWithSkillCheck}
					onSendMessage={mockOnSendMessage}
					activeCharacter="player"
					onTurnChange={mockOnTurnChange}
				/>
			);

			await waitForAsyncUpdates();

			const suggestionButton = getByText('Roll Stealth');
			suggestionButton.click();

			expect(mockOnSendMessage).toHaveBeenCalledWith('/roll stealth', 'player');
		});
	});

	describe('Keyboard handling', () => {
		it('should handle keyboard show/hide events', async () => {
			const { Keyboard } = await import('react-native');
			const mockAddListener = vi.mocked(Keyboard.addListener);

			renderWithProviders(
				<TurnBasedChat
					playerCharacter={mockPlayerCharacter}
					dmMessages={mockDMMessages}
					onSendMessage={mockOnSendMessage}
					activeCharacter="player"
					onTurnChange={mockOnTurnChange}
				/>
			);

			await waitForAsyncUpdates();

			expect(mockAddListener).toHaveBeenCalledWith('keyboardDidShow', expect.any(Function));
			expect(mockAddListener).toHaveBeenCalledWith('keyboardDidHide', expect.any(Function));
		});
	});

	describe('Responsive behavior', () => {
		it('should handle mobile layout', async () => {
			const { useWindowDimensions } = await import('react-native');
			vi.mocked(useWindowDimensions).mockReturnValue({
				width: 375,
				height: 812,
				scale: 1,
				fontScale: 1
			});

			const { container } = renderWithProviders(
				<TurnBasedChat
					playerCharacter={mockPlayerCharacter}
					dmMessages={mockDMMessages}
					onSendMessage={mockOnSendMessage}
					activeCharacter="player"
					onTurnChange={mockOnTurnChange}
				/>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should handle desktop layout', async () => {
			const { useWindowDimensions } = await import('react-native');
			vi.mocked(useWindowDimensions).mockReturnValue({
				width: 1024,
				height: 768,
				scale: 1,
				fontScale: 1
			});

			const { container } = renderWithProviders(
				<TurnBasedChat
					playerCharacter={mockPlayerCharacter}
					dmMessages={mockDMMessages}
					onSendMessage={mockOnSendMessage}
					activeCharacter="player"
					onTurnChange={mockOnTurnChange}
				/>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});
	});

	describe('Edge cases', () => {
		it('should handle null player character', async () => {
			const { container } = renderWithProviders(
				<TurnBasedChat
					playerCharacter={null}
					dmMessages={mockDMMessages}
					onSendMessage={mockOnSendMessage}
					activeCharacter="player"
					onTurnChange={mockOnTurnChange}
				/>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});

		it('should handle messages without IDs', async () => {
			const messagesWithoutIds: DMMessage[] = [
				{
					content: 'Test message without ID',
					speaker: 'Dungeon Master',
					timestamp: Date.now(),
				} as DMMessage,
			];

			const { getByText } = renderWithProviders(
				<TurnBasedChat
					playerCharacter={mockPlayerCharacter}
					dmMessages={messagesWithoutIds}
					onSendMessage={mockOnSendMessage}
					activeCharacter="player"
					onTurnChange={mockOnTurnChange}
				/>
			);

			await waitForAsyncUpdates();

			expect(getByText('Test message without ID')).toBeTruthy();
		});

		it('should handle malformed speaker prefixes', async () => {
			const messagesWithMalformedPrefix: DMMessage[] = [
				{
					id: 'msg-malformed',
					content: 'player:no space after colon',
					speaker: 'Dungeon Master',
					timestamp: Date.now(),
					type: 'dialogue',
				},
			];

			const { container } = renderWithProviders(
				<TurnBasedChat
					playerCharacter={mockPlayerCharacter}
					dmMessages={messagesWithMalformedPrefix}
					onSendMessage={mockOnSendMessage}
					activeCharacter="player"
					onTurnChange={mockOnTurnChange}
				/>
			);

			await waitForAsyncUpdates();

			expect(container).toBeTruthy();
		});
	});
});
