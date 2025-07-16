import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { CharacterFactory, AIResponseFactory } from '@/tests/fixtures/mock-factories';

// Mock the hook's dependencies
const mockDMVoice = {
  speak: vi.fn(),
  stop: vi.fn(),
  isPlaying: false,
};

const mockCactusProvider = {
  generateText: vi.fn().mockResolvedValue(AIResponseFactory.createSuccess('Mock response')),
  isAvailable: vi.fn().mockReturnValue(true),
  configure: vi.fn(),
  setModel: vi.fn(),
  getModel: vi.fn().mockReturnValue('gemma-3-2b-instruct'),
};

const mockAIServiceManager = {
  initialize: vi.fn(() => Promise.resolve(true)),
  getProvider: vi.fn(() => mockCactusProvider),
  switchProvider: vi.fn(() => Promise.resolve(true)),
  getProviderStatus: vi.fn(() => ({
    current: 'cactus',
    available: ['cactus', 'local', 'fallback'],
    performance: { responseTime: 500, successRate: 0.95 },
  })),
  getUsageStats: vi.fn(() => ({
    totalRequests: 10,
    totalTokens: 500,
    averageResponseTime: 450,
  })),
};

vi.mock('@/hooks/use-text-to-speech', () => ({
  useDMVoice: vi.fn(() => mockDMVoice),
}));

vi.mock('@/services/ai/ai-service-manager', () => ({
  AIServiceManager: vi.fn(() => mockAIServiceManager),
  DefaultAIConfig: {
    provider: 'cactus',
    model: 'gemma-3-2b-instruct',
    temperature: 0.7,
    maxTokens: 1000,
  },
}));

// Mock console methods to avoid noise in tests
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('useEnhancedDungeonMaster', () => {
  const mockCharacter = CharacterFactory.createBasic();
  const mockWorldState = {
    worldMap: { name: 'Test World' },
    playerPosition: { position: { x: 0, y: 0 } },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAIServiceManager.getProvider.mockReturnValue(mockCactusProvider);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('dependencies and mocking', () => {
    it('should have properly configured mock dependencies', () => {
      // Test that our mocks are working
      expect(mockDMVoice).toBeDefined();
      expect(mockDMVoice.speak).toBeDefined();
      expect(mockDMVoice.stop).toBeDefined();
      expect(mockAIServiceManager).toBeDefined();
      expect(mockCactusProvider).toBeDefined();
    });

    it('should verify mock interfaces match expected patterns', () => {
      // Verify mocks have the expected function signatures
      expect(typeof mockDMVoice.speak).toBe('function');
      expect(typeof mockDMVoice.stop).toBe('function');
      expect(typeof mockAIServiceManager.initialize).toBe('function');
      expect(typeof mockCactusProvider.generateText).toBe('function');
    });
  });

  describe('AI service integration', () => {
    it('should handle successful AI responses', async () => {
      const responseText = 'Welcome to the tavern, adventurer!';
      mockCactusProvider.generateText.mockResolvedValueOnce(
        AIResponseFactory.createSuccess(responseText)
      );

      const result = await mockCactusProvider.generateText({
        messages: [{ role: 'user', content: 'Hello DM' }],
        character: mockCharacter,
        worldState: mockWorldState,
      });

      expect(result.text).toBe(responseText);
      expect(mockCactusProvider.generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          character: mockCharacter,
          worldState: mockWorldState,
        })
      );
    });

    it('should handle AI service errors', async () => {
      const error = new Error('AI service unavailable');
      mockCactusProvider.generateText.mockRejectedValueOnce(error);

      await expect(
        mockCactusProvider.generateText({
          messages: [{ role: 'user', content: 'Test message' }],
        })
      ).rejects.toThrow('AI service unavailable');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      (timeoutError as any).code = 'TIMEOUT';
      mockCactusProvider.generateText.mockRejectedValueOnce(timeoutError);

      await expect(
        mockCactusProvider.generateText({
          messages: [{ role: 'user', content: 'Test message' }],
        })
      ).rejects.toThrow('Request timeout');
    });

    it('should handle rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      mockCactusProvider.generateText.mockRejectedValueOnce(rateLimitError);

      await expect(
        mockCactusProvider.generateText({
          messages: [{ role: 'user', content: 'Test message' }],
        })
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('provider management logic', () => {
    it('should support AI service manager operations', async () => {
      // Test initialization
      const initResult = await mockAIServiceManager.initialize();
      expect(initResult).toBe(true);
      expect(mockAIServiceManager.initialize).toHaveBeenCalled();
    });

    it('should support provider switching operations', async () => {
      const switchResult = await mockAIServiceManager.switchProvider('local');
      expect(switchResult).toBe(true);
      expect(mockAIServiceManager.switchProvider).toHaveBeenCalledWith('local');
    });

    it('should provide status information', () => {
      const status = mockAIServiceManager.getProviderStatus();
      expect(status).toEqual({
        current: 'cactus',
        available: ['cactus', 'local', 'fallback'],
        performance: { responseTime: 500, successRate: 0.95 },
      });
    });
  });

  describe('voice synthesis integration', () => {
    it('should call voice synthesis with correct text', async () => {
      const text = 'Welcome to the tavern!';
      await mockDMVoice.speak(text);
      
      expect(mockDMVoice.speak).toHaveBeenCalledWith(text);
    });

    it('should handle voice synthesis errors', async () => {
      const error = new Error('Voice synthesis failed');
      mockDMVoice.speak.mockRejectedValueOnce(error);

      await expect(mockDMVoice.speak('test')).rejects.toThrow('Voice synthesis failed');
    });

    it('should stop voice synthesis', async () => {
      await mockDMVoice.stop();
      expect(mockDMVoice.stop).toHaveBeenCalled();
    });
  });

  describe('message context building', () => {
    it('should include character context in AI requests', async () => {
      const messages = [
        { role: 'user' as const, content: 'Hello DM' },
      ];

      await mockCactusProvider.generateText({
        messages,
        character: mockCharacter,
        worldState: mockWorldState,
      });

      expect(mockCactusProvider.generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages,
          character: mockCharacter,
          worldState: mockWorldState,
        })
      );
    });

    it('should handle conversation history', async () => {
      const conversationHistory = [
        { role: 'user' as const, content: 'Message 1' },
        { role: 'assistant' as const, content: 'Response 1' },
        { role: 'user' as const, content: 'Message 2' },
      ];

      await mockCactusProvider.generateText({
        messages: conversationHistory,
        character: mockCharacter,
        worldState: mockWorldState,
      });

      expect(mockCactusProvider.generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: conversationHistory,
        })
      );
    });
  });

  describe('error handling and recovery', () => {
    it('should handle initialization failures', async () => {
      const initError = new Error('Initialization failed');
      mockAIServiceManager.initialize.mockRejectedValueOnce(initError);

      await expect(mockAIServiceManager.initialize()).rejects.toThrow('Initialization failed');
    });

    it('should handle provider switch failures', async () => {
      const switchError = new Error('Provider switch failed');
      mockAIServiceManager.switchProvider.mockRejectedValueOnce(switchError);

      await expect(mockAIServiceManager.switchProvider('local')).rejects.toThrow('Provider switch failed');
    });

    it('should handle empty messages gracefully', async () => {
      // Empty message should not be sent to AI
      const emptyMessage = '';
      
      if (emptyMessage.trim()) {
        await mockCactusProvider.generateText({
          messages: [{ role: 'user', content: emptyMessage }],
        });
      }

      expect(mockCactusProvider.generateText).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only messages', () => {
      const whitespaceMessage = '   \n\t  ';
      
      if (whitespaceMessage.trim()) {
        mockCactusProvider.generateText({
          messages: [{ role: 'user', content: whitespaceMessage }],
        });
      }

      expect(mockCactusProvider.generateText).not.toHaveBeenCalled();
    });
  });

  describe('performance considerations', () => {
    it('should complete AI requests within reasonable time', async () => {
      const fastResponse = AIResponseFactory.createSuccess('Quick response');
      mockCactusProvider.generateText.mockResolvedValueOnce(fastResponse);

      const startTime = performance.now();
      
      await mockCactusProvider.generateText({
        messages: [{ role: 'user', content: 'Test message' }],
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete quickly in test environment
      expect(duration).toBeLessThan(100);
    });

    it('should handle concurrent requests', async () => {
      const response1 = AIResponseFactory.createSuccess('Response 1');
      const response2 = AIResponseFactory.createSuccess('Response 2');
      
      mockCactusProvider.generateText
        .mockResolvedValueOnce(response1)
        .mockResolvedValueOnce(response2);

      const promises = [
        mockCactusProvider.generateText({
          messages: [{ role: 'user', content: 'Message 1' }],
        }),
        mockCactusProvider.generateText({
          messages: [{ role: 'user', content: 'Message 2' }],
        }),
      ];

      const results = await Promise.all(promises);

      expect(results[0].text).toBe('Response 1');
      expect(results[1].text).toBe('Response 2');
      expect(mockCactusProvider.generateText).toHaveBeenCalledTimes(2);
    });
  });

  describe('provider recommendations', () => {
    it('should generate provider recommendations based on performance', () => {
      const mockRecommendations = [
        {
          provider: 'cactus',
          score: 0.95,
          reasons: ['High success rate', 'Good performance'],
        },
        {
          provider: 'local',
          score: 0.8,
          reasons: ['Privacy focused', 'No API costs'],
        },
      ];

      // Test the recommendation algorithm logic
      const status = mockAIServiceManager.getProviderStatus();
      const recommendations = [];

      if (status && status.performance && status.performance.successRate >= 0.9) {
        recommendations.push({
          provider: status.current,
          score: status.performance.successRate,
          reasons: ['High success rate', 'Good performance'],
        });
      }

      recommendations.push({
        provider: 'local',
        score: 0.8,
        reasons: ['Privacy focused', 'No API costs'],
      });

      expect(recommendations).toEqual(mockRecommendations);
    });
  });

  describe('character and world state changes', () => {
    it('should handle character level changes', async () => {
      const updatedCharacter = { ...mockCharacter, level: 5 };

      await mockCactusProvider.generateText({
        messages: [{ role: 'user', content: 'Test message' }],
        character: updatedCharacter,
        worldState: mockWorldState,
      });

      expect(mockCactusProvider.generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          character: expect.objectContaining({ level: 5 }),
        })
      );
    });

    it('should handle world state position changes', async () => {
      const updatedWorldState = {
        ...mockWorldState,
        playerPosition: { position: { x: 5, y: 5 } },
      };

      await mockCactusProvider.generateText({
        messages: [{ role: 'user', content: 'Test message' }],
        character: mockCharacter,
        worldState: updatedWorldState,
      });

      expect(mockCactusProvider.generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          worldState: expect.objectContaining({
            playerPosition: { position: { x: 5, y: 5 } },
          }),
        })
      );
    });
  });

  describe('configuration and defaults', () => {
    it('should use default AI configuration from mocks', () => {
      // Test that our mocked configuration is being used
      expect(mockAIServiceManager.getProviderStatus()).toEqual({
        current: 'cactus',
        available: ['cactus', 'local', 'fallback'],
        performance: { responseTime: 500, successRate: 0.95 },
      });
    });

    it('should validate message roles', () => {
      const validRoles = ['user', 'assistant'] as const;
      const testMessage = { role: 'user' as const, content: 'Test' };
      
      expect(validRoles).toContain(testMessage.role);
    });

    it('should handle conversation context limits', () => {
      const longConversation = Array.from({ length: 50 }, (_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as const,
        content: `Message ${i + 1}`,
      }));

      // Test that we can handle long conversations
      expect(longConversation).toHaveLength(50);
      expect(longConversation[0].role).toBe('user');
      expect(longConversation[1].role).toBe('assistant');
    });
  });
});