/**
 * TypeScript wrapper for better-auth-cloudflare/client
 * Works around Metro bundler's package.json exports limitation
 */

// Use dynamic require for Metro compatibility
 
const cloudflareClientModule = require('better-auth-cloudflare/dist/client.cjs');

export const cloudflareClient = cloudflareClientModule.cloudflareClient;


