export interface CloudflareBindings {
	DATABASE: D1Database;
	GAME_SESSION: DurableObjectNamespace;
	QUESTS: KVNamespace;
	AUTH_SESSIONS?: KVNamespace;

	OLLAMA_BASE_URL: string;
	OLLAMA_MODEL: string;
	ADMIN_EMAILS: string;

	AUTH_SECRET: string;
	AUTH_URL?: string;
	GOOGLE_CLIENT_ID?: string;
	GOOGLE_CLIENT_SECRET?: string;
}

declare global {
	namespace NodeJS {
		// Allow accessing bindings in scripts/CLI helpers
		// eslint-disable-next-line @typescript-eslint/no-empty-interface
		interface ProcessEnv extends CloudflareBindings {}
	}
}
