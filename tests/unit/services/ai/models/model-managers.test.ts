import { describe, expect, it } from 'vitest';

import { ModelCacheManager } from '@/services/ai/models/model-cache-manager';
import { ModelCatalog } from '@/services/ai/models/model-catalog';
import { ModelDownloadManager } from '@/services/ai/models/model-download-manager';
import { ModelPrivacyManager } from '@/services/ai/models/model-privacy-manager';
import { ModelStorageManager } from '@/services/ai/models/model-storage-manager';
import { LocalDMProvider } from '@/services/ai/providers/local-dm-provider';

describe('Model management stubs', () => {
	it('instantiates model manager helpers', () => {
		expect(new ModelDownloadManager()).toBeDefined();
		expect(new ModelCatalog()).toBeDefined();
		expect(new ModelStorageManager()).toBeDefined();
		expect(new ModelCacheManager()).toBeDefined();
		expect(new ModelPrivacyManager()).toBeDefined();
	});

	it('provides minimal behaviors', async () => {
		const downloadManager = new ModelDownloadManager();
		expect(await downloadManager.getStorageInfo()).toEqual(
			expect.objectContaining({ free: expect.any(Number), used: expect.any(Number) }),
		);

		const catalog = new ModelCatalog();
		expect(await catalog.getCatalog()).toEqual(expect.any(Array));
	});

	it('exposes LocalDMProvider model management hooks', async () => {
		const provider = new LocalDMProvider({
			modelPath: '/tmp/model.onnx',
			contextSize: 1024,
			maxTokens: 64,
			temperature: 0.7,
			enableResourceMonitoring: false,
			powerSavingMode: false,
		});

		expect(await provider.getAvailableModels()).toEqual([]);
		expect(await provider.searchModels('test')).toEqual([]);
		expect(provider.getCacheStats()).toBeDefined();
	});
});
