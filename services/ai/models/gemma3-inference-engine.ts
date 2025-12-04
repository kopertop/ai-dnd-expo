import { Gemma3Tokenizer } from './gemma3-tokenizer';
import { ONNXModelManager } from './onnx-model-manager';

export class Gemma3InferenceEngine {
	private modelManager: ONNXModelManager;
	private tokenizer: Gemma3Tokenizer;
	private isInitialized = false;

	constructor(
		config: {
			modelPath: string;
			maxTokens?: number;
			temperature?: number;
			topP?: number;
			repetitionPenalty?: number;
		},
		deps: { modelManager?: ONNXModelManager; tokenizer?: Gemma3Tokenizer } = {},
	) {
		this.modelManager = deps.modelManager ?? new ONNXModelManager();
		this.tokenizer = deps.tokenizer ?? new Gemma3Tokenizer();
	}

	async initialize(): Promise<void> {
		this.isInitialized = true;
	}

	async generateText(prompt: string) {
		if (!this.isInitialized) {
			await this.initialize();
		}
		const tokens = await this.tokenizer.encode(prompt);
		return {
			text: 'Stub response',
			tokens,
			usage: {
				promptTokens: tokens.length,
				completionTokens: 1,
				totalTokens: tokens.length + 1,
			},
		};
	}

	async generateDnDResponse(request: { prompt: string }) {
		return this.generateText(request.prompt);
	}

	// Hooks used by tests
	protected sampleToken(_logits: Float32Array): number {
		return 0;
	}

	protected applyRepetitionPenalty(logits: Float32Array): Float32Array {
		return logits;
	}

	async cleanup() {
		this.isInitialized = false;
	}
}
