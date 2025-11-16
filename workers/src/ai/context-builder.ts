import { MultiplayerGameState } from '../types';

/**
 * Build AI context for multiplayer games
 */
export function buildMultiplayerContext(gameState: MultiplayerGameState): {
	players: Array<{
		id: string;
		name: string;
		race: string;
		class: string;
		level: number;
		stats: any;
	}>;
	quest: {
		name: string;
		description: string;
		objectives: Array<{ id: string; description: string; completed: boolean }>;
	};
	world: {
		name: string;
		location: string;
	};
	recentMessages: Array<{ speaker: string; content: string; timestamp: number }>;
} {
	return {
		players: gameState.players.map(p => {
			const char = gameState.characters.find(c => c.id === p.characterId);
			return {
				id: p.characterId,
				name: char?.name || p.name,
				race: char?.race || 'unknown',
				class: char?.class || 'unknown',
				level: char?.level || 1,
				stats: char?.stats || {},
			};
		}),
		quest: {
			name: gameState.quest.name,
			description: gameState.quest.description,
			objectives: gameState.quest.objectives.map(obj => ({
				id: obj.id,
				description: obj.description,
				completed: obj.completed,
			})),
		},
		world: {
			name: gameState.gameWorld,
			location: gameState.startingArea,
		},
		recentMessages: gameState.messages.slice(-10).map(msg => ({
			speaker: msg.speaker ?? 'Dungeon Master',
			content: msg.content,
			timestamp: msg.timestamp,
		})),
	};
}

