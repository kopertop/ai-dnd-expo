# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-powered Dungeons & Dragons platform built with React Native/Expo, based on the [Callstack Incubator AI template](https://github.com/callstackincubator/ai). The project enables players to experience D&D with AI-powered Dungeon Masters, NPCs, and companion characters. It features voice synthesis and dynamic content generation, supporting both solo and multiplayer gameplay across mobile, web, and future desktop platforms.

### Key Technologies

- **Cactus Compute**: Distributed compute network for AI model inference
- **Gemma3**: Google's instruction-tuned language model for D&D gameplay
- **React Native + Expo**: Cross-platform development framework
- **Local AI Fallbacks**: On-device AI processing for offline functionality

## Development Commands

### Core Commands

- `npm start` or `npx expo start` - Start the Expo development server
- `npm run android` - Start with Android emulator
- `npm run ios` - Start with iOS simulator
- `npm run web` - Start web version
- `npm run lint` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Run TypeScript type checking
- `npm run check` - Run format, lint, typecheck, and expo-doctor

### Testing Commands

- `npm run test` - Run main test suite (Vitest)
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:services` - Run AI services tests separately
- `npm run test:services:watch` - Run services tests in watch mode
- `npm run test:all` - Run all test suites
- `npm run test:all:coverage` - Run all tests with coverage

### Build Commands

- `npm run build:development` - Build development version with EAS
- `npm run build:staging` - Build staging version
- `npm run build:production` - Build production version
- `npm run deploy:development` - Deploy to development environment
- `npm run deploy:staging` - Deploy to staging environment
- `npm run deploy:production` - Deploy to production environment

### Project Management

- `npm run reset-project` - Moves current app to app-example and creates blank app directory

## Architecture

### File-Based Routing

- Uses Expo Router for navigation with automatic deep linking
- Route files are in `/app` directory - adding a file automatically creates a route
- `_layout.tsx` files define nested layouts
- Supports lazy-evaluation and deferred bundling
- Universal navigation across Android, iOS, and web platforms

### Key Directories

- `/app` - Route components and layouts (file-based routing)
- `/components` - Reusable UI components
- `/hooks` - Custom React hooks
- `/constants` - App constants (Colors, classes, races, etc.)
- `/assets` - Static assets (images, fonts, audio)
- `/services` - API services and AI integrations
- `/types` - TypeScript type definitions
- `/styles` - Shared styling and theme definitions
- `/stores` - Zustand state management
- `/tests` - Test files organized by type (unit, integration, fixtures)

### AI Services Architecture

The project has a sophisticated AI services layer:

```
services/
├── ai/
│   ├── agents/          # AI agent implementations (DM, Local DM)
│   ├── models/          # Device-specific AI models and optimization
│   ├── providers/       # AI service providers (OpenAI, Anthropic, Local)
│   └── tools/           # AI tools (dice roller, character updater, etc.)
├── character-voice-*    # Voice synthesis and character voice management
└── world-generator.ts   # Dynamic world generation
```

### Testing Architecture

The project uses a dual-config testing approach:

- **Main tests** (`vitest.config.ts`): Components, hooks, UI logic
- **Services tests** (`vitest.services.config.ts`): AI services, complex business logic
- **100% coverage requirement** for all code
- Comprehensive test setup with mocks and fixtures

### Theming System

- Light/dark mode support via `useColorScheme` hook
- Colors defined in `/constants/colors.ts`
- `ThemedText` and `ThemedView` components for theme-aware UI
- DnD-specific theme system in `/styles/dnd-theme.ts`

## Key Features

### AI Integration

- **Dungeon Master AI**: Comprehensive AI DM powered by Cactus Compute + Gemma3
- **Companion System**: Tavern-based companion recruitment and management
- **Voice Chat**: Real-time speech recognition and text-to-speech
- **Local AI Models**: On-device AI processing with Gemma3 and ONNX for offline scenarios
- **Device Optimization**: Battery-aware AI model management
- **Intelligent Fallbacks**: Rule-based responses when AI services are unavailable

### Game Features

- **Character Creation**: Full D&D 5e character creation with races, classes, skills
- **Dynamic UI**: Location-aware quick actions and context-sensitive interfaces
- **Game Canvas**: Multiple rendering options (SVG, Skia, standard Canvas)
- **State Management**: Persistent game state with Zustand
- **Audio System**: Background music with user controls

### Cross-Platform Support

- **Mobile**: iOS and Android with native optimizations
- **Web**: Progressive Web App capabilities
- **Universal**: Shared codebase with platform-specific optimizations

## Development Patterns

### Component Architecture

- Themed components extend base React Native components with light/dark color props
- Uses `@/` path alias for absolute imports
- Platform-specific styling with `Platform.select()`
- Comprehensive prop interfaces and TypeScript strict mode

### State Management

- **Zustand** for global state (settings, game state)
- **React Context** for provider-based state (audio, input mode)
- **Local Storage** integration for persistence
- **Async Storage** for mobile-specific data

### AI Service Integration

- Service layer abstracts AI providers (Cactus Compute, Local AI models)
- Tool calling system for AI agent capabilities
- Context management for conversation history
- Response quality filtering and optimization
- Intelligent fallback mechanisms with rule-based responses

## Important Files

- `app/_layout.tsx` - Root layout with theme provider and global components
- `constants/` - All game data (classes, races, skills, locations, etc.)
- `hooks/use-enhanced-dungeon-master.ts` - Main DM AI integration
- `hooks/use-simple-companions.ts` - Companion management system
- `components/turn-based-chat.tsx` - Main chat interface
- `components/tavern-companion-recruitment.tsx` - Companion recruitment system
- `services/ai/` - Core AI service implementations
- `AI-INSTRUCTIONS.md` - Comprehensive AI development guidelines
- `TODO.md` - Detailed development roadmap

## Development Notes

### Environment Setup

- Uses Expo SDK ~53.0.19 with React Native 0.79.5
- TypeScript strict mode enabled
- ESLint configured with Expo config and Prettier
- Vitest for testing with jsdom environment
- EAS Build for cloud builds and deployments

### AI Development Context

- **Cactus Compute**: Primary AI inference provider for distributed AI processing
- **Gemma3**: Google's instruction-tuned language model optimized for D&D
- **@cactus-compute/client**: Official client library for Cactus integration
- **Local AI Models**: On-device AI processing with Gemma3 and ONNX for fallback scenarios
- **Intelligent Fallbacks**: Rule-based responses when AI services are unavailable

### TypeScript Configuration

- Strict mode enabled with comprehensive path aliases
- Extends `expo/tsconfig.base` configuration
- Path aliases for all major directories (`@/components/*`, `@/hooks/*`, etc.)
- Type definitions in `/types` directory

### Key Conventions

- Use `@/` imports for all internal modules
- Components use themed props for dark/light mode
- AI services follow provider pattern with common interfaces
- Test files use `.test.tsx` extension and are co-located or in `/tests`
- Comprehensive error handling for AI service failures
- Always implement intelligent fallbacks for AI service unavailability

### Performance Considerations

- AI response caching and optimization
- Battery-aware model management for mobile
- Lazy loading for large components
- Optimized bundle splitting for web

## Working Features

The following features are fully implemented and working:

- **Tavern Companion Recruitment**: Complete companion system with AI-generated characters
- **Enhanced Dungeon Master**: AI DM with tool calling and context awareness
- **Voice Chat Integration**: Real-time speech recognition and synthesis
- **Location-aware UI**: Context-sensitive quick actions based on current location
- **Character Management**: Full character creation and progression system
- **Game State Persistence**: Saves and loads game state across sessions

## Development Workflow

1. **Type Checking**: Always run `npm run typecheck` before committing
2. **Linting**: Use `npm run lint` to fix code style issues
3. **Testing**: Run `npm run test:all` to ensure all tests pass
4. **Coverage**: Maintain 100% test coverage as configured
5. **AI Services**: Test AI integrations with `npm run test:services`

When implementing new features:
1. Add TypeScript interfaces in `/types`
2. Create tests first (TDD approach)
3. Implement feature with proper error handling
4. Add AI integration with Cactus Compute + intelligent fallbacks
5. Update documentation as needed

### Environment Configuration

Required environment variables:
```bash
EXPO_PUBLIC_CACTUS_API_KEY=your_api_key_here
EXPO_PUBLIC_CACTUS_ENDPOINT=https://api.cactus-compute.com
EXPO_PUBLIC_CACTUS_MODEL=gemma-3-2b-instruct
```

### AI Service Implementation Pattern

When adding AI features:
1. Use Cactus Compute as primary AI provider
2. Implement local AI models as fallback
3. Add rule-based responses for complete offline support
4. Include proper error handling and retry logic
5. Test all fallback scenarios thoroughly