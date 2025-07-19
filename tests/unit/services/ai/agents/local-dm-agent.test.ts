import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocalDMAgent } from '../../../../../services/ai/agents/local-dm-agent';

describe('LocalDMAgent', () => {
	let dmAgent: LocalDMAgent;

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock dependencies
		vi.mock('../../../../../services/ai/providers/local-dm-provider', () => ({
			LocalDMProvider: vi.fn().mockImplementation(() => ({
				initialize: vi.fn().mockResolvedValue(true),
				generateDnDResponse: vi.fn().mockResolvedValue({
					text: 'You attack the goblin! [ROLL:1d20+5] Roll for attack.',
					confidence: 0.9,
					toolCommands: [{ type: 'roll', params: '1d20+5' }],
					processingTime: 500,
				}),
				healthCheck: vi.fn().mockResolvedValue(true),
				isReady: vi.fn().mockReturnValue(true),
				getStatus: vi.fn().mockReturnValue({
					isLoaded: true,
					isReady: true,
					error: null,
				}),
				cleanup: vi.fn().mockResolvedValue(undefined),
			})),
		}));
		dmAgent = new LocalDMAgent({
			modelPath: '/test/path/model.onnx',
			maxTokens: 100,
			temperature: 0.7,
			enableContentFiltering: true,
		});
	});

	// Task 4.1: Create LocalDMAgent class with core D&D processing
	describe('Core D&D Processing (Task 4.1)', () => {
		it('should initialize successfully', async () => {
			await expect(dmAgent.initialize()).resolves.not.toThrow();
			expect(dmAgent.isReady()).toBe(true);
		});

		it('should process player actions with context awareness', async () => {
			await dmAgent.initialize();

			const response = await dmAgent.processAction('I attack the goblin', {
				playerName: 'TestPlayer',
				playerClass: 'Fighter',
				playerRace: 'Human',
				currentScene: 'Dungeon',
				gameHistory: ['Entered the dungeon', 'Found a goblin'],
			});

			expect(response).toEqual(expect.objectContaining({
				text: expect.any(String),
				actions: expect.any(Array),
			}));
		});

		it('should maintain narrative consistency', async () => {
			await dmAgent.initialize();

			// First action
			await dmAgent.processAction('I enter the tavern', {
				playerName: 'TestPlayer',
				playerClass: 'Bard',
				playerRace: 'Elf',
				currentScene: 'Village',
				gameHistory: ['Arrived at the village'],
			});

			// Second action should have updated history
			const processActionSpy = vi.spyOn(dmAgent['provider'], 'generateDnDResponse');

			await dmAgent.processAction('I talk to the bartender', {
				playerName: 'TestPlayer',
				playerClass: 'Bard',
				playerRace: 'Elf',
				currentScene: 'Tavern',
				gameHistory: ['Arrived at the village', 'Entered the tavern'],
			});

			// Check that history was passed correctly
			expect(processActionSpy).toHaveBeenCalledWith(
				'I talk to the bartender',
				expect.objectContaining({
					gameHistory: expect.arrayContaining(['Entered the tavern']),
				}),
				expect.any(Number),
			);
		});
	});

	// Task 4.2: Add tool command parsing and execution
	describe('Tool Command Parsing (Task 4.2)', () => {
		it('should extract dice roll commands', async () => {
			await dmAgent.initialize();

			// Mock provider to return response with dice roll
			vi.spyOn(dmAgent['provider'], 'generateDnDResponse').mockResolvedValueOnce({
				text: 'Roll for attack! [ROLL:1d20+5]',
				confidence: 0.9,
				toolCommands: [{ type: 'roll', params: '1d20+5' }],
				processingTime: 500,
			});

			const response = await dmAgent.processAction('I attack the orc', {
				playerName: 'TestPlayer',
				playerClass: 'Fighter',
				playerRace: 'Human',
				currentScene: 'Dungeon',
				gameHistory: ['Entered the dungeon', 'Found an orc'],
			});

			expect(response.actions).toContainEqual(expect.objectContaining({
				type: 'roll',
				params: '1d20+5',
			}));
		});

		it('should extract character stat updates', async () => {
			await dmAgent.initialize();

			// Mock provider to return response with stat update
			vi.spyOn(dmAgent['provider'], 'generateDnDResponse').mockResolvedValueOnce({
				text: 'You take damage! [UPDATE:HP-10]',
				confidence: 0.9,
				toolCommands: [{ type: 'update', params: 'HP-10' }],
				processingTime: 500,
			});

			const response = await dmAgent.processAction('I fail to dodge the trap', {
				playerName: 'TestPlayer',
				playerClass: 'Rogue',
				playerRace: 'Halfling',
				currentScene: 'Dungeon',
				gameHistory: ['Entered the dungeon', 'Found a trapped chest'],
			});

			expect(response.actions).toContainEqual(expect.objectContaining({
				type: 'update',
				params: 'HP-10',
			}));
		});

		it('should execute tool commands with game state integration', async () => {
			await dmAgent.initialize();

			// Mock provider to return response with multiple commands
			vi.spyOn(dmAgent['provider'], 'generateDnDResponse').mockResolvedValueOnce({
				text: 'You attack and deal damage! [ROLL:1d20+5] [DAMAGE:1d8+3]',
				confidence: 0.9,
				toolCommands: [
					{ type: 'roll', params: '1d20+5' },
					{ type: 'damage', params: '1d8+3' },
				],
				processingTime: 500,
			});

			const executeCommandsSpy = vi.spyOn(dmAgent as any, 'executeToolCommands');

			await dmAgent.processAction('I attack the dragon', {
				playerName: 'TestPlayer',
				playerClass: 'Paladin',
				playerRace: 'Dragonborn',
				currentScene: 'Dragon Lair',
				gameHistory: ['Entered the lair', 'Confronted the dragon'],
			});

			expect(executeCommandsSpy).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({ type: 'roll' }),
					expect.objectContaining({ type: 'damage' }),
				]),
				expect.any(Object),
			);
		});
	});

	// Task 4.3: Implement response quality filtering and validation
	describe('Response Quality Filtering (Task 4.3)', () => {
		it('should filter inappropriate content', async () => {
			await dmAgent.initialize();

			// Mock provider to return inappropriate content
			vi.spyOn(dmAgent['provider'], 'generateDnDResponse').mockResolvedValueOnce({
				text: 'This contains inappropriate content that should be filtered',
				confidence: 0.9,
				toolCommands: [],
				processingTime: 500,
			});

			// Mock content filter to detect inappropriate content
			vi.spyOn(dmAgent as any, 'filterInappropriateContent').mockReturnValueOnce({
				filtered: true,
				text: 'This content has been filtered',
				reason: 'Inappropriate language',
			});

			const response = await dmAgent.processAction('Tell me something inappropriate', {
				playerName: 'TestPlayer',
				playerClass: 'Bard',
				playerRace: 'Tiefling',
				currentScene: 'Tavern',
				gameHistory: ['Entered the tavern'],
			});

			expect(response.text).toBe('This content has been filtered');
			expect(response.filtered).toBe(true);
		});

		it('should validate response length', async () => {
			await dmAgent.initialize();

			// Mock provider to return very short response
			vi.spyOn(dmAgent['provider'], 'generateDnDResponse').mockResolvedValueOnce({
				text: 'Too short',
				confidence: 0.9,
				toolCommands: [],
				processingTime: 500,
			});

			// Mock validation to fail
			vi.spyOn(dmAgent as any, 'validateResponseLength').mockReturnValueOnce({
				valid: false,
				reason: 'Response too short',
			});

			// Mock regeneration
			vi.spyOn(dmAgent as any, 'regenerateResponse').mockResolvedValueOnce({
				text: 'This is a properly regenerated response with adequate length',
				actions: [],
			});

			const response = await dmAgent.processAction('Hello', {
				playerName: 'TestPlayer',
				playerClass: 'Wizard',
				playerRace: 'Human',
				currentScene: 'Library',
				gameHistory: ['Entered the library'],
			});

			expect(response.text).toBe('This is a properly regenerated response with adequate length');
		});

		it('should validate response format', async () => {
			await dmAgent.initialize();

			// Mock provider to return malformatted response
			vi.spyOn(dmAgent['provider'], 'generateDnDResponse').mockResolvedValueOnce({
				text: 'Malformatted response with [INVALID:command]',
				confidence: 0.9,
				toolCommands: [{ type: 'invalid', params: 'command' }],
				processingTime: 500,
			});

			// Mock validation to fail
			vi.spyOn(dmAgent as any, 'validateResponseFormat').mockReturnValueOnce({
				valid: false,
				reason: 'Invalid tool command format',
			});

			// Mock regeneration
			vi.spyOn(dmAgent as any, 'regenerateResponse').mockResolvedValueOnce({
				text: 'This is a properly formatted response',
				actions: [{ type: 'roll', params: '1d20' }],
			});

			const response = await dmAgent.processAction('Cast a spell', {
				playerName: 'TestPlayer',
				playerClass: 'Wizard',
				playerRace: 'Human',
				currentScene: 'Tower',
				gameHistory: ['Entered the tower'],
			});

			expect(response.text).toBe('This is a properly formatted response');
			expect(response.actions).toContainEqual(expect.objectContaining({
				type: 'roll',
				params: '1d20',
			}));
		});
	});

	// Test D&D rule integration
	describe('D&D Rule Integration', () => {
		it('should apply D&D rules for combat', async () => {
			await dmAgent.initialize();

			// Mock combat rules integration
			const applyCombatRulesSpy = vi.spyOn(dmAgent as any, 'applyCombatRules').mockReturnValue({
				advantage: true,
				criticalHit: false,
				damageModifier: 1.5,
			});

			await dmAgent.processAction('I attack the orc with advantage', {
				playerName: 'TestPlayer',
				playerClass: 'Fighter',
				playerRace: 'Human',
				currentScene: 'Battlefield',
				gameHistory: ['Entered battle', 'Flanked the orc'],
			});

			expect(applyCombatRulesSpy).toHaveBeenCalled();
		});

		it('should apply D&D rules for skill checks', async () => {
			await dmAgent.initialize();

			// Mock skill check rules integration
			const applySkillCheckRulesSpy = vi.spyOn(dmAgent as any, 'applySkillCheckRules').mockReturnValue({
				difficulty: 15,
				proficient: true,
				modifier: 3,
			});

			await dmAgent.processAction('I search for traps', {
				playerName: 'TestPlayer',
				playerClass: 'Rogue',
				playerRace: 'Halfling',
				currentScene: 'Dungeon',
				gameHistory: ['Entered the dungeon'],
			});

			expect(applySkillCheckRulesSpy).toHaveBeenCalled();
		});
	});

	// Test cleanup
	describe('Cleanup', () => {
		it('should clean up resources', async () => {
			await dmAgent.initialize();
			await dmAgent.cleanup();

			expect(dmAgent['provider'].cleanup).toHaveBeenCalled();
		});
	});
});
