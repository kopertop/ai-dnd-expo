# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

**Project**: AI D&D platform with React Native/Expo using voice synthesis & image generation

**Primary Commands**:

- `npm run ios` - Start iOS simulator (primary testing method)
- `npm start` - Start Expo dev server
- `npm run check` - Run all typechecking, linting, and general "doctor" checks

**Testing Protocol**:

- Always verify server isn't running before starting new one
- Use AppleScript "tell application Simulator" for iOS testing
- Must take screenshots & interact to verify completion
- CRITICAL: Always test after assuming task completion

**Architecture**:

- Expo Router file-based routing in `/app`
- Themed components with light/dark mode
- Uses `@/` path aliases
- Key dirs: `/components`, `/hooks`, `/constants`, `/services`

**Working Features**:

- Tavern companion recruitment
- Voice chat with speech recognition/TTS
- AI DM with tool calling
- Location-aware quick actions

**Development Rules**:

- Edit existing files > create new ones
- No proactive documentation creation
- TypeScript strict mode
- ESLint with Expo config

## Additional Commands

- `npm run android` - Start with Android emulator
- `npm run web` - Start web version
- `npx expo run:android` - Build and run locally on Android
- `npx expo run:ios` - Build and run locally on iOS
- `npx expo prebuild` - Generate native code (for ejected projects)
- `npx testflight` - Build and deploy to testflight
- `npm run reset-project` - Moves current app to app-example and creates blank app directory
- `npx tsc` - Run TypeScript type checking without compilation

## Architecture

### File-Based Routing

- Uses Expo Router for navigation with automatic deep linking
- Route files are in `/app` directory - adding a file automatically creates a route
- `(tabs)` directory creates a tab navigator
- `_layout.tsx` files define nested layouts
- Supports lazy-evaluation and deferred bundling
- Universal navigation across Android, iOS, and web platforms

### Additional Directories

- `/assets` - Static assets (images, fonts)
- `/services` - API services and AI integrations (to be created)
- `/types` - TypeScript type definitions (to be created)
- `/utils` - Utility functions (to be created)

## Tech Stack

- Expo SDK ~53.0.17 with React Native 0.79.5
- TypeScript strict mode
- ESLint with Expo config
- Platform-specific code via file extensions (.ios.tsx, .web.ts)

## Expo Workflow Considerations

### Development Approaches

- **Expo Go**: Good for quick prototyping and testing simple features
- **Development Builds**: Required for native libraries, custom configurations, or production-ready testing
- **Local Development**: Use `npx expo run:[android|ios]` for local compilation
- **Cloud-Based**: Use EAS Build for cloud compilation without local native tooling

### When to Use Development Builds

- Need native libraries not included in Expo Go
- Testing app-specific configurations (icons, splash screens)
- Implementing push notifications or universal links
- Production-ready development environment

## AI D&D Platform Context

### Core AI Services Integration

- **Resemble.ai**: Voice synthesis for character dialogue and narration
- **Flux.dev**: Dynamic image generation for characters, scenes, and items
- **OpenAI/Anthropic**: Conversation AI for DM, NPCs, and player companions
- **Custom AI**: D&D rule enforcement and game mechanics

### Key AI Agent Types

1. **Dungeon Master AI**: Story generation, world management, rule enforcement
2. **NPC AI**: Character dialogue, personality simulation, voice synthesis
3. **Player Character AI**: Companion characters for solo play
4. **Rule Advisor AI**: D&D 5e rule lookup and mechanics assistance

### Development Priorities

- Implement AI service integrations in `/services/ai/`
- Create D&D 5e rule engine in `/services/game/`
- Build character management system
- Develop real-time multiplayer infrastructure
- Integrate voice and image generation APIs

### Important Files for Development

- `AI-INSTRUCTIONS.md` - Comprehensive AI development guidelines
- `TODO.md` - Detailed development roadmap and feature planning
- `/components/tavern-companion-recruitment.tsx` - Functional companion system
- `/hooks/use-simple-companions.ts` - Companion management logic
