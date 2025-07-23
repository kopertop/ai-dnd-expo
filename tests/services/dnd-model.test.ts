import * as FileSystem from 'expo-file-system';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { dndModel, type DnDMessage, type ToolCall } from '@/services/dnd-model';

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

const mockFileSystem = FileSystem as any;

describe('DnDModelManager', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset the model instance
		(dndModel as any).isInitialized = false;
		(dndModel as any).modelConfig = null;
	});

	describe('initialization', () => {
		const mockConfig = {
			model: {
				name: 'dnd_model',
				type: 'gguf',
				path: './dnd_model_gguf',
				quantization: 'q4_k_m',
				context_length: 2048,
			},
			system_prompt: 'You are a Dungeon Master assistant for D&D 5e.',
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

		it('should initialize successfully with valid configuration', async () => {
			mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true } as any);
			mockFileSystem.readAsStringAsync.mockResolvedValue(JSON.stringify(mockConfig));
			mockFileSystem.makeDirectoryAsync.mockResolvedValue();
			mockFileSystem.copyAsync.mockResolvedValue();

			const progressMock = vi.fn();

			await dndModel.initialize(progressMock);

			expect(dndModel.getIsInitialized()).toBe(true);
			expect(dndModel.getModelConfig()).toEqual(mockConfig);
			expect(progressMock).toHaveBeenCalledWith(1.0);
		});

		it('should handle missing configuration file', async () => {
			mockFileSystem.makeDirectoryAsync.mockResolvedValue();
			mockFileSystem.copyAsync.mockResolvedValue();
			mockFileSystem.readAsStringAsync.mockRejectedValue(new Error('File not found'));

			const progressMock = vi.fn();

			await expect(dndModel.initialize(progressMock)).rejects.toThrow(
				'Failed to load D&D model config',
			);
		});

		it('should not reinitialize if already initialized', async () => {
			mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true } as any);
			mockFileSystem.readAsStringAsync.mockResolvedValue(JSON.stringify(mockConfig));
			mockFileSystem.makeDirectoryAsync.mockResolvedValue();
			mockFileSystem.copyAsync.mockResolvedValue();

			const progressMock = vi.fn();

			// Initialize once
			await dndModel.initialize(progressMock);
			expect(progressMock).toHaveBeenCalledTimes(3);

			// Try to initialize again
			progressMock.mockClear();
			await dndModel.initialize(progressMock);
			expect(progressMock).not.toHaveBeenCalled();
		});
	});

	describe('tool call parsing', () => {
		beforeEach(async () => {
			const mockConfig = {
				tools: {
					enabled: true,
					format: '[{tool_name}: {arguments}]',
					supported: ['roll', 'health', 'inventory', 'spellcast', 'check', 'save'],
				},
			};

			mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true } as any);
			mockFileSystem.readAsStringAsync.mockResolvedValue(JSON.stringify(mockConfig));
			mockFileSystem.makeDirectoryAsync.mockResolvedValue();
			mockFileSystem.copyAsync.mockResolvedValue();

			await dndModel.initialize(vi.fn());
		});

		it('should parse single tool call correctly', () => {
			const response = 'Make a perception check. [roll: 1d20+5]';
			const toolCalls = dndModel.parseToolCalls(response);

			expect(toolCalls).toHaveLength(1);
			expect(toolCalls[0]).toEqual({
				type: 'roll',
				arguments: '1d20+5',
			});
		});

		it('should parse multiple tool calls', () => {
			const response =
				'Roll initiative [roll: 1d20] and then check your health [health: player, -5].';
			const toolCalls = dndModel.parseToolCalls(response);

			expect(toolCalls).toHaveLength(2);
			expect(toolCalls[0]).toEqual({
				type: 'roll',
				arguments: '1d20',
			});
			expect(toolCalls[1]).toEqual({
				type: 'health',
				arguments: 'player, -5',
			});
		});

		it('should ignore unsupported tool calls', () => {
			const response = 'Cast a spell [unsupported: fireball] and roll [roll: 1d6].';
			const toolCalls = dndModel.parseToolCalls(response);

			expect(toolCalls).toHaveLength(1);
			expect(toolCalls[0]).toEqual({
				type: 'roll',
				arguments: '1d6',
			});
		});

		it('should handle empty response', () => {
			const toolCalls = dndModel.parseToolCalls('');
			expect(toolCalls).toHaveLength(0);
		});

		it('should handle malformed tool calls', () => {
			const response = 'Invalid [roll without closing bracket and [health: ] empty args';
			const toolCalls = dndModel.parseToolCalls(response);

			expect(toolCalls).toHaveLength(1);
			expect(toolCalls[0]).toEqual({
				type: 'health',
				arguments: '',
			});
		});
	});

	describe('tool execution simulation', () => {
		beforeEach(async () => {
			const mockConfig = {
				tools: { supported: ['roll', 'health', 'check', 'save'] },
			};

			mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true } as any);
			mockFileSystem.readAsStringAsync.mockResolvedValue(JSON.stringify(mockConfig));
			mockFileSystem.makeDirectoryAsync.mockResolvedValue();
			mockFileSystem.copyAsync.mockResolvedValue();

			await dndModel.initialize(vi.fn());
		});

		it('should simulate dice roll correctly', () => {
			const toolCall: ToolCall = { type: 'roll', arguments: '1d20+5' };
			const result = dndModel.simulateToolExecution(toolCall);

			expect(result).toMatch(/^<TOOLCALL>roll: \d+ \+ 5 = \*\d+\*<\/TOOLCALL>$/);

			// Extract the total and verify it's within expected range (6-25 for 1d20+5)
			const totalMatch = result.match(/\*(\d+)\*/);
			expect(totalMatch).toBeTruthy();
			const total = parseInt(totalMatch![1]);
			expect(total).toBeGreaterThanOrEqual(6);
			expect(total).toBeLessThanOrEqual(25);
		});

		it('should simulate multiple dice rolls', () => {
			const toolCall: ToolCall = { type: 'roll', arguments: '2d6' };
			const result = dndModel.simulateToolExecution(toolCall);

			expect(result).toMatch(/^<TOOLCALL>roll: \d+ \+ \d+ = \*\d+\*<\/TOOLCALL>$/);

			const totalMatch = result.match(/\*(\d+)\*/);
			expect(totalMatch).toBeTruthy();
			const total = parseInt(totalMatch![1]);
			expect(total).toBeGreaterThanOrEqual(2);
			expect(total).toBeLessThanOrEqual(12);
		});

		it('should simulate health changes', () => {
			const healToolCall: ToolCall = { type: 'health', arguments: 'player, +8' };
			const healResult = dndModel.simulateToolExecution(healToolCall);
			expect(healResult).toBe('<TOOLCALL>health: player health increased by 8</TOOLCALL>');

			const damageToolCall: ToolCall = { type: 'health', arguments: 'player, -5' };
			const damageResult = dndModel.simulateToolExecution(damageToolCall);
			expect(damageResult).toBe('<TOOLCALL>health: player health reduced by 5</TOOLCALL>');
		});

		it('should simulate ability checks and saves', () => {
			const checkToolCall: ToolCall = { type: 'check', arguments: 'perception' };
			const checkResult = dndModel.simulateToolExecution(checkToolCall);
			expect(checkResult).toMatch(/^<TOOLCALL>check: perception = \d+<\/TOOLCALL>$/);

			const saveToolCall: ToolCall = { type: 'save', arguments: 'constitution' };
			const saveResult = dndModel.simulateToolExecution(saveToolCall);
			expect(saveResult).toMatch(/^<TOOLCALL>save: constitution = \d+<\/TOOLCALL>$/);
		});

		it('should handle malformed roll arguments', () => {
			const toolCall: ToolCall = { type: 'roll', arguments: 'invalid' };
			const result = dndModel.simulateToolExecution(toolCall);
			expect(result).toBe('');
		});
	});

	describe('D&D response generation', () => {
		beforeEach(async () => {
			const mockConfig = {
				system_prompt: 'You are a Dungeon Master assistant for D&D 5e.',
				tools: { supported: ['roll', 'health', 'check'] },
			};

			mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true } as any);
			mockFileSystem.readAsStringAsync.mockResolvedValue(JSON.stringify(mockConfig));
			mockFileSystem.makeDirectoryAsync.mockResolvedValue();
			mockFileSystem.copyAsync.mockResolvedValue();

			await dndModel.initialize(vi.fn());
		});

		it('should generate response with context', async () => {
			const message: DnDMessage = {
				role: 'user',
				content: 'I want to look around the room',
				context: {
					role: 'Dungeon Master',
					world: 'Forgotten Realms',
					location: 'Ancient Temple',
					party: ['Thordak the Fighter', 'Elara the Wizard'],
				},
			};

			const response = await dndModel.generateResponse(message);
			expect(response).toContain('perception check');
			expect(response).toMatch(/\*\d+\*/); // Should contain executed dice roll
		});

		it('should handle combat scenarios', async () => {
			const message: DnDMessage = {
				role: 'user',
				content: 'I attack the goblin with my sword',
			};

			const response = await dndModel.generateResponse(message);
			expect(response).toContain('initiative');
			expect(response).toMatch(/<TOOLCALL>roll:.*<\/TOOLCALL>/);
		});

		it('should handle healing scenarios', async () => {
			const message: DnDMessage = {
				role: 'user',
				content: 'I drink a healing potion',
			};

			const response = await dndModel.generateResponse(message);
			expect(response).toContain('healing potion');
			expect(response).toMatch(/<TOOLCALL>health:.*<\/TOOLCALL>/);
		});

		it('should handle tavern roleplay', async () => {
			const message: DnDMessage = {
				role: 'user',
				content: 'I approach the innkeeper',
			};

			const response = await dndModel.generateResponse(message);
			expect(response).toContain('innkeeper');
			expect(response).toContain('traveler');
		});

		it('should throw error when not initialized', async () => {
			const uninitializedModel = { ...(dndModel as any) };
			uninitializedModel.isInitialized = false;

			const message: DnDMessage = {
				role: 'user',
				content: 'test message',
			};

			await expect(uninitializedModel.generateResponse(message)).rejects.toThrow(
				'D&D Model not initialized',
			);
		});
	});

	describe('integration scenarios', () => {
		beforeEach(async () => {
			const mockConfig = {
				system_prompt: 'You are a Dungeon Master assistant for D&D 5e.',
				tools: {
					enabled: true,
					format: '[{tool_name}: {arguments}]',
					supported: ['roll', 'health', 'inventory', 'spellcast', 'check', 'save'],
				},
			};

			mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true } as any);
			mockFileSystem.readAsStringAsync.mockResolvedValue(JSON.stringify(mockConfig));
			mockFileSystem.makeDirectoryAsync.mockResolvedValue();
			mockFileSystem.copyAsync.mockResolvedValue();

			await dndModel.initialize(vi.fn());
		});

		it('should handle complete combat scenario', async () => {
			const messages: DnDMessage[] = [
				{
					role: 'user',
					content: 'A goblin jumps out and attacks!',
					context: {
						role: 'Dungeon Master',
						location: 'Forest Path',
						party: ['Aragorn (Fighter, HP: 45/45)'],
					},
				},
				{
					role: 'user',
					content: 'I want to roll for initiative',
				},
				{
					role: 'user',
					content: 'I attack with my longsword',
				},
			];

			const responses = [];
			for (const message of messages) {
				const response = await dndModel.generateResponse(message);
				responses.push(response);
			}

			// Check that responses contain appropriate D&D elements
			expect(responses.join(' ')).toContain('initiative');
			expect(responses.some(r => r.match(/<TOOLCALL>roll:.*<\/TOOLCALL>/))).toBe(true);
		});

		it('should maintain conversation context across multiple messages', async () => {
			const context = {
				role: 'Dungeon Master',
				world: 'Forgotten Realms',
				location: 'Tavern',
				party: ['Hero'],
			};

			const message1: DnDMessage = {
				role: 'user',
				content: 'I enter the tavern',
				context,
			};

			const message2: DnDMessage = {
				role: 'user',
				content: 'I talk to the innkeeper',
				context,
			};

			const response1 = await dndModel.generateResponse(message1);
			const response2 = await dndModel.generateResponse(message2);

			expect(response1).toContain('tavern');
			expect(response2).toContain('innkeeper');
		});
	});
});
