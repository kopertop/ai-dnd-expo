import { Page, Route } from '@playwright/test';

// Minimal mock data to drive the multiplayer-game screen with a spell-cast flow
const now = Date.now();

const mockCharacters = [
	{
		id: 'char-1',
		name: 'Gandalf',
		race: 'human',
		class: 'wizard',
		level: 3,
		stats: { STR: 10, DEX: 14, CON: 12, INT: 16, WIS: 12, CHA: 10 },
		skills: ['arcana', 'history'],
		inventory: [],
		equipped: {},
		health: 20,
		maxHealth: 20,
		actionPoints: 3,
		maxActionPoints: 3,
	},
];

const mockMap = {
	id: 'map-1',
	name: 'Test Map',
	width: 5,
	height: 5,
	defaultTerrain: 'stone',
	terrain: [],
	tokens: [
		{
			id: 'token-player',
			type: 'player',
			entityId: 'char-1',
			label: 'Gandalf',
			x: 1,
			y: 1,
			color: '#2F80ED',
		},
		{
			id: 'token-npc',
			type: 'npc',
			entityId: 'npc-1',
			label: 'Goblin',
			x: 2,
			y: 1,
			color: '#EB5757',
		},
	],
	updatedAt: now,
};

const baseGameState = {
	hostId: 'host-1',
	quest: {
		id: 'quest-1',
		name: 'Test Quest',
		description: 'Spell cast flow',
		objectives: [],
		startingArea: 'start',
		world: 'test-world',
		createdAt: now,
	},
	sessionId: 'session-1',
	inviteCode: 'TEST01',
	players: [
		{
			characterId: 'char-1',
			playerId: 'player-1',
			name: 'Gandalf',
			joinedAt: now,
		},
	],
	status: 'active',
	createdAt: now,
	lastUpdated: now,
	messages: [],
	mapState: mockMap,
	activityLog: [],
	characters: mockCharacters,
	activeTurn: {
		type: 'player' as const,
		entityId: 'char-1',
		turnNumber: 1,
		startedAt: now,
		movementUsed: 0,
		majorActionUsed: false,
		minorActionUsed: false,
		speed: 6,
	},
	initiativeOrder: [
		{
			entityId: 'char-1',
			type: 'player' as const,
			initiative: 15,
		},
		{
			entityId: 'token-npc',
			type: 'npc' as const,
			initiative: 10,
		},
	],
};

export const setupMockGameState = async (page: Page) => {
	let spellCastCalls = 0;

	const respond = (route: Route, body: unknown) => route.fulfill({ status: 200, body: JSON.stringify(body) });

	await page.route('**/api/games/TEST01', route => respond(route, { gameState: baseGameState }));
	await page.route('**/api/games/TEST01/state', route => respond(route, { gameState: baseGameState }));
	await page.route('**/api/games/TEST01/map', route => respond(route, mockMap));
	await page.route('**/api/games/TEST01/map/tokens', route => respond(route, { tokens: mockMap.tokens }));

	// Turn updates
	await page.route('**/api/games/TEST01/turn/update', route => respond(route, { ...baseGameState }));

	// Spell casting endpoint
	await page.route('**/api/games/TEST01/characters/char-1/actions', async route => {
		if (route.request().method() === 'POST') {
			spellCastCalls += 1;
			return respond(route, { character: mockCharacters[0], actionPerformed: 'cast_spell' });
		}
		return respond(route, {});
	});

	// Perception/other actions fallback
	await page.route('**/api/games/TEST01/**', route => respond(route, {}));

	return () => spellCastCalls;
};
