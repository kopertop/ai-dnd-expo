#!/usr/bin/env bun
/**
 * Simplified migration script that uses wrangler d1 execute directly
 * This is a fallback if the TypeScript version has issues
 */

import { readdir } from 'fs/promises';
import { join } from 'path';


const MIGRATIONS_DIR = join(import.meta.dir, '..', 'migrations');
const isRemote = process.argv.includes('--remote');

async function main() {
	console.log(`Running migrations for ${isRemote ? 'remote' : 'local'} database...`);
	
	const files = await readdir(MIGRATIONS_DIR);
	const migrations = files
		.filter(f => f.endsWith('.sql'))
		.sort();
	
	if (migrations.length === 0) {
		console.log('No migrations found');
		return;
	}
	
	console.log(`Found ${migrations.length} migration(s)`);
	
	for (const filename of migrations) {
		const filepath = join(MIGRATIONS_DIR, filename);
		console.log(`\nApplying ${filename}...`);
		
		try {
			const command = isRemote
				? ['wrangler', 'd1', 'execute', 'ai-dnd-db', '--file', filepath]
				: ['wrangler', 'd1', 'execute', 'ai-dnd-db', '--local', '--file', filepath];
			
			const proc = Bun.spawn(command, {
				cwd: join(import.meta.dir, '..'),
				stdout: 'inherit',
				stderr: 'inherit',
			});
			
			await proc.exited;
			
			if (proc.exitCode === 0) {
				console.log(`✓ Applied ${filename}`);
			} else {
				console.error(`✗ Failed to apply ${filename} (exit code: ${proc.exitCode})`);
			}
		} catch (error: any) {
			console.error(`✗ Error applying ${filename}:`, error.message);
		}
	}
	
	console.log('\n✓ Migration process completed');
}

main().catch(console.error);

