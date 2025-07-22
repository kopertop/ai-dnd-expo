import { describe, it, expect, beforeEach } from 'vitest';

import { dndModel, type DnDMessage, type ToolCall } from '@/services/dnd-model';

describe('DnDModelManager Basic Tests', () => {
	beforeEach(() => {
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
			tools: {
				enabled: true,
				format: '[{tool_name}: {arguments}]',
				supported: ['roll', 'health', 'inventory', 'spellcast', 'check', 'save'],
			},
		};

		it('should not be initialized initially', () => {
			expect(dndModel.getIsInitialized()).toBe(false);
		});

		it('should return null config initially', () => {
			expect(dndModel.getModelConfig()).toBeNull();
		});
	});

	describe('tool call parsing', () => {
		beforeEach(() => {
			// Set up a mock config for parsing
			(dndModel as any).modelConfig = {
				tools: {
					enabled: true,
					format: '[{tool_name}: {arguments}]',
					supported: ['roll', 'health', 'inventory', 'spellcast', 'check', 'save'],
				},
			};
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
	});

	describe('tool execution simulation', () => {
		it('should simulate dice roll correctly', () => {
			const toolCall: ToolCall = { type: 'roll', arguments: '1d20+5' };
			const result = dndModel.simulateToolExecution(toolCall);

			expect(result).toMatch(/^<TOOLCALL>roll: \d+\+5 = \*\d+\*<\/TOOLCALL>$/);

			// Extract the total and verify it's within expected range (6-25 for 1d20+5)
			const totalMatch = result.match(/\*(\d+)\*/);
			expect(totalMatch).toBeTruthy();
			const total = parseInt(totalMatch![1]);
			expect(total).toBeGreaterThanOrEqual(6);
			expect(total).toBeLessThanOrEqual(25);
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

	describe('error handling', () => {
		it('should handle malformed user input gracefully', async () => {
			// Mock initialization
			(dndModel as any).isInitialized = true;
			(dndModel as any).modelConfig = {
				system_prompt: 'Test prompt',
				tools: { supported: ['roll'] },
			};

			const problematicInputs = [
				'', // Empty string
				'   ', // Whitespace only
				'¿∆∂ƒ∂©˙∆˚¬', // Unicode characters
				'[invalid: tool call without proper format',
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

		it('should throw error when not initialized', async () => {
			// Ensure model is not initialized
			(dndModel as any).isInitialized = false;

			const message: DnDMessage = {
				role: 'user',
				content: 'test message',
			};

			await expect(dndModel.generateResponse(message)).rejects.toThrow(
				'D&D Model not initialized',
			);
		});
	});
});
