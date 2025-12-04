# Local Development Setup

This guide will help you set up the AI D&D project for local development from a fresh checkout.

## Prerequisites

- **Bun** (v1.2.18+) - [Install Bun](https://bun.sh)
- **Node.js** (22+ LTS) - Required for some tooling
- **Wrangler CLI** - Installed via `bun install` (included in devDependencies)
- **Expo CLI** - Installed via `bun install` (included in dependencies)

## Quick Setup

### 1. Install Dependencies

```bash
bun install
```

This will:
- Install all npm packages
- Run postinstall scripts (applies patches)
- Set up the project

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
EXPO_PUBLIC_API_BASE_URL=http://localhost:8787

# Google OAuth (Required for authentication)
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_REDIRECT_URI_IOS=ai-dnd://oauth
EXPO_PUBLIC_GOOGLE_REDIRECT_URI_WEB=http://localhost:8081/auth

# Optional: Ollama Configuration (for web platform AI)
EXPO_PUBLIC_OLLAMA_BASE_URL=http://localhost:11434
EXPO_PUBLIC_OLLAMA_MODEL=llama3.2
EXPO_PUBLIC_OLLAMA_API_KEY=

# Optional: TTS Configuration
EXPO_PUBLIC_TTS_BASE_URL=http://localhost:5000
```

**Note:** You'll need to create a Google OAuth Client ID at [Google Cloud Console](https://console.cloud.google.com/):
1. Create a new project or select existing
2. Enable Google+ API
3. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
4. Add redirect URIs:
   - iOS: `ai-dnd://oauth`
   - Web: `http://localhost:8081/auth` (for development)

### 3. Set Up Local Database

Run database migrations to create the schema:

```bash
bun run db:migrate:dev
```

This will:
- Create the local D1 database
- Run `0000_initial.sql` (game tables)
- Run `0001_auth.sql` (authentication tables from expo-auth-template)

### 4. Start the Development Server

You have two options:

#### Option A: Full Stack (API + Frontend)

```bash
bun run start:full
```

This starts both the Cloudflare Workers API and the Expo dev server.

#### Option B: Separate Terminals

**Terminal 1 - API Server:**
```bash
bun run dev
```
This starts the Cloudflare Workers API at `http://localhost:8787`

**Terminal 2 - Expo Frontend:**
```bash
bun start
# or
bun run web  # for web only
```

### 5. Access the Application

- **Web**: Open `http://localhost:8081` in your browser
- **iOS Simulator**: Press `i` in the Expo CLI
- **Android Emulator**: Press `a` in the Expo CLI
- **Physical Device**: Scan the QR code with Expo Go app

## Database Commands

- **Run migrations (local)**: `bun run db:migrate:dev`
- **Run migrations (production)**: `bun run db:migrate:prod`
- **View local database**: `wrangler d1 execute DATABASE --local --command "SELECT * FROM users"`

## Troubleshooting

### Database Issues

If you get database errors:
1. Make sure migrations ran: `bun run db:migrate:dev`
2. Check wrangler.toml has correct database configuration
3. Try resetting local database: Delete `.wrangler/state` folder and re-run migrations

### Authentication Issues

If sign-in doesn't work:
1. Verify `EXPO_PUBLIC_GOOGLE_CLIENT_ID` is set correctly
2. Check redirect URIs match in Google Cloud Console
3. Ensure API server is running (`bun run dev`)
4. Check browser console for OAuth errors

### Port Conflicts

If ports are already in use:
- **8787** (API): Change in `wrangler.toml` or set `PORT` env var
- **8081** (Expo): Expo will automatically find another port

## Next Steps

- Read [README.md](./README.md) for more details
- Check [MULTIPLAYER-SETUP.md](./MULTIPLAYER-SETUP.md) for multiplayer features
- See [AUTH-SETUP.md](./AUTH-SETUP.md) for authentication details

