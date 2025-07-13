# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-powered Dungeons & Dragons platform built with React Native/Expo. The project enables players to experience D&D with AI-powered Dungeon Masters, NPCs, and companion characters. It features voice synthesis via Resemble.ai and dynamic image generation through Flux.dev, supporting both solo and multiplayer gameplay across mobile, web, and future desktop platforms.

## Development Commands

### Core Commands
- `npm start` or `npx expo start` - Start the Expo development server
- `npm run android` - Start with Android emulator
- `npm run ios` - Start with iOS simulator  
- `npm run web` - Start web version
- `npm run lint` - Run ESLint

### Native Build Commands
- `npx expo run:android` - Build and run locally on Android
- `npx expo run:ios` - Build and run locally on iOS
- `npx expo prebuild` - Generate native code (for ejected projects)
- `npx testflight` - Build and deploy to testflight

### Project Reset
- `npm run reset-project` - Moves current app to app-example and creates blank app directory

### Type Checking
- `npx tsc` - Run TypeScript type checking without compilation

## Architecture

### File-Based Routing
- Uses Expo Router for navigation with automatic deep linking
- Route files are in `/app` directory - adding a file automatically creates a route
- `(tabs)` directory creates a tab navigator
- `_layout.tsx` files define nested layouts
- Supports lazy-evaluation and deferred bundling
- Universal navigation across Android, iOS, and web platforms

### Key Directories
- `/app` - Route components and layouts
- `/components` - Reusable UI components
- `/hooks` - Custom React hooks
- `/constants` - App constants (Colors, etc.)
- `/assets` - Static assets (images, fonts)
- `/services` - API services and AI integrations (to be created)
- `/types` - TypeScript type definitions (to be created)
- `/utils` - Utility functions (to be created)

### Theming System
- Light/dark mode support via `useColorScheme` hook
- Colors defined in `/constants/colors.ts`
- `ThemedText` and `ThemedView` components for theme-aware UI
- `useThemeColor` hook for accessing theme colors

### Component Patterns
- Themed components extend base React Native components with light/dark color props
- Uses `@/` path alias for absolute imports
- Platform-specific styling with `Platform.select()`

## Key Files
- `app/_layout.tsx` - Root layout with theme provider
- `app/(tabs)/_layout.tsx` - Tab navigation layout
- `components/themed-text.tsx` & `components/themed-view.tsx` - Core themed components
- `hooks/use-theme-colors.ts` - Theme color resolution
- `constants/colors.ts` - Color definitions
- `tsconfig.json` - TypeScript config with path aliases

## Development Notes
- Uses Expo SDK ~53.0.17 with React Native 0.79.5
- TypeScript strict mode enabled
- ESLint configured with Expo config
- Font loading handled in root layout
- Platform-specific code supported via file extensions (.ios.tsx, .web.ts)

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

### TypeScript Best Practices
- Use `.tsx` for React components, `.ts` for non-JSX files
- Leverage path aliases (`@/*`) for cleaner imports
- Run `npx tsc` for type checking
- Extend `expo/tsconfig.base` configuration

### ESLint Configuration
- Uses Flat config format (SDK 53+)
- Extends `eslint-config-expo`
- Add `.eslintignore` for performance optimization
- Consider adding Prettier integration for consistent formatting

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

### Important Files for AI Development
- `AI-INSTRUCTIONS.md` - Comprehensive AI development guidelines
- `TODO.md` - Detailed development roadmap and feature planning
- `OVERNIGHT-PROGRESS.md` - Status of overnight development work (cleaned up)
- `COMPANION-DEMO.md` - Working tavern companion recruitment system
- `/components/tavern-companion-recruitment.tsx` - Functional companion system
- `/hooks/use-simple-companions.ts` - Companion management logic
- Future: `/services/ai/agents/` - AI agent implementations
- Future: `/services/ai/prompts/` - Prompt templates and management

### Current Working Features
- **Tavern Companion Recruitment** - Fully integrated with DM chat interface
- **Location-aware Quick Actions** - Context-sensitive DM chat buttons
- **Companion Management** - Party system with persistence
- **Voice Chat** - Real-time speech recognition and TTS
- **DM Agent** - AI-powered dungeon master with tool calling
