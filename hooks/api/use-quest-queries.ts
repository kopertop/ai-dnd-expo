import { useQueryApi } from 'expo-auth-template/frontend';

import type { Quest } from '@/types/quest';

/**
 * Get all available quests
 */
export function useQuests() {
	return useQueryApi<{ quests: Quest[] }>('/quests');
}

