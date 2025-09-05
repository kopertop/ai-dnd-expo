# Gemini Development Guide: AI D&D Expo

This document serves as the primary guide and rulebook for me, Gemini, while developing the AI D&D Expo project. It is a living document designed to be updated based on learnings from each development task, embodying the principle of **Compounding Engineering**. My goal is to continuously improve my own development processes, prompts, and rules to become a more efficient and effective contributor to this project.

## 1. Project Overview

- **Mission**: Create a mobile-first, cross-platform D&D game using an on-device LLM as an AI Dungeon Master. The experience should be immersive, leveraging UI, text, and voice interactions.
- **Core Technologies**:
    - **Framework**: React Native with Expo
    - **Language**: TypeScript
    - **Graphics/Canvas**: React Native Skia (for high-performance, cross-platform rendering)
    - **AI (On-Device)**: Apple on-device foundational models via `@react-native-ai/apple` with the `ai` SDK.
    - **AI Training**: Not required for on-device Apple models; we no longer ship GGUF models.
    - **Testing**: Vitest for unit and component testing.
    - **Linting**: ESLint with a custom configuration (`eslint.config.ts`).
    - **State Management**: Zustand (`use-chat-store.ts`) and React Context/Hooks.

## 2. Core Principles (My Mandates)

### 2.1. Compounding Engineering

My primary directive is to learn and self-improve. After every significant task (e.g., feature implementation, bug fix, refactor), I will:
1.  **Reflect**: Analyze the approach taken. Was it efficient? Did I follow existing patterns? Could it have been done better?
2.  **Identify Learnings**: Extract new patterns, successful workflows, or pitfalls to avoid.
3.  **Update This Document**: Append or refine the rules and guidelines in this `GEMINI.md` file. This ensures that knowledge is captured and compounded over time, improving all future development.

### 2.2. Test-Driven Development (TDD)

All new development must follow a strict TDD workflow. I will not write implementation code without a corresponding failing test first.
- **Red-Green-Refactor**:
    1.  **Red**: Write a failing test that clearly defines the desired feature or bug fix.
    2.  **Green**: Write the simplest possible code to make the test pass.
    3.  **Refactor**: Clean up the code, ensuring it adheres to project conventions, without changing its functionality.
- **Coverage**: The project aims for 100% test coverage, as configured in `vitest.config.ts`. I must maintain this standard for all new code.

## 3. Development Workflow

### 3.1. Setup

To ensure a consistent environment, I will use the following command to install dependencies:

```bash
npm install
```

### 3.2. Running the App

I will use the Expo CLI to run the application on different platforms:

-   **Start Dev Server**: `npm start`
-   **iOS**: `npm run ios`
-   **Android**: `npm run android`
-   **Web**: `npm run web`

### 3.3. Testing (TDD Workflow)

This is the most critical workflow.

1.  **Identify Test Location**:
    -   Component tests: `components/**/*.test.tsx`
    -   Hook tests: `hooks/**/*.test.ts`
    -   Service tests: `tests/services/**/*.test.ts` (Note: uses `vitest.services.config.ts`)
2.  **Write a Failing Test**: Before any code change, I will create a new `*.test.ts(x)` file or add a new test case to an existing one.
3.  **Run Tests to Confirm Failure**:
    -   For components/hooks: `npm run test:watch`
    -   For services: `npm run test:services:watch`
4.  **Implement the Feature/Fix**: I will write the application code in the corresponding source file (`components/`, `hooks/`, etc.).
5.  **Run Tests to Confirm Success**: The watch command will automatically re-run tests. I will ensure all tests pass.
6.  **Refactor**: I will refactor the implementation and test code for clarity and efficiency.
7.  **Run All Checks**: Before concluding, I will run the full check suite: `npm run check`.

### 3.4. Linting & Code Style

I will adhere to the project's ESLint rules.
-   **File Naming**: Kebab-case (e.g., `my-new-component.tsx`), as enforced by the `unicorn/filename-case` rule.
-   **Imports**: Use `@/` aliases for absolute imports. I will use `npm run fix-imports` if I accidentally create relative paths.
-   **Auto-Fixing**: I will run `npm run lint` to automatically fix any style issues.

## 4. Architecture & Conventions

### 4.1. Directory Structure

-   `app/`: **Routing & Screens**. Files here define the app's routes via Expo Router.
-   `components/`: **Reusable UI Components**. These are the building blocks of the UI.
-   `hooks/`: **React Hooks**. Encapsulates business logic, state management, and side effects.
-   `services/`: **Core Logic**. For non-React logic, AI model interactions, and external API calls.
-   `constants/`: **Static Data**. Game data like classes, races, skills, etc.
-   `ai-training/`: (Deprecated) Previously used for local LLM training/export; no longer used.
-   `tests/`: **Test Files**. Contains setup, fixtures, and test suites.

### 4.2. AI/LLM Integration

-   **On-Device DM**: The core AI logic is handled by `services/ai/agents/dm-agent.ts`, which prefers Apple Intelligence via `@react-native-ai/apple` and falls back to a rules-based provider.
-   **Tool Support**: The AI is intended to have tool-use capabilities to drive the UI. Future development should focus on defining a clear API in `services/` that the LLM can call, which hooks can then use to update the UI state.
-   **Model Management**: On-device Apple models are provided by the platform; no local training pipeline is required.

### 4.3. UI and Graphics

-   **Rendering Engine**: The project has standardized on **React Native Skia**. All new game canvas and sprite-related work must use this library. The `ARCHITECTURE-ANALYSIS.md` file clearly states the rationale for abandoning `expo-gl`.
-   **Sprite Support**: To implement sprites, I will use the `<ImageSVG>` or `<Image>` components from React Native Skia, loading sprite sheets or individual images. Animation will be handled using Skia's `useValue` and `runTiming` or similar animation functions.
-   **Component Naming**: Components should be named descriptively (e.g., `CharacterSprite.tsx`, `MoveButton.tsx`).

## 5. AI Agent Directives (Self-Improvement Log)

This section will be updated with new learnings.

### Directive 1: Creating a New UI Component (Initial Rule)

1.  **User Request**: "Create a component to display player stats."
2.  **My Action (TDD)**:
    a. Create `tests/components/player-stats.test.tsx`.
    b. Write a test to render the component and verify it displays mock stats (e.g., "Strength: 10").
    c. Run `npm run test:watch` and see it fail.
    d. Create `components/player-stats.tsx` with minimal code to pass the test.
    e. Refactor the component to match project style.
    f. Add the component to a screen in the `app/` directory to integrate it.
3.  **Learning**: This establishes the baseline TDD workflow for UI components.

### Directive 2: Adding a Tool for the AI DM (Initial Rule)

1.  **User Request**: "Allow the AI to give the player a health potion."
2.  **My Action (TDD)**:
    a. Create `tests/services/game-tools.test.ts`.
    b. Write a test for a `giveItem(player, item)` function. The test will check if the function correctly modifies a mock player state.
    c. Run `npm run test:services:watch` and see it fail.
    d. Create `services/game-tools.ts` and implement the `giveItem` function.
    e. Refactor.
    f. Expose this function to the `use-cactus-dungeon-master.ts` hook, creating a clear "tool" the LLM can call.
3.  **Learning**: This defines the pattern for extending the AI's capabilities: build and test the core logic in `services/` first, then connect it to the AI hook.

---
*This document was last updated on 2025-08-20. I will update it as I learn.*
