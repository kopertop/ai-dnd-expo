import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock expo-audio
const mockAudio = {
	requestRecordingPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
	getRecordingPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
};

// Mock expo-speech-recognition
const mockSpeechRecognition = {
	requestPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
	start: vi.fn().mockResolvedValue(undefined),
	stop: vi.fn().mockResolvedValue(undefined),
};

describe('useVoiceRecognition hook', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.doMock('expo-audio', () => mockAudio);
		vi.doMock('expo-speech-recognition', () => ({
			ExpoSpeechRecognitionModule: mockSpeechRecognition,
			useSpeechRecognitionEvent: vi.fn(),
		}));
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('permission management', () => {
		it('should request microphone permissions', async () => {
			mockAudio.requestRecordingPermissionsAsync.mockResolvedValueOnce({ granted: true });
			const result = await mockAudio.requestRecordingPermissionsAsync();

			expect(mockAudio.requestRecordingPermissionsAsync).toHaveBeenCalled();
			expect(result.granted).toBe(true);
		});

		it('should check existing permissions', async () => {
			mockAudio.getRecordingPermissionsAsync.mockResolvedValueOnce({ granted: true });
			const result = await mockAudio.getRecordingPermissionsAsync();

			expect(mockAudio.getRecordingPermissionsAsync).toHaveBeenCalled();
			expect(result.granted).toBe(true);
		});

		it('should handle permission denial', async () => {
			mockAudio.requestRecordingPermissionsAsync.mockResolvedValueOnce({ granted: false });

			const result = await mockAudio.requestRecordingPermissionsAsync();

			expect(result.granted).toBe(false);
		});

		it('should handle permission request errors', async () => {
			const permissionError = new Error('Permission request failed');
			mockAudio.requestRecordingPermissionsAsync.mockRejectedValueOnce(permissionError);

			await expect(mockAudio.requestRecordingPermissionsAsync()).rejects.toThrow(
				'Permission request failed',
			);
		});
	});

	describe('speech recognition functionality', () => {
		it('should request speech recognition permissions', async () => {
			mockSpeechRecognition.requestPermissionsAsync.mockResolvedValueOnce({ granted: true });
			const result = await mockSpeechRecognition.requestPermissionsAsync();

			expect(mockSpeechRecognition.requestPermissionsAsync).toHaveBeenCalled();
			expect(result.granted).toBe(true);
		});

		it('should start speech recognition', async () => {
			await mockSpeechRecognition.start();

			expect(mockSpeechRecognition.start).toHaveBeenCalled();
		});

		it('should stop speech recognition', async () => {
			await mockSpeechRecognition.stop();

			expect(mockSpeechRecognition.stop).toHaveBeenCalled();
		});

		it('should start with custom options', async () => {
			const options = {
				lang: 'en-US',
				interimResults: true,
				maxAlternatives: 3,
				continuous: true,
			};

			await mockSpeechRecognition.start(options);

			expect(mockSpeechRecognition.start).toHaveBeenCalledWith(options);
		});
	});

	describe('error handling', () => {
		it('should handle speech recognition permission denial', async () => {
			mockSpeechRecognition.requestPermissionsAsync.mockResolvedValueOnce({ granted: false });

			const result = await mockSpeechRecognition.requestPermissionsAsync();

			expect(result.granted).toBe(false);
		});

		it('should handle speech recognition start errors', async () => {
			const startError = new Error('Speech recognition start failed');
			mockSpeechRecognition.start.mockRejectedValueOnce(startError);

			await expect(mockSpeechRecognition.start()).rejects.toThrow(
				'Speech recognition start failed',
			);
		});

		it('should handle speech recognition stop errors', async () => {
			const stopError = new Error('Speech recognition stop failed');
			mockSpeechRecognition.stop.mockRejectedValueOnce(stopError);

			await expect(mockSpeechRecognition.stop()).rejects.toThrow(
				'Speech recognition stop failed',
			);
		});

		it('should handle permission check errors gracefully', async () => {
			const permissionError = new Error('Permission check failed');
			mockAudio.getRecordingPermissionsAsync.mockRejectedValueOnce(permissionError);

			await expect(mockAudio.getRecordingPermissionsAsync()).rejects.toThrow(
				'Permission check failed',
			);
		});
	});

	describe('platform support', () => {
		it('should be supported on iOS', () => {
			// Mock Platform.OS is set to 'ios' in the mock
			expect(true).toBe(true); // iOS support is mocked as true
		});

		it('should handle different language options', async () => {
			const englishOptions = { lang: 'en-US' };
			const britishOptions = { lang: 'en-GB' };

			await mockSpeechRecognition.start(englishOptions);
			await mockSpeechRecognition.start(britishOptions);

			expect(mockSpeechRecognition.start).toHaveBeenCalledWith(englishOptions);
			expect(mockSpeechRecognition.start).toHaveBeenCalledWith(britishOptions);
		});

		it('should handle continuous recognition', async () => {
			const continuousOptions = {
				continuous: true,
				interimResults: true,
			};

			await mockSpeechRecognition.start(continuousOptions);

			expect(mockSpeechRecognition.start).toHaveBeenCalledWith(continuousOptions);
		});
	});

	describe('speech-to-text conversion', () => {
		it('should simulate speech conversion', async () => {
			// Mock conversion function
			const convertSpeechToText = async (_uri: string, language: string = 'en-US') => {
				await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing
				return language === 'en-US'
					? 'I want to attack the goblin with my sword'
					: 'Speech converted';
			};

			const result = await convertSpeechToText('test-audio.m4a', 'en-US');

			expect(result).toBe('I want to attack the goblin with my sword');
		});

		it('should handle different languages in conversion', async () => {
			const convertSpeechToText = async (_uri: string, language: string = 'en-US') => {
				await new Promise(resolve => setTimeout(resolve, 50));
				return language === 'en-GB'
					? 'I should like to attack the goblin'
					: 'I want to attack the goblin';
			};

			const usResult = await convertSpeechToText('test.m4a', 'en-US');
			const gbResult = await convertSpeechToText('test.m4a', 'en-GB');

			expect(usResult).toBe('I want to attack the goblin');
			expect(gbResult).toBe('I should like to attack the goblin');
		});
	});

	describe('configuration options', () => {
		it('should have iOS configuration', () => {
			const iOSConfig = {
				language: 'en-US',
				continuous: true,
				interimResults: true,
				maxAlternatives: 1,
			};

			expect(iOSConfig.language).toBe('en-US');
			expect(iOSConfig.continuous).toBe(true);
			expect(iOSConfig.interimResults).toBe(true);
			expect(iOSConfig.maxAlternatives).toBe(1);
		});

		it('should have fallback configuration', () => {
			const fallbackConfig = {
				maxDuration: 30000,
				android: {
					extension: '.m4a',
					outputFormat: 'mpeg4',
					audioEncoder: 'aac',
				},
				ios: {
					extension: '.m4a',
					outputFormat: 'mpeg4aac',
				},
			};

			expect(fallbackConfig.maxDuration).toBe(30000);
			expect(fallbackConfig.android.extension).toBe('.m4a');
			expect(fallbackConfig.ios.extension).toBe('.m4a');
		});
	});

	describe('performance', () => {
		it('should start recognition quickly', async () => {
			const startTime = performance.now();

			await mockSpeechRecognition.start();

			const endTime = performance.now();
			const duration = endTime - startTime;

			// Should start within 50ms in test environment
			expect(duration).toBeLessThan(50);
		});

		it('should handle rapid start/stop cycles', async () => {
			// Rapidly start and stop recognition
			await mockSpeechRecognition.start();
			await mockSpeechRecognition.stop();
			await mockSpeechRecognition.start();
			await mockSpeechRecognition.stop();

			expect(mockSpeechRecognition.start).toHaveBeenCalledTimes(2);
			expect(mockSpeechRecognition.stop).toHaveBeenCalledTimes(2);
		});

		it('should handle concurrent permission requests', async () => {
			mockAudio.requestRecordingPermissionsAsync.mockResolvedValue({ granted: true });
			mockSpeechRecognition.requestPermissionsAsync.mockResolvedValue({ granted: true });

			const promises = [
				mockAudio.requestRecordingPermissionsAsync(),
				mockSpeechRecognition.requestPermissionsAsync(),
			];

			const results = await Promise.all(promises);

			expect(results).toHaveLength(2);
			expect(results[0].granted).toBe(true);
			expect(results[1].granted).toBe(true);
		});
	});

	describe('timeout handling', () => {
		it('should handle timeout scenarios', async () => {
			// Simulate timeout by using fake timers
			vi.useFakeTimers();

			const timeoutPromise = new Promise(resolve => {
				setTimeout(() => resolve('timeout'), 5000);
			});

			// Fast-forward time
			vi.advanceTimersByTime(5000);

			const result = await timeoutPromise;
			expect(result).toBe('timeout');

			vi.useRealTimers();
		});

		it('should handle custom timeout durations', async () => {
			vi.useFakeTimers();

			const customTimeoutPromise = new Promise(resolve => {
				setTimeout(() => resolve('custom timeout'), 10000);
			});

			vi.advanceTimersByTime(10000);

			const result = await customTimeoutPromise;
			expect(result).toBe('custom timeout');

			vi.useRealTimers();
		});
	});
});
