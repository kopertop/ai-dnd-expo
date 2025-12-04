import type { CloudflareBindings } from '../env';

import { Database } from '@/shared/workers/db';

/**
 * Resolve the SQL binding, preferring the R2-hosted database when available.
 */
export function resolveSqlBinding(env: CloudflareBindings): D1Database {
	return env.R2_SQL ?? env.DATABASE;
}

/**
 * Create a Database instance backed by the preferred SQL binding.
 */
export function createDatabase(env: CloudflareBindings): Database {
	return new Database(resolveSqlBinding(env));
}
