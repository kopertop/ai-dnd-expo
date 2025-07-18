---
inclusion: fileMatch
fileMatchPattern: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', '**/playwright.config.ts', '**/vitest.config.ts', 'tests/**/*']
---

# Testing Guidelines

**IMPORTANT** To run the tests, use `npm run test:all`. For individual test suites use `npm run test <filename>`

## Mobile D&D Game Testing Philosophy
- **Vitest**: Primary testing framework with 100% coverage requirement
- **Mobile-First**: Test touch interactions and mobile-specific D&D gameplay
- **AI Integration**: Mock Cactus Compute services for predictable D&D scenarios
- **Fallback Testing**: Test offline AI fallbacks and rule-based responses
- **D&D Mechanics**: Test dice rolling, character creation, and game state

## Testing Stack
- **Vitest**: Fast unit testing with TypeScript support (dual config setup)
- **@testing-library/react-native**: Mobile component testing
- **MSW**: Mock Cactus Compute AI services for D&D scenarios

## Test Organization

### File Structure (Mobile-First)
```
tests/
├── unit/                         # Vitest unit tests
│   ├── components/               # D&D UI component tests
│   ├── hooks/                    # AI integration hook tests
│   ├── services/                 # Cactus Compute service tests
│   └── utils/                    # D&D utility function tests
├── fixtures/                     # D&D test data
│   ├── characters.json
│   ├── game-states.json
│   └── mock-ai-responses.json
├── utils/                        # Test utilities
│   ├── test-helpers.ts
│   ├── mock-cactus-services.ts
│   └── d&d-data-generators.ts
└── config/                       # Test configuration
    ├── vitest.config.ts
    └── vitest.services.config.ts
```

### Key Test Commands
```bash
npm run test:all                  # All tests with coverage
npm run test:services             # AI service tests
npm run test:watch                # Watch mode for development
```

## D&D Mobile Game Testing Patterns

### Component Testing Example
```typescript
// unit/components/character-sheet-modal.test.tsx
import { render, screen } from '@testing-library/react-native';
import { CharacterSheetModal } from '@/components/character-sheet-modal';
import { testCharacter } from '../../fixtures/characters.json';

describe('CharacterSheetModal', () => {
  it('should display D&D character information', () => {
    render(
      <CharacterSheetModal 
        character={testCharacter} 
        visible={true} 
        onClose={vi.fn()} 
      />
    );
    
    expect(screen.getByText(testCharacter.name)).toBeOnTheScreen();
    expect(screen.getByText(testCharacter.class)).toBeOnTheScreen();
    expect(screen.getByText(testCharacter.race)).toBeOnTheScreen();
  });
});
```

### AI Service Testing
```typescript
// unit/services/cactus-provider.test.ts
import { vi } from 'vitest';
import { CactusProvider } from '@/services/ai/providers/cactus-provider';

describe('CactusProvider', () => {
  it('should handle AI failures with D&D fallbacks', async () => {
    const provider = new CactusProvider();
    
    // Mock Cactus service failure
    vi.spyOn(provider, 'sendMessage').mockRejectedValue(new Error('Network error'));
    
    const response = await provider.getDMResponse('Hello DM');
    
    expect(response.fallback).toBe(true);
    expect(response.message).toContain('DM is thinking');
  });
});
```

## Critical D&D Game Testing Areas

### D&D Mechanics Testing
```typescript
// unit/hooks/use-dice-roller.test.ts
import { renderHook, act } from '@testing-library/react';
import { useDiceRoller } from '@/hooks/use-dice-roller';

describe('useDiceRoller', () => {
  it('should roll valid D20 results', () => {
    const { result } = renderHook(() => useDiceRoller());
    
    act(() => {
      const roll = result.current.rollD20();
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(20);
    });
  });
});
```

### Character Creation Testing
```typescript
// unit/components/character-creation.test.tsx
import { render, fireEvent, screen } from '@testing-library/react-native';
import { CharacterCreationFlow } from '@/components/character-creation-flow';

describe('CharacterCreationFlow', () => {
  it('should create valid D&D character', () => {
    render(<CharacterCreationFlow />);
    
    fireEvent.press(screen.getByText('Human'));
    fireEvent.press(screen.getByText('Fighter'));
    fireEvent.changeText(screen.getByPlaceholderText('Character Name'), 'TestHero');
    
    fireEvent.press(screen.getByText('Create Character'));
    
    expect(screen.getByText('TestHero')).toBeOnTheScreen();
  });
});
```

## AI Service Testing Requirements

### Mock Cactus Compute Responses
```typescript
// utils/mock-cactus-services.ts
export const mockCactusResponses = {
  dungeonMaster: {
    greeting: "Welcome to the tavern, adventurer!",
    combat: "Roll for initiative!",
    exploration: "You see a mysterious door ahead.",
    fallback: "The DM is thinking... (AI service temporarily unavailable)"
  },
  companion: {
    recruitment: "I'd be honored to join your party!",
    dialogue: "What's our next move?",
    fallback: "Your companion seems distracted."
  }
};

export class MockCactusService {
  static setupMSW(): void {
    // Setup MSW handlers for Cactus endpoints
  }
  
  static simulateOffline(): void {
    // Test offline fallback scenarios
  }
}
```

## Mobile D&D Testing Best Practices

### Required Testing Areas
1. **AI Integration**: Test Cactus Compute + local fallbacks
2. **D&D Mechanics**: Dice rolling, character creation, combat
3. **Mobile UI**: Touch interactions, responsive design
4. **Offline Mode**: Local AI and rule-based fallbacks
5. **Performance**: Battery usage, network efficiency

### Testing Commands
```bash
npm run test:all              # All tests with 100% coverage
npm run test:services         # AI service tests
npm run test:watch            # Development watch mode
npm run typecheck             # TypeScript validation
npm run lint                  # Code quality checks
```

### AI Testing Requirements
- Mock Cactus Compute services consistently
- Test all fallback scenarios (local AI, rule-based)
- Verify offline D&D gameplay functionality
- Test mobile-specific AI performance optimizations