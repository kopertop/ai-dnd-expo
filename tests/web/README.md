# Web Platform Testing Guide

This guide covers testing the AI D&D Platform on the web platform at `http://localhost:8081`.

## Prerequisites

1. **Ollama Server** (required for AI inference):
   - Install from https://ollama.ai
   - Pull a model: `ollama pull llama3.2`
   - Verify it's running: `curl http://localhost:11434/api/tags`

2. **Kokoro TTS Server** (optional, for TTS):
   - Follow Kokoro TTS setup instructions
   - Default endpoint: `http://localhost:5000`
   - Verify it's running: `curl http://localhost:5000/health`

3. **Environment Variables**:
   - Create `.env` file with required variables (see main README)

## Manual Testing Checklist

### 1. Application Startup
- [ ] App loads at `http://localhost:8081`
- [ ] No console errors on initial load
- [ ] Home screen displays correctly

### 2. Authentication
- [ ] Google sign-in button appears (if configured)
- [ ] Apple sign-in button appears (if configured, iOS/Safari only)
- [ ] Sign-in flow completes successfully
- [ ] Session persists after page refresh
- [ ] Sign-out works correctly

### 3. AI Provider Status
- [ ] Settings modal shows "Ollama Status"
- [ ] Status shows "✅ Connected" when Ollama is running
- [ ] Status shows "❌ Disconnected" when Ollama is not running
- [ ] Current provider displays correctly

### 4. TTS Provider Status
- [ ] Settings modal shows TTS provider status
- [ ] Shows "🎤 Kokoro" when Kokoro is configured
- [ ] Shows "❌ None" when no TTS provider is available
- [ ] TTS works when provider is available

### 5. Voice Features (Web Limitations)
- [ ] Speech-to-Text toggle is hidden on web
- [ ] Voice recording button is hidden on web
- [ ] Text-to-Speech toggle is visible and functional
- [ ] Auto-speak DM messages works when enabled

### 6. Game Creation
- [ ] New game button works
- [ ] Character creation wizard functions correctly
- [ ] All character creation steps work (world, location, race, class, etc.)
- [ ] Game state saves correctly

### 7. Gameplay
- [ ] Chat interface loads correctly
- [ ] DM responds to player messages
- [ ] Messages display correctly
- [ ] Tool commands (dice rolls, etc.) are processed
- [ ] Game state persists

### 8. Offline Mode
- [ ] App works when Ollama is offline (falls back to rule-based)
- [ ] Network status is displayed correctly
- [ ] Provider health updates when network changes

### 9. Error Handling
- [ ] Graceful fallback when Ollama is unavailable
- [ ] Error messages display correctly
- [ ] App doesn't crash on provider errors

## Automated Testing

Run web-specific tests:

```bash
npm run test
```

## Browser Compatibility

Tested browsers:
- Chrome/Edge (Chromium)
- Firefox
- Safari (macOS/iOS)

## Known Limitations

1. **Speech Recognition**: Not available on web (native only)
2. **Voice Recording**: Not available on web (native only)
3. **ONNX Runtime**: Not available on web (native only)
4. **Cactus Compute**: Not available on web (native only)

## Troubleshooting

### Ollama Connection Issues
- Verify Ollama is running: `curl http://localhost:11434/api/tags`
- Check `EXPO_PUBLIC_OLLAMA_BASE_URL` in `.env`
- Check browser console for CORS errors

### Kokoro TTS Issues
- Verify Kokoro server is running
- Check `EXPO_PUBLIC_TTS_BASE_URL` in `.env`
- Check browser console for connection errors

### Authentication Issues
- Verify OAuth client IDs are configured
- Check browser console for authentication errors
- Ensure redirect URIs are configured correctly

## Performance Testing

1. **Load Time**: App should load in < 3 seconds
2. **AI Response Time**: Ollama responses should complete in < 5 seconds
3. **TTS Generation**: Kokoro TTS should generate audio in < 2 seconds
4. **Memory Usage**: Monitor browser memory usage during gameplay

