# On-Device LLM Integration Setup

This document explains how to set up on-device AI inference for D&D gameplay using ONNX Runtime with the Gemma 3n-E2B model.

## Current Implementation

The system now supports two modes:

1. **On-Device ONNX** (Primary) - Uses onnxruntime-react-native with Gemma 3n-E2B model
2. **Fallback Mode** (Backup) - Uses rule-based responses when model fails

## How It Works

### 1. Automatic Model Loading

The LLM model loads automatically when the app starts:

```typescript
// Model configuration in use-dungeon-master.ts
const gemmaModel = useGemmaModel({
  modelPath:
    'https://huggingface.co/onnx-community/gemma-3n-E2B-it-ONNX/resolve/main/onnx/model.onnx',
  maxTokens: 150,
  temperature: 0.7,
  useOnDevice: true,
});
```

### 2. Model Download

The first time you run the app:

- Model downloads automatically from HuggingFace
- ~2GB download (Gemma 3n-E2B model in ONNX format)
- Cached locally for future use
- Progress shown in console logs

### 3. Performance Configurations

Choose based on your device capabilities:

```typescript
// Performance (faster, shorter responses)
const gemmaModel = useGemmaModel(GemmaPresets.performance);

// Quality (slower, longer responses)
const gemmaModel = useGemmaModel(GemmaPresets.quality);

// Balanced (recommended)
const gemmaModel = useGemmaModel(GemmaPresets.balanced);
```

## Model Capabilities

**Gemma 3n-E2B ONNX Features:**

- 3 billion parameters (compressed and quantized)
- 2K token context window
- ONNX optimized for mobile inference
- Instruction-tuned for conversational tasks

**D&D Integration:**

- Contextual responses based on character and scene
- Dice notation parsing: `[ROLL:1d20+3]`
- Character updates: `[UPDATE:HP-5]`
- Rule lookups and combat management

## Testing On-Device Inference

1. Start the app (no setup required)
2. Wait for model download on first launch
3. Begin a game and send player actions
4. Check console for "Gemma ONNX model ready!"

## Performance Considerations

**On-Device ONNX:**

- Latency: ~2-8 seconds per request
- Quality: High-quality conversational responses
- Memory: ~2GB model + runtime
- Privacy: All processing on-device

**Fallback Mode:**

- Latency: <100ms
- Quality: Rule-based, predictable
- Memory: Minimal
- Cost: Free

## Requirements

**Development:**

- Use a development client (not Expo Go)
- React Native 0.64.3+
- iOS 12+ / Android API 21+

**Runtime:**

- ~2.5GB free storage for model
- ~1GB RAM for inference
- CPU-based inference (no GPU required)

## Future Enhancements

1. **Larger Models** - Support 1B+ parameter models on high-end devices
2. **Fine-Tuning** - Train on D&D-specific data
3. **Model Switching** - Load different models for different game scenarios
4. **Response Caching** - Store responses for common actions

## Troubleshooting

**"Model download failed":**

- Check internet connection
- Ensure sufficient storage space
- Try restarting the app

**"Model not ready":**

- Wait for initial download to complete
- Check console logs for errors
- Verify fallback mode works first

**Slow responses:**

- Reduce max_tokens in configuration
- Use performance preset for faster responses
- Consider device capabilities
