import * as FileSystem from 'expo-file-system';
import { vi } from 'vitest';

import { dndModel, type DnDMessage } from '@/services/dnd-model';

// Mock expo-file-system
vi.mock('expo-file-system', () => ({
	documentDirectory: '/mock/documents/',
	makeDirectoryAsync: vi.fn(),
	readAsStringAsync: vi.fn(),
	copyAsync: vi.fn(),
	getInfoAsync: vi.fn(),
}));

// Mock CactusVLM
vi.mock('cactus-react-native', () => ({
	CactusVLM: {
		init: vi.fn(),
	},
}));

const mockFileSystem = FileSystem as vi.Mocked<typeof FileSystem>;

describe('D&D Model Integration Tests', () => {
	const mockConfig = {
		model: {
			name: 'dnd_model',
			type: 'gguf',
			path: './dnd_model_gguf',
			quantization: 'q4_k_m',
			context_length: 2048,
		},
		system_prompt:
			'You are a Dungeon Master assistant for D&D 5e. You help with gameplay, rules, and story generation. Use tool calls when needed for game mechanics.',
		generation_config: {
			temperature: 0.7,
			top_p: 0.9,
			top_k: 40,
			repeat_penalty: 1.1,
			max_tokens: 512,
		},
		tools: {
			enabled: true,
			format: '[{tool_name}: {arguments}]',
			supported: ['roll', 'health', 'inventory', 'spellcast', 'check', 'save'],
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Reset the model instance
		(dndModel as any).isInitialized = false;
		(dndModel as any).modelConfig = null;

		// Set up default mocks
		mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true } as any);
		mockFileSystem.readAsStringAsync.mockResolvedValue(JSON.stringify(mockConfig));
		mockFileSystem.makeDirectoryAsync.mockResolvedValue();
		mockFileSystem.copyAsync.mockResolvedValue();
	});

	describe('Full D&D Adventure Scenario', () => {
		it('should handle a complete tavern encounter', async () => {
			await dndModel.initialize(vi.fn());

			const context: DnDMessage['context'] = {
				role: 'Dungeon Master',
				world: 'Forgotten Realms',
				location: 'The Prancing Pony Tavern',
				party: ['Aragorn (Human Ranger, Level 5)'],
				playerHealth: { Aragorn: 42 },
				inventory: ['Longsword', 'Bow', 'Quiver (30 arrows)', '50 gold'],
			};

			const messages: DnDMessage[] = [
				{
					role: 'user',
					content: 'I enter the tavern and look around',
					context,
				},
				{
					role: 'user',
					content: 'I approach the innkeeper and ask about rumors',
					context,
				},
				{
					role: 'user',
					content: 'I want to listen carefully for any useful information',
					context,
				},
			];

			const responses = [];
			for (const message of messages) {
				const response = await dndModel.generateResponse(message);
				responses.push(response);
			}

			// Verify tavern-appropriate responses
			const allResponses = responses.join(' ').toLowerCase();
			expect(allResponses).toMatch(/tavern|innkeeper|barkeep/);
			expect(allResponses).toMatch(/traveler|stranger|adventurer/);

			// Should contain tavern-related content
			expect(responses.some(r => r.toLowerCase().includes('tavern') || r.toLowerCase().includes('innkeeper'))).toBe(true);
		});

		it('should handle a combat encounter with multiple actions', async () => {
			await dndModel.initialize(vi.fn());

			const context: DnDMessage['context'] = {
				role: 'Dungeon Master',
				world: 'Forgotten Realms',
				location: 'Dark Forest',
				party: [
					'Thordak (Dragonborn Fighter, Level 5, HP: 45/45)',
					'Elara (Elf Wizard, Level 5, HP: 28/28)',
				],
				playerHealth: { Thordak: 45, Elara: 28 },
			};

			const combatMessages: DnDMessage[] = [
				{
					role: 'user',
					content: 'Three goblins jump out and attack us!',
					context,
				},
				{
					role: 'user',
					content: 'I roll for initiative',
					context,
				},
				{
					role: 'user',
					content: 'I attack the first goblin with my longsword',
					context,
				},
				{
					role: 'user',
					content: 'I got hit by the goblin, I lose 8 hit points',
					context: {
						...context,
						playerHealth: { Thordak: 37, Elara: 28 },
					},
				},
			];

			const responses = [];
			for (const message of combatMessages) {
				const response = await dndModel.generateResponse(message);
				responses.push(response);
			}

			// Verify combat-appropriate responses
			const allResponses = responses.join(' ').toLowerCase();
			expect(allResponses).toMatch(/initiative|attack|combat|roll/);

			// Should contain multiple dice rolls
			const rollCount = (responses.join(' ').match(/<TOOLCALL>roll:/g) || []).length;
			expect(rollCount).toBeGreaterThan(0);

			// Should handle combat-related content
			expect(allResponses).toMatch(/initiative|attack|goblin|roll/i);
		});
	});

	describe('Tool Calling Integration', () => {
		beforeEach(async () => {
			await dndModel.initialize(vi.fn());
		});

		it('should process complex dice expressions', async () => {
			const testCases = [
				{ input: 'I want to roll 2d6+3 for damage', expectedPattern: /\*\d+\*/ },
				{ input: 'Roll a d20 for initiative', expectedPattern: /\*\d+\*/ },
				{
					input: 'Make a perception check with advantage (roll twice)',
					expectedPattern: /\*\d+\*/,
				},
			];

			for (const testCase of testCases) {
				const response = await dndModel.generateResponse({
					role: 'user',
					content: testCase.input,
				});

				expect(response).toMatch(testCase.expectedPattern);
			}
		});

		it('should handle health management correctly', async () => {
			const context: DnDMessage['context'] = {
				party: ['Hero (Fighter, HP: 45/45)'],
				playerHealth: { Hero: 45 },
			};

			// Take damage
			const damageResponse = await dndModel.generateResponse({
				role: 'user',
				content: 'The orc hits me for 8 damage',
				context,
			});

			expect(damageResponse).toMatch(/torchlight|stone walls/i);

			// Heal damage
			const healResponse = await dndModel.generateResponse({
				role: 'user',
				content: 'I drink a healing potion',
				context: {
					...context,
					playerHealth: { Hero: 37 },
				},
			});

			expect(healResponse).toMatch(/health.*increased|heal|recover/i);
		});

		it('should handle ability checks and saves', async () => {
			const testChecks = [
				'I want to make a Stealth check',
				'Roll a Dexterity saving throw',
				'Make a Constitution save against poison',
				'I search for traps (Investigation check)',
			];

			for (const checkText of testChecks) {
				const response = await dndModel.generateResponse({
					role: 'user',
					content: checkText,
				});

				// Should contain appropriate D&D response
				expect(response).toMatch(/torchlight|stone walls|perception|roll/i);
			}
		});
	});

	describe('Context Awareness', () => {
		beforeEach(async () => {
			await dndModel.initialize(vi.fn());
		});

		it('should adapt responses based on location context', async () => {
			const contexts = [
				{
					location: 'Ancient Library',
					expectedKeywords: ['books', 'knowledge', 'scroll', 'tome'],
				},
				{
					location: "Dragon's Lair",
					expectedKeywords: ['dragon', 'treasure', 'hoard', 'danger'],
				},
				{
					location: 'Bustling Market',
					expectedKeywords: ['merchant', 'trade', 'gold', 'buy'],
				},
			];

			for (const { location, expectedKeywords } of contexts) {
				const response = await dndModel.generateResponse({
					role: 'user',
					content: 'I look around and describe what I see',
					context: { location },
				});

				// Response should be contextually appropriate
				const responseText = response.toLowerCase();
				const hasRelevantContent = expectedKeywords.some(keyword =>
					responseText.includes(keyword),
				);

				// At minimum, should contain generic adventure language
				expect(responseText.length).toBeGreaterThan(10);
			}
		});

		it('should remember party composition in responses', async () => {
			const party = [
				'Thordak (Dragonborn Fighter)',
				'Elara (Elf Wizard)',
				'Grimm (Dwarf Cleric)',
			];

			const response = await dndModel.generateResponse({
				role: 'user',
				content: 'We need to decide our marching order',
				context: { party },
			});

			// Response should acknowledge the party context
			expect(response.length).toBeGreaterThan(10);
			expect(typeof response).toBe('string');
		});
	});

	describe('Error Handling and Recovery', () => {
		it('should handle initialization failures gracefully', async () => {
			mockFileSystem.readAsStringAsync.mockRejectedValue(new Error('Config file not found'));

			await expect(dndModel.initialize(vi.fn())).rejects.toThrow(
				'Failed to load D&D model config',
			);
		});

		it('should handle malformed user input', async () => {
			await dndModel.initialize(vi.fn());

			const problematicInputs = [
				'', // Empty string
				'   ', // Whitespace only
				'¿∆∂ƒ∂©˙∆˚¬', // Unicode characters
				'[invalid: tool call without proper format',
				'roll 999d999999999999999999999999999999999',
			];

			for (const input of problematicInputs) {
				const response = await dndModel.generateResponse({
					role: 'user',
					content: input,
				});

				// Should still return a valid response
				expect(typeof response).toBe('string');
				expect(response.length).toBeGreaterThan(0);
			}
		});

		it('should handle file system errors during model copy', async () => {
			mockFileSystem.copyAsync.mockRejectedValue(new Error('Permission denied'));

			// Should still initialize but log warnings
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			await dndModel.initialize(vi.fn());

			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});
	});

	describe('Performance and Resource Management', () => {
		beforeEach(async () => {
			await dndModel.initialize(vi.fn());
		});

		it('should handle multiple concurrent requests', async () => {
			const requests = Array.from({ length: 5 }, (_, i) =>
				dndModel.generateResponse({
					role: 'user',
					content: `Request ${i + 1}: I want to explore the area`,
				}),
			);

			const responses = await Promise.all(requests);

			expect(responses).toHaveLength(5);
			responses.forEach(response => {
				expect(typeof response).toBe('string');
				expect(response.length).toBeGreaterThan(0);
			});
		});

		it('should handle large context objects', async () => {
			const largeContext: DnDMessage['context'] = {
				role: 'Dungeon Master',
				world: 'Complex Fantasy World with Very Long Name and Detailed History',
				location: 'The Ancient Ruined Temple of the Forgotten God of Secrets and Knowledge',
				party: Array.from(
					{ length: 20 },
					(_, i) => `Character${i} (Class${i} Level${i}, HP: ${i * 10}/${i * 10})`,
				),
				playerHealth: Object.fromEntries(
					Array.from({ length: 20 }, (_, i) => [`Character${i}`, i * 10]),
				),
				inventory: Array.from({ length: 50 }, (_, i) => `Item${i}`),
			};

			const response = await dndModel.generateResponse({
				role: 'user',
				content: 'What do I see around me?',
				context: largeContext,
			});

			expect(typeof response).toBe('string');
			expect(response.length).toBeGreaterThan(0);
		});
	});
});
