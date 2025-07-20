# Implementation Plan

- [x] 1. Set up device detection and screen size utilities
  - Enhance the existing `use-screen-size` hook to include phone-specific detection
  - Add `isPhone` property to the hook return value
  - Test device detection across different screen sizes
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 2. Install and configure voice interaction dependencies
  - [x] 2.1 Install voice packages and check current permissions
    - Install `expo-speech-recognition` package
    - Install `expo-speech` package (if not already installed)
    - Add pre-check with `getPermissionsAsync()` to avoid unnecessary permission prompts
    - Consider `@react-native-voice/voice` as fallback option if expo-speech-recognition lacks features
    - _Requirements: 6.1, 6.2, 6.8, 6.9_

  - [x] 2.2 Configure app.json with voice permissions and plugin
    - Add "expo-speech-recognition" plugin to app.json plugins array
    - Configure Android permissions: RECORD_AUDIO
    - Add iOS NSMicrophoneUsageDescription and NSSpeechRecognitionUsageDescription
    - Set up androidSpeechServicePackages for package visibility
    - _Requirements: 6.8, 6.9_

- [x] 3. Create Zustand stores for state management
  - [x] 3.1 Implement chat store with message persistence
    - Create `stores/useChatStore.ts` with message history and current input state
    - Add persistence middleware for chat messages
    - Include voice mode toggle state
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 3.2 Implement settings store for voice and app preferences
    - Create `stores/useSettingsStore.ts` with voice settings
    - Include TTS/STT enabled flags, volume, speech rate, and language settings
    - Add theme preference storage
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 3.3 Implement layout store for UI state management
    - Create `stores/useLayoutStore.ts` for layout-specific state
    - Track current layout type, active tab, and modal visibility states
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 4. Create voice interaction hooks and components
  - [x] 4.1 Implement speech recognition hook
    - Create `hooks/useSpeechRecognition.ts` using expo-speech-recognition
    - Handle permission requests and error states
    - Implement start/stop listening functionality with event handlers
    - Add configurable continuous recognition flag (continuous: true/false) based on platform support
    - _Requirements: 6.3, 6.4, 6.5, 6.10, 6.11_

  - [x] 4.2 Implement text-to-speech hook
    - Create `hooks/useTextToSpeech.ts` using expo-speech
    - Load available voices using `Speech.getAvailableVoicesAsync()` for user selection
    - Implement speak/stop functionality with voice selection
    - Populate settings UI with voice options (gender/pitch preferences)
    - _Requirements: 6.1, 6.2, 6.13, 6.14_

  - [x] 4.3 Create voice chat input component
    - Build `components/VoiceChatInput.tsx` with microphone button
    - Integrate speech recognition and text input
    - Add visual feedback for listening state
    - _Requirements: 6.6, 6.12, 6.13_

- [x] 5. Implement phone layout with Expo Router tabs
  - [x] 5.1 Create tab-based file structure
    - Create `app/(tabs)/` directory structure
    - Set up `_layout.tsx` for tab navigation configuration
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 5.2 Implement individual tab screens
    - Create `app/(tabs)/index.tsx` for Chat tab using existing TurnBasedChat component
    - Create `app/(tabs)/character.tsx` for Character Sheet tab
    - Create `app/(tabs)/map.tsx` for Map/Game View tab using existing GameCanvas
    - Create `app/(tabs)/settings.tsx` for Settings tab
    - _Requirements: 1.5, 1.6, 1.7, 1.8_

  - [x] 5.3 Configure tab icons and styling
    - Add FontAwesome icons for each tab
    - Configure tab bar styling and active tint colors
    - Ensure tab state preservation when switching
    - _Requirements: 1.9, 5.1, 5.2, 5.3, 5.4_

- [x] 6. Implement tablet layout with side-by-side panels
  - [x] 6.1 Create tablet layout component
    - Build `components/TabletLayout.tsx` with side-by-side structure
    - Implement left panel for chat and right panel for game map
    - Add bottom control buttons for character sheet and settings
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 6.2 Implement modal dialogs for tablet
    - Create character sheet modal that opens from bottom controls
    - Create settings modal that opens from bottom controls
    - Ensure modals don't interfere with main game view
    - _Requirements: 2.5, 2.6, 2.7, 2.8_

- [x] 7. Create responsive game container
  - Implement `components/ResponsiveGameContainer.tsx` that detects device type
  - Route to appropriate layout based on screen size detection
  - Integrate with layout store for state management
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8. Integrate voice features across layouts
  - [x] 8.1 Add voice input to chat interfaces
    - Integrate VoiceChatInput component in both phone and tablet chat interfaces
    - Connect to chat store for message handling
    - _Requirements: 6.6, 6.11, 6.12_

  - [x] 8.2 Add text-to-speech for DM responses
    - Integrate TTS hook in chat components to speak DM messages
    - Add voice selection options in settings
    - Respect user settings for TTS enabled/disabled
    - _Requirements: 6.1, 6.2, 6.14_

- [x] 9. Update main game component integration
  - Modify `app/game.tsx` to use ResponsiveGameContainer
  - Ensure existing game state and props are passed correctly
  - Test integration with existing game functionality
  - _Requirements: 4.5, 5.5_

- [x] 10. Implement error handling and permissions
  - [x] 10.1 Add voice permission handling
    - Create permission request utilities
    - Add user-friendly error messages for permission denials
    - Handle graceful fallbacks when voice features are unavailable
    - _Requirements: 6.9, 6.10_

  - [x] 10.2 Add speech recognition error handling
    - Handle network errors, no speech detected, and other STT errors
    - Provide visual feedback for error states
    - _Requirements: 6.10, 6.11_

- [ ] 11. Add smooth transitions and animations
  - Implement tab transition animations for phone layout using react-native-reanimated
  - Add modal appearance/disappearance animations for tablet layout
  - Ensure smooth orientation change handling with LayoutAnimation
  - Wrap interfaces in SafeAreaView to avoid notch/status bar issues
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 12. Testing and validation
  - [ ] 12.1 Test device detection and layout switching
    - Verify correct layout selection based on screen size
    - Test orientation changes and responsive behavior
    - _Requirements: 3.4, 3.5_

  - [ ] 12.2 Test voice integration functionality
    - **CRITICAL**: Test speech recognition accuracy on real devices (simulators have limitations)
    - Configure Android emulator with "virtual mic uses host audio input" if needed
    - Note: iOS simulator returns canned responses for speech recognition
    - Test text-to-speech with different voices and settings
    - Verify permission handling on both iOS and Android
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 12.3 Test state management and persistence
    - Verify chat messages persist across app restarts
    - Test state synchronization between layouts
    - Verify settings persistence and application
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 12.4 Add automated voice flow testing
    - Create CI/E2E tests for voice flows: record → transcribe → speak
    - Test error scenarios and fallback behaviors
    - Verify voice settings are applied correctly
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
