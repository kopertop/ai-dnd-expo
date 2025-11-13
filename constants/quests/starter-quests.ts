import { Quest } from '@/types/quest';

export const rescueMissionQuest: Quest = {
	id: 'rescue-mission',
	name: 'The Lost Merchant',
	description:
		'A merchant has gone missing while traveling through the dangerous forest. The party must track them down, face the dangers of the wilderness, and bring them back safely.',
	objectives: [
		{
			id: 'obj1',
			description: 'Find clues about the merchant\'s last known location',
			completed: false,
		},
		{
			id: 'obj2',
			description: 'Navigate through the dangerous forest',
			completed: false,
		},
		{
			id: 'obj3',
			description: 'Rescue the merchant from their captors',
			completed: false,
		},
		{
			id: 'obj4',
			description: 'Return safely to town',
			completed: false,
		},
	],
	startingArea: 'Town Square',
	world: 'Fantasy',
	maxPlayers: 6,
	estimatedDuration: 45,
	createdAt: Date.now(),
	createdBy: 'system',
};

export const dungeonCrawlQuest: Quest = {
	id: 'dungeon-crawl',
	name: 'The Abandoned Crypt',
	description:
		'An ancient crypt has been discovered beneath the old temple. Strange sounds echo from within, and the local villagers are too afraid to investigate. The party must explore the depths and uncover the secrets within.',
	objectives: [
		{
			id: 'obj1',
			description: 'Enter the crypt and explore the first level',
			completed: false,
		},
		{
			id: 'obj2',
			description: 'Solve the puzzles blocking your path',
			completed: false,
		},
		{
			id: 'obj3',
			description: 'Defeat the guardians of the crypt',
			completed: false,
		},
		{
			id: 'obj4',
			description: 'Retrieve the artifact from the deepest chamber',
			completed: false,
		},
	],
	startingArea: 'Old Temple',
	world: 'Fantasy',
	maxPlayers: 8,
	estimatedDuration: 60,
	createdAt: Date.now(),
	createdBy: 'system',
};

export const mysteryQuest: Quest = {
	id: 'mystery-investigation',
	name: 'The Mysterious Disappearance',
	description:
		'People have been vanishing from the town without a trace. The party must investigate, gather clues, interview witnesses, and solve the mystery before more people disappear.',
	objectives: [
		{
			id: 'obj1',
			description: 'Gather information from witnesses',
			completed: false,
		},
		{
			id: 'obj2',
			description: 'Investigate the scene of the disappearances',
			completed: false,
		},
		{
			id: 'obj3',
			description: 'Follow the clues to find the culprit',
			completed: false,
		},
		{
			id: 'obj4',
			description: 'Confront and stop the responsible party',
			completed: false,
		},
	],
	startingArea: 'Town Center',
	world: 'Fantasy',
	maxPlayers: 6,
	estimatedDuration: 50,
	createdAt: Date.now(),
	createdBy: 'system',
};

