export interface ModelMetadata {
	id: string;
	name: string;
	size: number;
}

export class ModelDownloadManager {
	async initializeDirectories() {
		return true;
	}

	async downloadModel(_url: string): Promise<ModelMetadata> {
		return { id: 'model', name: 'model', size: 0 };
	}

	async getStorageInfo() {
		return { free: 1024 * 1024 * 1024, used: 0 };
	}
}
