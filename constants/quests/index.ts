
import { icebreakerQuest } from './icebreaker';
import { dungeonCrawlQuest, mysteryQuest, rescueMissionQuest } from './starter-quests';

import { Quest } from '@/types/quest';

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

