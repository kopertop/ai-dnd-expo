# Technology Stack

## Foundation
- **Base Template**: [Callstack Incubator AI](https://github.com/callstackincubator/ai)
- **React Native + Expo**: Mobile-first cross-platform development
- **TypeScript**: Strict typing for code quality

## AI Integration (Primary Focus)
- **Cactus Compute**: Primary AI inference provider
- **Gemma3**: Google's instruction-tuned LLM for D&D
- **@cactus-compute/client**: Official Cactus client library
- **Local AI Fallbacks**: ONNX models for offline scenarios
- **Rule-based Responses**: Fallback system for complete offline support

## Mobile-Optimized Stack
- **Expo Router**: File-based navigation
- **React Native Reanimated**: Smooth mobile animations
- **React Native Gesture Handler**: Touch interactions
- **AsyncStorage**: Mobile data persistence
- **Expo Audio/Speech**: Voice features for mobile

## Development & Testing
- **Vitest**: Fast testing with 100% coverage requirement
- **EAS Build**: Cloud building for mobile apps
- **ESLint + Prettier**: Code quality and formatting

## Essential Commands

```bash
# Mobile Development
npm start                    # Expo dev server
npm run ios                  # iOS simulator
npm run android              # Android emulator

# Code Quality (Required before commits)
npm run typecheck            # TypeScript validation
npm run lint                 # ESLint + auto-fix
npm run test:all             # All tests with coverage

# Mobile Builds
npm run build:development    # Dev build for testing
npm run build:production     # Production build for stores
```

## Required Environment Variables
```bash
EXPO_PUBLIC_CACTUS_API_KEY=your_api_key_here
EXPO_PUBLIC_CACTUS_ENDPOINT=https://api.cactus-compute.com
EXPO_PUBLIC_CACTUS_MODEL=gemma-3-2b-instruct
```

## Mobile Performance Priorities
- AI response caching for mobile networks
- Battery-efficient AI model usage
- Offline-first design with intelligent fallbacks
- Touch-optimized D&D interface
