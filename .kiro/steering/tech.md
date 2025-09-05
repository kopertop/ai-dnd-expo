# Technology Stack

## Core Framework
- **React Native + Expo**: Cross-platform mobile development with web support
- **TypeScript**: Strict typing for better code quality and developer experience
- **Expo Router**: File-based routing system for navigation

## AI Integration
- **Apple Intelligence**: On-device foundational models (iOS) via `@react-native-ai/apple`
- **ai SDK**: High-level text generation used with the Apple provider
- **Intelligent Fallbacks**: Rules-based provider when device models are unavailable

## UI & Styling
- **React Native StyleSheet**: Component styling with theming support
- **Expo Vector Icons**: Icon library (@expo/vector-icons)
- **React Native Gesture Handler**: Touch and gesture handling
- **React Native Reanimated**: Smooth animations and transitions
- **@shopify/react-native-skia**: Advanced graphics rendering for game canvas

## Audio & Voice
- **Expo Audio**: Background music and sound effects
- **Expo Speech**: Text-to-speech for character voices
- **Expo Speech Recognition**: Voice input for player commands

## State Management
- **React Context**: Current state management (expanding to Redux Toolkit)
- **AsyncStorage**: Local data persistence
- **Custom Hooks**: Reusable state logic

## Development Tools
- **ESLint**: Code linting with strict TypeScript rules
- **Prettier**: Code formatting (via ESLint integration)
- **Jest**: Testing framework (configured but tests not yet implemented)

## Build & Deployment
- **EAS Build**: Expo Application Services for building
- **EAS Submit**: App store submission automation

## Common Commands

### Development
```bash
# Start development server
npm start

# Platform-specific development
npm run ios          # iOS simulator
npm run android      # Android emulator  
npm run web          # Web browser

# Code quality
npm run lint         # Run ESLint with auto-fix
npm run typecheck    # TypeScript type checking
npm run check        # Run lint + typecheck + expo-doctor
```

### Building
```bash
# Local development builds
npm run build:local
npm run build:development

# Staging and production
npm run build:staging
npm run build:production
```

### Deployment
```bash
# Deploy to different environments
npm run deploy:development
npm run deploy:staging
npm run deploy:production

# Submit to app stores
npm run submit:staging
npm run submit:production
```

### Testing
```bash
npm test              # Run tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Environment Configuration

No AI keys are required for on-device Apple models. See `.env.example`.

## Performance Considerations
- Response caching for AI interactions
- Debounced saves to prevent excessive storage writes
- Intelligent retry mechanisms with exponential backoff
- Memory management for game state and world generation
