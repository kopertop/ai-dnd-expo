export interface InferenceContext {
	gameId?: string;
}

export class ModelCacheManager {
	getCacheStats() {
		return { entries: 0 };
	}

	clearCache() {
		return true;
	}
}
