# Setting Up Local Models for AI D&D App

## Overview

The app now supports loading AI models from local build folders instead of downloading them from Hugging Face. This avoids authentication issues and provides better reliability.

## Model Setup Instructions

### 1. Create Models Directory

First, create the models directory in your assets folder:

```bash
mkdir -p assets/models
```

### 2. Download Model Using Hugging Face CLI

Use the Hugging Face CLI to download the model (this requires authentication):

```bash
# Install huggingface_hub if you haven't already
pip install huggingface_hub

# Login to Hugging Face (you'll need a token)
huggingface-cli login

# Download the model to your assets/models directory
huggingface-cli download unsloth/gemma-3n-E2B-it-GGUF gemma-3n-E2B-it-Q4_K_S.gguf --local-dir assets/models
```

### 3. Alternative: Manual Download

If you prefer to download manually:

1. Go to: https://huggingface.co/unsloth/gemma-3n-E2B-it-GGUF/tree/main
2. Download the `gemma-3n-E2B-it-Q4_K_S.gguf` file
3. Place it in `assets/models/` directory

### 4. Verify File Structure

Your directory structure should look like:

```
ai-dnd-expo/
├── assets/
│   ├── models/
│   │   └── gemma-3n-E2B-it-Q4_K_S.gguf  # ~1.1GB file
│   ├── images/
│   └── ...
└── ...
```

### 5. Test the Local Provider

1. Open the app
2. Tap "🧪 AI Debug Tests"
3. Try the "📁 Cactus Local Provider" (blue button)
4. It should find and load the local model file

## Model Specifications

- **Model**: Gemma-3n-E2B-IT (Instruction Tuned)
- **Format**: GGUF (optimized for mobile)
- **Quantization**: Q4_K_S (superior quality, optimized for mobile)
- **Size**: ~1.1GB
- **Context**: 8192 tokens
- **Performance**: Excellent for mobile devices
- **Special Features**:
  - Optimized by Unsloth for better performance
  - Smaller size than standard Gemma models
  - Better instruction following capabilities

## Troubleshooting

### Model File Not Found

If you get "Model file not found" error:

- Check that the file exists in `assets/models/`
- Verify the filename matches exactly: `gemma-3n-E2B-it-Q4_K_S.gguf`
- Make sure the file size is reasonable (~1.1GB)

### Model File Too Small

If you get "Model file appears to be too small" error:

- The download may have failed
- Re-download the model file
- Check your internet connection

### Cactus LM Initialization Fails

If Cactus LM fails to initialize:

- The app will automatically fall back to rule-based AI
- This still provides full D&D functionality
- Check the debug info for specific error details

## Next Steps

1. **Download the model** using the instructions above
2. **Test the local provider** in the debug test suite
3. **If it works**: The app will use the local model for AI responses
4. **If it fails**: The app will use rule-based fallback (still fully functional)

The local model approach should resolve the 401 authentication errors and provide a more reliable AI experience!
