---
inclusion: fileMatch
fileMatchPattern: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', '**/playwright.config.ts', '**/vitest.config.ts', 'tests/**/*']
---

# Testing Guidelines

**IMPORTANT** To run the tests, use `npm run test`. To run an *individual test suite* use `npm run test <filename>`

## Testing Philosophy
- Use Playwright for comprehensive end-to-end testing of user journeys and cross-platform compatibility
- Use Vitest for fast unit tests with mocking capabilities for isolated component and service testing
- Prioritize E2E tests for critical user flows and AI integration points
- Mock AI services consistently to ensure predictable test outcomes

## Testing Stack
- **Playwright**: End-to-end testing framework with cross-browser and mobile device support
- **Playwright MCP**: Enhanced browser automation with snapshot capabilities and debugging tools
- **Vitest**: Fast unit testing framework with TypeScript support and mocking utilities
- **MSW (Mock Service Worker)**: API mocking for AI services in both E2E and unit tests

## Test Organization

### File Structure
```
tests/
├── e2e/                          # Playwright E2E tests
│   ├── character-creation.spec.ts
│   ├── game-continuation.spec.ts
│   ├── dm-interaction.spec.ts
│   ├── character-sheet.spec.ts
│   ├── dice-rolling.spec.ts
│   ├── voice-features.spec.ts
│   ├── error-handling.spec.ts
│   └── performance.spec.ts
├── unit/                         # Vitest unit tests
│   ├── components/               # Component unit tests
│   ├── hooks/                    # Hook unit tests
│   ├── services/                 # Service unit tests
│   └── utils/                    # Utility function tests
├── fixtures/                     # Test data and fixtures
│   ├── characters.json
│   ├── game-states.json
│   └── mock-responses.json
├── page-objects/                 # Page Object Model classes
│   ├── HomePage.ts
│   ├── NewGamePage.ts
│   ├── GamePage.ts
│   └── CharacterSheetModal.ts
├── utils/                        # Test utilities and helpers
│   ├── test-helpers.ts
│   ├── mock-services.ts
│   ├── data-generators.ts
│   └── assertions.ts
└── config/                       # Test configuration
    ├── playwright.config.ts
    ├── vitest.config.ts
    └── test-environments.ts
```

### Naming Conventions
- E2E test files: `feature-name.spec.ts`
- Unit test files: `component-name.test.ts`
- Page objects: `PageName.ts` (PascalCase)
- Mock files: `service-name.mock.ts`
- Test utilities: `test-helpers.ts`

## End-to-End Testing with Playwright

### Page Object Model Pattern
```typescript
// page-objects/GamePage.ts
export class GamePage {
  constructor(private page: Page) {}

  async sendMessageToDM(message: string): Promise<void> {
    await this.page.fill('[data-testid="chat-input"]', message);
    await this.page.click('[data-testid="send-button"]');
  }

  async waitForDMResponse(): Promise<string> {
    const response = await this.page.waitForSelector('[data-testid="dm-response"]');
    return await response.textContent() || '';
  }

  async openCharacterSheet(): Promise<void> {
    await this.page.click('[data-testid="character-sheet-button"]');
    await this.page.waitForSelector('[data-testid="character-sheet-modal"]');
  }
}
```

### E2E Test Example
```typescript
// e2e/character-creation.spec.ts
import { test, expect } from '@playwright/test';
import { NewGamePage } from '../page-objects/NewGamePage';
import { testCharacter } from '../fixtures/characters.json';

test.describe('Character Creation Flow', () => {
  test('should create a new character successfully', async ({ page }) => {
    const newGamePage = new NewGamePage(page);
    
    await newGamePage.navigate();
    await newGamePage.selectWorld('Forgotten Realms');
    await newGamePage.selectRace('Human');
    await newGamePage.selectClass('Fighter');
    await newGamePage.enterCharacterDetails(testCharacter.name, testCharacter.background);
    
    await newGamePage.startGame();
    
    // Verify character was created and game started
    await expect(page.locator('[data-testid="game-canvas"]')).toBeVisible();
    await expect(page.locator('[data-testid="character-name"]')).toHaveText(testCharacter.name);
  });
});
```

### Cross-Platform Testing
```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
});
```

## Unit Testing with Vitest

### Component Testing
```typescript
// unit/components/character-sheet-modal.test.tsx
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CharacterSheetModal } from '@/components/character-sheet-modal';
import { testCharacter } from '../../fixtures/characters.json';

describe('CharacterSheetModal', () => {
  it('should display character information correctly', () => {
    const mockOnClose = vi.fn();
    
    render(
      <CharacterSheetModal 
        character={testCharacter} 
        visible={true} 
        onClose={mockOnClose} 
      />
    );
    
    expect(screen.getByText(testCharacter.name)).toBeInTheDocument();
    expect(screen.getByText(testCharacter.class)).toBeInTheDocument();
    expect(screen.getByText(testCharacter.race)).toBeInTheDocument();
  });
});
```

### Hook Testing
```typescript
// unit/hooks/use-game-state.test.ts
import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useGameState } from '@/hooks/use-game-state';
import { testCharacter } from '../../fixtures/characters.json';

describe('useGameState', () => {
  it('should update character state correctly', () => {
    const { result } = renderHook(() => useGameState());
    
    act(() => {
      result.current.updateCharacter(testCharacter);
    });
    
    expect(result.current.character).toEqual(testCharacter);
    expect(result.current.isLoading).toBe(false);
  });
});
```

### Service Testing
```typescript
// unit/services/ai-service-manager.test.ts
import { vi } from 'vitest';
import { AIServiceManager } from '@/services/ai/ai-service-manager';
import { mockDungeonMasterResponse } from '../utils/mock-services';

describe('AIServiceManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle AI service failures gracefully', async () => {
    const aiService = new AIServiceManager();
    
    // Mock AI service failure
    vi.spyOn(aiService, 'sendMessage').mockRejectedValue(new Error('Service unavailable'));
    
    const response = await aiService.getDMResponse('Hello');
    
    expect(response.fallback).toBe(true);
    expect(response.message).toContain('temporarily unavailable');
  });
});
```

## AI Service Testing

### Mock AI Responses
```typescript
// utils/mock-services.ts
export const mockAIResponses = {
  dungeonMaster: {
    greeting: "Welcome to the tavern, adventurer!",
    combat: "Roll for initiative!",
    exploration: "You see a mysterious door ahead.",
    fallback: "The DM is thinking... (AI service temporarily unavailable)"
  },
  npc: {
    shopkeeper: "What can I help you find today?",
    guard: "Halt! State your business.",
    fallback: "The character seems distracted."
  }
};

export class MockAIService {
  static setup(): void {
    // Setup MSW handlers for AI endpoints
  }
  
  static simulateFailure(): void {
    // Configure MSW to return error responses
  }
}
```

### AI Integration Testing
```typescript
// e2e/dm-interaction.spec.ts
test('should handle AI service failures gracefully', async ({ page }) => {
  // Setup mock to simulate AI service failure
  await page.route('**/api/ai/dm', route => {
    route.fulfill({ status: 500, body: 'Service unavailable' });
  });
  
  const gamePage = new GamePage(page);
  await gamePage.sendMessageToDM('Hello DM');
  
  // Verify fallback response is shown
  const response = await gamePage.waitForDMResponse();
  expect(response).toContain('temporarily unavailable');
});
```

## Performance Testing

### Performance Monitoring
```typescript
// utils/performance-monitor.ts
export class PerformanceMonitor {
  static async measurePageLoad(page: Page): Promise<number> {
    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  }
  
  static async measureAIResponseTime(page: Page): Promise<number> {
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="dm-response"]');
    return Date.now() - startTime;
  }
}
```

### Performance Tests
```typescript
// e2e/performance.spec.ts
test('should load initial page within 3 seconds', async ({ page }) => {
  const loadTime = await PerformanceMonitor.measurePageLoad(page);
  expect(loadTime).toBeLessThan(3000);
});
```

## Test Data Management

### Test Fixtures
```typescript
// fixtures/test-data-generator.ts
export class TestDataGenerator {
  static generateCharacter(overrides?: Partial<Character>): Character {
    return {
      id: `test-${Date.now()}`,
      name: 'Test Hero',
      race: 'human',
      class: 'fighter',
      level: 1,
      stats: { strength: 16, dexterity: 14, constitution: 15, intelligence: 10, wisdom: 12, charisma: 8 },
      skills: ['athletics', 'intimidation'],
      background: 'A brave test character',
      ...overrides
    };
  }
  
  static generateGameState(): GameState {
    return {
      characters: [this.generateCharacter()],
      playerCharacterId: 'test-character-1',
      gameWorld: 'test-world',
      startingArea: 'test-tavern',
      sessionId: `session-${Date.now()}`
    };
  }
}
```

## Continuous Integration

### Test Commands
```bash
# E2E Tests
npm run test:e2e              # Run all Playwright tests
npm run test:e2e:headed       # Run with browser UI visible
npm run test:e2e:debug        # Run in debug mode
npm run test:e2e:report       # Generate and open HTML report

# Unit Tests  
npm run test:unit             # Run all Vitest tests
npm run test:unit:watch       # Watch mode for development
npm run test:unit:coverage    # Generate coverage report
npm run test:unit:ui          # Run with Vitest UI

# Combined
npm run test                  # Run all tests (unit + e2e)
npm run test:ci               # CI-optimized test run
```

### CI/CD Integration
```yaml
# .github/workflows/tests.yml
name: Tests
on: [push, pull_request]
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit
      
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Testing Best Practices

### E2E Testing Best Practices
- Use data-testid attributes for reliable element selection
- Implement Page Object Model for maintainable test code
- Test complete user journeys, not individual components
- Use Playwright MCP snapshots for dynamic element identification
- Mock external services but test real user interactions
- Capture screenshots and videos for failed tests

### Unit Testing Best Practices
- Test behavior, not implementation details
- Use descriptive test names that explain the scenario
- Mock external dependencies and focus on the unit under test
- Test edge cases and error conditions
- Keep tests fast and isolated
- Use factories for generating test data

### AI-Specific Testing Considerations
- Always test fallback behavior when AI services fail
- Mock AI responses to be deterministic and fast
- Test rate limiting and retry logic
- Verify proper error messaging to users
- Test AI response parsing and validation
- Monitor AI service performance and response times