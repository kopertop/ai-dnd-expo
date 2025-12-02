export interface CactusStatus {
	isReady: boolean;
	error: string | null;
}

export class CactusAIProvider {
	async initialize(): Promise<void> {
		return;
	}

	async generateDnDResponse(_prompt: string, _context?: Record<string, unknown>) {
		return {
			text: '',
			metadata: { toolCommands: [] },
		};
	}

	async healthCheck(): Promise<boolean> {
		return true;
	}

	isReady(): boolean {
		return true;
	}

	getStatus(): CactusStatus {
		return { isReady: true, error: null };
	}

	async cleanup(): Promise<void> {
		return;
	}
}
