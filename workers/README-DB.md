# Database Setup and Migrations

This project uses Cloudflare D1 (SQLite-compatible) database for persistent storage of games, characters, and players.

## Initial Setup

1. **Create the database** (first time only):
   ```bash
   cd workers
   bun run db:create
   ```
   This will create a D1 database named `ai-dnd-db`. Note the database ID that's returned.

2. **Update wrangler.toml** with the actual database ID:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "ai-dnd-db"
   database_id = "your-actual-database-id-here"  # Replace this
   preview_database_id = "your-preview-database-id-here"  # Replace this
   ```

## Running Migrations

### Local Development

To apply migrations to your local development database:

```bash
cd workers
bun run db:migrate
```

This will:
- Read all `.sql` files from the `migrations/` directory
- Apply them in order (sorted by filename)
- Track applied migrations in a `schema_migrations` table

### Production/Remote

To apply migrations to your remote/production database:

```bash
cd workers
bun run db:migrate:remote
```

**Important**: Always test migrations locally first!

## Creating New Migrations

1. Create a new SQL file in `workers/migrations/` with the format:
   ```
   NNNN_description.sql
   ```
   Where `NNNN` is a sequential number (e.g., `0002_add_indexes.sql`)

2. Write your SQL migration:
   ```sql
   -- Example: Add a new column
   ALTER TABLE games ADD COLUMN notes TEXT;
   ```

3. Test locally:
   ```bash
   bun run db:migrate
   ```

4. Apply to production when ready:
   ```bash
   bun run db:migrate:remote
   ```

## Database Schema

The initial schema (`0001_initial_schema.sql`) includes:

- **games**: Game sessions with invite codes
- **characters**: Player characters (reusable across games)
- **game_players**: Links players to games with their characters
- **game_states**: Current state of active games

## Database Helper

The `src/db.ts` file provides a `Database` class with helper methods for common operations:

```typescript
const db = new Database(env.DB);
await db.createGame({ ... });
await db.createCharacter({ ... });
await db.addPlayerToGame({ ... });
```

## Notes

- Migrations are idempotent - they can be run multiple times safely (use `IF NOT EXISTS`, etc.)
- The migration script uses `wrangler d1 execute` under the hood
- Local migrations use `--local` flag, remote migrations don't

