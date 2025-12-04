import type { LocalDMResponse } from '../providers/local-dm-provider';
import { LocalDMProvider } from '../providers/local-dm-provider';

export interface LocalDMAgentConfig {
	modelPath: string;
	maxTokens: number;
	temperature: number;
	enableContentFiltering?: boolean;
	enableResourceMonitoring?: boolean;
}

export class LocalDMAgent {
	private provider: LocalDMProvider;
	constructor(config: LocalDMAgentConfig) {
		this.provider = new LocalDMProvider({
			modelPath: config.modelPath,
			contextSize: 0,
			maxTokens: config.maxTokens,
			temperature: config.temperature,
			enableResourceMonitoring: config.enableResourceMonitoring ?? false,
			powerSavingMode: false,
		});
	}

	async initialize(): Promise<void> {
		await this.provider.initialize();
	}

	async processAction(action: string, context: any): Promise<LocalDMResponse> {
		return this.provider.generateDnDResponse(action, context);
	}

	async generateNarration(scene: string, context: any): Promise<string> {
		const res = await this.provider.generateDnDResponse(scene, context);
		return res.text;
	}

	async loadModel(_config: any): Promise<boolean> {
		return true;
	}

	async unloadModel(): Promise<void> {
		return;
	}

	setPerformanceMode(_mode: 'performance' | 'balanced' | 'quality') {}
	enableBatteryOptimization(_enabled: boolean) {}
	clearModelCache(): Promise<void> {
		this.provider.clearCache();
		return Promise.resolve();
	}
	exportModelData(): Promise<any> {
		return Promise.resolve({});
	}

	isReady(): boolean {
		return this.provider.isReady();
	}
}
