# CactusTTS Integration

This document describes the implementation of native TTS (Text-to-Speech) support for Cactus using the Chatterbox model.

## Overview

The CactusTTS integration provides character-specific voice synthesis using the Chatterbox model from Hugging Face. It allows different character types (DM, Wizard, Warrior, etc.) to have distinct voices with customizable pitch and speed settings.

## Features

- **Character Voice Types**: Pre-configured voices for different character types
- **Customizable Parameters**: Adjustable pitch and speed for each voice
- **Easy Integration**: Simple API with React hooks for easy use
- **Progress Tracking**: Download progress tracking for model initialization
- **Error Handling**: Comprehensive error handling and user feedback
- **Audio Playback**: Full audio playback using expo-av
- **Settings Integration**: Built-in settings page for testing and configuration

## Character Voice Types

The following character voice types are available:

- **DM**: Dungeon Master voice (authoritative, dramatic)
- **Wizard**: Magical, scholarly voice
- **Warrior**: Strong, commanding voice
- **Rogue**: Quick, cunning voice
- **Cleric**: Wise, spiritual voice
- **Bard**: Musical, charismatic voice
- **Narrator**: Storytelling voice
- **Monster**: Deep, intimidating voice
- **NPC**: Generic NPC voice

## Usage

### Basic Usage

```typescript
import { cactus } from '@/components/cactus';

// Initialize TTS (after VLM is initialized)
await cactus.initializeTTS(progress => {
  console.log(`Progress: ${progress * 100}%`);
});

// Speak text as a character
await cactus.say('Welcome, adventurer!', 'DM', {
  onStart: () => console.log('Started speaking'),
  onDone: () => console.log('Finished speaking'),
  onError: error => console.error('TTS Error:', error),
});
```

### Using React Hooks

```typescript
import { useCactusTTS, useDMVoice } from '@/hooks/use-cactus-tts';

// General TTS hook
const tts = useCactusTTS();

// Initialize TTS
await tts.initializeTTS();

// Speak with any character voice
await tts.say('Hello world!', 'Wizard');

// Pre-configured character voice hooks
const dmVoice = useDMVoice();
await dmVoice.speak('Welcome to the dungeon!');
```

### Available Hooks

- `useCactusTTS()` - General TTS functionality
- `useDMVoice()` - Pre-configured DM voice
- `useWizardVoice()` - Pre-configured Wizard voice
- `useWarriorVoice()` - Pre-configured Warrior voice
- `useRogueVoice()` - Pre-configured Rogue voice
- `useClericVoice()` - Pre-configured Cleric voice
- `useBardVoice()` - Pre-configured Bard voice
- `useNarratorVoice()` - Pre-configured Narrator voice
- `useMonsterVoice()` - Pre-configured Monster voice
- `useNPCVoice()` - Pre-configured NPC voice

## Settings Integration

The CactusTTS functionality is fully integrated into the app's settings page:

### Accessing TTS Settings

1. Navigate to the game settings page
2. Scroll down to the "CactusTTS (Local AI Voices)" section
3. Initialize TTS if not already done
4. Select a character voice type
5. Enter test text and try different phrases

### Settings Features

- **Status Indicator**: Shows if TTS is initialized
- **Initialize Button**: One-click TTS setup
- **Voice Selection**: Choose from all available character voices
- **Text Input**: Test custom phrases
- **Speak Button**: Generate and play audio immediately

## Configuration

### Voice Settings

Each character voice has default settings that can be overridden:

```typescript
// Default voice configurations
const voiceConfigs = {
  DM: { speaker: 'dm', pitch: 0.8, speed: 0.5 },
  Wizard: { speaker: 'wizard', pitch: 0.9, speed: 0.4 },
  Warrior: { speaker: 'warrior', pitch: 0.7, speed: 0.6 },
  // ... etc
};

// Override settings when speaking
await cactus.say('Hello!', 'DM', {
  pitch: 0.9, // Higher pitch
  speed: 0.6, // Faster speech
});
```

### Model Configuration

The TTS uses the Chatterbox model from Hugging Face:

- **Model URL**: `https://huggingface.co/calcuis/chatterbox-gguf/resolve/main/chatterbox-gguf.gguf`
- **Model Type**: GGUF format for local inference
- **Download Location**: `FileSystem.documentDirectory`

## Implementation Details

### Architecture

1. **Model Download**: Automatically downloads the Chatterbox model on first initialization
2. **Context Sharing**: Uses the same LlamaContext as the VLM for efficient resource usage
3. **Voice Generation**: Generates audio using the CactusTTS.generate() method
4. **Audio Playback**: Full audio playback using expo-av with proper error handling

### Audio Playback

The implementation includes complete audio playback:

```typescript
// Audio playback implementation
const audioResult = await this.tts.generate(text, speakerJsonStr);
if (audioResult) {
  // Convert audio data to playable format
  const audioUri = await this.convertAudioToFile(audioResult);

  // Play using expo-av
  const { sound } = await Audio.Sound.createAsync({ uri: audioUri }, { shouldPlay: true });

  // Handle playback lifecycle
  await sound.playAsync();
}
```

### Error Handling

The implementation includes comprehensive error handling:

- **Initialization Errors**: VLM not initialized, model download failures
- **TTS Errors**: Invalid character types, empty text, generation failures
- **Audio Errors**: Playback failures, file conversion errors
- **User Feedback**: Clear error messages and status indicators

### Performance Considerations

- **Model Size**: Chatterbox model is relatively small for mobile devices
- **Memory Usage**: Shared context with VLM reduces memory footprint
- **Initialization Time**: One-time download and setup process
- **Generation Speed**: Local inference provides fast response times
- **Audio Quality**: High-quality voice synthesis with character-specific traits

## Demo Component

A demo component is available at `components/cactus-tts-demo.tsx` that showcases:

- TTS initialization
- Voice selection
- Text input and speech generation
- Sample texts for testing
- Status indicators and error handling
- Audio playback verification

## Testing

### Test Script

A test script is available at `scripts/test-cactus-tts.js`:

```bash
node scripts/test-cactus-tts.js
```

This script verifies:

- Voice configurations
- Sample texts
- Integration points
- Usage examples

### Manual Testing

1. **Settings Page**: Navigate to settings and test TTS functionality
2. **Demo Component**: Use the dedicated demo component
3. **Console Logs**: Monitor audio generation and playback
4. **Error Handling**: Test various error conditions

## Future Enhancements

### Planned Features

1. **Voice Customization**: User-defined voice profiles
2. **Batch Processing**: Multiple text-to-speech requests
3. **Voice Persistence**: Save and load custom voice settings
4. **Performance Optimization**: Model quantization and caching
5. **Advanced Audio**: Background music integration, sound effects

### Voice Customization

Future implementation will allow users to:

- Create custom character voices
- Adjust voice parameters in real-time
- Save voice preferences per character
- Import/export voice configurations

## Troubleshooting

### Common Issues

1. **"Cactus VLM not initialized"**
   - Ensure VLM is initialized before TTS
   - Call `cactus.initialize()` first

2. **"TTS not initialized"**
   - Call `cactus.initializeTTS()` after VLM initialization
   - Check for download progress

3. **"Unknown character voice type"**
   - Use one of the predefined character types
   - Check `cactus.getAvailableCharacterVoices()` for valid options

4. **Model download failures**
   - Check internet connection
   - Verify Hugging Face model URL is accessible
   - Check available storage space

5. **Audio playback issues**
   - Ensure expo-av is properly installed
   - Check device audio settings
   - Verify audio permissions

### Debug Information

Enable debug logging to troubleshoot issues:

```typescript
// Check initialization status
console.log('VLM Initialized:', cactus.getIsInitialized());
console.log('TTS Initialized:', cactus.getIsTTSInitialized());

// Check available voices
console.log('Available voices:', cactus.getAvailableCharacterVoices());

// Check voice configuration
console.log('DM Voice Config:', cactus.getVoiceConfig('DM'));

// Monitor audio generation
console.log('Audio result:', audioResult);
```

## Integration with Existing Systems

The CactusTTS system is designed to integrate with existing voice systems:

- **Character Voice Manager**: Can be extended to use CactusTTS
- **DM Voice System**: Compatible with existing DM voice functionality
- **Game State**: Can be integrated with character state management
- **Settings Store**: Voice preferences can be stored in settings

## API Reference

### CactusManager Methods

- `initializeTTS(onProgress?)`: Initialize TTS with progress callback
- `say(text, characterId, options?)`: Speak text with character voice
- `getIsTTSInitialized()`: Check if TTS is initialized
- `getAvailableCharacterVoices()`: Get list of available voice types
- `getVoiceConfig(characterId)`: Get configuration for specific voice

### Hook Methods

- `initializeTTS(onProgress?)`: Initialize TTS
- `say(text, characterId, options?)`: Speak text
- `speak(text, options?)`: Speak with pre-configured character voice
- `isInitialized`: TTS initialization status
- `isSpeaking`: Current speaking status
- `isInitializing`: Initialization progress status

## Conclusion

The CactusTTS integration provides a complete, production-ready text-to-speech solution for your D&D game. With character-specific voices, easy-to-use APIs, and full audio playback, it enhances the immersive experience for players.

The system is fully integrated into the settings page for easy testing and configuration, making it simple to try different character voices and phrases during development and gameplay.
