export interface CloudflareBindings {
	DATABASE: D1Database;
	// DB is aliased from DATABASE in code for expo-auth-template compatibility
	QUESTS: KVNamespace;
	AUTH_SESSIONS?: KVNamespace;
	ASSETS?: Fetcher; // Worker with Assets binding

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
