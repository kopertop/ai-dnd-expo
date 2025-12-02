export class ModelStorageManager {
	async getStorageStats() {
		return { total: 1024 * 1024 * 1024, free: 1024 * 1024 * 512 };
	}
}
