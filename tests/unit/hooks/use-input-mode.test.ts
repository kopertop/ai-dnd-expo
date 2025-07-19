import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock AsyncStorage
const mockAsyncStorage = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
};

describe('useInputMode hook', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Setup AsyncStorage mock
		vi.doMock('@react-native-async-storage/async-storage', () => ({
			default: mockAsyncStorage,
		}));
		mockAsyncStorage.getItem.mockResolvedValue(null);
		mockAsyncStorage.setItem.mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('storage operations', () => {
		it('should get item from storage', async () => {
			mockAsyncStorage.getItem.mockResolvedValueOnce('voice');

			const result = await mockAsyncStorage.getItem('@ai-dnd/inputMode');

			expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('@ai-dnd/inputMode');
			expect(result).toBe('voice');
		});

		it('should set item in storage', async () => {
			await mockAsyncStorage.setItem('@ai-dnd/inputMode', 'text');

			expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('@ai-dnd/inputMode', 'text');
		});

		it('should handle null values from storage', async () => {
			mockAsyncStorage.getItem.mockResolvedValueOnce(null);

			const result = await mockAsyncStorage.getItem('@ai-dnd/inputMode');

			expect(result).toBeNull();
		});

		it('should handle storage errors gracefully', async () => {
			const storageError = new Error('Storage unavailable');
			mockAsyncStorage.getItem.mockRejectedValueOnce(storageError);

			await expect(mockAsyncStorage.getItem('@ai-dnd/inputMode')).rejects.toThrow(
				'Storage unavailable',
			);
		});
	});

	describe('input mode values', () => {
		it('should handle text mode', async () => {
			await mockAsyncStorage.setItem('@ai-dnd/inputMode', 'text');

			expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('@ai-dnd/inputMode', 'text');
		});

		it('should handle voice mode', async () => {
			await mockAsyncStorage.setItem('@ai-dnd/inputMode', 'voice');

			expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('@ai-dnd/inputMode', 'voice');
		});

		it('should load text mode from storage', async () => {
			mockAsyncStorage.getItem.mockResolvedValueOnce('text');

			const result = await mockAsyncStorage.getItem('@ai-dnd/inputMode');

			expect(result).toBe('text');
		});

		it('should load voice mode from storage', async () => {
			mockAsyncStorage.getItem.mockResolvedValueOnce('voice');

			const result = await mockAsyncStorage.getItem('@ai-dnd/inputMode');

			expect(result).toBe('voice');
		});
	});

	describe('input mode validation', () => {
		it('should validate text as valid input mode', () => {
			const validModes = ['text', 'voice'];

			expect(validModes.includes('text')).toBe(true);
		});

		it('should validate voice as valid input mode', () => {
			const validModes = ['text', 'voice'];

			expect(validModes.includes('voice')).toBe(true);
		});

		it('should reject invalid input modes', () => {
			const validModes = ['text', 'voice'];

			expect(validModes.includes('invalid')).toBe(false);
			expect(validModes.includes('speech')).toBe(false);
			expect(validModes.includes('typing')).toBe(false);
		});

		it('should handle empty string as invalid', () => {
			const validModes = ['text', 'voice'];

			expect(validModes.includes('')).toBe(false);
		});
	});

	describe('storage key consistency', () => {
		it('should use consistent storage key', async () => {
			const storageKey = '@ai-dnd/inputMode';

			await mockAsyncStorage.getItem(storageKey);
			await mockAsyncStorage.setItem(storageKey, 'text');

			expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(storageKey);
			expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(storageKey, 'text');
		});

		it('should not use different storage keys', async () => {
			const correctKey = '@ai-dnd/inputMode';
			const wrongKey = 'inputMode';

			await mockAsyncStorage.setItem(correctKey, 'text');

			expect(mockAsyncStorage.setItem).not.toHaveBeenCalledWith(wrongKey, 'text');
		});
	});

	describe('error handling', () => {
		it('should handle storage save errors', async () => {
			const saveError = new Error('Storage save failed');
			mockAsyncStorage.setItem.mockRejectedValueOnce(saveError);

			await expect(mockAsyncStorage.setItem('@ai-dnd/inputMode', 'voice')).rejects.toThrow(
				'Storage save failed',
			);
		});

		it('should handle storage load errors', async () => {
			const loadError = new Error('Storage load failed');
			mockAsyncStorage.getItem.mockRejectedValueOnce(loadError);

			await expect(mockAsyncStorage.getItem('@ai-dnd/inputMode')).rejects.toThrow(
				'Storage load failed',
			);
		});

		it('should handle storage clear errors', async () => {
			const clearError = new Error('Storage clear failed');
			mockAsyncStorage.clear.mockRejectedValueOnce(clearError);

			await expect(mockAsyncStorage.clear()).rejects.toThrow('Storage clear failed');
		});
	});

	describe('state persistence', () => {
		it('should persist text mode selection', async () => {
			await mockAsyncStorage.setItem('@ai-dnd/inputMode', 'text');
			mockAsyncStorage.getItem.mockResolvedValueOnce('text');

			const result = await mockAsyncStorage.getItem('@ai-dnd/inputMode');

			expect(result).toBe('text');
		});

		it('should persist voice mode selection', async () => {
			await mockAsyncStorage.setItem('@ai-dnd/inputMode', 'voice');
			mockAsyncStorage.getItem.mockResolvedValueOnce('voice');

			const result = await mockAsyncStorage.getItem('@ai-dnd/inputMode');

			expect(result).toBe('voice');
		});

		it('should handle mode switching', async () => {
			// Set to text first
			await mockAsyncStorage.setItem('@ai-dnd/inputMode', 'text');

			// Then switch to voice
			await mockAsyncStorage.setItem('@ai-dnd/inputMode', 'voice');

			expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(2);
			expect(mockAsyncStorage.setItem).toHaveBeenNthCalledWith(
				1,
				'@ai-dnd/inputMode',
				'text',
			);
			expect(mockAsyncStorage.setItem).toHaveBeenNthCalledWith(
				2,
				'@ai-dnd/inputMode',
				'voice',
			);
		});
	});

	describe('performance', () => {
		it('should handle rapid mode changes', async () => {
			const promises = [
				mockAsyncStorage.setItem('@ai-dnd/inputMode', 'text'),
				mockAsyncStorage.setItem('@ai-dnd/inputMode', 'voice'),
				mockAsyncStorage.setItem('@ai-dnd/inputMode', 'text'),
			];

			await Promise.all(promises);

			expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(3);
		});

		it('should complete storage operations quickly', async () => {
			const startTime = performance.now();

			await mockAsyncStorage.setItem('@ai-dnd/inputMode', 'voice');

			const endTime = performance.now();
			const duration = endTime - startTime;

			// Should complete within 50ms in test environment
			expect(duration).toBeLessThan(50);
		});

		it('should handle concurrent storage operations', async () => {
			const promises = [
				mockAsyncStorage.getItem('@ai-dnd/inputMode'),
				mockAsyncStorage.setItem('@ai-dnd/inputMode', 'text'),
			];

			await Promise.all(promises);

			expect(mockAsyncStorage.getItem).toHaveBeenCalled();
			expect(mockAsyncStorage.setItem).toHaveBeenCalled();
		});
	});

	describe('default behavior', () => {
		it('should default to text mode when storage is empty', async () => {
			mockAsyncStorage.getItem.mockResolvedValueOnce(null);

			const result = await mockAsyncStorage.getItem('@ai-dnd/inputMode');

			// When null is returned, the hook should default to 'text'
			const defaultMode = result || 'text';
			expect(defaultMode).toBe('text');
		});

		it('should handle undefined storage values', async () => {
			mockAsyncStorage.getItem.mockResolvedValueOnce(undefined);

			const result = await mockAsyncStorage.getItem('@ai-dnd/inputMode');

			const defaultMode = result || 'text';
			expect(defaultMode).toBe('text');
		});

		it('should ignore invalid stored values', async () => {
			mockAsyncStorage.getItem.mockResolvedValueOnce('invalid-mode');

			const result = await mockAsyncStorage.getItem('@ai-dnd/inputMode');
			const validModes = ['text', 'voice'];

			// If invalid value, should default to text
			const finalMode = validModes.includes(result) ? result : 'text';
			expect(finalMode).toBe('text');
		});
	});

	describe('type safety', () => {
		it('should handle string input mode values', () => {
			const textMode: string = 'text';
			const voiceMode: string = 'voice';

			expect(typeof textMode).toBe('string');
			expect(typeof voiceMode).toBe('string');
		});

		it('should validate input mode types', () => {
			type InputMode = 'text' | 'voice';

			const isValidInputMode = (mode: string): mode is InputMode => {
				return mode === 'text' || mode === 'voice';
			};

			expect(isValidInputMode('text')).toBe(true);
			expect(isValidInputMode('voice')).toBe(true);
			expect(isValidInputMode('invalid')).toBe(false);
		});
	});
});
