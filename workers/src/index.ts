import app from './app';
import type { Env } from './env';
import { GameSession } from './game-session';

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		return app.fetch(request, env);
	},
};

export { GameSession };

