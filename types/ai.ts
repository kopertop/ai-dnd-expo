/**
 * AI Provider Types
 * 
 * Common types for AI providers across platforms
 */

export interface AIMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface AICompletionParams {
	temperature?: number;
	top_p?: number;
	n_predict?: number;
	num_predict?: number;
	stop?: string[];
	stream?: boolean;
}

export interface AIProviderResponse {
	text: string;
	confidence?: number;
	toolCommands?: Array<{ type: string; params: string }>;
	processingTime?: number;
	metadata?: {
		modelUsed?: string;
		tokensGenerated?: number;
		provider?: string;
	};
}

export interface AIStreamChunk {
	token: string;
	done: boolean;
	metadata?: {
		modelUsed?: string;
		tokensGenerated?: number;
	};
}

export interface AIProviderHealth {
	available: boolean;
	latency?: number;
	error?: string;
}

export type AIProviderType = 'ollama' | 'local' | 'fallback';

export interface AIProviderConfig {
	type: AIProviderType;
	baseUrl?: string;
	model?: string;
	timeout?: number;
	apiKey?: string;
	fallbackMode?: 'local' | 'localfirst' | 'remotefirst' | 'remote';
}

