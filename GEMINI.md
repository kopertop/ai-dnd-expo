# GEMINI.md

This document provides specific guidance for Gemini when contributing to the AI D&D Platform development.

## 🎯 Project Mission

Create an immersive, AI-powered Dungeons & Dragons platform that seamlessly blends human creativity with AI assistance. The platform should feel natural, engaging, and accessible to both D&D veterans and newcomers.

## 🏗️ Architecture Principles

### Core Design Philosophy
- **AI-First**: Every feature should consider AI integration from the start
- **Modular AI**: AI agents should be composable and replaceable
- **Human-Centric**: AI enhances human experience, never replaces human agency
- **Cross-Platform**: Universal experience across mobile, web, and future desktop

### File-Based Routing
- Uses Expo Router for navigation with automatic deep linking.
- Route files are in `/app` directory - adding a file automatically creates a route.
- `(tabs)` directory creates a tab navigator.
- `_layout.tsx` files define nested layouts.

### Key Directories
- `/app`: Route components and layouts.
- `/components`: Reusable UI components.
- `/hooks`: Custom React hooks.
- `/constants`: App constants (Colors, etc.).
- `/assets`: Static assets (images, fonts).
- `/services`: API services and AI integrations (to be created).
- `/types`: TypeScript type definitions (to be created).
- `/utils`: Utility functions (to be created).

### Theming System
- Light/dark mode support via `useColorScheme` hook.
- Colors defined in `/constants/Colors.ts`.
- `ThemedText` and `ThemedView` components for theme-aware UI.
- `useThemeColor` hook for accessing theme colors.

### Component Patterns
- Themed components extend base React Native components with light/dark color props.
- Uses `@/` path alias for absolute imports.
- Platform-specific styling with `Platform.select()`.

## 🛠️ Development Guidelines

### Development Commands
- `npm start` or `npx expo start`: Start the Expo development server.
- `npm run android`: Start with Android emulator.
- `npm run ios`: Start with iOS simulator.
- `npm run web`: Start web version.
- `npm run lint`: Run ESLint.
- `npx tsc`: Run TypeScript type checking without compilation.
- `npm run reset-project`: Moves current app to app-example and creates blank app directory.
- `npm test`: Run Jest tests.

### AI Integration
- **Core AI Services**: Resemble.ai (voice synthesis), Flux.dev (image generation), OpenAI/Anthropic (conversation AI).
- **AI Agent Types**: Dungeon Master AI, NPC AI, Player Character AI, Rule Advisor AI.
- **Implementation Guidelines**:
    - Use context-aware prompt engineering.
    - Maintain story consistency.
    - Balance challenge and fun.
    - Provide clear, actionable descriptions.
    - Maintain consistent character personality for PC-AI.
    - Generate contextual dialogue for NPC-AI.
    - Reference official D&D 5e rules for Rule Advisor AI.

### Code Organization (Planned)
```
services/
├── ai/
│   ├── agents/          # AI agent implementations
│   ├── prompts/         # Prompt templates and management
│   ├── voice/           # Resemble.ai integration
│   ├── images/          # Flux.dev integration
│   └── providers/       # AI service providers (OpenAI, Anthropic)
├── game/
│   ├── rules/           # D&D rule engine
│   ├── state/           # Game state management
│   ├── dice/            # Dice rolling and probability
│   └── combat/          # Combat mechanics
├── multiplayer/
│   ├── rooms/           # Game room management
│   ├── sync/            # State synchronization
│   └── communication/   # Real-time messaging
└── storage/
    ├── characters/      # Character persistence
    ├── campaigns/       # Campaign data
    └── settings/        # User preferences
```

### TypeScript Conventions
- Use `.tsx` for React components, `.ts` for non-JSX files.
- Leverage path aliases (`@/*`) for cleaner imports.
- Run `npx tsc` for type checking.

## 🚀 Current Status & Priorities

### Project Status Overview
- **Current Phase**: Foundation Setup
- **Next Milestone**: Basic AI Integration

### Phase 1: Foundation & Setup (In Progress)
- [x] Project initialization with Expo
- [x] TypeScript configuration
- [x] ESLint and development tools
- [x] Basic project documentation
- [ ] CI/CD pipeline setup
- [ ] Environment configuration management
- [ ] Error tracking integration (Sentry)
- [ ] Create service layer architecture
- [ ] Set up state management (Redux Toolkit)
- [ ] Implement navigation structure
- [ ] Create basic UI theme system
- [ ] Set up testing framework
- [ ] Database schema design
- [ ] Character sheet component
- [ ] Dice roller component
- [ ] Chat interface component
- [ ] Game board/map component
- [ ] Inventory management component
- [ ] Settings/preferences component

## 🔑 Key Files

- `app/_layout.tsx`: Root layout with theme provider.
- `app/(tabs)/_layout.tsx`: Tab navigation layout.
- `components/ThemedText.tsx` & `components/ThemedView.tsx`: Core themed components.
- `hooks/useThemeColor.ts`: Theme color resolution.
- `constants/Colors.ts`: Color definitions.
- `tsconfig.json`: TypeScript config with path aliases.
- `package.json`: Project dependencies and scripts.
- `CLAUDE.md`: Guidance for Claude Code.
- `AI-INSTRUCTIONS.md`: Comprehensive AI development guidelines.
- `TODO.md`: Detailed development roadmap and feature planning.

## 📝 General Guidelines

- **Adhere to existing conventions**: Mimic the style, structure, and patterns of existing code.
- **Proactive**: Fulfill the user's request thoroughly, including reasonable, directly implied follow-up actions.
- **Confirm Ambiguity**: Do not take significant actions beyond the clear scope of the request without confirming with the user.
- **Security First**: Never introduce code that exposes, logs, or commits secrets, API keys, or other sensitive information.
- **Explain Critical Commands**: Before executing commands with `run_shell_command` that modify the file system, codebase, or system state, provide a brief explanation.
- **Testing**: Always verify changes using the project's testing procedures (`npm test`, `npx tsc`, `npm run lint`).
- **Commit Messages**: Propose clear, concise, and focused commit messages (why, not just what).
