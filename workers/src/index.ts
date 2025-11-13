import { GameSession } from './game-session';
import { handleRequest } from './routes';

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		return handleRequest(request, env);
	},
};

export { GameSession };

interface Env {
	GAME_SESSION: DurableObjectNamespace<GameSession>;
	QUESTS: KVNamespace;
	OLLAMA_BASE_URL: string;
	OLLAMA_MODEL: string;
	ADMIN_EMAILS: string;
}

