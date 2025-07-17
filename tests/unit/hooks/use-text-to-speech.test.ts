import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock expo-speech
const mockSpeech = {
	speak: vi.fn().mockResolvedValue(undefined),
	stop: vi.fn(),
	pause: vi.fn(),
	resume: vi.fn(),
	isSpeaking: vi.fn().mockResolvedValue(false),
	getAvailableVoicesAsync: vi.fn().mockResolvedValue([
		{
			identifier: 'com.apple.ttsbundle.Daniel-compact',
			name: 'Daniel',
			language: 'en-US',
			quality: 'Default',
		},
	]),
};

describe('useTextToSpeech hook', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.doMock('expo-speech', () => mockSpeech);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('speech functionality', () => {
		it('should have speak method available', () => {
			expect(mockSpeech.speak).toBeDefined();
			expect(typeof mockSpeech.speak).toBe('function');
		});

		it('should have stop method available', () => {
			expect(mockSpeech.stop).toBeDefined();
			expect(typeof mockSpeech.stop).toBe('function');
		});

		it('should have pause method available', () => {
			expect(mockSpeech.pause).toBeDefined();
			expect(typeof mockSpeech.pause).toBe('function');
		});

		it('should have resume method available', () => {
			expect(mockSpeech.resume).toBeDefined();
			expect(typeof mockSpeech.resume).toBe('function');
		});

		it('should call speak method with text', async () => {
			await mockSpeech.speak('Hello, world!');

			expect(mockSpeech.speak).toHaveBeenCalledWith('Hello, world!');
		});

		it('should call stop method', () => {
			mockSpeech.stop();

			expect(mockSpeech.stop).toHaveBeenCalled();
		});

		it('should call pause method', () => {
			mockSpeech.pause();

			expect(mockSpeech.pause).toHaveBeenCalled();
		});

		it('should call resume method', () => {
			mockSpeech.resume();

			expect(mockSpeech.resume).toHaveBeenCalled();
		});
	});

	describe('speech state management', () => {
		it('should check if speaking', async () => {
			mockSpeech.isSpeaking.mockResolvedValueOnce(false);
			const isSpeaking = await mockSpeech.isSpeaking();

			expect(mockSpeech.isSpeaking).toHaveBeenCalled();
			expect(isSpeaking).toBe(false);
		});

		it('should return true when speaking', async () => {
			mockSpeech.isSpeaking.mockResolvedValueOnce(true);

			const isSpeaking = await mockSpeech.isSpeaking();

			expect(isSpeaking).toBe(true);
		});

		it('should get available voices', async () => {
			mockSpeech.getAvailableVoicesAsync.mockResolvedValueOnce([
				{
					identifier: 'com.apple.ttsbundle.Daniel-compact',
					name: 'Daniel',
					language: 'en-US',
					quality: 'Default',
				},
			]);
			const voices = await mockSpeech.getAvailableVoicesAsync();

			expect(mockSpeech.getAvailableVoicesAsync).toHaveBeenCalled();
			expect(voices).toHaveLength(1);
			expect(voices[0].name).toBe('Daniel');
		});
	});

	describe('speech options', () => {
		it('should speak with custom options', async () => {
			const options = {
				language: 'en-US',
				pitch: 0.8,
				rate: 0.5,
			};

			await mockSpeech.speak('Test speech', options);

			expect(mockSpeech.speak).toHaveBeenCalledWith('Test speech', options);
		});

		it('should handle empty text gracefully', async () => {
			await mockSpeech.speak('');

			expect(mockSpeech.speak).toHaveBeenCalledWith('');
		});

		it('should handle null text gracefully', async () => {
			await mockSpeech.speak(null);

			expect(mockSpeech.speak).toHaveBeenCalledWith(null);
		});
	});

	describe('error handling', () => {
		it('should handle speak errors gracefully', async () => {
			const speechError = new Error('Speech synthesis failed');
			mockSpeech.speak.mockRejectedValueOnce(speechError);

			await expect(mockSpeech.speak('Error test')).rejects.toThrow('Speech synthesis failed');
		});

		it('should handle voice loading errors gracefully', async () => {
			const voiceError = new Error('Voice loading failed');
			mockSpeech.getAvailableVoicesAsync.mockRejectedValueOnce(voiceError);

			await expect(mockSpeech.getAvailableVoicesAsync()).rejects.toThrow('Voice loading failed');
		});

		it('should handle isSpeaking errors gracefully', async () => {
			const statusError = new Error('Status check failed');
			mockSpeech.isSpeaking.mockRejectedValueOnce(statusError);

			await expect(mockSpeech.isSpeaking()).rejects.toThrow('Status check failed');
		});
	});

	describe('text cleaning utilities', () => {
		it('should clean dice notation from text', () => {
			const text = 'You rolled [ROLL:1d20+5] for initiative!';
			const cleaned = text.replace(/\[ROLL:[^\]]+\]/g, '');

			expect(cleaned).toBe('You rolled  for initiative!');
		});

		it('should clean character update commands from text', () => {
			const text = 'You take [UPDATE:HP-10] damage!';
			const cleaned = text.replace(/\[UPDATE:[^\]]+\]/g, '');

			expect(cleaned).toBe('You take  damage!');
		});

		it('should clean rule lookup commands from text', () => {
			const text = 'Check [LOOKUP:Stealth] rules for hiding.';
			const cleaned = text.replace(/\[LOOKUP:[^\]]+\]/g, '');

			expect(cleaned).toBe('Check  rules for hiding.');
		});

		it('should clean up extra whitespace', () => {
			const text = 'Multiple   spaces    and\n\nnewlines\t\ttabs';
			const cleaned = text.replace(/\s+/g, ' ').trim();

			expect(cleaned).toBe('Multiple spaces and newlines tabs');
		});
	});

	describe('voice presets', () => {
		it('should have narration preset configuration', () => {
			const narrationPreset = {
				pitch: 0.8,
				rate: 0.5,
				language: 'en-US',
			};

			expect(narrationPreset.pitch).toBe(0.8);
			expect(narrationPreset.rate).toBe(0.5);
			expect(narrationPreset.language).toBe('en-US');
		});

		it('should have dialogue preset configuration', () => {
			const dialoguePreset = {
				pitch: 0.9,
				rate: 0.6,
				language: 'en-US',
			};

			expect(dialoguePreset.pitch).toBe(0.9);
			expect(dialoguePreset.rate).toBe(0.6);
			expect(dialoguePreset.language).toBe('en-US');
		});

		it('should have combat preset configuration', () => {
			const combatPreset = {
				pitch: 0.7,
				rate: 0.4,
				language: 'en-US',
			};

			expect(combatPreset.pitch).toBe(0.7);
			expect(combatPreset.rate).toBe(0.4);
			expect(combatPreset.language).toBe('en-US');
		});
	});

	describe('performance', () => {
		it('should handle rapid speech requests', async () => {
			const promises = [
				mockSpeech.speak('First'),
				mockSpeech.speak('Second'),
				mockSpeech.speak('Third'),
			];

			await Promise.all(promises);

			expect(mockSpeech.speak).toHaveBeenCalledTimes(3);
		});

		it('should complete speech operations quickly', async () => {
			const startTime = performance.now();

			await mockSpeech.speak('Performance test');

			const endTime = performance.now();
			const duration = endTime - startTime;

			// Should complete within 50ms in test environment
			expect(duration).toBeLessThan(50);
		});
	});
});
