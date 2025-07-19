# Cactus Compute Integration for AI D&D

This document describes the integration of Cactus Compute's LLM into the AI D&D application.

## Overview

We've integrated Cactus Compute's on-device LLM capabilities to provide an AI Dungeon Master that can run locally on the user's device. This integration allows for:

- Local-first AI processing for privacy and offline play
- Cloud fallback when needed for more complex scenarios
- Efficient on-device inference with minimal latency
- Intelligent responses to player actions with D&D rule awareness

## Implementation Components

### 1. Core Components

- **DM Agent** (`services/ai/agents/dm-agent.ts`): Implements the Dungeon Master logic using the Cactus LLM
- **DM Provider** (`services/ai/providers/dm-provider.ts`): Bridges the gap between the application and the DM Agent
- **Cactus Provider** (`services/ai/providers/cactus-provider.ts`): Wrapper around the Cactus Compute LLM client
- **Integration Bridge** (`services/ai/cactus-integration-bridge.ts`): Connects the app's existing AI system with our Cactus implementation

### 2. UI Components

- **DM Chat** (`components/game/dm-chat.tsx`): Chat interface for interacting with the DM
- **Dungeon Master Hook** (`hooks/use-dungeon-master.ts`): React hook for using the DM in components

## Usage

### Basic Usage

```tsx
import { useDungeonMaster } from '@/hooks/use-dungeon-master';

const MyComponent = () => {
  const {
    isInitialized,
    isLoading,
    error,
    processPlayerAction,
    generateNarration,
  } = useDungeonMaster({
    autoInitialize: true,
    fallbackMode: 'localfirst',
  });

  const handlePlayerAction = async () => {
    if (!isInitialized || isLoading) return;

    const response = await processPlayerAction('I search the room', {
      playerName: 'Elric',
      playerClass: 'Wizard',
      playerRace: 'Human',
      currentScene: 'The Misty Tavern',
      gameHistory: ['You enter the tavern.'],
    });

    console.log(response.text);

    // Handle tool commands
    response.toolCommands.forEach(command => {
      console.log(`Command: ${command.type}, Params: ${command.params}`);
    });
  };

  return (
    // Your component JSX
  );
};
```

### Using the Chat Component

```tsx
import { DMChat } from '@/components/game/dm-chat';

const GameScreen = () => {
  const handleToolCommand = (type: string, params: string) => {
    // Handle tool commands (dice rolls, etc.)
    console.log(`Command: ${type}, Params: ${params}`);
  };

  return (
    <DMChat
      playerName="Elric"
      playerClass="Wizard"
      playerRace="Human"
      currentScene="The Misty Tavern"
      onToolCommand={handleToolCommand}
    />
  );
};
```

### Using the Integration Bridge

```typescript
import {
  initializeCactusLLM,
  generateCactusResponse,
  generateCactusNarration,
  isCactusInitialized,
} from '@/services/ai/cactus-integration-bridge';

// Initialize the LLM
await initializeCactusLLM(progress => {
  console.log(`Initialization progress: ${progress.status}`);
});

// Generate a response
const response = await generateCactusResponse('I search the room', {
  playerName: 'Elric',
  playerClass: 'Wizard',
  playerRace: 'Human',
  currentScene: 'The Misty Tavern',
  gameHistory: ['You enter the tavern.'],
});

// Generate a narration
const narration = await generateCactusNarration('The Misty Tavern', {
  playerName: 'Elric',
  playerClass: 'Wizard',
  playerRace: 'Human',
  currentLocation: 'The Misty Tavern',
});
```

## Configuration

The Cactus integration can be configured with the following options:

- `modelUrl`: URL to download the model from (defaults to Gemma3-1B-Instruct)
- `contextSize`: Size of the context window (defaults to 2048)
- `apiKey`: Optional API key for Cactus Compute cloud services
- `fallbackMode`: Strategy for fallback ('local', 'localfirst', 'remotefirst', 'remote')
- `temperature`: Controls randomness of responses (defaults to 0.7)

## Integration with Existing App

To integrate with your existing app:

1. Replace any existing AI model loading code with calls to `initializeCactusLLM`
2. Replace response generation with calls to `generateCactusResponse` or `generateCactusNarration`
3. Use the `DMChat` component or `useDungeonMaster` hook in your UI

## Performance Considerations

- The model is downloaded once and cached for future use
- Battery optimization mode can be enabled to reduce power consumption
- Performance mode can be set to 'performance', 'balanced', or 'quality'
- Responses are cached to improve performance for similar queries

## Troubleshooting

If you encounter issues with the Cactus integration:

1. Check if the model is downloaded correctly
2. Verify that the API key is set correctly (if using cloud fallback)
3. Check the logs for error messages
4. Try clearing the model cache and restarting the app

## Future Improvements

- Add support for more Cactus Compute models
- Implement VLM (Vision Language Model) support for image-based gameplay
- Add support for voice input and output using Cactus TTS
- Improve the D&D rule system integration
- Add support for multiplayer sessions
