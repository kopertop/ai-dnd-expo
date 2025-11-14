/**
 * TypeScript wrapper for better-auth/client
 * Works around Metro bundler's package.json exports limitation
 */

// Use dynamic require for Metro compatibility
// eslint-disable-next-line @typescript-eslint/no-require-imports
const betterAuthClient = require('better-auth/dist/client/index.cjs');

export const createAuthClient = betterAuthClient.createAuthClient;
export type { BetterAuthClientOptions } from 'better-auth';


