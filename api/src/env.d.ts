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
	IMAGES_BUCKET: R2Bucket;
	R2_PUBLIC_URL?: string; // Public URL for R2 bucket (e.g., https://images.dnd.coredumped.org)

	// Partykit runtime configuration
	PARTYKIT_HOST?: string;
	PARTYKIT_PUBLIC_URL?: string;
	PARTYKIT_SECRET?: string;

	GameRoom: DurableObjectNamespace;

	OLLAMA_BASE_URL: string;
	OLLAMA_MODEL: string;
	ADMIN_EMAILS: string;

	AUTH_SECRET: string;
	AUTH_URL?: string;
	GOOGLE_CLIENT_ID?: string;
	GOOGLE_CLIENT_SECRET?: string;

	API_RATE_LIMITER?: any; // RateLimit binding
}

declare global {
	namespace NodeJS {
		// Allow accessing bindings in scripts/CLI helpers
		// eslint-disable-next-line @typescript-eslint/no-empty-interface
		interface ProcessEnv extends CloudflareBindings {}
	}
}
