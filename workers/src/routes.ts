import { generateInviteCode, getSessionStub } from './session-manager';
import { corsHeaders, handleCORS, requireAdmin } from './middleware';
import { Quest } from './types';
import { Database } from './db';

export async function handleRequest(request: Request, env: Env): Promise<Response> {
	// Handle CORS
	const corsResponse = handleCORS(request);
	if (corsResponse) return corsResponse;

	const url = new URL(request.url);
	const path = url.pathname;

	try {
		// API Routes
		if (path.startsWith('/api/games')) {
			return handleGameRoutes(request, env, path);
		}

		if (path.startsWith('/api/quests')) {
			return handleQuestRoutes(request, env, path);
		}

		if (path.startsWith('/api/admin')) {
			return handleAdminRoutes(request, env, path);
		}

		// Health check
		if (path === '/health') {
			return new Response(JSON.stringify({ status: 'ok' }), {
				headers: corsHeaders(),
			});
		}

		return new Response('Not Found', { status: 404, headers: corsHeaders() });
	} catch (error) {
		console.error('Request error:', error);
		return new Response(
			JSON.stringify({
				error: 'Internal server error',
				message: error instanceof Error ? error.message : 'Unknown error',
			}),
			{
				status: 500,
				headers: corsHeaders(),
			},
		);
	}
}

async function handleGameRoutes(
	request: Request,
	env: Env,
	path: string,
): Promise<Response> {
	// POST /api/games - Create new game
	if (path === '/api/games' && request.method === 'POST') {
		const body = await request.json();
		const { questId, quest, world, startingArea, hostId, hostEmail, hostCharacter } = body;
		const db = new Database(env.DB);

		// Use quest from request body if provided, otherwise try to load from KV
		let questData: Quest;
		if (quest) {
			// Quest data provided directly in request (preferred for predefined quests)
			questData = quest;
		} else if (questId) {
			// Try to load from KV storage (for admin-created quests)
			const kvQuestData = await env.QUESTS.get(questId);
			if (!kvQuestData) {
				return new Response(
					JSON.stringify({ error: 'Quest not found. Please provide quest data in the request body.' }),
					{
						status: 404,
						headers: corsHeaders(),
					},
				);
			}
			questData = JSON.parse(kvQuestData);
		} else {
			return new Response(
				JSON.stringify({ error: 'Quest ID or quest data is required' }),
				{
					status: 400,
					headers: corsHeaders(),
				},
			);
		}

		// Generate invite code
		const inviteCode = generateInviteCode();

		// Get session stub
		const sessionStub = getSessionStub(env, inviteCode);

		// Initialize session
		// Construct proper URLs for Durable Object fetch
		const requestUrl = new URL(request.url);
		const baseOrigin = requestUrl.origin;
		
		const initRequest = new Request(`${baseOrigin}/initialize`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				inviteCode,
				hostId,
				quest: questData,
				world,
				startingArea,
			}),
		});
		
		const initResponse = await sessionStub.fetch(initRequest);
		if (!initResponse.ok) {
			const errorText = await initResponse.text();
			console.error('Failed to initialize session:', errorText);
			return new Response(
				JSON.stringify({ error: 'Failed to initialize game session', details: errorText }),
				{
					status: 500,
					headers: corsHeaders(),
				},
			);
		}

		// Save game to database
		const gameId = sessionStub.id.toString();
		await db.createGame({
			id: gameId,
			invite_code: inviteCode,
			host_id: hostId,
			host_email: hostEmail || null,
			quest_id: questData.id,
			quest_data: JSON.stringify(questData),
			world,
			starting_area: startingArea,
			status: 'waiting',
		});

		// Add host's character if provided
		if (hostCharacter) {
			// Save character to database
			await db.createCharacter({
				id: hostCharacter.id,
				player_id: hostId,
				player_email: hostEmail || null,
				name: hostCharacter.name,
				level: hostCharacter.level,
				race: hostCharacter.race,
				class: hostCharacter.class,
				description: hostCharacter.description || null,
				stats: JSON.stringify(hostCharacter.stats),
				skills: JSON.stringify(hostCharacter.skills || []),
				inventory: JSON.stringify(hostCharacter.inventory || []),
				equipped: JSON.stringify(hostCharacter.equipped || {}),
				health: hostCharacter.health,
				max_health: hostCharacter.maxHealth,
				action_points: hostCharacter.actionPoints,
				max_action_points: hostCharacter.maxActionPoints,
			});

			// Add player to game
			await db.addPlayerToGame({
				game_id: gameId,
				player_id: hostId,
				player_email: hostEmail || null,
				character_id: hostCharacter.id,
				character_name: hostCharacter.name,
				joined_at: Date.now(),
			});

			await sessionStub.fetch(
				new Request(`${baseOrigin}/join`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						character: hostCharacter,
						playerId: hostId,
					}),
				}),
			);
		}

		// Get session info
		const sessionResponse = await sessionStub.fetch(
			new Request(`${baseOrigin}/state`),
		);
		const sessionData = await sessionResponse.json();

		return new Response(JSON.stringify(sessionData), {
			headers: corsHeaders(),
		});
	}

	// Extract invite code from path: /api/games/:inviteCode/...
	const pathParts = path.split('/');
	const inviteCodeIndex = pathParts.indexOf('games') + 1;
	if (inviteCodeIndex < pathParts.length) {
		const inviteCode = pathParts[inviteCodeIndex];
		const sessionStub = getSessionStub(env, inviteCode);

		// GET /api/games/:inviteCode - Get game session info
		if (path === `/api/games/${inviteCode}` && request.method === 'GET') {
			const response = await sessionStub.fetch(
				new Request(`${request.url}/state`),
			);
			const data = await response.json();
			return new Response(JSON.stringify(data), {
				headers: corsHeaders(),
			});
		}

		// POST /api/games/:inviteCode/join - Join game
		if (
			path === `/api/games/${inviteCode}/join` &&
			request.method === 'POST'
		) {
			const body = await request.json();
			const { character, playerId, playerEmail } = body;
			const db = new Database(env.DB);
			
			// Get game from database
			const game = await db.getGameByInviteCode(inviteCode);
			if (!game) {
				return new Response(
					JSON.stringify({ error: 'Game not found' }),
					{ status: 404, headers: corsHeaders() },
				);
			}
			
			// Save character to database
			await db.createCharacter({
				id: character.id,
				player_id: playerId,
				player_email: playerEmail || null,
				name: character.name,
				level: character.level,
				race: character.race,
				class: character.class,
				description: character.description || null,
				stats: JSON.stringify(character.stats),
				skills: JSON.stringify(character.skills || []),
				inventory: JSON.stringify(character.inventory || []),
				equipped: JSON.stringify(character.equipped || {}),
				health: character.health,
				max_health: character.maxHealth,
				action_points: character.actionPoints,
				max_action_points: character.maxActionPoints,
			});
			
			// Add player to game
			await db.addPlayerToGame({
				game_id: game.id,
				player_id: playerId,
				player_email: playerEmail || null,
				character_id: character.id,
				character_name: character.name,
				joined_at: Date.now(),
			});
			
			// Create a new request with just the path for the Durable Object
			const url = new URL(request.url);
			const doRequest = new Request(`${url.origin}/join`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ character, playerId }),
			});
			const response = await sessionStub.fetch(doRequest);
			const data = await response.json();
			return new Response(JSON.stringify(data), {
				headers: corsHeaders(),
			});
		}

		// GET /api/games/:inviteCode/state - Poll game state
		if (
			path === `/api/games/${inviteCode}/state` &&
			request.method === 'GET'
		) {
			const url = new URL(request.url);
			const response = await sessionStub.fetch(
				new Request(`${url.origin}/state`),
			);
			const data = await response.json();
			return new Response(JSON.stringify(data), {
				headers: corsHeaders(),
			});
		}

		// POST /api/games/:inviteCode/action - Player action
		if (
			path === `/api/games/${inviteCode}/action` &&
			request.method === 'POST'
		) {
			const response = await sessionStub.fetch(request);
			const data = await response.json();
			return new Response(JSON.stringify(data), {
				headers: corsHeaders(),
			});
		}

		// POST /api/games/:inviteCode/dm-action - DM action
		if (
			path === `/api/games/${inviteCode}/dm-action` &&
			request.method === 'POST'
		) {
			const response = await sessionStub.fetch(request);
			const data = await response.json();
			return new Response(JSON.stringify(data), {
				headers: corsHeaders(),
			});
		}

		// POST /api/games/:inviteCode/start - Start game
		if (
			path === `/api/games/${inviteCode}/start` &&
			request.method === 'POST'
		) {
			const response = await sessionStub.fetch(request);
			const data = await response.json();
			return new Response(JSON.stringify(data), {
				headers: corsHeaders(),
			});
		}

		// WS /api/games/:inviteCode/ws - WebSocket connection
		if (path === `/api/games/${inviteCode}/ws`) {
			return sessionStub.fetch(request);
		}
	}

	return new Response('Not Found', { status: 404, headers: corsHeaders() });
}

async function handleQuestRoutes(
	request: Request,
	env: Env,
	path: string,
): Promise<Response> {
	// GET /api/quests - List all quests
	if (path === '/api/quests' && request.method === 'GET') {
		const keys = await env.QUESTS.list();
		const quests: Quest[] = [];

		for (const key of keys.keys) {
			const questData = await env.QUESTS.get(key.name);
			if (questData) {
				quests.push(JSON.parse(questData));
			}
		}

		return new Response(JSON.stringify({ quests }), {
			headers: corsHeaders(),
		});
	}

	// GET /api/quests/:questId - Get specific quest
	if (path.startsWith('/api/quests/') && request.method === 'GET') {
		const questId = path.split('/').pop();
		if (questId) {
			const questData = await env.QUESTS.get(questId);
			if (questData) {
				return new Response(questData, {
					headers: corsHeaders(),
				});
			}
		}
		return new Response(
			JSON.stringify({ error: 'Quest not found' }),
			{
				status: 404,
				headers: corsHeaders(),
			},
		);
	}

	return new Response('Not Found', { status: 404, headers: corsHeaders() });
}

async function handleAdminRoutes(
	request: Request,
	env: Env,
	path: string,
): Promise<Response> {
	// Check admin access
	const adminCheck = await requireAdmin(request, env);
	if (adminCheck) return adminCheck;

	// POST /api/admin/quests - Create new quest
	if (path === '/api/admin/quests' && request.method === 'POST') {
		const body = await request.json();
		const quest: Quest = {
			...body,
			id: body.id || `quest_${Date.now()}`,
			createdAt: Date.now(),
			createdBy: getEmailFromRequest(request) || 'admin',
		};

		await env.QUESTS.put(quest.id, JSON.stringify(quest));

		return new Response(JSON.stringify(quest), {
			headers: corsHeaders(),
		});
	}

	// DELETE /api/admin/games/:gameId - Delete game
	if (path.startsWith('/api/admin/games/') && request.method === 'DELETE') {
		const gameId = path.split('/').pop();
		if (gameId) {
			// Note: Durable Objects don't have a direct delete method
			// We'd need to mark it as deleted in the state
			// For now, return success
			return new Response(
				JSON.stringify({ success: true, message: 'Game deletion not yet implemented' }),
				{
					headers: corsHeaders(),
				},
			);
		}
	}

	return new Response('Not Found', { status: 404, headers: corsHeaders() });
}

function getEmailFromRequest(request: Request): string | null {
	return request.headers.get('X-User-Email');
}

interface Env {
	GAME_SESSION: DurableObjectNamespace;
	DB: D1Database;
	QUESTS: KVNamespace;
	OLLAMA_BASE_URL: string;
	OLLAMA_MODEL: string;
	ADMIN_EMAILS: string;
}

