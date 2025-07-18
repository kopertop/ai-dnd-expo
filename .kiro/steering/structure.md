# Project Structure

## Based on Callstack Incubator AI Template

```
ai-dnd-expo/
├── app/              # Expo Router screens (mobile-first)
├── components/       # D&D-specific UI components
├── hooks/           # AI integration and game state hooks
├── services/        # Cactus Compute AI services
├── types/           # D&D game type definitions
├── constants/       # D&D game data (classes, races, etc.)
├── assets/          # D&D artwork and audio
└── .kiro/           # AI development configuration
```

## Key Mobile-First Directories

### `/app` - Mobile Game Screens
- `index.tsx` - Main menu/home screen
- `new-game.tsx` - Character creation flow
- `game.tsx` - Primary D&D gameplay screen
- `_layout.tsx` - Mobile-optimized root layout

### `/components` - D&D Mobile UI
- **Game Core**: `turn-based-chat.tsx`, `game-canvas.tsx`, `dice-roller.tsx`
- **Character**: `character-sheet-modal.tsx`, `character-review.tsx`
- **D&D Choosers**: `class-chooser.tsx`, `race-chooser.tsx`, `world-chooser.tsx`
- **AI Features**: `voice-chat-button.tsx`, `tavern-companion-recruitment.tsx`

### `/hooks` - AI & Game Logic
- **AI Integration**: `use-enhanced-dungeon-master.ts`, `use-simple-companions.ts`
- **Game State**: `use-game-state.ts`, `use-audio-player.tsx`
- **Mobile Features**: `use-voice-recognition.ts`, `use-text-to-speech.ts`

### `/services` - Cactus Compute Integration
- **AI Core**: `ai/ai-service-manager.ts`, `ai/providers/cactus-provider.ts`
- **AI Agents**: `ai/agents/dungeon-master-agent.ts`, `ai/agents/local-dm-agent.ts`
- **AI Tools**: `ai/tools/dice-roller.ts`, `ai/tools/character-updater.ts`

### `/types` - D&D Game Types
- **Core Game**: `character.ts`, `game.ts`, `companion.ts`
- **D&D Mechanics**: `class-option.ts`, `race-option.ts`, `skill.ts`, `stats.ts`

### `/constants` - D&D Game Data
- **Character Options**: `classes.ts`, `races.ts`, `skills.ts`, `worlds.ts`
- **Game Assets**: `backgrounds.ts`, `locations.ts`, `colors.ts`

## Mobile-First Architecture Principles

### AI-Powered D&D Game Structure
- **Components**: Mobile-optimized D&D UI elements
- **Hooks**: AI integration and game state management
- **Services**: Cactus Compute AI providers with fallbacks
- **Types**: D&D-specific game mechanics and data

### Mobile Performance Priorities
- Touch-optimized component design
- AI response caching for mobile networks
- Battery-efficient AI model usage
- Offline-first with intelligent fallbacks

### Key Patterns
- All AI services use Cactus Compute as primary provider
- Local AI models provide offline fallback
- Rule-based responses for complete offline support
- Mobile-first responsive design with web fallback
