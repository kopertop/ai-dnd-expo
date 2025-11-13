import { Quest } from '@/types/quest';

export const icebreakerQuest: Quest = {
	id: 'icebreaker-newstex',
	name: 'The Newstex Icebreaker',
	description:
		'A short collaborative adventure designed to bring the Newstex team together. The party must work together to solve puzzles, overcome challenges, and complete a mission that requires everyone\'s unique skills.',
	objectives: [
		{
			id: 'obj1',
			description: 'Assemble the team and introduce yourselves',
			completed: false,
		},
		{
			id: 'obj2',
			description: 'Solve the first puzzle together',
			completed: false,
		},
		{
			id: 'obj3',
			description: 'Navigate through the challenge area',
			completed: false,
		},
		{
			id: 'obj4',
			description: 'Complete the final objective as a team',
			completed: false,
		},
	],
	startingArea: 'The Gathering Hall',
	world: 'Fantasy',
	maxPlayers: 11,
	estimatedDuration: 30, // 30 minutes
	createdAt: Date.now(),
	createdBy: 'system',
};

