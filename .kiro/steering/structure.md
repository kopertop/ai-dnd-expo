# Project Structure

## Root Directory Organization

```
ai-dnd-expo/
├── app/              # File-based routing (Expo Router)
├── components/       # Reusable UI components
├── hooks/           # Custom React hooks
├── constants/       # App constants and configuration
├── assets/          # Static assets (images, fonts, audio)
├── services/        # API services and AI integrations
├── types/           # TypeScript type definitions
├── styles/          # Shared styling and themes
├── scripts/         # Build and deployment scripts
└── .kiro/           # Kiro AI assistant configuration
```

## Key Directories

### `/app` - Expo Router Pages
File-based routing system:
- `_layout.tsx` - Root layout with providers and navigation
- `index.tsx` - Home/landing screen
- `new-game.tsx` - Character creation flow
- `game.tsx` - Main gameplay screen
- `+not-found.tsx` - 404 error page

### `/components` - UI Components
Organized by functionality:
- **Game Components**: `game-canvas.tsx`, `game-status-bar.tsx`, `turn-based-chat.tsx`
- **Character Components**: `character-sheet-modal.tsx`, `character-review.tsx`
- **Chooser Components**: `class-chooser.tsx`, `race-chooser.tsx`, `world-chooser.tsx`
- **UI Primitives**: `themed-text.tsx`, `themed-view.tsx`, `collapsible.tsx`
- **Specialized**: `voice-chat-button.tsx`, `skia-game-canvas.tsx`

### `/hooks` - Custom React Hooks
Business logic and state management:
- **Game Logic**: `use-game-state.ts`, `use-enhanced-dungeon-master.ts`
- **AI Integration**: `use-dungeon-master.ts`, `use-simple-companions.ts`
- **Media**: `use-audio-player.tsx`, `use-text-to-speech.ts`, `use-voice-recognition.ts`
- **UI Utilities**: `use-screen-size.ts`, `use-input-mode.tsx`, `use-color-scheme.ts`

### `/services` - External Integrations
API services and business logic:
- **AI Services**: `ai/agents/dm-agent.ts`, `ai/providers/apple-ai-provider.ts`, `ai/providers/working-ai-provider.ts`
- **Game Logic**: `world-generator.ts`, `movement-animation.ts`
- **AI Agents**: `ai/agents/` (dungeon master, NPCs, companions)

### `/types` - TypeScript Definitions
Shared type definitions:
- **Core Types**: `character.ts`, `game.ts`, `world-map.ts`
- **UI Types**: `class-option.ts`, `race-option.ts`, `location-option.ts`
- **Game Mechanics**: `skill.ts`, `stats.ts`, `companion.ts`

### `/constants` - Configuration
Static configuration and data:
- **Game Data**: `classes.ts`, `races.ts`, `skills.ts`, `worlds.ts`
- **UI Config**: `colors.ts`, `backgrounds.ts`, `locations.ts`

### `/assets` - Static Resources
Organized by type:
- **Images**: `images/classes/`, `images/races/`, `images/locations/`, `images/items/`
- **Audio**: `audio/background.mp3`
- **Fonts**: `fonts/SpaceMono-Regular.ttf`
- **Models**: `models/DialoGPT-small/` (local AI fallback)

## File Naming Conventions

### Components
- Use kebab-case: `character-sheet-modal.tsx`
- Suffix with component type: `.tsx` for React components
- Group related components in subdirectories when needed

### Hooks
- Prefix with `use-`: `use-enhanced-dungeon-master.ts`
- Use kebab-case: `use-game-state.ts`
- Suffix with `.ts` or `.tsx` (if JSX needed)

### Types
- Use kebab-case: `character.ts`, `world-map.ts`
- Singular nouns for main entity types
- Group related types in single files

### Services
- Use kebab-case: `ai-service-manager.ts`
- Organize by domain: `ai/providers/`, `ai/agents/`
- Suffix with purpose: `-provider.ts`, `-agent.ts`, `-service.ts`

## Import Path Aliases

Configured in `tsconfig.json`:
```typescript
"@/*": ["./*"]
"@/assets/*": ["./assets/*"]
"@/components/*": ["./components/*"]
"@/constants/*": ["./constants/*"]
"@/hooks/*": ["./hooks/*"]
"@/styles/*": ["./styles/*"]
"@/types/*": ["./types/*"]
"@/services/*": ["./services/*"]
```

## Code Organization Patterns

### Component Structure
```typescript
// Imports (external first, then internal)
import React from 'react';
import { View, Text } from 'react-native';

import { useGameState } from '@/hooks/use-game-state';
import { Character } from '@/types/character';

// Types and interfaces
interface ComponentProps {
  character: Character;
  onAction: (action: string) => void;
}

// Main component (arrow function)
export const ComponentName: React.FC<ComponentProps> = ({ 
  character, 
  onAction 
}) => {
  // Component logic
  return (
    <View>
      {/* JSX */}
    </View>
  );
};

// Styles at bottom
const styles = StyleSheet.create({
  // styles
});
```

### Hook Structure
```typescript
// Imports
import { useCallback, useEffect, useState } from 'react';

// Types
interface HookReturn {
  data: any;
  loading: boolean;
  error: string | null;
}

// Hook implementation
export const useCustomHook = (params: any): HookReturn => {
  // State and logic
  return {
    data,
    loading,
    error,
  };
};
```

### Service Structure
```typescript
// Interfaces first
export interface ServiceConfig {
  // config types
}

// Main service class
export class ServiceName {
  private config: ServiceConfig;
  
  constructor(config: ServiceConfig) {
    this.config = config;
  }
  
  // Public methods
  public async method(): Promise<Result> {
    // implementation
  }
  
  // Private methods
  private helperMethod(): void {
    // implementation
  }
}

// Default exports/configs at bottom
export const DefaultConfig: ServiceConfig = {
  // defaults
};
```

## Architecture Principles

### Separation of Concerns
- **Components**: UI rendering and user interaction
- **Hooks**: State management and business logic
- **Services**: External API integration and complex operations
- **Types**: Shared data structures and interfaces

### Data Flow
- Props flow down from parent to child components
- Events bubble up through callback props
- Global state managed through React Context
- AI interactions handled by dedicated service layer

### Error Handling
- Services implement retry logic and fallbacks
- Components display user-friendly error messages
- Hooks provide error states to components
- Global error boundaries catch unhandled errors

### Performance
- Lazy loading for heavy components
- Memoization for expensive calculations
- Debounced saves for frequent updates
- Caching for AI responses and game data
