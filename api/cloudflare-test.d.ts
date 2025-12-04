/// <reference types="@cloudflare/vitest-pool-workers" />

declare module 'cloudflare:test' {
	import type { CloudflareBindings } from '@/api/src/env';

	export const env: CloudflareBindings;
	export const SELF: Service<CloudflareBindings>;
}

