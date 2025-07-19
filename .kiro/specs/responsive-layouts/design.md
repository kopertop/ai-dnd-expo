# Design Document: Responsive Layouts

## Overview

This design document outlines the implementation approach for creating responsive layouts in the AI D&D application. The feature will provide optimized user experiences for both phone and tablet devices by implementing a tab-based interface for phones and a side-by-side layout for tablets. Additionally, it will integrate voice-interactive chat capabilities using expo-speech-recognition and expo-speech.

## Architecture

### Core Components

The responsive layout system will be built on these architectural components:

1. **Device Detection Layer** - Using existing `use-screen-size` hook
2. **Layout Components** - Phone tabs vs Tablet side-by-side
3. **Voice Integration** - Speech recognition and text-to-speech
4. **Navigation System** - Expo Router tabs for phones

### Phone Layout Implementation

Based on Expo Router tabs documentation (https://docs.expo.dev/router/advanced/tabs/), the phone layout will use file-based routing:

```
app/
├── _layout.tsx
└── (tabs)/
    ├── _layout.tsx
    ├── index.tsx (Chat)
    ├── character.tsx
    ├── map.tsx
    └── settings.tsx
```

#### Tab Layout Configuration

```typescript
// app/(tabs)/_layout.tsx
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: 'blue' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => (
            <FontAwesome size={28} name="comments" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="character"
        options={{
          title: 'Character',
          tabBarIcon: ({ color }) => (
            <FontAwesome size={28} name="user" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => (
            <FontAwesome size={28} name="map" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <FontAwesome size={28} name="cog" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

### Tablet Layout Implementation

```typescript
// components/TabletLayout.tsx
const TabletLayout: React.FC<TabletLayoutProps> = (props) => {
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  return (
    <View style={styles.container}>
      <View style={styles.leftPanel}>
        <TurnBasedChat {...props} />
      </View>
      <View style={styles.rightPanel}>
        <GameCanvas {...props} />
      </View>
      <View style={styles.bottomControls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => setShowCharacterSheet(true)}
        >
          <FontAwesome name="user" size={24} color="white" />
          <Text style={styles.buttonText}>Character</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => setShowSettings(true)}
        >
          <FontAwesome name="cog" size={24} color="white" />
          <Text style={styles.buttonText}>Settings</Text>
        </TouchableOpacity>
      </View>
      
      <CharacterSheetModal 
        visible={showCharacterSheet}
        onClose={() => setShowCharacterSheet(false)}
        character={props.playerCharacter}
      />
      <SettingsModal 
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#ccc',
  },
  rightPanel: {
    flex: 2,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
});
```

## Voice Integration Implementation

### Speech Recognition (expo-speech-recognition)

Based on https://github.com/jamsch/expo-speech-recognition documentation:

```typescript
// hooks/useSpeechRecognition.ts
import { 
  ExpoSpeechRecognitionModule, 
  useSpeechRecognitionEvent 
} from 'expo-speech-recognition';

export const useSpeechRecognition = () => {
  const [recognizing, setRecognizing] = useState(false);
  const [transcript, setTranscript] = useState('');

  useSpeechRecognitionEvent('start', () => setRecognizing(true));
  useSpeechRecognitionEvent('end', () => setRecognizing(false));
  useSpeechRecognitionEvent('result', (event) => {
    setTranscript(event.results[0]?.transcript || '');
  });
  useSpeechRecognitionEvent('error', (event) => {
    console.log('error code:', event.error, 'error message:', event.message);
  });

  const startListening = async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      console.warn('Permissions not granted', result);
      return;
    }
    
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: false,
    });
  };

  const stopListening = () => {
    ExpoSpeechRecognitionModule.stop();
  };

  return {
    recognizing,
    transcript,
    startListening,
    stopListening,
  };
};
```

### Text-to-Speech (expo-speech)

Based on https://docs.expo.dev/versions/latest/sdk/speech/ documentation:

```typescript
// hooks/useTextToSpeech.ts
import * as Speech from 'expo-speech';

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<Speech.Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string | undefined>();

  useEffect(() => {
    // Load available voices for user selection (gender/pitch preferences)
    Speech.getAvailableVoicesAsync().then(setAvailableVoices);
  }, []);

  const speak = (text: string, options?: Speech.SpeechOptions) => {
    Speech.speak(text, {
      voice: selectedVoice,
      ...options,
      onStart: () => setIsSpeaking(true),
      onDone: () => setIsSpeaking(false),
      onError: (error) => {
        console.error('TTS Error:', error);
        setIsSpeaking(false);
      },
    });
  };

  const stop = () => {
    Speech.stop();
    setIsSpeaking(false);
  };

  return {
    isSpeaking,
    availableVoices,
    selectedVoice,
    setSelectedVoice,
    speak,
    stop,
  };
};
```

### Voice Chat Component

```typescript
// components/VoiceChatInput.tsx
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface VoiceChatInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
}

const VoiceChatInput: React.FC<VoiceChatInputProps> = ({
  onSend,
  placeholder = "Type or speak your message..."
}) => {
  const [message, setMessage] = useState('');
  const { recognizing, transcript, startListening, stopListening } = useSpeechRecognition();

  useEffect(() => {
    if (transcript && !recognizing) {
      setMessage(transcript);
    }
  }, [transcript, recognizing]);

  const handleSend = () => {
    if (message.trim()) {
      onSend(message);
      setMessage('');
    }
  };

  return (
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.textInput}
        value={message}
        onChangeText={setMessage}
        placeholder={placeholder}
        multiline
      />
      <TouchableOpacity 
        style={[styles.micButton, recognizing && styles.listeningButton]}
        onPress={recognizing ? stopListening : startListening}
      >
        <FontAwesome 
          name={recognizing ? "microphone" : "microphone-slash"} 
          size={20} 
          color="white" 
        />
      </TouchableOpacity>
      <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
        <FontAwesome name="send" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );
};
```

## Device Detection Enhancement

```typescript
// hooks/use-screen-size.ts (enhanced)
import { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';

interface ScreenSize {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isPhone: boolean; // New property for phone-specific detection
}

export const useScreenSize = (): ScreenSize => {
  const [screenData, setScreenData] = useState(Dimensions.get('window'));

  useEffect(() => {
    const onChange = (result: { window: any; screen: any }) => {
      setScreenData(result.window);
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  const { width, height } = screenData;

  return {
    width,
    height,
    isMobile: width < 768,
    isTablet: width >= 768 && width <= 1024,
    isDesktop: width > 1024,
    isPhone: width < 768, // Phone-specific detection
  };
};
```

## Main Game Component Integration

```typescript
// app/game.tsx (modified)
const GameScreen: React.FC = () => {
  const { isPhone } = useScreenSize();
  // ... existing game state logic

  if (isPhone) {
    // Redirect to tab-based layout
    return <Redirect href="/(tabs)" />;
  }

  // Render tablet layout directly
  return <TabletLayout gameState={gameState} playerCharacter={playerCharacter} />;
};
```

## Error Handling

### Voice Permission Handling

```typescript
const handleVoicePermissions = async () => {
  try {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      Alert.alert(
        'Permissions Required',
        'Microphone permission is needed for voice input. Please enable it in settings.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error('Permission error:', error);
    return false;
  }
};
```

### Speech Recognition Error Handling

```typescript
useSpeechRecognitionEvent('error', (event) => {
  let errorMessage = 'Voice recognition error occurred.';
  
  switch (event.error) {
    case 'not-allowed':
      errorMessage = 'Microphone permission denied.';
      break;
    case 'network':
      errorMessage = 'Network error. Please check your connection.';
      break;
    case 'no-speech':
      errorMessage = 'No speech detected. Please try again.';
      break;
  }
  
  Alert.alert('Voice Recognition Error', errorMessage);
});
```

## State Management and Persistence

### Zustand Store Architecture

The responsive layouts will use Zustand stores to maintain state consistency across different layouts and components. This ensures that switching between phone tabs or tablet panels preserves the user's context and data.

#### Chat Store

```typescript
// stores/useChatStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChatMessage {
  id: string;
  content: string;
  speaker: 'player' | 'dm';
  timestamp: number;
}

interface ChatState {
  messages: ChatMessage[];
  currentInput: string;
  isVoiceMode: boolean;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setCurrentInput: (input: string) => void;
  toggleVoiceMode: () => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      currentInput: '',
      isVoiceMode: false,
      addMessage: (message) => set((state) => ({
        messages: [...state.messages, {
          ...message,
          id: Date.now().toString(),
          timestamp: Date.now(),
        }]
      })),
      setCurrentInput: (input) => set({ currentInput: input }),
      toggleVoiceMode: () => set((state) => ({ isVoiceMode: !state.isVoiceMode })),
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({ messages: state.messages }),
    }
  )
);
```

#### Settings Store

```typescript
// stores/useSettingsStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  voiceEnabled: boolean;
  ttsEnabled: boolean;
  volume: number;
  speechRate: number;
  language: string;
  theme: 'light' | 'dark' | 'auto';
  updateVoiceSettings: (settings: Partial<Pick<SettingsState, 'voiceEnabled' | 'ttsEnabled' | 'volume' | 'speechRate'>>) => void;
  updateLanguage: (language: string) => void;
  updateTheme: (theme: 'light' | 'dark' | 'auto') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      voiceEnabled: true,
      ttsEnabled: true,
      volume: 1.0,
      speechRate: 1.0,
      language: 'en-US',
      theme: 'auto',
      updateVoiceSettings: (settings) => set((state) => ({ ...state, ...settings })),
      updateLanguage: (language) => set({ language }),
      updateTheme: (theme) => set({ theme }),
    }),
    {
      name: 'settings-storage',
    }
  )
);
```

#### Layout Store

```typescript
// stores/useLayoutStore.ts
import { create } from 'zustand';

interface LayoutState {
  currentLayout: 'phone' | 'tablet';
  activeTab: string;
  showCharacterSheet: boolean;
  showSettings: boolean;
  setLayout: (layout: 'phone' | 'tablet') => void;
  setActiveTab: (tab: string) => void;
  toggleCharacterSheet: () => void;
  toggleSettings: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  currentLayout: 'phone',
  activeTab: 'chat',
  showCharacterSheet: false,
  showSettings: false,
  setLayout: (layout) => set({ currentLayout: layout }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleCharacterSheet: () => set((state) => ({ showCharacterSheet: !state.showCharacterSheet })),
  toggleSettings: () => set((state) => ({ showSettings: !state.showSettings })),
}));
```

### Store Integration in Components

#### Chat Component Integration

```typescript
// components/ChatInterface.tsx
import { useChatStore } from '../stores/useChatStore';
import { useSettingsStore } from '../stores/useSettingsStore';

const ChatInterface: React.FC = () => {
  const { 
    messages, 
    currentInput, 
    isVoiceMode, 
    addMessage, 
    setCurrentInput, 
    toggleVoiceMode 
  } = useChatStore();
  
  const { voiceEnabled, ttsEnabled } = useSettingsStore();
  
  // Component implementation using store state
  return (
    <View>
      {/* Chat messages display */}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      
      {/* Voice input component */}
      {voiceEnabled && (
        <VoiceChatInput 
          value={currentInput}
          onChangeText={setCurrentInput}
          onSend={(text) => addMessage({ content: text, speaker: 'player' })}
          isVoiceMode={isVoiceMode}
          onToggleVoice={toggleVoiceMode}
        />
      )}
    </View>
  );
};
```

#### Layout Component Integration

```typescript
// components/ResponsiveGameContainer.tsx
import { useLayoutStore } from '../stores/useLayoutStore';
import { useScreenSize } from '../hooks/use-screen-size';

const ResponsiveGameContainer: React.FC = () => {
  const { isPhone } = useScreenSize();
  const { setLayout } = useLayoutStore();
  
  useEffect(() => {
    setLayout(isPhone ? 'phone' : 'tablet');
  }, [isPhone, setLayout]);
  
  return isPhone ? <PhoneTabLayout /> : <TabletSideBySideLayout />;
};
```

### State Persistence Strategy

1. **Chat Messages**: Persisted to AsyncStorage to maintain conversation history across app restarts
2. **Settings**: Persisted to maintain user preferences
3. **Layout State**: Not persisted (determined by device detection on app start)
4. **Game State**: Continues to use existing persistence mechanism

### Cross-Layout State Synchronization

The Zustand stores ensure that:
- Switching from phone tabs to tablet layout (or vice versa) maintains all chat history
- Voice settings and preferences are consistent across layouts
- Character sheet and settings modal states are preserved
- Current input text is maintained when switching between layouts

## Testing Strategy

### Voice Integration Testing
- Test speech recognition accuracy with game-specific vocabulary
- Test text-to-speech with DM responses and voice selection options
- Verify permission handling on both platforms
- Test error scenarios (network issues, no speech detected)
- **Important**: Test speech-to-text on real devices (simulators have limitations with microphone input)

### Layout Testing
- Test tab navigation on various phone sizes
- Test tablet side-by-side layout responsiveness
- Verify modal behavior on tablets
- Test orientation changes and layout adaptation

### State Management Testing
- Verify state persistence across app restarts
- Test state synchronization between different layouts
- Verify store updates trigger appropriate UI re-renders
- Test state cleanup and memory management