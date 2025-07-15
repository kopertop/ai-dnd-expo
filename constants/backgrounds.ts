// D&D-style random backgrounds for character creation

export type BackgroundOrigin = {
	title: string;
	description: string;
	races: string[];
	classes: Record<string, string>; // className -> flavor sentence
};
export type BackgroundEvent = {
	title: string;
	description: string;
	classes: string[];
};
export type BackgroundGoal = {
	title: string;
	description: string;
	classes: string[];
};

export const BACKGROUND_ORIGINS: BackgroundOrigin[] = [
	{
		title: 'Volcanic Survivor',
		description:
			'You are a defender of earth and life, having survived the eruption of a mighty volcano. The scars you bear are a testament to your resilience and the fury of the elements.',
		races: ['Dwarf', 'Human'],
		classes: {
			Fighter: 'You learned to fight to protect your people from the chaos of the volcano.',
			Barbarian: 'The fury of the mountain lives within you, driving your rage in battle.',
			Wizard: 'You became obsessed with the secrets of elemental power after witnessing the devastation.',
		},
	},
	{
		title: 'Nomadic Desert Tribe',
		description:
			'You grew up wandering the endless sands, learning the ways of survival and the secrets of the desert spirits.',
		races: ['Dragonborn', 'Human'],
		classes: {
			Ranger: 'You mastered the art of tracking and hunting in the harshest of climates.',
			Fighter: 'Tribal raids and skirmishes taught you tactics and discipline.',
			Druid: 'You commune with the spirits of sand and wind, drawing power from the desert itself.',
		},
	},
	{
		title: 'Dockside Orphan',
		description:
			'The bustling docks were your home, and the streets your school. You learned to survive by your wits and your speed.',
		races: ['Half-Orc', 'Halfling', 'Tiefling'],
		classes: {
			Rogue: 'You became an expert pickpocket and master of shadows.',
			Warlock: 'Desperation led you to bargain with dark forces for a taste of power.',
			Fighter: 'You survived by fighting for scraps and standing your ground.',
		},
	},
	// ... (add more as needed)
];

export const BACKGROUND_EVENTS: BackgroundEvent[] = [
	{
		title: 'Artifact Embedded',
		description:
			'While exploring a ruin, you accidentally tripped over a switch and fell on top of an ancient artifact. The artifact became embedded next to your heart, and could not be removed. Sometimes it triggers randomly with unpredictable effects.',
		classes: ['Wizard', 'Fighter', 'Cleric'],
	},
	{
		title: 'Cursed by a Hag',
		description:
			'A mysterious hag placed a powerful curse upon you. Its effects haunt your dreams and shape your destiny.',
		classes: ['Warlock', 'Cleric', 'Wizard'],
	},
	{
		title: 'Arena Survivor',
		description:
			'You were forced to fight for your life in a brutal arena. The crowd cheered as you overcame impossible odds.',
		classes: ['Fighter', 'Barbarian', 'Rogue'],
	},
	// ... (add more as needed)
];

export const BACKGROUND_GOALS: BackgroundGoal[] = [
	{
		title: 'Hunt the Creature',
		description:
			"As a child, your childhood friend was attacked and eaten by a large creature. You've been searching for it ever since to take out your revenge.",
		classes: ['Ranger', 'Fighter', 'Cleric'],
	},
	{
		title: 'Seek Redemption',
		description:
			'You seek to atone for a past mistake or failure, hoping to restore your honor and find peace.',
		classes: ['Paladin', 'Cleric', 'Fighter'],
	},
	{
		title: 'Famous Name',
		description:
			'You are determined to make your name known throughout the land, whether through heroism, cunning, or sheer force of will.',
		classes: ['Bard', 'Sorcerer', 'Rogue'],
	},
	// ... (add more as needed)
];

// Utility to pick a random element from an array
function pickRandom<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

// Generate a random background string for a given race and class
export function generateRandomBackground(race: string, className: string): string {
	// Origin
	const possibleOrigins = BACKGROUND_ORIGINS.filter(
		o => o.races.includes(race) && Object.keys(o.classes).includes(className),
	);
	const origin =
		possibleOrigins.length > 0 ? pickRandom(possibleOrigins) : pickRandom(BACKGROUND_ORIGINS);
	const originFlavor = origin.classes[className] || Object.values(origin.classes)[0];
	// Event
	const possibleEvents = BACKGROUND_EVENTS.filter(e => e.classes.includes(className));
	const event =
		possibleEvents.length > 0 ? pickRandom(possibleEvents) : pickRandom(BACKGROUND_EVENTS);
	// Goal
	const possibleGoals = BACKGROUND_GOALS.filter(g => g.classes.includes(className));
	const goal =
		possibleGoals.length > 0 ? pickRandom(possibleGoals) : pickRandom(BACKGROUND_GOALS);
	return (
		`# ${origin.title}\n` +
		`${origin.description}\n${originFlavor}\n\n` +
		`# ${event.title}\n` +
		`${event.description}\n\n` +
		'# Your goal\n' +
		`${goal.description}`
	);
}
