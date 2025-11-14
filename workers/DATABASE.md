# Database Migration Guide

## Quick Start

1. **Create the D1 database** (first time only):
   ```bash
   cd workers
   bun run db:create
   ```
   Copy the database ID and update `wrangler.toml` with the actual IDs.

2. **Run migrations locally**:
   ```bash
   bun run db:migrate
   ```

3. **Run migrations on remote/production**:
   ```bash
   bun run db:migrate:remote
   ```

## Database Schema

The database stores:
- **Games**: All game sessions with invite codes
- **Characters**: Player characters (reusable across games, linked by email)
- **Game Players**: Links players to games with their characters
- **Game States**: Current state of active games (for resuming)

## Email Collection

Both host and join flows now collect email addresses:
- **Host**: Email collected before quest selection
- **Join**: Email collected after entering invite code, before character creation

Emails are used to:
- Link characters to players for resuming games
- Allow players to reuse characters across games
- Enable future features like game history and notifications

## Migration Files

Migrations are stored in `workers/migrations/` and are applied in order:
- `0001_initial_schema.sql` - Creates all tables

To add a new migration:
1. Create `0002_description.sql` in the migrations folder
2. Write your SQL (use `IF NOT EXISTS` for idempotency)
3. Test locally: `bun run db:migrate`
4. Apply remotely: `bun run db:migrate:remote`

