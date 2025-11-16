export interface Env {
	GAME_SESSION: DurableObjectNamespace;
	DB: D1Database;
	QUESTS: KVNamespace;
	AUTH_SESSIONS?: KVNamespace;
	OLLAMA_BASE_URL: string;
	OLLAMA_MODEL: string;
	ADMIN_EMAILS: string;
	AUTH_SECRET: string;
	AUTH_URL?: string;
	GOOGLE_CLIENT_ID?: string;
	GOOGLE_CLIENT_SECRET?: string;
	APPLE_CLIENT_ID?: string;
	APPLE_CLIENT_SECRET?: string;
}

