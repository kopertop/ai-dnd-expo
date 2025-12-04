#!/bin/bash

# Start both Expo and Cloudflare Worker in parallel

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Starting development servers..."
echo "Expo will run on default port"
echo "Worker will run on http://localhost:8787"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Start API worker in background (from project root)
(bun run dev) &
WORKER_PID=$!

# Wait a moment for worker to start
sleep 2

# Start Expo (foreground) - we're already in project root
bun run start

# Cleanup on exit
trap "kill $WORKER_PID 2>/dev/null" EXIT

