export interface CloudflareBindings {
	DATABASE: D1Database;
	/**
	 * SQL binding backed by R2 (libSQL-compatible). Prefer this for new data access paths.
	 * Falls back to DATABASE when unavailable for local/dev runs.
	 */
	R2_SQL?: D1Database;
	// DB is aliased from DATABASE in code for expo-auth-template compatibility
	QUESTS: KVNamespace;
	AUTH_SESSIONS?: KVNamespace;
	ASSETS?: Fetcher; // Worker with Assets binding

	// Partykit runtime configuration
	PARTYKIT_HOST?: string;
	PARTYKIT_PUBLIC_URL?: string;
	PARTYKIT_SECRET?: string;

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
