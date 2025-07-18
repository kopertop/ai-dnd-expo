# AI D&D Mobile Game 🎲🤖

A mobile-first AI-powered Dungeons & Dragons game built on the [Callstack Incubator AI](https://github.com/callstackincubator/ai) template. Experience D&D adventures powered by Cactus Compute and Gemma3 AI with intelligent fallbacks for offline play.

## 🌟 Features

### 🎭 AI-Powered D&D Gameplay

- **AI Dungeon Master**: Intelligent DM powered by Cactus Compute + Gemma3
- **AI NPCs**: Voiced characters with unique personalities and dialogue
- **AI Companions**: Optional party members for solo adventures
- **Smart Fallbacks**: Local AI models and rule-based responses for offline play

### 📱 Mobile-First Design

- **Touch-Optimized UI**: D&D interface designed for mobile devices
- **Voice Integration**: Speech recognition and text-to-speech for immersive gameplay
- **Offline Mode**: Play D&D even without internet connection
- **Cross-Platform**: iOS, Android, and web support

### ⚡ Built on Callstack Incubator AI

- **Foundation**: Based on the proven Callstack Incubator AI template
- **Cactus Compute**: Distributed AI inference for scalable gameplay
- **Gemma3 Integration**: Google's instruction-tuned LLM for D&D scenarios
- **Intelligent Architecture**: AI services with comprehensive fallback systems

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **Expo CLI**: `npm install -g @expo/cli`
- **Mobile Development**: 
  - **iOS (macOS only)**: 
    - Install Xcode from Mac App Store
    - Install Xcode Command Line Tools: `xcode-select --install`
    - Open Xcode and accept license agreements
    - Install iOS Simulator (included with Xcode)
  - **Android**: 
    - Install Android Studio
    - Set up Android emulator through Android Studio
    - Configure Android SDK path in environment variables
- **Cactus Compute API Key**: Sign up at [Cactus Compute](https://cactus-compute.com)

### 1. Environment Setup

Create a `.env` file in the project root:

```bash
# Required for AI functionality
EXPO_PUBLIC_CACTUS_API_KEY=your_cactus_api_key_here
EXPO_PUBLIC_CACTUS_ENDPOINT=https://api.cactus-compute.com
EXPO_PUBLIC_CACTUS_MODEL=gemma-3-2b-instruct
```

### 2. Installation

```bash
# Install dependencies
npm install

# For iOS development (macOS only)
npx pod-install ios
```

### 3. Development Server

```bash
# Start Expo development server
npm start

# Platform-specific commands
npm run ios          # iOS simulator (requires Xcode setup)
npm run android      # Android emulator (requires Android Studio)
npm run web          # Web browser (easiest for testing)
```

### 4. Testing on Different Platforms

**iOS Testing (macOS only)**
```bash
# Ensure iOS Simulator is available
xcrun simctl list devices

# Run on iOS simulator
npm run ios
```

**Android Testing**
```bash
# List available Android emulators
emulator -list-avds

# Start Android emulator (replace with your AVD name)
emulator -avd Pixel_5_API_31

# Run on Android emulator
npm run android
```

**Web Testing (Cross-platform)**
```bash
# Run in web browser (works on any OS)
npm run web
```

**Physical Device Testing**
```bash
# Start development server
npm start

# Scan QR code with Expo Go app (iOS/Android)
# Or use device-specific development builds
```

### 5. Testing the AI Features

Once running, you can:
- Create a D&D character through the character creation flow
- Chat with the AI Dungeon Master
- Recruit AI companions in the tavern
- Test voice features (mobile devices only)

## 🏗️ Development Workflow

### Code Quality Commands

```bash
# TypeScript type checking (required before commits)
npm run typecheck

# ESLint with auto-fix
npm run lint

# Format code with Prettier
npm run format

# Run all quality checks
npm run check
```

### Testing Commands

```bash
# Run all tests with coverage
npm run test:all

# Run main test suite
npm run test

# Run AI services tests
npm run test:services

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Build Commands

```bash
# Development build for testing
npm run build:development

# Staging build
npm run build:staging

# Production build for app stores
npm run build:production
```

### Project Structure

```
ai-dnd-expo/
├── app/              # Expo Router screens (mobile-first)
├── components/       # D&D-specific UI components
├── hooks/           # AI integration and game state hooks
├── services/        # Cactus Compute AI services
├── types/           # D&D game type definitions
├── constants/       # D&D game data (classes, races, etc.)
├── assets/          # D&D artwork and audio
├── tests/           # Comprehensive test suite
└── .kiro/           # AI development configuration
```

## 🤖 AI Integration

### Core AI Stack

- **Cactus Compute**: Primary AI inference provider for scalable D&D gameplay
- **Gemma3**: Google's instruction-tuned language model optimized for D&D scenarios
- **Local AI Models**: On-device ONNX models for offline fallback scenarios
- **Rule-based Responses**: Intelligent fallbacks for complete offline D&D gameplay

### AI Architecture

- **DM Agent**: Cactus Compute-powered Dungeon Master with tool calling
- **Companion System**: AI party members with unique personalities
- **Voice Integration**: Speech recognition and text-to-speech for immersive gameplay
- **Smart Fallbacks**: Three-tier fallback system (Cactus → Local AI → Rule-based)

## 🛠️ Troubleshooting

### Common Issues

**AI Features Not Working**
- Ensure `EXPO_PUBLIC_CACTUS_API_KEY` is set in your `.env` file
- Check your Cactus Compute account has sufficient credits
- Verify network connectivity for AI services

**Build Errors**
- Run `npm run typecheck` to catch TypeScript errors
- Run `npm run lint` to fix code style issues
- Clear Metro cache: `npx expo start --clear`

**iOS Development Issues**
- Ensure Xcode is installed from Mac App Store
- Install Xcode Command Line Tools: `xcode-select --install`
- Accept Xcode license agreements by opening Xcode
- Run `npx pod-install ios` after installing new dependencies
- Check iOS Simulator is available: `xcrun simctl list devices`
- If iOS Simulator won't start, try: `npm run ios -- --simulator="iPhone 15"`

**Android Development Issues**
- Ensure Android Studio is installed with SDK
- Check Android emulator is running
- Verify Android SDK path in environment variables

### Getting Help

- 📖 [CLAUDE.md](./CLAUDE.md) - Claude Code-specific guidance
- 🤖 [AI-INSTRUCTIONS.md](./AI-INSTRUCTIONS.md) - AI development guidelines
- 📋 [TODO.md](./TODO.md) - Development roadmap and tasks
- 🧪 [.kiro/steering/](./kiro/steering/) - Project steering documents

## 🔧 Technology Stack

- **Foundation**: [Callstack Incubator AI](https://github.com/callstackincubator/ai)
- **Mobile Framework**: React Native + Expo
- **Language**: TypeScript with strict mode
- **AI Services**: Cactus Compute + Gemma3
- **Testing**: Vitest with 100% coverage requirement
- **Build System**: EAS Build for mobile apps

## 📱 Platform Support

- ✅ **iOS** (iPhone & iPad) - Primary platform
- ✅ **Android** - Primary platform  
- ✅ **Web** - Development and fallback platform
- 🔄 **Desktop** - Future consideration

## 🛡️ Privacy & Security

- **API Key Security**: Environment variables for sensitive data
- **Offline Mode**: Local AI models for privacy-conscious users
- **Data Encryption**: Secure storage of game data
- **Fallback Systems**: Multiple AI providers for reliability

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🎲 Ready to Adventure!

This mobile D&D game brings the magic of tabletop gaming to your phone with intelligent AI companions. Create your character, chat with the AI Dungeon Master, and embark on epic quests powered by cutting-edge AI technology.

**Built with ❤️ using the Callstack Incubator AI template**
