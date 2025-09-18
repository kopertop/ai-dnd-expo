import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Apple Speech API
	const mockAppleSpeech = {
		apple: {
			 speechModel: vi.fn(() => 'apple-speech-model'),
		},
		AppleSpeech: {
			 getVoices: vi.fn().mockResolvedValue([
				{
					 identifier: 'com.apple.voice.compact.en-US.Samantha',
					 name: 'Samantha',
					 language: 'en-US',
					 quality: 'default',
					 isPersonalVoice: false,
					 isNoveltyVoice: false,
				},
			]),
		},
	};

// Mock AI Speech Generation
const mockAISpeech = {
	experimental_generateSpeech: vi.fn().mockResolvedValue({
		audio: {
			uint8Array: new Uint8Array(1024),
			base64: 'base64-encoded-audio',
		},
	}),
};

describe('useTextToSpeech hook', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			// Reinitialize mock implementations after clearing
			mockAppleSpeech.apple.speechModel = vi.fn(() => 'apple-speech-model');
			mockAppleSpeech.AppleSpeech.getVoices = vi.fn().mockResolvedValue([
				{
					 identifier: 'com.apple.voice.compact.en-US.Samantha',
					 name: 'Samantha',
					 language: 'en-US',
					 quality: 'default',
					 isPersonalVoice: false,
					 isNoveltyVoice: false,
				},
			]);
			vi.doMock('@react-native-ai/apple', () => mockAppleSpeech);
			mockAISpeech.experimental_generateSpeech = vi.fn().mockResolvedValue({
				audio: {
					uint8Array: new Uint8Array(1024),
					base64: 'base64-encoded-audio',
				},
			});
		});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('speech functionality', () => {
		it('should have Apple Speech API available', () => {
			expect(mockAppleSpeech.apple.speechModel).toBeDefined();
			expect(typeof mockAppleSpeech.apple.speechModel).toBe('function');
		});

		it('should have AppleSpeech.getVoices method available', () => {
			expect(mockAppleSpeech.AppleSpeech.getVoices).toBeDefined();
			expect(typeof mockAppleSpeech.AppleSpeech.getVoices).toBe('function');
		});

		it('should have AI speech generation available', () => {
			expect(mockAISpeech.experimental_generateSpeech).toBeDefined();
			expect(typeof mockAISpeech.experimental_generateSpeech).toBe('function');
		});

		it('should call Apple Speech API with correct parameters', async () => {
			await mockAISpeech.experimental_generateSpeech({
				model: mockAppleSpeech.apple.speechModel(),
				text: 'Hello, world!',
				voice: 'com.apple.voice.compact.en-US.Samantha',
				language: 'en-US',
			});

			expect(mockAISpeech.experimental_generateSpeech).toHaveBeenCalledWith({
				model: 'apple-speech-model',
				text: 'Hello, world!',
				voice: 'com.apple.voice.compact.en-US.Samantha',
				language: 'en-US',
			});
		});

		it('should get available voices', async () => {
			const voices = await mockAppleSpeech.AppleSpeech.getVoices();

			expect(mockAppleSpeech.AppleSpeech.getVoices).toHaveBeenCalled();
			expect(voices).toHaveLength(1);
			expect(voices[0].name).toBe('Samantha');
		});
	});

	describe('speech state management', () => {
		it('should get available voices with correct structure', async () => {
			const voices = await mockAppleSpeech.AppleSpeech.getVoices();

			expect(mockAppleSpeech.AppleSpeech.getVoices).toHaveBeenCalled();
			expect(voices).toHaveLength(1);
			expect(voices[0].name).toBe('Samantha');
			expect(voices[0].identifier).toBe('com.apple.voice.compact.en-US.Samantha');
			expect(voices[0].language).toBe('en-US');
			expect(voices[0].quality).toBe('default');
		});

		it('should handle voice quality types correctly', async () => {
			const voices = await mockAppleSpeech.AppleSpeech.getVoices();
			const voice = voices[0];

			expect(['default', 'enhanced', 'premium']).toContain(voice.quality);
		});

		it('should include personal voice flags', async () => {
			const voices = await mockAppleSpeech.AppleSpeech.getVoices();
			const voice = voices[0];

			expect(typeof voice.isPersonalVoice).toBe('boolean');
			expect(typeof voice.isNoveltyVoice).toBe('boolean');
		});
	});

	describe('speech options', () => {
		it('should generate speech with custom options', async () => {
			const options = {
				model: mockAppleSpeech.apple.speechModel(),
				text: 'Test speech',
				voice: 'com.apple.voice.compact.en-US.Samantha',
				language: 'en-US',
			};

			await mockAISpeech.experimental_generateSpeech(options);

			expect(mockAISpeech.experimental_generateSpeech).toHaveBeenCalledWith(options);
		});

		it('should handle empty text gracefully', async () => {
			await mockAISpeech.experimental_generateSpeech({
				model: mockAppleSpeech.apple.speechModel(),
				text: '',
				voice: 'com.apple.voice.compact.en-US.Samantha',
				language: 'en-US',
			});

			expect(mockAISpeech.experimental_generateSpeech).toHaveBeenCalledWith({
				model: 'apple-speech-model',
				text: '',
				voice: 'com.apple.voice.compact.en-US.Samantha',
				language: 'en-US',
			});
		});

		it('should return audio data in correct format', async () => {
			const result = await mockAISpeech.experimental_generateSpeech({
				model: mockAppleSpeech.apple.speechModel(),
				text: 'Test speech',
				voice: 'com.apple.voice.compact.en-US.Samantha',
				language: 'en-US',
			});

			expect(result.audio).toBeDefined();
			expect(result.audio.uint8Array).toBeInstanceOf(Uint8Array);
			expect(result.audio.base64).toBe('base64-encoded-audio');
		});
	});

	describe('error handling', () => {
		it('should handle speech generation errors gracefully', async () => {
			const speechError = new Error('Speech synthesis failed');
			mockAISpeech.experimental_generateSpeech.mockRejectedValueOnce(speechError);

			await expect(
				mockAISpeech.experimental_generateSpeech({
					model: mockAppleSpeech.apple.speechModel(),
					text: 'Error test',
					voice: 'com.apple.voice.compact.en-US.Samantha',
					language: 'en-US',
				}),
			).rejects.toThrow('Speech synthesis failed');
		});

		it('should handle voice loading errors gracefully', async () => {
			const voiceError = new Error('Voice loading failed');
			mockAppleSpeech.AppleSpeech.getVoices.mockRejectedValueOnce(voiceError);

			await expect(mockAppleSpeech.AppleSpeech.getVoices()).rejects.toThrow(
				'Voice loading failed',
			);
		});

		it('should handle model creation errors gracefully', async () => {
			const modelError = new Error('Model creation failed');
			mockAppleSpeech.apple.speechModel.mockImplementationOnce(() => {
				throw modelError;
			});

			expect(() => mockAppleSpeech.apple.speechModel()).toThrow('Model creation failed');
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
		it('should handle rapid speech generation requests', async () => {
			const promises = [
				mockAISpeech.experimental_generateSpeech({
					model: mockAppleSpeech.apple.speechModel(),
					text: 'First',
					voice: 'com.apple.voice.compact.en-US.Samantha',
					language: 'en-US',
				}),
				mockAISpeech.experimental_generateSpeech({
					model: mockAppleSpeech.apple.speechModel(),
					text: 'Second',
					voice: 'com.apple.voice.compact.en-US.Samantha',
					language: 'en-US',
				}),
				mockAISpeech.experimental_generateSpeech({
					model: mockAppleSpeech.apple.speechModel(),
					text: 'Third',
					voice: 'com.apple.voice.compact.en-US.Samantha',
					language: 'en-US',
				}),
			];

			await Promise.all(promises);

			expect(mockAISpeech.experimental_generateSpeech).toHaveBeenCalledTimes(3);
		});

		it('should complete speech operations quickly', async () => {
			const startTime = performance.now();

			await mockAISpeech.experimental_generateSpeech({
				model: mockAppleSpeech.apple.speechModel(),
				text: 'Performance test',
				voice: 'com.apple.voice.compact.en-US.Samantha',
				language: 'en-US',
			});

			const endTime = performance.now();
			const duration = endTime - startTime;

			// Should complete within 50ms in test environment
			expect(duration).toBeLessThan(50);
		});
	});
});
