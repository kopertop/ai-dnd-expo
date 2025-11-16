#!/usr/bin/env bun
/**
 * Database migration script for D1 database
 * Usage:
 *   bun run scripts/migrate.ts          # Apply migrations to local DB
 *   bun run scripts/migrate.ts --remote # Apply migrations to remote DB
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';


const MIGRATIONS_DIR = join(import.meta.dir, '..', 'migrations');
const isRemote = process.argv.includes('--remote');

async function getMigrations(): Promise<string[]> {
	const files = await readdir(MIGRATIONS_DIR);
	return files
		.filter(f => f.endsWith('.sql'))
		.sort(); // Sort by filename (0001, 0002, etc.)
}

async function getAppliedMigrations(db: any): Promise<Set<string>> {
	try {
		// Check if migrations table exists
		const result = await db.prepare(
			"SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'",
		).first();
		
		if (!result) {
			// Create migrations table
			await db.exec(`
				CREATE TABLE IF NOT EXISTS schema_migrations (
					version TEXT PRIMARY KEY,
					applied_at INTEGER NOT NULL
				)
			`);
			return new Set();
		}
		
		const migrations = await db.prepare('SELECT version FROM schema_migrations').all();
		return new Set(migrations.results.map((m: any) => m.version));
	} catch (error) {
		console.error('Error checking migrations:', error);
		return new Set();
	}
}

async function applyMigration(db: any, filename: string, sql: string): Promise<void> {
	console.log(`Applying migration: ${filename}`);
	
	try {
		// Execute migration in a transaction
		await db.exec('BEGIN TRANSACTION');
		await db.exec(sql);
		
		// Record migration
		const version = filename.replace('.sql', '');
		await db.prepare(
			'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
		).bind(version, Date.now()).run();
		
		await db.exec('COMMIT');
		console.log(`✓ Applied ${filename}`);
	} catch (error) {
		await db.exec('ROLLBACK');
		console.error(`✗ Failed to apply ${filename}:`, error);
		throw error;
	}
}

async function main() {
	console.log(`Running migrations for ${isRemote ? 'remote' : 'local'} database...`);
	
	const migrations = await getMigrations();
	if (migrations.length === 0) {
		console.log('No migrations found');
		return;
	}
	
	console.log(`Found ${migrations.length} migration(s)`);
	
	// Use wrangler to execute SQL
	// For local: wrangler d1 execute ai-dnd-db --local --file=...
	// For remote: wrangler d1 execute ai-dnd-db --file=...
	
	for (const filename of migrations) {
		const filepath = join(MIGRATIONS_DIR, filename);
		const sql = await readFile(filepath, 'utf-8');
		
		const version = filename.replace('.sql', '');
		console.log(`\nProcessing ${version}...`);
		
		try {
			// Use wrangler CLI to execute migration
			const command = isRemote
				? `wrangler d1 execute ai-dnd-db --file=${filepath}`
				: `wrangler d1 execute ai-dnd-db --local --file=${filepath}`;
			
			const proc = Bun.spawn(command.split(' '), {
				cwd: join(import.meta.dir, '..'),
				stdout: 'pipe',
				stderr: 'pipe',
			});
			
			const output = await new Response(proc.stdout).text();
			const error = await new Response(proc.stderr).text();
			
			if (proc.exitCode !== 0) {
				console.error(`Error executing migration ${filename}:`, error);
				// Check if migration was already applied
				if (error.includes('already exists') || error.includes('duplicate')) {
					console.log(`  Migration ${version} may already be applied, skipping...`);
					continue;
				}
				throw new Error(`Migration failed: ${error}`);
			}
			
			console.log(`✓ Applied ${filename}`);
		} catch (error: any) {
			console.error(`✗ Failed to apply ${filename}:`, error.message);
			// Continue with other migrations
		}
	}
	
	console.log('\n✓ All migrations completed');
}

main().catch(console.error);

