# Deployment Guide

This document outlines the deployment process for the AI D&D Platform.

## 🚀 Overview

The project is deployed across two main components on Cloudflare:
1. **Cloudflare Pages**: Serves the static web application (HTML, JS, CSS, assets) with optimal caching.
2. **Cloudflare Workers API**: A dedicated Worker handling all API requests (`/api/*`), WebSockets, and database interactions.

Both components are served under the same domain: `dnd.coredumped.org`.
- `dnd.coredumped.org` -> Cloudflare Pages (Static Content)
- `dnd.coredumped.org/api/*` -> Routed via Pages Service Bindings to the API Worker.

The project uses **Expo Application Services (EAS)** for building mobile apps, and **GitHub Actions** for automated CI/CD workflows.

### Deployment Environments

- **Development**: Local development builds and testing
- **Staging**: Internal testing and QA environment
- **Production**: Live app store releases and web deployment

## 🔧 Setup Requirements

### Prerequisites

1. **EAS CLI Installation**

   ```bash
   npm install -g eas-cli
   ```

2. **Expo Account**
   - Create account at [expo.dev](https://expo.dev)
   - Run `eas login` to authenticate

3. **Cloudflare Account**
   - Access to Cloudflare dashboard for Pages and Workers.
   - `wrangler` CLI authenticated (`npx wrangler login`).

4. **Environment Variables**
   - Copy `.env.example` to `.env` and configure
   - Set up GitHub Secrets for CI/CD (see below)

### GitHub Secrets Configuration

Add these secrets to your GitHub repository:

1. **EXPO_TOKEN**: Personal access token from Expo
   - Generate at: https://expo.dev/accounts/[account]/settings/access-tokens
   - Add to GitHub: Settings > Secrets and variables > Actions

2. **Apple Developer Account** (for iOS builds)
   - Apple ID and Team ID
   - Configure in `eas.json`

3. **Google Play Console** (for Android builds)
   - Service account key
   - Configure in `eas.json`

## 🏗️ Build Profiles

### Development Profile

- **Purpose**: Local development and testing
- **Distribution**: Internal only
- **Development Client**: Enabled
- **Command**: `eas build --profile development`

### Staging Profile

- **Purpose**: Internal testing and QA
- **Distribution**: Internal testers
- **Updates**: Enabled via `staging` branch
- **Command**: `eas build --profile staging`

### Production Profile

- **Purpose**: App store releases
- **Distribution**: App stores
- **Updates**: Enabled via `production` branch
- **Command**: `eas build --profile production`

## 🔄 CI/CD Workflow

### Automated Workflows

1. **Pull Request**:
   - Run tests and linting
   - Build development version
   - No deployment

2. **Push to `develop` branch**:
   - Run tests
   - Publish staging update
   - Build staging version

3. **Push to `main` branch**:
   - Run tests
   - Publish production update
   - Build production version
   - Ready for app store submission

### Manual Workflows

Use the deployment script for manual deployments:

```bash
# Deploy to development
./scripts/deploy.sh deploy development

# Deploy to staging
./scripts/deploy.sh deploy staging

# Deploy to production
./scripts/deploy.sh deploy production

# Submit to app stores
./scripts/deploy.sh submit production
```

## 📱 Platform-Specific Builds

### iOS Builds

- Requires Apple Developer account
- Code signing handled by EAS
- TestFlight for staging distribution

### Android Builds

- Google Play Console integration
- Internal testing track for staging
- Production track for releases

### Web Builds (Cloudflare Pages + Workers)

The web deployment consists of two parts:

1. **Static Content (Pages)**: Built via `expo export --platform web`. Deployed to Cloudflare Pages.
2. **API (Worker)**: Deployed to Cloudflare Workers using `wrangler.api.toml`.

#### Web Deployment Commands

```bash
# Deploy everything (Web + API)
bun run deploy

# Deploy Web only (Pages)
bun run deploy:web

# Deploy API only (Worker)
bun run deploy:api
```

## 🌐 Web Architecture & Routing

We use a split architecture to optimize performance and security:

- **Static Content**: Served by Cloudflare Pages (`wrangler.toml`). This ensures long-term caching for assets and fast delivery of HTML/JS/CSS.
- **API**: Served by a Cloudflare Worker (`wrangler.api.toml`). Handles all dynamic logic, DB access, and WebSockets.

### Routing Strategy

All traffic goes to `dnd.coredumped.org`.
- Requests starting with `/api/*` are intercepted by a Cloudflare Pages Function (`functions/api/[[path]].ts`).
- This function uses **Service Bindings** to forward the request directly to the API Worker (`ai-dnd-api`).
- Partykit/WebSocket endpoints are served at `/party/*` and routed to the same Worker (see `wrangler.api.toml` routes).
- All forwarding stays inside Cloudflare's network (no extra HTTP hop).

### Local Development

To develop locally with the full stack (Web + API):

```bash
# Start both Web (Expo) and API (Wrangler) in dev mode
bun run dev

# Or run individually:
bun run dev:api  # Starts API worker at http://localhost:8787
bun run dev:web  # Starts Expo web at http://localhost:8081
```

### First-Time Rollout Checklist (split deployment)
1. **Deploy API first** so the service binding target exists:
   ```bash
   bun run deploy:api
   ```
2. **Deploy Web (Pages)**:
   ```bash
   bun run deploy:web
   ```
3. **Verify Service Binding**: In Cloudflare Pages → Functions → Service Bindings, ensure `API_WORKER` points to `ai-dnd-api`.
4. **Verify Routes**: In `wrangler.api.toml`, routes cover both `/api/*` and `/party/*` on `dnd.coredumped.org`.

## 🛡️ Denial of Wallet (DoW) Protection

To prevent abuse and unexpected costs, we implement several layers of protection:

1. **Rate Limiting**:
   - Configured in `wrangler.api.toml` via `[[ratelimits]]`. Namespace IDs are self-assigned positive integers (e.g., `namespace_id = 1001`); no dashboard setup needed.
   - Default limit: 1000 requests per minute per IP (see middleware in `api/src/index.ts`). Tighten per-endpoint as needed.

2. **Worker Limits** (`wrangler.api.toml`):
   - `cpu_ms = 50`: Caps CPU time per request.
   - `subrequests = 1000`: Limits internal subrequests.
   - `memory_mb = 128`: Limits memory usage.

3. **Request Size Limits**:
   - API rejects requests larger than 10MB to prevent memory exhaustion.

## 🤝 Team Workflow

### Roles & Responsibilities

- **Developers**: Feature development and testing
- **QA**: Staging environment testing
- **DevOps**: CI/CD maintenance and monitoring
- **Product**: Production deployment approval

### Communication

- Deployment notifications in team chat
- Status updates in project management
- Incident reports for failures

## 📚 Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)

---

_Last updated: 2025-05-20_
