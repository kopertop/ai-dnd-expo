import { describe, expect, it } from 'vitest';

import { ONNXModelManager } from '@/services/ai/models/onnx-model-manager';

describe('ONNXModelManager (stub)', () => {
	it('instantiates and validates a session', async () => {
		const manager = new ONNXModelManager();
		const session = await manager.loadGemma3Model('/tmp/mock.onnx');
		expect(manager.isModelReady()).toBe(true);
		expect(await manager.validateModel(session)).toBe(true);
	});
});
