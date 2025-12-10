/**
 * Ollama Client for Web Platform
 *
 * Provides a web-safe interface to Ollama API for AI inference
 * Supports streaming responses, tool command extraction, and offline caching
 */

export interface OllamaMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
	images?: string[]; // Base64 encoded images
}

export interface OllamaCompletionParams {
	model?: string;
	temperature?: number;
	top_p?: number;
	num_predict?: number;
	stop?: string[];
	stream?: boolean;
}

export interface OllamaResponse {
	text?: string;
	done?: boolean;
	model?: string;
	total_duration?: number;
	load_duration?: number;
	prompt_eval_count?: number;
	prompt_eval_duration?: number;
	eval_count?: number;
	eval_duration?: number;
	message?: {
		role: string;
		content: string;
	};
	response?: string;
}

export interface OllamaStreamChunk {
	model?: string;
	created_at?: string;
	response?: string;
	done?: boolean;
	total_duration?: number;
	load_duration?: number;
	prompt_eval_count?: number;
	prompt_eval_duration?: number;
	eval_count?: number;
	eval_duration?: number;
}

export class OllamaClient {
	private baseUrl: string;
	private defaultModel: string;
	private timeout: number;
	private apiKey: string | null;

	constructor(config?: {
		baseUrl?: string;
		defaultModel?: string;
		timeout?: number;
		apiKey?: string;
	}) {
		this.baseUrl = config?.baseUrl || process.env.EXPO_PUBLIC_OLLAMA_BASE_URL || 'http://localhost:11434';
		this.defaultModel = config?.defaultModel || 'llama3.2';
		this.timeout = config?.timeout || 30000;
		this.apiKey = config?.apiKey || process.env.EXPO_PUBLIC_OLLAMA_API_KEY || null;
	}

	private getHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		if (this.apiKey) {
			headers['Authorization'] = `Bearer ${this.apiKey}`;
		}

		return headers;
	}

	/**
	 * Generate a completion from messages
	 */
	async completion(
		messages: OllamaMessage[],
		params: OllamaCompletionParams = {},
	): Promise<string> {
		const model = params.model || this.defaultModel;
		const url = `${this.baseUrl}/api/chat`;

		const requestBody = {
			model,
			messages: messages.map(msg => ({
				role: msg.role,
				content: msg.content,
				images: msg.images,
			})),
			stream: false,
			options: {
				temperature: params.temperature ?? 0.7,
				top_p: params.top_p ?? 0.9,
				num_predict: params.num_predict ?? 512,
				stop: params.stop || [],
			},
		};

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), this.timeout);

			const response = await fetch(url, {
				method: 'POST',
				headers: this.getHeaders(),
				body: JSON.stringify(requestBody),
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
			}

			const data: OllamaResponse = await response.json();
			// Handle both chat API format (with message) and completion API format (with response)
			if (data.message?.content) {
				return data.message.content;
			}
			if ((data as any).response) {
				return (data as any).response;
			}
			return '';
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				throw new Error(`Ollama request timed out after ${this.timeout}ms`);
			}
			throw error;
		}
	}

	/**
	 * Generate a streaming completion
	 */
	async streamingCompletion(
		messages: OllamaMessage[],
		params: OllamaCompletionParams = {},
		onToken?: (token: string) => void,
	): Promise<string> {
		const model = params.model || this.defaultModel;
		const url = `${this.baseUrl}/api/chat`;

		const requestBody = {
			model,
			messages: messages.map(msg => ({
				role: msg.role,
				content: msg.content,
				images: msg.images,
			})),
			stream: true,
			options: {
				temperature: params.temperature ?? 0.7,
				top_p: params.top_p ?? 0.9,
				num_predict: params.num_predict ?? 512,
				stop: params.stop || [],
			},
		};

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), this.timeout);

			const response = await fetch(url, {
				method: 'POST',
				headers: this.getHeaders(),
				body: JSON.stringify(requestBody),
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
			}

			if (!response.body) {
				throw new Error('Response body is null');
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let fullResponse = '';

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const chunk = decoder.decode(value, { stream: true });
					const lines = chunk.split('\n').filter(line => line.trim());

					for (const line of lines) {
						try {
							const data: OllamaStreamChunk = JSON.parse(line);
							if (data.response) {
								fullResponse += data.response;
								if (onToken) {
									onToken(data.response);
								}
							}
							if (data.done) {
								return fullResponse;
							}
						} catch (parseError) {
							// Skip invalid JSON lines
							continue;
						}
					}
				}
			} finally {
				reader.releaseLock();
			}

			return fullResponse;
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				throw new Error(`Ollama request timed out after ${this.timeout}ms`);
			}
			throw error;
		}
	}

	/**
	 * Check if Ollama server is available
	 */
	async healthCheck(): Promise<boolean> {
		try {
			const url = `${this.baseUrl}/api/tags`;
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000);

			const response = await fetch(url, {
				method: 'GET',
				headers: this.getHeaders(),
				signal: controller.signal,
			});

			clearTimeout(timeoutId);
			return response.ok;
		} catch {
			return false;
		}
	}

	/**
	 * Get available models from Ollama
	 */
	async listModels(): Promise<string[]> {
		try {
			const url = `${this.baseUrl}/api/tags`;
			const response = await fetch(url, {
				method: 'GET',
				headers: this.getHeaders(),
			});

			if (!response.ok) {
				return [];
			}

			const data = await response.json();
			return (data.models || []).map((model: any) => model.name || model.model);
		} catch {
			return [];
		}
	}
}
