import { Quest } from '@/types/quest';

import { icebreakerQuest } from './icebreaker';
import { dungeonCrawlQuest, mysteryQuest, rescueMissionQuest } from './starter-quests';

export const predefinedQuests: Quest[] = [
	icebreakerQuest,
	rescueMissionQuest,
	dungeonCrawlQuest,
	mysteryQuest,
];

export { icebreakerQuest, rescueMissionQuest, dungeonCrawlQuest, mysteryQuest };

export function getQuestById(id: string): Quest | undefined {
	return predefinedQuests.find(q => q.id === id);
}

