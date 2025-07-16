# Design Document

## Overview

This design outlines the implementation of comprehensive unit test coverage for the AI D&D Platform using Vitest as the primary testing framework. The solution will achieve 100% test coverage across all testable code while maintaining fast execution times and reliable test isolation through strategic mocking of external dependencies.

The testing architecture follows a layered approach that mirrors the application structure, with dedicated testing strategies for React components, custom hooks, services, and utilities. The design emphasizes maintainability, consistency, and developer productivity while ensuring thorough validation of all business logic.

## Architecture

### Testing Framework Stack

**Primary Framework**: Vitest
- Chosen for its native TypeScript support, fast execution, and excellent mocking capabilities
- Provides built-in coverage reporting with line, branch, and function coverage metrics
- Offers watch mode for efficient development workflows

**Testing Utilities**:
- `@testing-library/react-native`: Component testing with user-centric queries
- `@testing-library/jest-dom`: Extended matchers for DOM assertions
- `@testing-library/user-event`: Realistic user interaction simulation
- `vitest/globals`: Global test functions (describe, it, expect)

**Mocking Strategy**:
- External APIs: Spy-based mocking using Vitest's `vi.spyOn()` for method interception
- React Native modules: Spy on platform-specific methods and provide mock implementations
- File system operations: Spy on file system methods with in-memory mock responses
- Network requests: Spy on HTTP client methods and return controlled responses
- **Constraint**: Avoid `vi.mock()` to prevent interference with parallel test execution

### Test Organization Structure

```
tests/
├── unit/
│   ├── components/          # Component tests
│   ├── hooks/              # Custom hook tests
│   ├── services/           # Service layer tests
│   ├── utils/              # Utility function tests
├── fixtures/               # Test data factories
├── helpers/               # Test utilities and spy management
├── setup/                 # Test configuration files
└── __spies__/             # Reusable spy implementations
```

### Coverage Requirements

- **Line Coverage**: 100% of executable lines
- **Branch Coverage**: 100% of conditional branches
- **Function Coverage**: 100% of exported functions
- **Statement Coverage**: 100% of statements

## Components and Interfaces

### Test Infrastructure Components

#### 1. Test Configuration (`vitest.config.ts`)
```typescript
interface VitestConfig {
  testEnvironment: 'jsdom' | 'node';
  setupFiles: string[];
  coverage: CoverageConfig;
  globals: boolean;
  mockReset: boolean;
}
```

**Design Decision**: Use jsdom environment for component tests and node environment for service tests to optimize performance while maintaining compatibility.

#### 2. Spy Management System
```typescript
interface SpyManager {
  createSpies<T extends object>(target: T, methods: (keyof T)[]): Record<keyof T, MockedFunction>;
  resetAllSpies(): void;
  restoreAllSpies(): void;
}

interface TestDataFactory<T> {
  create(overrides?: Partial<T>): T;
  createMany(count: number, overrides?: Partial<T>): T[];
}
```

**Design Decision**: Centralized spy management ensures consistent test isolation, while separate data factories provide test fixtures without mocking concerns.

#### 3. Test Utilities
```typescript
interface TestUtils {
  renderWithProviders(component: ReactElement): RenderResult;
  createHookSpy<T extends object>(hook: T, method: keyof T): MockedFunction;
  waitForAsyncUpdates(): Promise<void>;
  setupCommonSpies(): void;
  cleanupSpies(): void;
}
```

### Component Testing Strategy

#### React Component Tests
Each component test file will follow this structure:
1. **Rendering Tests**: Verify components render without crashing
2. **Props Tests**: Validate prop handling and display logic
3. **Interaction Tests**: Test user interactions and callback triggers
4. **State Tests**: Verify state changes and UI updates
5. **Hook Integration Tests**: Test component-hook interactions

**Mock Strategy for Components**:
- Spy on custom hook methods and return controlled values using `vi.spyOn()`
- Spy on external dependencies (navigation, storage, etc.) and provide mock implementations
- Use real React Native components where possible for integration confidence
- Reset spies in `beforeEach` to ensure test isolation

#### Custom Hook Testing Strategy
Hook tests will use `@testing-library/react-hooks` pattern:
1. **Initial State Tests**: Verify default return values
2. **Action Tests**: Test state updates from hook actions
3. **Side Effect Tests**: Validate useEffect and async operations
4. **Error Handling Tests**: Test error states and recovery
5. **Dependency Tests**: Verify external service interactions

**Mock Strategy for Hooks**:
- Spy on external service methods using `vi.spyOn()` and provide controlled return values
- Spy on React Native platform API methods and mock their implementations
- Preserve internal hook logic for full coverage while isolating external dependencies

### Service Layer Testing Strategy

#### AI Service Testing
```typescript
interface AIServiceTest {
  mockProvider: MockedAIProvider;
  testSuccessScenarios(): void;
  testErrorHandling(): void;
  testRetryLogic(): void;
  testFallbackBehavior(): void;
}
```

**Design Decision**: Spy on external AI provider methods while testing internal service logic to ensure fast, reliable tests that don't depend on external services.

#### Storage Service Testing
```typescript
interface StorageServiceTest {
  mockAsyncStorage: MockedAsyncStorage;
  testDataPersistence(): void;
  testDataRetrieval(): void;
  testErrorRecovery(): void;
}
```

## Data Models

### Test Data Models

#### Mock Data Factories
```typescript
interface CharacterFactory {
  createBasicCharacter(): Character;
  createCompleteCharacter(): Character;
  createCharacterWithClass(className: string): Character;
}

interface GameStateFactory {
  createNewGame(): GameState;
  createActiveGame(): GameState;
  createGameWithHistory(): GameState;
}
```

#### Test Fixtures
```typescript
interface TestFixtures {
  characters: Character[];
  gameStates: GameState[];
  aiResponses: AIResponse[];
  mockApiResponses: Record<string, any>;
}
```

**Design Decision**: Use factory pattern for test data creation to ensure consistency and reduce test setup complexity.

### Mock Implementation Models

#### External API Mocks
```typescript
interface MockedCactusProvider {
  generateResponse: MockedFunction<(prompt: string) => Promise<string>>;
  isAvailable: MockedFunction<() => boolean>;
  configure: MockedFunction<(config: any) => void>;
}

interface MockedAsyncStorage {
  getItem: MockedFunction<(key: string) => Promise<string | null>>;
  setItem: MockedFunction<(key: string, value: string) => Promise<void>>;
  removeItem: MockedFunction<(key: string) => Promise<void>>;
}
```

## Error Handling

### Test Error Scenarios

#### Component Error Handling
1. **Prop Validation Errors**: Test invalid prop handling
2. **Render Errors**: Test error boundary integration
3. **Async Operation Errors**: Test loading and error states
4. **Hook Error Propagation**: Test error handling from custom hooks

#### Service Error Handling
1. **Network Failures**: Test API timeout and connection errors
2. **Invalid Responses**: Test malformed data handling
3. **Authentication Errors**: Test auth failure scenarios
4. **Rate Limiting**: Test throttling and retry behavior

#### Mock Error Simulation
```typescript
interface ErrorSimulation {
  simulateNetworkError(): void;
  simulateTimeoutError(): void;
  simulateInvalidDataError(): void;
  simulateAuthenticationError(): void;
}
```

**Design Decision**: Comprehensive error testing ensures the application gracefully handles all failure scenarios without crashing.

## Testing Strategy

### Test Execution Strategy

#### Performance Requirements
- **Full Suite Execution**: < 30 seconds
- **Individual Test Files**: < 2 seconds
- **Watch Mode Responsiveness**: < 500ms for file changes

#### Coverage Reporting
```typescript
interface CoverageReport {
  lines: { total: number; covered: number; percentage: number };
  branches: { total: number; covered: number; percentage: number };
  functions: { total: number; covered: number; percentage: number };
  statements: { total: number; covered: number; percentage: number };
}
```

#### Test Categories
1. **Unit Tests**: Isolated component/function testing
2. **Integration Tests**: Component-hook-service interaction testing
3. **Mock Tests**: External dependency interaction validation

### Spy-Based Testing Strategy

#### External Dependencies
- **Cactus AI Provider**: Spy on provider methods and return controlled responses
- **AsyncStorage**: Spy on storage methods with in-memory implementations
- **React Navigation**: Spy on navigation functions and track calls
- **Expo APIs**: Spy on platform-specific methods and provide mock responses
- **File System**: Spy on file operations and simulate responses

#### Internal Dependencies
- **Custom Hooks**: Spy on hook methods in component tests, test directly in hook tests
- **Services**: Spy on service methods in component/hook tests, test directly in service tests
- **Utilities**: Test directly without spying on internal functions

**Design Rationale**: Using `vi.spyOn()` exclusively ensures external dependencies don't slow down tests while maintaining parallel test execution compatibility and full coverage of internal application logic.

### Test Maintenance Strategy

#### Shared Test Utilities
```typescript
interface SharedTestUtils {
  setupTestEnvironment(): void;
  cleanupTestEnvironment(): void;
  createMockProviders(): MockProviders;
  assertNoConsoleErrors(): void;
}
```

#### Test Naming Conventions
- Test files: `*.test.ts` or `*.test.tsx`
- Test descriptions: Use "should" statements for clarity
- Test groups: Organize by functionality using `describe` blocks

#### Reusable Spy Implementations
- Centralized spy setup utilities in `__helpers__` directory
- Shared test data factories for common data structures
- Consistent spy reset and restore strategies between tests

**Design Decision**: Standardized patterns and shared utilities reduce maintenance overhead and ensure consistent test quality across the codebase.

## Implementation Patterns

### Spy Setup Examples

#### Component Test with Hook Spies
```typescript
// tests/unit/components/character-sheet-modal.test.tsx
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react-native';
import * as useGameStateModule from '@/hooks/use-game-state';
import { CharacterSheetModal } from '@/components/character-sheet-modal';

describe('CharacterSheetModal', () => {
  let gameStateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    gameStateSpy = vi.spyOn(useGameStateModule, 'useGameState').mockReturnValue({
      character: { name: 'Test Character', level: 1 },
      updateCharacter: vi.fn(),
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render character information', () => {
    render(<CharacterSheetModal visible={true} onClose={vi.fn()} />);
    expect(screen.getByText('Test Character')).toBeTruthy();
  });
});
```

#### Service Test with External API Spies
```typescript
// tests/unit/services/ai-service-manager.test.ts
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CactusProvider } from '@/services/ai/providers/cactus-provider';
import { AIServiceManager } from '@/services/ai/ai-service-manager';

describe('AIServiceManager', () => {
  let cactusProviderSpy: ReturnType<typeof vi.spyOn>;
  let aiServiceManager: AIServiceManager;

  beforeEach(() => {
    cactusProviderSpy = vi.spyOn(CactusProvider.prototype, 'generateResponse')
      .mockResolvedValue('Mocked AI response');
    
    aiServiceManager = new AIServiceManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate response using Cactus provider', async () => {
    const response = await aiServiceManager.generateResponse('test prompt');
    
    expect(cactusProviderSpy).toHaveBeenCalledWith('test prompt');
    expect(response).toBe('Mocked AI response');
  });
});
```

#### Hook Test with Platform API Spies
```typescript
// tests/unit/hooks/use-audio-player.test.ts
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Audio } from 'expo-av';
import { useAudioPlayer } from '@/hooks/use-audio-player';

describe('useAudioPlayer', () => {
  let audioLoadSpy: ReturnType<typeof vi.spyOn>;
  let audioPlaySpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    const mockSound = {
      playAsync: vi.fn().mockResolvedValue(undefined),
      stopAsync: vi.fn().mockResolvedValue(undefined),
    };

    audioLoadSpy = vi.spyOn(Audio.Sound, 'createAsync')
      .mockResolvedValue({ sound: mockSound });
    audioPlaySpy = vi.spyOn(mockSound, 'playAsync');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should load and play audio file', async () => {
    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      await result.current.playSound('test-audio.mp3');
    });

    expect(audioLoadSpy).toHaveBeenCalledWith({ uri: 'test-audio.mp3' });
    expect(audioPlaySpy).toHaveBeenCalled();
  });
});
```

### Spy Management Utilities

#### Centralized Spy Manager
```typescript
// tests/helpers/spy-manager.ts
import { vi, MockedFunction } from 'vitest';

export class SpyManager {
  private spies: Array<ReturnType<typeof vi.spyOn>> = [];

  createSpy<T extends object, K extends keyof T>(
    target: T,
    method: K,
    implementation?: T[K]
  ): MockedFunction<T[K]> {
    const spy = vi.spyOn(target, method);
    if (implementation) {
      spy.mockImplementation(implementation as any);
    }
    this.spies.push(spy);
    return spy as MockedFunction<T[K]>;
  }

  resetAllSpies(): void {
    this.spies.forEach(spy => spy.mockReset());
  }

  restoreAllSpies(): void {
    this.spies.forEach(spy => spy.mockRestore());
    this.spies = [];
  }
}

// Usage in tests
export const createSpyManager = () => new SpyManager();
```

#### Common Spy Setups
```typescript
// tests/__spies__/common-spies.ts
import { vi } from 'vitest';
import { AsyncStorage } from '@react-native-async-storage/async-storage';
import { CactusProvider } from '@/services/ai/providers/cactus-provider';

export const setupStorageSpies = () => ({
  getItem: vi.spyOn(AsyncStorage, 'getItem').mockResolvedValue(null),
  setItem: vi.spyOn(AsyncStorage, 'setItem').mockResolvedValue(undefined),
  removeItem: vi.spyOn(AsyncStorage, 'removeItem').mockResolvedValue(undefined),
});

export const setupAIProviderSpies = () => ({
  generateResponse: vi.spyOn(CactusProvider.prototype, 'generateResponse')
    .mockResolvedValue('Default AI response'),
  isAvailable: vi.spyOn(CactusProvider.prototype, 'isAvailable')
    .mockReturnValue(true),
});

export const setupNavigationSpies = () => ({
  navigate: vi.fn(),
  goBack: vi.fn(),
  reset: vi.fn(),
});
```

### Test Data Factories

#### Character Factory
```typescript
// tests/fixtures/character-factory.ts
import { Character } from '@/types/character';

export const CharacterFactory = {
  createBasic(): Character {
    return {
      id: 'test-char-1',
      name: 'Test Character',
      level: 1,
      class: 'Fighter',
      race: 'Human',
      stats: { strength: 10, dexterity: 10, constitution: 10 },
      hitPoints: { current: 10, maximum: 10 },
      experience: 0,
    };
  },

  createWithOverrides(overrides: Partial<Character>): Character {
    return { ...this.createBasic(), ...overrides };
  },

  createMany(count: number): Character[] {
    return Array.from({ length: count }, (_, i) => 
      this.createWithOverrides({ id: `test-char-${i + 1}` })
    );
  },
};
```

This refined design document now provides:

1. **Clear constraint adherence**: Exclusively uses `vi.spyOn()` and avoids `vi.mock()`
2. **Concrete implementation examples**: Shows exactly how to implement the spy-based approach
3. **Practical utilities**: Provides reusable spy management and setup patterns
4. **Parallel test compatibility**: Ensures tests can run in parallel without interference
5. **Maintainable patterns**: Establishes consistent approaches for different test scenarios

The design now gives developers clear guidance on how to implement comprehensive unit tests while respecting the constraint to avoid `vi.mock()` for better parallel test execution.