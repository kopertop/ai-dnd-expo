export class Gemma3Tokenizer {
	async initialize(): Promise<void> {
		return;
	}

	isReady(): boolean {
		return true;
	}

	getVocabSize(): number {
		return 32000;
	}

	async loadVocab(): Promise<boolean> {
		return true;
	}

	async encode(text: string): Promise<number[]> {
		return Array.from({ length: Math.min(5, text.length) }, (_, i) => i + 1);
	}

	async decode(_tokens: number[]): Promise<string> {
		return 'Decoded text';
	}

	getSpecialTokenId(token: string): number | undefined {
		const map: Record<string, number> = {
			'<eos>': 2,
			'<end_of_turn>': 107,
			'<end_of_dm>': 109,
		};
		return map[token];
	}

	getConfig() {
		return { vocabSize: 32000 };
	}
}
