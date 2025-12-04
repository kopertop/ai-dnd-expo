export interface ModelInput {
	[key: string]: any;
}

export class ONNXModelManager {
	private validated = false;

	async loadGemma3Model(_path: string): Promise<Record<string, unknown>> {
		this.validated = true;
		return {};
	}

	async validateModel(_session: Record<string, unknown>): Promise<boolean> {
		this.validated = true;
		return true;
	}

	async runInference(_session: Record<string, unknown>, _input: ModelInput) {
		if (!this.validated) {
			throw new Error('Model not validated');
		}
		return { logits: new Float32Array([0.1, 0.2, 0.7]) };
	}

	async cleanupSession(_session: Record<string, unknown>): Promise<void> {
		this.validated = false;
	}

	isModelReady(): boolean {
		return this.validated;
	}

	optimizeSession(_session: Record<string, unknown>, _deviceInfo: any) {
		// no-op stub
	}

	prepareInputTensors(input: ModelInput) {
		return input;
	}
}

export const ONNXModelUtils = {
	validateInput(outputNames: string[]) {
		return outputNames.includes('logits');
	},
};
