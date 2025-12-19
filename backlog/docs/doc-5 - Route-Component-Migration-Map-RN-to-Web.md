---
id: doc-5
title: Route + Component Migration Map (RN to Web)
type: other
created_date: '2025-12-19 13:57'
---
# Route + Component Migration Map (RN to Web)

## Route Mapping Rules (Expo Router -> TanStack Router)
- `app/_layout.tsx` -> `src/routes/__root.tsx` (root layout).
- `app/+not-found.tsx` -> `src/components/NotFound.tsx` or `notFoundComponent` in `__root`.
- `app/index.tsx` -> `src/routes/index.tsx`.
- `[param]` -> `$param` (e.g., `app/characters/[id].tsx` -> `src/routes/characters.$id.tsx`).
- `[...splat]` -> splat param (`$splat`) per TanStack Router convention; validate naming in Start docs.
- `(group)` segments are pathless; map to `_pathless` layout or nested layout in TanStack Router.
- Nested folders translate to nested path segments (e.g., `app/admin/maps/[id].tsx` -> `src/routes/admin/maps.$id.tsx`).

## Route Mapping (Expo file -> TanStack route path)
- `app/index.tsx` -> `/`
- `app/login.tsx` -> `/login`
- `app/join-game.tsx` -> `/join-game`
- `app/new-game.tsx` -> `/new-game`
- `app/multiplayer-game.tsx` -> `/multiplayer-game`
- `app/licenses.tsx` -> `/licenses`
- `app/sql.tsx` -> `/sql`
- `app/party-test.tsx` -> `/party-test`
- `app/characters/index.tsx` -> `/characters`
- `app/characters/[id].tsx` -> `/characters/$id`
- `app/new-character/index.tsx` -> `/new-character`
- `app/new-character/[...selections].tsx` -> `/new-character/$selections` (splat)
- `app/auth/index.tsx` -> `/auth`
- `app/auth/callback.tsx` -> `/auth/callback`
- `app/auth/error.tsx` -> `/auth/error`
- `app/game/index.tsx` -> `/game`
- `app/game/[inviteCode].tsx` -> `/game/$inviteCode`
- `app/game/(tabs)/_layout.tsx` -> `/game` layout (pathless group)
- `app/game/(tabs)/index.tsx` -> `/game` tab default
- `app/game/(tabs)/map.tsx` -> `/game/map`
- `app/game/(tabs)/character.tsx` -> `/game/character`
- `app/game/(tabs)/dnd-model.tsx` -> `/game/dnd-model`
- `app/game/(tabs)/settings.tsx` -> `/game/settings`
- `app/host-game/index.tsx` -> `/host-game`
- `app/host-game/[id].tsx` -> `/host-game/$id`
- `app/host-game/[id]/[mapId].tsx` -> `/host-game/$id/$mapId`
- `app/admin/index.tsx` -> `/admin`
- `app/admin/images.tsx` -> `/admin/images`
- `app/admin/maps/index.tsx` -> `/admin/maps`
- `app/admin/maps/create.tsx` -> `/admin/maps/create`
- `app/admin/maps/[id].tsx` -> `/admin/maps/$id`
- `app/admin/worlds/index.tsx` -> `/admin/worlds`
- `app/admin/worlds/[id].tsx` -> `/admin/worlds/$id`

## RN-only Components (Rewrite Required)

### High Complexity (Canvas/gesture/animation)
- `components/skia-game-canvas.tsx` (Skia -> Canvas/WebGL)
- `components/svg-game-canvas.tsx` (react-native-svg -> DOM SVG)
- `components/game-canvas.tsx` (Platform-specific rendering)
- `components/map/interactive-map.tsx` (gesture + map interactions)
- `components/map/tile-action-menu.tsx` (modal + gesture)
- `components/map/tile-details-modal.tsx` (modal)
- `components/tablet-layout.tsx` (reanimated/layout)
- `components/animated-modal.tsx` (reanimated)
- `components/parallax-scroll-view.tsx` (reanimated)
- `components/command-palette.tsx` (safe-area + platform)

### Medium Complexity (media/voice/upload)
- `components/image-upload-modal.tsx` (image picker + file system + clipboard + sharing)
- `components/image-uploader.tsx` (document picker + upload)
- `components/vtt-map-import.tsx` (image picker)
- `components/voice-chat-button.tsx`
- `components/voice-chat-input.tsx`
- `components/voice-error-handler.tsx`
- `components/voice-status-indicator.tsx`

### Lower Complexity (UI primitives to HTML/CSS)
- `components/app-footer.tsx`
- `components/attribute-picker.tsx`
- `components/character-*` (sheet, list, view, review, modal)
- `components/class-chooser.tsx`
- `components/collapsible.tsx`
- `components/combat-result-modal.tsx`
- `components/connection-status-indicator.tsx`
- `components/dice-roll-overlay.tsx`
- `components/dm-action-banner.tsx`
- `components/dm-controls-panel.tsx`
- `components/dnd-model-chat.tsx`
- `components/email-input.tsx`
- `components/expo-icon*.tsx` (swap icon system)
- `components/external-link.tsx`
- `components/game-status-bar.tsx`
- `components/haptic-tab.tsx`
- `components/icon-picker.tsx`
- `components/invite-code-*`
- `components/location-chooser.tsx`
- `components/map-element-picker.tsx`
- `components/map-management-panel.tsx`
- `components/media-library-modal.tsx`
- `components/messages.tsx`
- `components/multiplayer-chat.tsx`
- `components/notifications-panel.tsx`
- `components/npc-selector.tsx`
- `components/player-*`
- `components/portrait-selector.tsx`
- `components/quest-selector.tsx`
- `components/race-chooser.tsx`
- `components/refresh-button.tsx`
- `components/responsive-game-container.tsx`
- `components/searchable-list.tsx`
- `components/settings-*`
- `components/skill-chooser.tsx`
- `components/spell-action-selector.tsx`
- `components/sprite-icon.tsx`
- `components/tavern-companion-recruitment.tsx`
- `components/themed-*`
- `components/tile-property-editor.tsx`
- `components/trait-chooser.tsx`
- `components/turn-based-chat.tsx`
- `components/turn-resource-values.tsx`
- `components/ui/*` (accordion, confirm-modal, icon-symbol, tab-bar-background)
- `components/world-chooser.tsx`

## Hooks / Stores / Services Needing Refactor

### Hooks
- `hooks/use-audio-player.*`
- `hooks/use-color-scheme*.ts`
- `hooks/use-character-creation.ts`
- `hooks/use-game-state.ts`
- `hooks/use-input-mode.tsx`
- `hooks/use-polling-game-state.ts`
- `hooks/use-screen-size.ts`
- `hooks/use-simple-companions.ts`
- `hooks/use-speech-recognition.ts`
- `hooks/use-text-to-speech*.ts`
- `hooks/use-voice-permissions.ts`
- `hooks/use-voice-recognition.ts`
- `hooks/api/use-*-queries.ts` (expo-auth-template client)

### Stores
- `stores/settings-store.ts` (AsyncStorage)

### Services
- `services/api/multiplayer-client.ts` (expo-auth-template)
- `services/api/websocket-client.ts` (expo-auth-template)
- `services/config/api-base-url.ts` (expo-constants)
- `services/character-voice-manager.ts` (expo-speech)
- `services/character-voice-registry.ts` (AsyncStorage)
- `services/dnd-model.ts` (expo-file-system)
- `services/tts/kokoro-client.ts` (expo-file-system + Platform)
- `services/voice-profiles.ts` (Platform)
- `services/ai/models/battery-optimizer.ts` (AppState)
- `services/ai/models/device-capability-manager.ts` (Platform)
- `services/ai/providers/platform-aware-provider.ts` (Platform)
- `services/ai/providers/working-ai-provider.ts` (Platform)

## Assumptions Requiring Integration/E2E Validation
- Grouped routes `(tabs)` and mixed `/game` routes do not conflict after TanStack Router mapping.
- Splat route mapping for `[...selections]` matches TanStack Start conventions.
- Auth flows across `/auth/*` and `/login` are compatible with cookie-based SSR and Worker auth endpoints.
- Web equivalents for gesture, reanimated, and safe-area behaviors preserve map interactions.
- WebGL/Canvas replacements for Skia and SVG map layers provide acceptable performance.
- Media capture, file uploads, and TTS/voice recognition workflows function end-to-end on web.
