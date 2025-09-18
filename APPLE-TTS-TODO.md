# Apple On‑Device TTS Implementation Plan

This document captures the full, step‑by‑step plan to replace the current placeholder Text‑to‑Speech (TTS) implementation with a real, on‑device Apple AI SDK integration.

---

## ✅ TODO LIST

```markdown
- [x] **1️⃣ Create platform‑specific TTS hook (iOS)**
  - File: `hooks/use-text-to-speech.ios.ts`
  - Export a hook that:
    - Lazily imports `@react-native-ai/apple` (`apple`, `AppleSpeech`).
    - Checks iOS version ≥ 13 and `Platform.OS === 'ios'`.
    - Requests Personal Voice permission if needed.
    - Loads the voice catalog via `AppleSpeech.getVoices()` and stores it in state.
    - Provides `speak(text, options)` that:
      - Calls `AppleSpeech.generate(text, {voice, language})` (or uses the provider’s `experimental_generateSpeech` wrapper).
      - Receives `{audio:{uint8Array, base64}}`.
      - Creates an `Audio.Sound` (from `expo-av`) from the Uint8Array/WAV buffer.
      - Plays the sound, fires `onStart`, `onDone`, handles errors via `onError`.
    - Implements real `stop`, `pause`, `resume` using the `Audio.Sound` API.
    - Cleans up the sound object on unmount.
    - Sets `isAvailable` to `true` only after successful voice load; otherwise `false`.

- [x] **2️⃣ Add fallback (non‑iOS) hook**
  - File: `hooks/use-text-to-speech.ts`
  - Export the generic hook that re‑exports:
    ```ts
    export const useTextToSpeech = Platform.OS === 'ios'
      ? require('./use-text-to-speech.ios').useTextToSpeech
      : require('./use-text-to-speech.stub').useTextToSpeech;
    ```
  - Create `hooks/use-text-to-speech.stub.ts` containing the current simulated implementation (timeout‑based) for Android/Web.

- [ ] **3️⃣ Centralise voice type**
  - File: `types/voice.ts`
  - Add/export:
    ```ts
    export interface AppleVoice {
      identifier: string;
      name: string;
      language: string;
      quality: 'default' | 'enhanced' | 'premium';
      isPersonalVoice?: boolean;
      isNoveltyVoice?: boolean;
    }
    export type TTSVoice = AppleVoice;
    ```
  - Update imports in hook files to use this type.

- [ ] **4️⃣ Extend AppleAIProvider with speech generation**
  - File: `services/ai/providers/apple-ai-provider.ts`
  - Add a new method:
    ```ts
    async generateSpeech(params: {
      text: string;
      voice?: string;
      language?: string;
    }): Promise<{audio:{uint8Array:Uint8Array; base64:string}}>
    ```
    - Internally lazy‑imports `AppleSpeech` and `apple.speechModel`.
    - Calls `AppleSpeech.generate(text, {voice, language})` (or via `experimental_generateSpeech`).
    - Returns the audio payload.
  - Update `WorkingAIProviderInterface` (in `services/ai/providers/working-ai-provider.ts`) to include this method.

- [ ] **5️⃣ Update DM / other consumers to use the new provider**
  - Refactor any direct calls to `experimental_generateSpeech` to use the new `AppleAIProvider.generateSpeech` method.
  - Ensure error handling propagates to UI.

- [ ] **6️⃣ Write comprehensive unit tests for the iOS hook**
  - File: `tests/unit/hooks/use-text-to-speech.test.ts`
  - Use `renderHook` (or the repository’s `render-helpers`) to test:
    1. Mock `@react-native-ai/apple` and `expo-av` (Audio.Sound).
    2. Verify `isAvailable` becomes true on iOS mock.
    3. Verify `availableVoices` matches mocked list.
    4. Call `speak` and assert:
       - `AppleSpeech.generate` called with correct model, voice, language.
       - `Audio.Sound.loadAsync` receives proper WAV data.
       - `onStart` fires before playback, `onDone` fires after playback resolves.
    5. Test `stop`, `pause`, `resume` invoke the corresponding `Audio.Sound` methods.
    6. Simulate errors (voice list failure, generation rejection) and assert `onError` is called and `isAvailable` is set appropriately.
  - Keep existing stub tests for non‑iOS platforms unchanged.

- [ ] **7️⃣ Add integration test (optional but recommended)**
  - Run on an iOS simulator using the Xcode‑MCP tools.
  - Mount a component that uses `useTextToSpeech`, trigger `speak`, and verify via simulator logs that audio playback started (or inspect the `Audio.Sound` mock).

- [ ] **8️⃣ Documentation updates**
  - In `hooks/use-text-to-speech.ts` header comment: explain lazy import, permission flow, and why a stub exists for other platforms.
  - Update `README` or add `docs/tts-implementation.md` with a short guide for future contributors.

- [ ] **9️⃣ Run lint, type‑check, and full test suite**
  - `npm run check` (ESLint + TypeScript) – fix any new type errors (especially after updating interfaces).
  - `npm test` – ensure all existing tests still pass and new tests succeed.

- [ ] **🔟 Commit & PR**
  - Stage only files touched by the above steps.
  - Write a concise commit message, e.g.:
    `Add real on‑device Apple TTS implementation with proper hook, provider, and tests`
  - Create a PR, reference the related issue/feature ticket, and request review.
```

---

### Execution Flow Summary
1. **Platform‑specific hook** – loads voices, generates speech, plays audio via `expo‑av`.
2. **Fallback stub** – retains existing timeout‑based behaviour for non‑iOS platforms.
3. **Provider extension** – centralises speech generation logic and adds it to the AI provider interface.
4. **Tests** – mock Apple SDK and `expo‑av`, verify all success and error paths.
5. **Documentation & CI** – keep the codebase maintainable and ensure the new feature does not break existing functionality.

Once each checklist item is marked complete, the repository will ship a fully‑functional, high‑quality on‑device Apple TTS experience.
```