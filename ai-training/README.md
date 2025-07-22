# D&D GGUF Model Training with Unsloth

This directory contains tools and notebooks for fine-tuning Gemma3N models specifically for D&D gameplay using Unsloth framework. The trained models export to GGUF format for local deployment with Cactus AI.

## Quick Start

### 1. Environment Setup

```bash
# Navigate to ai-training directory
cd ai-training

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Launch Jupyter notebook
jupyter notebook notebooks/train_gguf_model.ipynb
```

### 2. Run Training Notebook

Open `notebooks/train_gguf_model.ipynb` and follow the step-by-step process:

1. Environment validation and dependency installation
2. Model loading (Gemma 3-2B or 3-4B)
3. D&D training data processing
4. Fine-tuning with LoRA adapters
5. GGUF export for Cactus AI integration

## System Requirements

### Hardware Requirements

- **RAM**: 16GB+ minimum (32GB+ recommended)
- **Disk Space**: 50GB+ free space required
- **GPU**: 8GB+ VRAM recommended
  - NVIDIA GPU with CUDA 11.8+ support, or
  - Apple Silicon (M1/M2/M3) with Metal Performance Shaders
  - CPU training supported but slower

### Software Requirements

- **Python**: Version 3.9-3.11 required
- **Operating System**: macOS, Linux, or Windows
- **Jupyter**: For running training notebooks
- **CUDA**: 11.8+ for NVIDIA GPU acceleration

## Training Framework: Unsloth

### Key Benefits

- **2x faster training** compared to standard methods
- **70% less VRAM usage** through optimized kernels
- **Native GGUF export** for direct Ollama/llama.cpp compatibility
- **No accuracy loss** with 4-bit quantization
- **Apple Silicon support** with Metal Performance Shaders

### Supported Models

- `unsloth/gemma-3-2b-it` - Recommended for most use cases (faster training)
- `unsloth/gemma-3-4b-it` - Better quality but requires more VRAM
- `unsloth/gemma-3n-E2B-it` - Multimodal variant (experimental)
- `unsloth/gemma-3n-E4B-it` - Larger multimodal variant

## Training Data Format

### Markdown Scenario Structure

```markdown
# SYSTEM

Role: Dungeon Master
World: Forgotten Realms
Location: Tavern
Party:

- Thordak (Dragonborn Fighter, Level 5, HP: 45/45)

# USER

I want to approach the bartender and ask about rumors in town.

# DM

The burly half-orc bartender looks up as you approach...
Make a perception check. [roll: perception]

# TOOLCALL

perception: 15 + 10(skill) = _25_
```

### Supported D&D Tools

- `[roll: dice_expression]` - Dice rolls (d20, 3d6+2, etc.)
- `[health: character, +/-amount]` - Health management
- `[inventory: character, +/-item]` - Inventory updates
- `[spellcast: spell_name, level, target]` - Spell casting
- `[check: skill_name]` - Skill/ability checks
- `[save: save_type]` - Saving throws

## Configuration Options

### Training Hyperparameters

```python
CONFIG = {
    # Model selection
    "model_name": "unsloth/gemma-3-2b-it",
    "max_seq_length": 2048,
    "load_in_4bit": True,

    # LoRA settings
    "r": 16,                    # LoRA rank (higher = more parameters)
    "lora_alpha": 16,          # LoRA scaling factor
    "lora_dropout": 0,         # Dropout rate (0 for better convergence)

    # Training parameters
    "learning_rate": 2e-4,     # Learning rate
    "max_steps": 60,           # Training steps (adjust for dataset size)
    "batch_size": 2,           # Batch size per device
    "gradient_accumulation_steps": 4,

    # Export settings
    "gguf_quantization": "q4_k_m"  # Q4_K_M, Q5_K_M, Q8_0, F16, F32
}
```

### Memory Optimization

- **4-bit quantization**: Reduces VRAM usage by ~75%
- **Gradient checkpointing**: Trades compute for memory
- **LoRA adapters**: Only trains 1-10% of model parameters
- **Batch size tuning**: Adjust based on available VRAM

## GGUF Export and Quantization

### Available Quantization Levels

- `F32`: Full precision (largest, best quality)
- `F16`: Half precision (balanced)
- `Q8_0`: 8-bit quantization
- `Q5_K_M`: Medium 5-bit (recommended)
- `Q4_K_M`: Medium 4-bit (default, good balance)
- `Q4_0`: Basic 4-bit (smallest, fastest)

### Export Process

The notebook automatically:

1. Saves model in Hugging Face format
2. Converts to GGUF with specified quantization
3. Generates metadata and integration files
4. Creates Cactus AI configuration templates

## Cactus AI Integration

### Generated Files

After training completion, you'll find:

- `trained_models/dnd_gemma3_2b_gguf/` - GGUF model files
- `model_metadata.json` - Training information and metrics
- `cactus_config.json` - Cactus AI configuration
- `integration_instructions.md` - Step-by-step integration guide

### Integration Steps

1. Copy GGUF files to Cactus models directory
2. Update Cactus configuration with new model path
3. Configure tool calling format: `[tool_name: arguments]`
4. Test with D&D scenarios to validate functionality

## Performance Benchmarks

### Training Speed (approximate)

| Hardware        | Model Size | Steps/sec | Total Time (60 steps) |
| --------------- | ---------- | --------- | --------------------- |
| RTX 4090 (24GB) | Gemma-3-2B | ~0.8      | ~75 seconds           |
| RTX 3080 (10GB) | Gemma-3-2B | ~0.5      | ~120 seconds          |
| M2 Max (64GB)   | Gemma-3-2B | ~0.3      | ~200 seconds          |
| CPU (32GB RAM)  | Gemma-3-2B | ~0.05     | ~20 minutes           |

### Model Sizes (post-quantization)

| Quantization | Gemma-3-2B | Gemma-3-4B | Mobile Compatible |
| ------------ | ---------- | ---------- | ----------------- |
| Q4_K_M       | ~1.8GB     | ~3.2GB     | ✅ iOS/Android    |
| Q5_K_M       | ~2.2GB     | ~3.8GB     | ✅ iOS (limited)  |
| Q8_0         | ~3.1GB     | ~5.5GB     | ❌ Too large      |
| F16          | ~6.2GB     | ~11GB      | ❌ Too large      |

## Troubleshooting

### Common Issues

**Out of Memory Errors**

- Reduce `per_device_train_batch_size` from 2 to 1
- Increase `gradient_accumulation_steps` to maintain effective batch size
- Enable 4-bit quantization with `load_in_4bit: True`
- Use smaller model variant (2B instead of 4B)

**CUDA/GPU Issues**

- Verify CUDA installation: `nvidia-smi`
- Check PyTorch CUDA compatibility: `torch.cuda.is_available()`
- Update GPU drivers to latest version
- Try `torch.cuda.empty_cache()` between cells

**Apple Silicon Issues**

- Ensure Xcode Command Line Tools installed
- Check MPS availability: `torch.backends.mps.is_available()`
- Use smaller batch sizes due to unified memory
- Update to latest PyTorch nightly for best MPS support

**Training Convergence Issues**

- Check training data quality and diversity
- Adjust learning rate (try 1e-4 or 5e-5)
- Increase warmup steps for stability
- Monitor loss curves for overfitting

### Performance Optimization

**For Faster Training**

- Use `bf16` precision on supported hardware
- Enable gradient checkpointing: `"unsloth"`
- Use larger batch sizes if VRAM allows
- Pre-process and cache datasets

**For Better Quality**

- Increase LoRA rank (`r`) from 16 to 32 or 64
- Use more training steps with diverse data
- Lower learning rate for fine-grained adjustments
- Use higher precision quantization (Q5_K_M, Q8_0)

## Directory Structure

```
ai-training/
├── README.md                    # This file
├── requirements.txt             # Python dependencies
├── notebooks/
│   └── train_gguf_model.ipynb  # Main training notebook
├── data/                        # Training data (markdown scenarios)
├── trained_models/              # Output directory for trained models
├── scripts/                     # Validation and utility scripts
├── validation/                  # System validation results
└── venv/                       # Python virtual environment
```

## Next Steps

1. **Run the training notebook** to create your first D&D model
2. **Create custom training data** with your specific D&D scenarios
3. **Integrate with Cactus AI** following the generated instructions
4. **Iterate and improve** based on performance in your D&D sessions
5. **Share and collaborate** with the D&D AI community

For detailed implementation, open and run `notebooks/train_gguf_model.ipynb`.
