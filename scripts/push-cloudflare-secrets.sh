#!/usr/bin/env bash

# Push Cloudflare Worker secrets by reading values from .env and .dev.vars.
# .dev.vars overrides .env when both define the same key.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILES=("$ROOT_DIR/.env" "$ROOT_DIR/.dev.vars")
WRANGLER_ENV="${1:-}"

if ! command -v wrangler >/dev/null 2>&1; then
	echo "wrangler CLI is required but not found in PATH" >&2
	exit 1
fi

read_env_vars() {
	ROOT_DIR="$ROOT_DIR" python3 - <<'PY'
from pathlib import Path
import json
import os

root = Path(os.environ["ROOT_DIR"])
files = [root / ".env", root / ".dev.vars"]

def load_env(path: Path) -> dict[str, str]:
	data: dict[str, str] = {}
	if not path.exists():
		return data
	for raw in path.read_text().splitlines():
		line = raw.strip()
		if not line or line.startswith("#") or "=" not in line:
			continue
		key, value = line.split("=", 1)
		data[key.strip()] = value.strip().strip('"').strip("'")
	return data

merged: dict[str, str] = {}
for path in files:
	merged.update(load_env(path))

# Fallback to process environment variables for any keys not present in files
for key, value in os.environ.items():
	merged.setdefault(key, value)

# Map target secret names to possible source keys (in priority order)
key_map = {
	"AUTH_SECRET": ["AUTH_SECRET", "JWT_SECRET"],
	"GOOGLE_CLIENT_ID": ["GOOGLE_CLIENT_ID"],
	"GOOGLE_CLIENT_SECRET": ["GOOGLE_CLIENT_SECRET"],
	"OLLAMA_BASE_URL": ["OLLAMA_BASE_URL"],
	"OLLAMA_MODEL": ["OLLAMA_MODEL"],
	"OLLAMA_API_KEY": ["OLLAMA_API_KEY"],
	"ADMIN_EMAILS": ["ADMIN_EMAILS"],
}

secrets: dict[str, str] = {}
for target, sources in key_map.items():
	for source in sources:
		if source in merged:
			secrets[target] = merged[source]
			break

print(json.dumps(secrets))
PY
}

SECRETS_JSON="$(read_env_vars)"

get_secret_value() {
	local key="$1"
	python3 - <<'PY' "$SECRETS_JSON" "$key"
import json, sys
secrets = json.loads(sys.argv[1])
key = sys.argv[2]
print(secrets.get(key, ""))
PY
}

put_secret() {
	local name="$1"
	local value="$2"

	if [[ -z "$value" ]]; then
		echo "Skipping $name (no value found in .env/.dev.vars)" >&2
		return
	fi

	if [[ -n "$WRANGLER_ENV" ]]; then
		printf "%s" "$value" | wrangler secret put "$name" --env "$WRANGLER_ENV"
	else
		printf "%s" "$value" | wrangler secret put "$name"
	fi
}

main() {
	declare -a required_secrets=(
		AUTH_SECRET
		GOOGLE_CLIENT_ID
		GOOGLE_CLIENT_SECRET
		OLLAMA_BASE_URL
		OLLAMA_MODEL
		ADMIN_EMAILS
	)

	# Optional: only pushed if present
	declare -a optional_secrets=(OLLAMA_API_KEY)

	for name in "${required_secrets[@]}"; do
		value="$(get_secret_value "$name")"
		if [[ -z "$value" ]]; then
			echo "ERROR: $name is missing in .env/.dev.vars" >&2
			continue
		fi
		put_secret "$name" "$value"
	done

	for name in "${optional_secrets[@]}"; do
		value="$(get_secret_value "$name")"
		if [[ -z "$value" ]]; then
			echo "Skipping optional $name (no value found)" >&2
			continue
		fi
		put_secret "$name" "$value"
	done
}

main
