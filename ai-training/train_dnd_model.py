#!/usr/bin/env python3
"""
One-click D&D Model Training for CactusAI
Usage: python train_dnd_model.py
"""

import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path


def check_environment():
    """Check if environment is ready for training."""
    try:
        import torch
        import transformers
        print(f"✅ PyTorch {torch.__version__} detected")
        print(f"✅ Transformers {transformers.__version__} detected")

        # Check for GPU
        if torch.cuda.is_available():
            print(f"✅ CUDA GPU available: {torch.cuda.get_device_name()}")
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            print("✅ Apple Silicon GPU (MPS) available")
        else:
            print("⚠️  CPU training (slower but works)")

        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        return False

def check_unsloth():
    """Check if Unsloth is installed."""
    try:
        import unsloth
        print(f"✅ Unsloth available")
        return True
    except ImportError:
        print("📦 Unsloth not found, installing...")
        return False

def install_dependencies():
    """Install required packages for Apple Silicon."""
    print("📦 Installing training dependencies...")

    # Check if we're in a virtual environment
    in_venv = hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix)
    if not in_venv:
        print("⚠️  Warning: Not in a virtual environment. Consider using 'python -m venv venv' first.")

    import platform
    if platform.machine() == 'arm64':  # Apple Silicon
        print("🍎 Detected Apple Silicon, using optimized installation...")

        # Install PyTorch with MPS support first
        print("Installing PyTorch with MPS support...")
        subprocess.run([
            sys.executable, "-m", "pip", "install",
            "torch", "torchvision", "torchaudio", "--index-url", "https://download.pytorch.org/whl/cpu"
        ], check=False)

        # Install Unsloth for Apple Silicon
        print("Installing Unsloth...")
        result = subprocess.run([
            sys.executable, "-m", "pip", "install",
            "unsloth[apple-mps]", "--no-deps"
        ], capture_output=True, text=True)

        if result.returncode != 0:
            print("Trying alternative Unsloth installation...")
            subprocess.run([
                sys.executable, "-m", "pip", "install", "unsloth"
            ], check=False)

        # Install other dependencies
        other_packages = [
            "datasets",
            "accelerate",
            "trl",
            "peft",
            "transformers>=4.30.0"
        ]

    else:
        # Linux/Windows installation
        other_packages = [
            "unsloth[colab-new]",
            "datasets",
            "transformers>=4.30.0",
            "accelerate",
            "bitsandbytes",
            "trl",
            "peft"
        ]

    for package in other_packages:
        print(f"Installing {package}...")
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", package, "--quiet"
        ], capture_output=True, text=True)

        if result.returncode != 0:
            print(f"⚠️  Warning: Failed to install {package}")
            print(f"Error: {result.stderr}")

    print("✅ Dependencies installation completed!")

def load_training_data():
    """Load D&D training data from markdown files."""
    print("📚 Loading D&D training data...")

    data_dir = Path("data/scenarios")
    training_data = []

    if not data_dir.exists():
        print("⚠️  No training data directory found, using sample data")
        return None

    # Recursively find all markdown files
    md_files = list(data_dir.rglob("*.md"))

    if not md_files:
        print("⚠️  No markdown training files found, using sample data")
        return None

    print(f"📖 Found {len(md_files)} training files")

    for md_file in md_files:
        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()

            # Parse the markdown format
            sections = content.split('\n# ')
            if len(sections) < 3:
                continue

            system_content = ""
            conversations = []

            for section in sections:
                section = section.strip()
                if not section:
                    continue

                if section.startswith('SYSTEM'):
                    system_content = section.replace('SYSTEM\n', '').strip()
                elif section.startswith('USER'):
                    user_content = section.replace('USER\n', '').strip()
                    conversations.append({"role": "user", "content": f"Context:\n{system_content}\n\nPlayer: {user_content}"})
                elif section.startswith('DM'):
                    dm_content = section.replace('DM\n', '').strip()
                    conversations.append({"role": "assistant", "content": dm_content})
                elif section.startswith('TOOLCALL'):
                    # Skip toolcall sections for now - they're handled in DM responses
                    continue

            if len(conversations) >= 2:  # Need at least user + assistant
                # Add system message at the beginning
                full_conversation = [{"role": "system", "content": "You are a Dungeon Master assistant for D&D 5e. You help with gameplay, rules, and story generation. Use tool calls when needed for game mechanics."}]
                full_conversation.extend(conversations)
                training_data.append({"conversations": full_conversation})

        except Exception as e:
            print(f"⚠️  Error processing {md_file}: {e}")
            continue

    print(f"✅ Loaded {len(training_data)} training conversations")
    return training_data

def train_model():
    """Execute the training process."""
    print("🚀 Starting D&D model training...")

    # Try to import Unsloth first, fallback to standard transformers
    use_unsloth = True
    try:
        import torch
        from datasets import Dataset
        from transformers import TrainingArguments
        from trl import SFTTrainer
        from unsloth import FastLanguageModel
        from unsloth.chat_templates import get_chat_template
        print("✅ Using Unsloth for optimized training")
    except ImportError as e:
        print(f"⚠️  Unsloth not available: {e}")
        print("🔄 Falling back to standard transformers training...")
        use_unsloth = False

        try:
            import torch
            from datasets import Dataset
            from peft import LoraConfig, get_peft_model
            from transformers import (AutoModelForCausalLM, AutoTokenizer,
                                      DataCollatorForLanguageModeling,
                                      TrainingArguments)
            from trl import SFTTrainer
            print("✅ Using standard transformers with LoRA")
        except ImportError as e:
            print(f"❌ Failed to import training libraries: {e}")
            print("💡 Try running: pip install datasets transformers accelerate trl peft")
            return False

    # Training configuration
    CONFIG = {
        "model_name": "unsloth/gemma-3-2b-it",
        "max_seq_length": 2048,
        "load_in_4bit": True,
        "r": 16,
        "target_modules": ["q_proj", "k_proj", "v_proj", "o_proj",
                          "gate_proj", "up_proj", "down_proj"],
        "lora_alpha": 16,
        "lora_dropout": 0,
        "per_device_train_batch_size": 2,
        "gradient_accumulation_steps": 4,
        "warmup_steps": 5,
        "max_steps": 60,
        "learning_rate": 2e-4,
        "output_dir": "./trained_models",
        "model_save_name": "dnd_gemma3_2b",
        "gguf_quantization": "q4_k_m",
        "system_message": "You are a Dungeon Master assistant for D&D 5e. You help with gameplay, rules, and story generation. Use tool calls when needed for game mechanics."
    }

    print(f"📥 Loading model: {CONFIG['model_name']}")

    if use_unsloth:
        # Load model with Unsloth
        model, tokenizer = FastLanguageModel.from_pretrained(
            model_name=CONFIG["model_name"],
            max_seq_length=CONFIG["max_seq_length"],
            dtype=None,
            load_in_4bit=CONFIG["load_in_4bit"],
        )

        # Configure LoRA with Unsloth
        model = FastLanguageModel.get_peft_model(
            model,
            r=CONFIG["r"],
            target_modules=CONFIG["target_modules"],
            lora_alpha=CONFIG["lora_alpha"],
            lora_dropout=CONFIG["lora_dropout"],
            bias="none",
            use_gradient_checkpointing="unsloth",
            random_state=42,
        )

        print(f"✅ Model loaded with {model.get_nb_trainable_parameters()[0]:,} trainable parameters")

    else:
        # Load model with standard transformers
        model = AutoModelForCausalLM.from_pretrained(
            CONFIG["model_name"],
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map="auto" if torch.cuda.is_available() else None,
        )

        tokenizer = AutoTokenizer.from_pretrained(CONFIG["model_name"])
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        # Configure LoRA with PEFT
        lora_config = LoraConfig(
            r=CONFIG["r"],
            lora_alpha=CONFIG["lora_alpha"],
            target_modules=CONFIG["target_modules"],
            lora_dropout=CONFIG["lora_dropout"],
            bias="none",
            task_type="CAUSAL_LM",
        )

        model = get_peft_model(model, lora_config)

        # Count trainable parameters
        trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
        print(f"✅ Model loaded with {trainable_params:,} trainable parameters")

    # Load training data from files
    training_data = load_training_data()

    # Fallback to sample data if no files found
    if not training_data:
        print("📝 Using sample D&D training data...")
        training_data = [
            {
                "conversations": [
                    {"role": "system", "content": CONFIG["system_message"]},
                    {"role": "user", "content": "Context:\nRole: Dungeon Master\nWorld: Forgotten Realms\nLocation: Tavern\nParty: Thordak (Dragonborn Fighter, Level 5, HP: 45/45)\n\nPlayer: I want to approach the bartender and ask about rumors in town."},
                    {"role": "assistant", "content": "The burly half-orc bartender looks up as you approach. 'What'll it be?' he grunts, wiping a mug with a questionably clean rag.\n\nWhen you ask about rumors, he leans in closer. 'Well, there's been talk of strange lights in the old tower north of town. Some say it's ghosts, others say it's that crazy wizard Zandor up to no good again.'\n\nHe eyes you up and down. 'You lot look capable. Thinking of checking it out? Make a perception check first.' [roll: perception]"}
                ]
            },
            {
                "conversations": [
                    {"role": "system", "content": CONFIG["system_message"]},
                    {"role": "user", "content": "Context:\nRole: Dungeon Master\nWorld: Forgotten Realms\nLocation: Combat\nParty: Elara (Elf Wizard, Level 5, HP: 28/28), Grimm (Dwarf Cleric, Level 5, HP: 38/38)\n\nPlayer: I want to cast Magic Missile at the goblin."},
                    {"role": "assistant", "content": "Elara raises her hands and three glowing darts of magical force streak toward the goblin. Magic Missile automatically hits, so no attack roll needed.\n\nRoll 3d4+3 for damage. [roll: 3d4+3]\n\nThe goblin staggers as the magical darts strike, looking badly wounded but still standing."}
                ]
            },
            {
                "conversations": [
                    {"role": "system", "content": CONFIG["system_message"]},
                    {"role": "user", "content": "Context:\nRole: Dungeon Master\nWorld: Forgotten Realms\nLocation: Combat\nParty: Sara (Human Fighter, Level 6, HP: 32/58)\n\nPlayer: I'm badly injured. I want to use my Second Wind ability."},
                    {"role": "assistant", "content": "Sara draws upon her inner reserves of stamina. As a bonus action, you can use Second Wind to regain hit points.\n\nRoll 1d10 + 6 (your fighter level) to see how many hit points you recover. [roll: 1d10+6]\n\nYou feel a surge of vitality as you catch your second wind in the heat of battle. [health: Sara, +rolled_amount]"}
                ]
            }
        ]

    # Prepare dataset
    dataset = Dataset.from_list(training_data)

    # Apply chat template
    tokenizer = get_chat_template(tokenizer, chat_template="gemma")

    def formatting_prompts_func(examples):
        convos = examples["conversations"]
        texts = [tokenizer.apply_chat_template(convo, tokenize=False, add_generation_prompt=False) for convo in convos]
        return {"text": texts}

    dataset = dataset.map(formatting_prompts_func, batched=True)

    print("📚 Training data prepared")

    # Setup trainer
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        dataset_text_field="text",
        max_seq_length=CONFIG["max_seq_length"],
        dataset_num_proc=2,
        packing=False,
        args=TrainingArguments(
            per_device_train_batch_size=CONFIG["per_device_train_batch_size"],
            gradient_accumulation_steps=CONFIG["gradient_accumulation_steps"],
            warmup_steps=CONFIG["warmup_steps"],
            max_steps=CONFIG["max_steps"],
            learning_rate=CONFIG["learning_rate"],
            fp16=not torch.cuda.is_bf16_supported(),
            bf16=torch.cuda.is_bf16_supported(),
            logging_steps=1,
            optim="adamw_8bit",
            weight_decay=0.01,
            lr_scheduler_type="linear",
            seed=42,
            output_dir=CONFIG["output_dir"],
            save_strategy="no",
            logging_dir="./logs",
            remove_unused_columns=False,
            report_to=None,
        ),
    )

    print("🏋️‍♂️ Starting training...")
    start_time = datetime.now()

    # Train the model
    trainer_stats = trainer.train()

    end_time = datetime.now()
    training_time = end_time - start_time

    print(f"✅ Training completed in {training_time}")
    print(f"Final loss: {trainer_stats.training_loss:.4f}")

    # Save model
    model_save_path = f"{CONFIG['output_dir']}/{CONFIG['model_save_name']}"
    model.save_pretrained(model_save_path)
    tokenizer.save_pretrained(model_save_path)

    print(f"💾 Model saved to: {model_save_path}")

    # Export to GGUF for CactusAI
    gguf_save_path = f"{model_save_path}_gguf"

    print("📦 Exporting to GGUF format...")
    model.save_pretrained_gguf(
        gguf_save_path,
        tokenizer,
        quantization_method=CONFIG["gguf_quantization"]
    )

    # Create CactusAI configuration
    cactus_config = {
        "model": {
            "name": CONFIG["model_save_name"],
            "type": "gguf",
            "path": f"./{CONFIG['model_save_name']}_gguf",
            "quantization": CONFIG["gguf_quantization"],
            "context_length": CONFIG["max_seq_length"]
        },
        "system_prompt": CONFIG["system_message"],
        "generation_config": {
            "temperature": 0.7,
            "top_p": 0.9,
            "top_k": 40,
            "repeat_penalty": 1.1,
            "max_tokens": 512
        },
        "tools": {
            "enabled": True,
            "format": "[{tool_name}: {arguments}]",
            "supported": ["roll", "health", "inventory", "spellcast", "check", "save"]
        }
    }

    # Save CactusAI config
    config_path = os.path.join(gguf_save_path, "cactus_config.json")
    with open(config_path, 'w') as f:
        json.dump(cactus_config, f, indent=2)

    # Get model file info
    gguf_files = [f for f in os.listdir(gguf_save_path) if f.endswith('.gguf')]

    print("\n" + "="*60)
    print("🎉 D&D MODEL READY FOR CACTUSAI!")
    print("="*60)
    print(f"📁 GGUF Location: {gguf_save_path}")
    print(f"📄 Config File: {config_path}")
    print(f"📦 Model Files: {', '.join(gguf_files)}")
    print(f"⚡ Training Time: {training_time}")
    print(f"🎯 Final Loss: {trainer_stats.training_loss:.4f}")
    print("\n🔧 To integrate with CactusAI:")
    print(f"1. Copy {gguf_save_path}/*.gguf to your CactusAI models directory")
    print(f"2. Use the configuration in {config_path}")
    print(f"3. Test with D&D scenarios!")
    print("="*60)

    return True

def main():
    """Main execution function."""
    print("🐉 D&D Model Training for CactusAI")
    print("="*40)

    # Check environment
    if not check_environment():
        print("Installing dependencies...")
        install_dependencies()

        # Re-check after installation
        if not check_environment():
            print("❌ Environment setup failed")
            return False

    # Train the model
    success = train_model()

    if success:
        print("\n🎊 Training completed successfully!")
        print("Your D&D model is ready for CactusAI integration!")
    else:
        print("\n💥 Training failed. Check the output above for errors.")

    return success

if __name__ == "__main__":
    main()
