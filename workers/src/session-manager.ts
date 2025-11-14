import { Quest } from './types';

/**
 * Generate a unique 6-character alphanumeric invite code
 */
export function generateInviteCode(): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let code = '';
	for (let i = 0; i < 6; i++) {
		code += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return code;
}

/**
 * Get or create a Durable Object ID for a game session
 */
export function getSessionId(
	env: Env,
	inviteCode: string,
): DurableObjectId {
	// Use invite code as the ID name for easy lookup
	return env.GAME_SESSION.idFromName(inviteCode);
}

/**
 * Get the Durable Object stub for a game session
 */
export function getSessionStub(
	env: Env,
	inviteCode: string,
): DurableObjectStub<GameSession> {
	const id = getSessionId(env, inviteCode);
	return env.GAME_SESSION.get(id);
}

interface Env {
	GAME_SESSION: DurableObjectNamespace<GameSession>;
	QUESTS: KVNamespace;
	OLLAMA_BASE_URL: string;
	OLLAMA_MODEL: string;
	ADMIN_EMAILS: string;
}

// Forward declaration - will be imported from game-session.ts
interface GameSession {
	fetch(request: Request): Promise<Response>;
}

