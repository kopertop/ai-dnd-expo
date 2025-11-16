# Multiplayer Setup Guide

## Quick Start

To run both the Expo app and the Cloudflare Worker API:

```bash
bun run start:full
```

This will start:
1. Cloudflare Worker on `http://localhost:8787`
2. Expo dev server (default port)

## Separate Commands

If you prefer to run them separately:

**Terminal 1 - Worker:**
```bash
bun run start:worker
```

**Terminal 2 - Expo:**
```bash
bun start
```

## Worker Setup

1. Navigate to workers directory:
```bash
cd workers
```

2. Install dependencies:
```bash
bun install
```

3. Copy environment variables:
```bash
cp .dev.vars.example .dev.vars
```

4. Edit `.dev.vars` with your settings:
```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
ADMIN_EMAILS=kopertop@gmail.com,cmoyer@newstex.com
```

## Environment Variables

### Frontend (.env in project root)
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8787
```

### Worker (workers/.dev.vars)
```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
ADMIN_EMAILS=kopertop@gmail.com,cmoyer@newstex.com
```

## Troubleshooting

### Worker not starting
- Make sure you're in the `workers` directory
- Check that `wrangler` is installed: `bun install` in workers directory
- Verify `wrangler.toml` is configured correctly

### API connection errors
- Ensure worker is running on port 8787
- Check `EXPO_PUBLIC_API_BASE_URL` matches worker URL
- Verify CORS is enabled (already configured in worker)

### Ollama connection issues
- Ensure Ollama is running: `ollama serve`
- Verify `OLLAMA_BASE_URL` in `.dev.vars` matches your Ollama instance
- Test Ollama directly: `curl http://localhost:11434/api/tags`

