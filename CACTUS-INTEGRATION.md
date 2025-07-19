# Cactus Compute LLM Integration

This document describes the integration of Cactus Compute's LLM into our AI D&D application.

## Overview

We've integrated Cactus Compute's on-device LLM capabilities to provide an AI Dungeon Master that can run locally on the user's device. This integration allows for:

- Local-first AI processing for privacy and offline play
- Cloud fallback when needed for more complex scenarios
- Efficient on-device inference with minimal latency
- Intelligent responses to player actions with D&D rule awareness

## Implementation Components

### 1. Cactus Provider

The `CactusProvider` class in `services/ai/providers/cactus-provider.ts` provides a wrapper around the Cactus Compute LLM client. It handles:

- Model initialization and loading
- Model caching and downloading
- Text completion with streaming support
- Context management

### 2. Cactus DM Agent

The `CactusDMAgent` in `services/ai/agents/cactus-dm-agent.ts` implements the Dungeon Master logic using the Cactus LLM. It provides:

- Processing player actions in the context of a D&D game
- Generating narrations for scenes
- Applying D&D rules to player actions
- Generating tool commands for dice rolls, damage calculations, etc.

### 3. Cactus DM Provider

The `CactusDMProvider` in `services/ai/providers/cactus-dm-provider.ts` bridges the gap between the application and the Cactus DM Agent. It:

- Converts application-specific context to the format expected by the agent
- Handles timeouts and error cases
- Provides a simple API for the application to use

### 4. React Hook

The `useCactusDungeonMaster` hook in `hooks/use-cactus-dungeon-master.ts` provides a React interface to the Cactus DM functionality. It manages:

- Initialization state and progress
- Loading states and errors
- API key storage
- Cleanup on component unmount

### 5. UI Components

- `CactusDMChat` in `components/game/cactus-dm-chat.tsx` provides a chat interface for interacting with the Cactus DM
- `CactusDMExample` in `components/game/cactus-dm-example.tsx` demonstrates how to use the Cactus DM in a game context
- `CactusDMScreen` in `app/cactus-dm.tsx` provides a screen for showcasing the Cactus DM integration

## Usage

### Basic Usage

```tsx
import { useCactusDungeonMaster } from '@/hooks/use-cactus-dungeon-master';

const MyComponent = () => {
  const {
    isInitialized,
    isLoading,
    error,
    processPlayerAction,
    generateNarration,
  } = useCactusDungeonMaster({
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
import { CactusDMChat } from '@/components/game/cactus-dm-chat';

const GameScreen = () => {
  const handleToolCommand = (type: string, params: string) => {
    // Handle tool commands (dice rolls, etc.)
    console.log(`Command: ${type}, Params: ${params}`);
  };
  
  return (
    <CactusDMChat
      playerName="Elric"
      playerClass="Wizard"
      playerRace="Human"
      currentScene="The Misty Tavern"
      onToolCommand={handleToolCommand}
    />
  );
};
```

## Configuration

The Cactus integration can be configured with the following options:

- `modelUrl`: URL to download the model from (defaults to Gemma3-1B-Instruct)
- `contextSize`: Size of the context window (defaults to 2048)
- `apiKey`: Optional API key for Cactus Compute cloud services
- `fallbackMode`: Strategy for fallback ('local', 'localfirst', 'remotefirst', 'remote')
- `temperature`: Controls randomness of responses (defaults to 0.7)

## Performance Considerations

- The model is downloaded once and cached for future use
- Battery optimization mode can be enabled to reduce power consumption
- Performance mode can be set to 'performance', 'balanced', or 'quality'
- Responses are cached to improve performance for similar queries

## Future Improvements

- Add support for more Cactus Compute models
- Implement VLM (Vision Language Model) support for image-based gameplay
- Add support for voice input and output using Cactus TTS
- Improve the D&D rule system integration
- Add support for multiplayer sessions
