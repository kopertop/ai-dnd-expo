import { Platform } from 'react-native';

import type {
	WorkingAICompletionParams,
	WorkingAIMessage,
	WorkingAIProviderInterface,
} from './working-ai-provider';

export class AppleAIProvider implements WorkingAIProviderInterface {
	isInitialized = false;
	private debugInfo: any = {};

	async initialize(onProgress?: (progress: number) => void): Promise<boolean> {
		try {
			if (this.isInitialized) return true;

			if (onProgress) onProgress(0.25);

			// Basic platform gate; provider only works on iOS
			if (Platform.OS !== 'ios') {
				throw new Error('AppleAIProvider is only available on iOS');
			}

			// Lazy import to keep bundle lean and avoid type friction
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const { createApple } = (await import('@react-native-ai/apple')) as any;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const ai = (await import('ai')) as any;

			if (!createApple || !ai?.generateText) {
				throw new Error('Apple AI SDK not available');
			}

			this.debugInfo.provider = 'apple';
			this.isInitialized = true;
			if (onProgress) onProgress(1);
			return true;
		} catch (err) {
			this.debugInfo.lastError = err instanceof Error ? err.message : String(err);
			if (onProgress) onProgress(0);
			return false;
		}
	}

	async completion(
		messages: WorkingAIMessage[],
		params: WorkingAICompletionParams = {},
	): Promise<string> {
		if (!this.isInitialized) {
			throw new Error('AppleAIProvider not initialized');
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { createApple } = (await import('@react-native-ai/apple')) as any;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { generateText } = (await import('ai')) as any;

		const apple = createApple();

		// Choose a sensible default model identifier; let the native lib resolve
		// If the model id is not required or differs, native lib will handle it.
		const model = apple.model?.('text') ?? apple;

		// Prefer passing structured messages if supported; otherwise, flatten
		const hasMessagesSupport = true;

		if (hasMessagesSupport) {
			const result = await generateText({
				model,
				messages: messages.map(m => ({ role: m.role, content: m.content })),
				temperature: params.temperature ?? 0.7,
				maxTokens: params.n_predict ?? 256,
			});
			return String(result?.text ?? '');
		}

		const prompt = this.flattenMessages(messages);
		const result = await generateText({
			model,
			prompt,
			temperature: params.temperature ?? 0.7,
			maxTokens: params.n_predict ?? 256,
		});
		return String(result?.text ?? '');
	}

	async streamingCompletion(
		messages: WorkingAIMessage[],
		params: WorkingAICompletionParams = {},
		onToken?: (token: string) => void,
	): Promise<string> {
		// For now, call non-streaming completion and simulate token callbacks
		const text = await this.completion(messages, params);
		if (onToken) {
			const tokens = text.split(' ');
			for (const t of tokens) onToken(t + ' ');
		}
		return text;
	}

	rewind(): void {
		// No conversation context held in this adapter; nothing to rewind.
	}

	getDebugInfo() {
		return this.debugInfo;
	}

	private flattenMessages(messages: WorkingAIMessage[]): string {
		return messages
			.map(m => `${m.role.toUpperCase()}: ${m.content}`)
			.join('\n');
	}
}

export default AppleAIProvider;

