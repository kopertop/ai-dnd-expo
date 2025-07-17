import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, waitFor } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSimpleCompanions } from '@/hooks/use-simple-companions';

describe('useSimpleCompanions basic test', () => {
	// Use spyOn for AsyncStorage methods
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(AsyncStorage, 'getItem').mockResolvedValue(null);
		vi.spyOn(AsyncStorage, 'setItem').mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should initialize with default values', async () => {
		const { result } = renderHook(() => useSimpleCompanions());

		// Wait for the initial load to complete
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.companions).toEqual([]);
		expect(result.current.activeCompanions).toEqual([]);
		expect(result.current.partyConfig).toEqual({
			maxSize: 4,
			activeCompanions: [],
			leadershipStyle: 'democratic',
		});
		expect(result.current.error).toBeNull();
	});
});
