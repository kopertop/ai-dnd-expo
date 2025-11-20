import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OllamaClient } from '@/services/api/ollama-client';

describe('OllamaClient', () => {
	let ollamaClient: OllamaClient;
	
	// Mock fetch globally
	const mockFetch = vi.fn();
	global.fetch = mockFetch;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('API Key Support', () => {
		it('should include Authorization header when API key is provided', async () => {
			// Create client with API key
			ollamaClient = new OllamaClient({
				apiKey: 'test-api-key'
			});

			// Mock successful response
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ message: { content: 'Test response' } })
			});

			// Make a completion request
			await ollamaClient.completion([{ role: 'user', content: 'Hello' }]);

			// Check that fetch was called with Authorization header
			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						'Authorization': 'Bearer test-api-key'
					})
				})
			);
		});

		it('should not include Authorization header when no API key is provided', async () => {
			// Create client without API key
			ollamaClient = new OllamaClient();

			// Mock successful response
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ message: { content: 'Test response' } })
			});

			// Make a completion request
			await ollamaClient.completion([{ role: 'user', content: 'Hello' }]);

			// Check that fetch was called without Authorization header
			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.not.objectContaining({
						'Authorization': expect.any(String)
					})
				})
			);
		});

		it('should include Authorization header in health check when API key is provided', async () => {
			// Create client with API key
			ollamaClient = new OllamaClient({
				apiKey: 'test-api-key'
			});

			// Mock successful response
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ models: [] })
			});

			// Make a health check request
			await ollamaClient.healthCheck();

			// Check that fetch was called with Authorization header
			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						'Authorization': 'Bearer test-api-key'
					})
				})
			);
		});
	});
});

