# Multiplayer API Worker

Cloudflare Workers backend for the multiplayer D&D system.

## Setup

1. Install dependencies:
```bash
cd workers
bun install
```

2. Copy environment variables:
```bash
cp .dev.vars.example .dev.vars
```

3. Update `.dev.vars` with your configuration (Ollama URL, admin emails, etc.)

## Development

Run the worker locally:
```bash
bun run dev
```

This will start the worker on `http://localhost:8787` by default.

## Deployment

Deploy to Cloudflare:
```bash
bun run deploy
```

Make sure to set environment variables in Cloudflare Dashboard:
- `OLLAMA_BASE_URL` - Your Ollama instance URL
- `OLLAMA_MODEL` - Model name (default: llama3.2)
- `ADMIN_EMAILS` - Comma-separated admin email addresses

## KV Namespace Setup

Before deploying, create a KV namespace for quests:

```bash
wrangler kv:namespace create "QUESTS"
wrangler kv:namespace create "QUESTS" --preview
```

Update `wrangler.toml` with the returned namespace IDs.

