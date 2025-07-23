#!/usr/bin/env python3
"""
Enhanced D&D Model Training with Incremental Training Support
Usage: python train_dnd_model_v2.py [--incremental] [--base-model PATH]
"""

import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path


class DNDModelTrainer:
    """D&D Model Trainer with incremental training support."""

    def __init__(self):
        self.base_model_path = None
        self.incremental_mode = False
        self.learning_rate = 2e-4
        self.epochs = None
        self.max_steps = 60

    def check_environment(self):
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

    def check_libraries(self):
        """Check if required libraries are installed."""
        try:
            import peft
            import transformers
            import trl
            print(f"✅ Training libraries available")
            return True
        except ImportError:
            return False

    def install_dependencies(self):
        """Install required packages."""
        print("📦 Installing training dependencies...")

        packages = [
            "torch",
            "transformers",
            "datasets",
            "accelerate",
            "peft",
            "trl",
            "bitsandbytes"
        ]

        for package in packages:
            print(f"Installing {package}...")
            subprocess.run([
                sys.executable, "-m", "pip", "install", package, "--quiet", "--upgrade"
            ], check=False)

        print("✅ Installation completed!")

    def load_training_data(self):
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

    def train(self):
        """Execute the training process."""
        print("🚀 Starting D&D model training...")

        if self.incremental_mode:
            print("🔄 Incremental training mode enabled")
            if self.base_model_path:
                print(f"📂 Base model: {self.base_model_path}")
        else:
            print("🆕 Full training mode")

        # Check environment
        if not self.check_environment():
            print("Installing basic dependencies...")
            self.install_dependencies()

            # Re-check after installation
            if not self.check_environment():
                print("❌ Environment setup failed")
                return False

        # Check and install training libraries
        if not self.check_libraries():
            print("📦 Installing training libraries...")
            self.install_dependencies()

            # Final check
            if not self.check_libraries():
                print("⚠️  Training library installation failed")
                return False

        return self._execute_training()

    def _execute_training(self):
        """Internal training execution."""
        # Use native HuggingFace transformers
        try:
            import torch
            from datasets import Dataset
            from peft import LoraConfig, PeftModel, get_peft_model
            from transformers import (AutoModelForCausalLM, AutoTokenizer,
                                      TrainingArguments)
            from trl import SFTTrainer
            print("✅ Using native HuggingFace transformers with LoRA")
        except ImportError as e:
            print(f"❌ Failed to import training libraries: {e}")
            print("💡 Try running: pip install datasets transformers accelerate trl peft")
            return False

        # Training configuration with reliable HuggingFace models
        possible_models = [
            "microsoft/DialoGPT-medium",
            "facebook/opt-350m",
            "EleutherAI/gpt-neo-125M",
            "distilgpt2"
        ]

        CONFIG = {
            "model_name": possible_models[0],  # Will be updated below
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
            "max_steps": self.max_steps,
            "learning_rate": self.learning_rate,
            "output_dir": "./trained_models",
            "model_save_name": "dnd_model",
            "gguf_quantization": "q4_k_m",
            "system_message": "You are a Dungeon Master assistant for D&D 5e. You help with gameplay, rules, and story generation. Use tool calls when needed for game mechanics."
        }

        # Adjust settings for incremental training
        if self.incremental_mode:
            CONFIG["learning_rate"] = self.learning_rate  # Lower learning rate
            CONFIG["max_steps"] = max(20, self.max_steps // 3)  # Fewer steps
            CONFIG["warmup_steps"] = 2
            print(f"🔄 Incremental training settings: lr={CONFIG['learning_rate']}, steps={CONFIG['max_steps']}")

        # Try to find a working model
        working_model = None
        for model_name in possible_models:
            try:
                print(f"🔍 Trying model: {model_name}")
                from transformers import AutoConfig
                AutoConfig.from_pretrained(model_name)
                working_model = model_name
                print(f"✅ Found working model: {model_name}")
                break
            except Exception as e:
                print(f"❌ {model_name} not available: {str(e)[:100]}...")
                continue

        if not working_model:
            print("❌ No compatible models found. Using local fallback.")
            working_model = "microsoft/DialoGPT-medium"

        CONFIG["model_name"] = working_model

        print(f"📥 Loading model: {CONFIG['model_name']}")

        # Load model - either base model or existing trained model for incremental training
        if self.incremental_mode and self.base_model_path and Path(self.base_model_path).exists():
            print(f"🔄 Loading existing model for incremental training: {self.base_model_path}")
            try:
                # Load the base model first
                base_model = AutoModelForCausalLM.from_pretrained(
                    CONFIG["model_name"],
                    torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                    device_map="auto" if torch.cuda.is_available() else None,
                )

                # Load the existing LoRA adapter
                model = PeftModel.from_pretrained(base_model, self.base_model_path)
                print("✅ Loaded existing LoRA adapter for incremental training")

            except Exception as e:
                print(f"⚠️  Failed to load existing model: {e}")
                print("🔄 Falling back to base model training")
                model = AutoModelForCausalLM.from_pretrained(
                    CONFIG["model_name"],
                    torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                    device_map="auto" if torch.cuda.is_available() else None,
                )
        else:
            # Load base model for full training
            model = AutoModelForCausalLM.from_pretrained(
                CONFIG["model_name"],
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                device_map="auto" if torch.cuda.is_available() else None,
            )

        tokenizer = AutoTokenizer.from_pretrained(CONFIG["model_name"])
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        # Configure LoRA if not already a PEFT model
        if not hasattr(model, 'peft_config'):
            lora_config = LoraConfig(
                r=CONFIG["r"],
                lora_alpha=CONFIG["lora_alpha"],
                target_modules=["c_attn", "c_proj", "c_fc"],  # GPT-2 style target modules
                lora_dropout=CONFIG["lora_dropout"],
                bias="none",
                task_type="CAUSAL_LM",
            )

            model = get_peft_model(model, lora_config)

        # Count trainable parameters
        trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
        total_params = sum(p.numel() for p in model.parameters())
        print(f"✅ Model loaded with {trainable_params:,} trainable parameters ({100*trainable_params/total_params:.2f}%)")

        # Load training data from files
        training_data = self.load_training_data()

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

        # Format conversations as text for training
        def formatting_prompts_func(examples):
            convos = examples["conversations"]
            texts = []
            for convo in convos:
                # Simple format for DialoGPT-style training
                formatted_text = ""
                for msg in convo:
                    if msg["role"] == "user":
                        formatted_text += f"User: {msg['content']}\n"
                    elif msg["role"] == "assistant":
                        formatted_text += f"DM: {msg['content']}\n"
                texts.append(formatted_text.strip())
            return {"text": texts}

        dataset = dataset.map(formatting_prompts_func, batched=True)

        print("📚 Training data prepared")

        # Setup trainer
        training_args = TrainingArguments(
            per_device_train_batch_size=CONFIG["per_device_train_batch_size"],
            gradient_accumulation_steps=CONFIG["gradient_accumulation_steps"],
            warmup_steps=CONFIG["warmup_steps"],
            max_steps=CONFIG["max_steps"],
            learning_rate=CONFIG["learning_rate"],
            fp16=False,  # Disable fp16 for stability on Apple Silicon
            logging_steps=1,
            optim="adamw_torch",  # Use standard AdamW
            weight_decay=0.01,
            lr_scheduler_type="linear",
            seed=42,
            output_dir=CONFIG["output_dir"],
            save_strategy="no",
            logging_dir="./logs",
            report_to="none",
            remove_unused_columns=False,
        )

        # Use the simplest SFTTrainer configuration
        trainer = SFTTrainer(
            model=model,
            args=training_args,
            train_dataset=dataset,
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
            },
            "training_info": {
                "mode": "incremental" if self.incremental_mode else "full",
                "base_model": self.base_model_path if self.incremental_mode else None,
                "training_time": str(training_time),
                "final_loss": trainer_stats.training_loss,
                "date": datetime.now().isoformat()
            }
        }

        # Save CactusAI config
        config_path = os.path.join(model_save_path, "cactus_config.json")
        with open(config_path, 'w') as f:
            json.dump(cactus_config, f, indent=2)

        # Get model file info
        model_files = [f for f in os.listdir(model_save_path) if f.endswith(('.bin', '.safetensors', '.json'))]

        print("\n" + "="*60)
        print("🎉 D&D MODEL READY FOR CACTUSAI!")
        print("="*60)
        print(f"📁 Model Location: {model_save_path}")
        print(f"📄 Config File: {config_path}")
        print(f"📦 Model Files: {', '.join(model_files)}")
        print(f"⚡ Training Time: {training_time}")
        print(f"🎯 Final Loss: {trainer_stats.training_loss:.4f}")
        print(f"🔄 Training Mode: {'Incremental' if self.incremental_mode else 'Full'}")
        print("\n🔧 To integrate with CactusAI:")
        print(f"1. Convert model to GGUF using llama.cpp")
        print(f"2. Use the configuration in {config_path}")
        print(f"3. Test with D&D scenarios!")
        print("="*60)

        return True


def train_model():
    """Legacy function for backward compatibility."""
    trainer = DNDModelTrainer()
    return trainer.train()


def main():
    """Main execution function."""
    import argparse

    parser = argparse.ArgumentParser(description="D&D Model Training with Incremental Support")
    parser.add_argument("--incremental", action="store_true", help="Enable incremental training mode")
    parser.add_argument("--base-model", help="Path to existing model for incremental training")
    parser.add_argument("--learning-rate", type=float, default=2e-4, help="Learning rate")
    parser.add_argument("--max-steps", type=int, default=60, help="Maximum training steps")

    args = parser.parse_args()

    print("🐉 D&D Model Training for CactusAI with HuggingFace")
    print("="*50)

    trainer = DNDModelTrainer()
    trainer.incremental_mode = args.incremental
    trainer.base_model_path = args.base_model
    trainer.learning_rate = args.learning_rate
    trainer.max_steps = args.max_steps

    if args.incremental:
        print("🔄 Incremental training mode enabled")
        if args.base_model:
            print(f"📂 Base model: {args.base_model}")
        else:
            print("⚠️  No base model specified, will try to find existing model")
            # Try to find existing model
            default_path = "./trained_models/dnd_model"
            if Path(default_path).exists():
                trainer.base_model_path = default_path
                print(f"✅ Found existing model: {default_path}")
            else:
                print("❌ No existing model found, switching to full training")
                trainer.incremental_mode = False

    success = trainer.train()

    if success:
        print("\n🎊 Training completed successfully!")
        print("Your D&D model is ready for CactusAI integration!")
    else:
        print("\n💥 Training failed. Check the output above for errors.")

    return success


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
