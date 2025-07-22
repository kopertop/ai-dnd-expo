#!/usr/bin/env python3
"""
D&D Model Training with Gemma3N using Unsloth & TRL
Based on the Unsloth notebook example with SFTConfig
"""

import os
import sys
import json
import torch
from datetime import datetime
from pathlib import Path

def main():
    print("🚀 Starting D&D Gemma3N Training with Unsloth")
    print("=" * 50)
    
    # Import required libraries
    try:
        from unsloth import FastLanguageModel
        from unsloth.chat_templates import get_chat_template
        from datasets import Dataset
        from trl import SFTTrainer, SFTConfig
        print("✅ All libraries imported successfully")
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("💡 Make sure you ran the install script first")
        return False
    
    # Check device
    if torch.cuda.is_available():
        device = "cuda"
        print(f"✅ CUDA GPU: {torch.cuda.get_device_name()}")
    elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
        device = "mps"
        print("✅ Apple Silicon GPU (MPS)")
    else:
        device = "cpu"
        print("⚠️  CPU training (slower)")
    
    # Model configuration - using verified working models
    MODEL_CONFIG = {
        "model_name": "unsloth/Meta-Llama-3.1-8B-Instruct-bnb-4bit",  # Verified working model
        "max_seq_length": 2048,
        "dtype": None,  # Auto-detect
        "load_in_4bit": True,
    }
    
    # LoRA configuration
    LORA_CONFIG = {
        "r": 16,
        "target_modules": ["q_proj", "k_proj", "v_proj", "o_proj",
                          "gate_proj", "up_proj", "down_proj"],
        "lora_alpha": 16,
        "lora_dropout": 0,
        "bias": "none",
        "use_gradient_checkpointing": "unsloth",
        "random_state": 3407,
        "use_rslora": False,
        "loftq_config": None,
    }
    
    print(f"📥 Loading model: {MODEL_CONFIG['model_name']}")
    
    # Load model and tokenizer with Unsloth
    try:
        model, tokenizer = FastLanguageModel.from_pretrained(
            model_name=MODEL_CONFIG["model_name"],
            max_seq_length=MODEL_CONFIG["max_seq_length"],
            dtype=MODEL_CONFIG["dtype"],
            load_in_4bit=MODEL_CONFIG["load_in_4bit"],
        )
        print("✅ Base model loaded")
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        # Fallback to a smaller model
        print("🔄 Trying fallback model...")
        MODEL_CONFIG["model_name"] = "unsloth/Llama-3.2-1B-Instruct"
        try:
            model, tokenizer = FastLanguageModel.from_pretrained(
                model_name=MODEL_CONFIG["model_name"],
                max_seq_length=MODEL_CONFIG["max_seq_length"],
                dtype=MODEL_CONFIG["dtype"],
                load_in_4bit=MODEL_CONFIG["load_in_4bit"],
            )
            print("✅ Fallback model loaded")
        except Exception as e2:
            print(f"❌ Fallback model also failed: {e2}")
            return False
    
    # Configure LoRA adapters
    model = FastLanguageModel.get_peft_model(
        model,
        r=LORA_CONFIG["r"],
        target_modules=LORA_CONFIG["target_modules"],
        lora_alpha=LORA_CONFIG["lora_alpha"],
        lora_dropout=LORA_CONFIG["lora_dropout"],
        bias=LORA_CONFIG["bias"],
        use_gradient_checkpointing=LORA_CONFIG["use_gradient_checkpointing"],
        random_state=LORA_CONFIG["random_state"],
        use_rslora=LORA_CONFIG["use_rslora"],
        loftq_config=LORA_CONFIG["loftq_config"],
    )
    
    trainable_params = model.get_nb_trainable_parameters()
    print(f"✅ LoRA configured: {trainable_params[0]:,} trainable parameters ({trainable_params[1]:.2%})")
    
    # Load D&D training data
    training_data = load_dnd_training_data()
    print(f"📚 Loaded {len(training_data)} D&D training examples")
    
    # Convert to Dataset
    dataset = Dataset.from_list(training_data)
    
    # Apply chat template
    tokenizer = get_chat_template(
        tokenizer,
        chat_template="gemma",
    )
    
    def formatting_prompts_func(examples):
        convos = examples["conversations"]
        texts = [
            tokenizer.apply_chat_template(convo, tokenize=False, add_generation_prompt=False)
            for convo in convos
        ]
        return {"text": texts}
    
    dataset = dataset.map(formatting_prompts_func, batched=True)
    print("✅ Dataset formatted with chat template")
    
    # Training configuration using SFTConfig (as per notebook example)
    print("🏋️‍♂️ Setting up training...")
    
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        eval_dataset=None,  # Can set up evaluation!
        args=SFTConfig(
            dataset_text_field="text",
            per_device_train_batch_size=1,
            gradient_accumulation_steps=4,  # Use GA to mimic batch size!
            warmup_steps=5,
            # num_train_epochs = 1, # Set this for 1 full training run.
            max_steps=60,
            learning_rate=2e-4,  # Reduce to 2e-5 for long training runs
            logging_steps=1,
            optim="adamw_8bit",
            weight_decay=0.01,
            lr_scheduler_type="linear",
            seed=3407,
            report_to="none",  # Use this for WandB etc
            output_dir="./trained_models",
            save_strategy="no",  # Don't save intermediate checkpoints
        ),
    )
    
    print("🎯 Starting training...")
    start_time = datetime.now()
    
    # Train the model
    trainer_stats = trainer.train()
    
    end_time = datetime.now()
    training_time = end_time - start_time
    
    print(f"✅ Training completed in {training_time}")
    print(f"📊 Final training loss: {trainer_stats.training_loss:.4f}")
    
    # Save model
    model_save_path = "./trained_models/dnd_gemma3n"
    model.save_pretrained(model_save_path)
    tokenizer.save_pretrained(model_save_path)
    print(f"💾 Model saved to: {model_save_path}")
    
    # Export to GGUF format for CactusAI
    print("📦 Exporting to GGUF format...")
    gguf_save_path = f"{model_save_path}_gguf"
    
    try:
        model.save_pretrained_gguf(
            gguf_save_path,
            tokenizer,
            quantization_method="q4_k_m"
        )
        
        # Get GGUF files
        gguf_files = [f for f in os.listdir(gguf_save_path) if f.endswith('.gguf')]
        
        # Create CactusAI configuration
        cactus_config = {
            "model": {
                "name": "dnd_gemma3n",
                "type": "gguf",
                "path": f"./{os.path.basename(gguf_save_path)}",
                "files": gguf_files,
                "quantization": "q4_k_m",
                "context_length": MODEL_CONFIG["max_seq_length"]
            },
            "system_prompt": "You are a Dungeon Master assistant for D&D 5e. You help with gameplay, rules, and story generation. Use tool calls when needed for game mechanics.",
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
                "base_model": MODEL_CONFIG["model_name"],
                "training_steps": 60,
                "final_loss": float(trainer_stats.training_loss),
                "training_time": str(training_time),
                "training_date": datetime.now().isoformat()
            }
        }
        
        # Save CactusAI config
        config_path = os.path.join(gguf_save_path, "cactus_config.json")
        with open(config_path, 'w') as f:
            json.dump(cactus_config, f, indent=2)
        
        print("✅ GGUF export successful")
        
        # Display final results
        print("\n" + "=" * 60)
        print("🎉 D&D GEMMA3N MODEL READY FOR CACTUSAI!")
        print("=" * 60)
        print(f"📁 GGUF Location: {gguf_save_path}")
        print(f"📄 Config File: {config_path}")
        print(f"📦 Model Files: {', '.join(gguf_files)}")
        print(f"⚡ Training Time: {training_time}")
        print(f"🎯 Final Loss: {trainer_stats.training_loss:.4f}")
        print(f"🧠 Base Model: {MODEL_CONFIG['model_name']}")
        print("\n🔧 To integrate with CactusAI:")
        print(f"1. Copy {gguf_save_path}/*.gguf to your CactusAI models directory")
        print(f"2. Use the configuration in {config_path}")
        print("3. Test with D&D scenarios!")
        print("=" * 60)
        
    except Exception as e:
        print(f"⚠️  GGUF export failed: {e}")
        print("💡 Model saved in HuggingFace format. You can convert to GGUF later.")
    
    return True

def load_dnd_training_data():
    """Load D&D training data from markdown files or use samples."""
    data_dir = Path("data/scenarios")
    training_data = []
    
    if data_dir.exists():
        print("📖 Loading training data from files...")
        md_files = list(data_dir.rglob("*.md"))
        
        for md_file in md_files:
            try:
                with open(md_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Parse markdown scenario
                parsed = parse_markdown_scenario(content)
                if parsed:
                    training_data.append(parsed)
            except Exception as e:
                print(f"⚠️  Error parsing {md_file}: {e}")
                continue
    
    if not training_data:
        print("📝 Using sample D&D training data...")
        training_data = get_sample_dnd_data()
    
    return training_data

def parse_markdown_scenario(content):
    """Parse a markdown D&D scenario into conversation format."""
    sections = {}
    current_section = None
    current_content = []
    
    for line in content.split('\n'):
        if line.startswith('# '):
            if current_section:
                sections[current_section] = '\n'.join(current_content).strip()
            current_section = line[2:].strip().upper()
            current_content = []
        else:
            current_content.append(line)
    
    if current_section:
        sections[current_section] = '\n'.join(current_content).strip()
    
    # Convert to conversation format
    if 'USER' in sections and 'DM' in sections:
        system_context = sections.get('SYSTEM', '')
        user_content = sections['USER']
        dm_content = sections['DM']
        
        # Add context to user message
        if system_context:
            user_content = f"Context:\n{system_context}\n\nPlayer: {user_content}"
        
        return {
            "conversations": [
                {"role": "system", "content": "You are a Dungeon Master assistant for D&D 5e. You help with gameplay, rules, and story generation. Use tool calls when needed for game mechanics."},
                {"role": "user", "content": user_content},
                {"role": "assistant", "content": dm_content}
            ]
        }
    
    return None

def get_sample_dnd_data():
    """Get sample D&D training conversations."""
    return [
        {
            "conversations": [
                {"role": "system", "content": "You are a Dungeon Master assistant for D&D 5e. You help with gameplay, rules, and story generation. Use tool calls when needed for game mechanics."},
                {"role": "user", "content": "Context:\nRole: Dungeon Master\nWorld: Forgotten Realms\nLocation: Tavern\nParty: Thordak (Dragonborn Fighter, Level 5, HP: 45/45)\n\nPlayer: I want to approach the bartender and ask about rumors in town."},
                {"role": "assistant", "content": "The burly half-orc bartender looks up as you approach. 'What'll it be?' he grunts, wiping a mug with a questionably clean rag.\n\nWhen you ask about rumors, he leans in closer. 'Well, there's been talk of strange lights in the old tower north of town. Some say it's ghosts, others say it's that crazy wizard Zandor up to no good again.'\n\nHe eyes you up and down. 'You lot look capable. Thinking of checking it out? Make a perception check first.' [roll: perception]"}
            ]
        },
        {
            "conversations": [
                {"role": "system", "content": "You are a Dungeon Master assistant for D&D 5e. You help with gameplay, rules, and story generation. Use tool calls when needed for game mechanics."},
                {"role": "user", "content": "Context:\nRole: Dungeon Master\nWorld: Forgotten Realms\nLocation: Combat\nParty: Elara (Elf Wizard, Level 5, HP: 28/28)\n\nPlayer: I want to cast Magic Missile at the goblin."},
                {"role": "assistant", "content": "Elara raises her hands and three glowing darts of magical force streak toward the goblin. Magic Missile automatically hits, so no attack roll needed.\n\nRoll 3d4+3 for damage. [roll: 3d4+3]\n\nThe goblin staggers as the magical darts strike, looking badly wounded but still standing."}
            ]
        },
        {
            "conversations": [
                {"role": "system", "content": "You are a Dungeon Master assistant for D&D 5e. You help with gameplay, rules, and story generation. Use tool calls when needed for game mechanics."},
                {"role": "user", "content": "Context:\nRole: Dungeon Master\nWorld: Forgotten Realms\nLocation: Combat\nParty: Sara (Human Fighter, Level 6, HP: 32/58)\n\nPlayer: I'm badly injured. I want to use my Second Wind ability."},
                {"role": "assistant", "content": "Sara draws upon her inner reserves of stamina. As a bonus action, you can use Second Wind to regain hit points.\n\nRoll 1d10 + 6 (your fighter level) to see how many hit points you recover. [roll: 1d10+6]\n\nYou feel a surge of vitality as you catch your second wind in the heat of battle. [health: Sara, +rolled_amount]"}
            ]
        },
        {
            "conversations": [
                {"role": "system", "content": "You are a Dungeon Master assistant for D&D 5e. You help with gameplay, rules, and story generation. Use tool calls when needed for game mechanics."},
                {"role": "user", "content": "Context:\nRole: Dungeon Master\nWorld: Forgotten Realms\nLocation: Wilderness\nParty: Finn (Halfling Rogue, Level 3, HP: 24/24)\n\nPlayer: I want to search for traps on this door."},
                {"role": "assistant", "content": "Good thinking! This old door could definitely be trapped. Make an Investigation check to search for traps. [roll: investigation]\n\nYou carefully examine the door frame, handle, and surrounding area for any signs of mechanical devices or magical auras."}
            ]
        },
        {
            "conversations": [
                {"role": "system", "content": "You are a Dungeon Master assistant for D&D 5e. You help with gameplay, rules, and story generation. Use tool calls when needed for game mechanics."},
                {"role": "user", "content": "Context:\nRole: Dungeon Master\nWorld: Forgotten Realms\nLocation: Shop\nParty: Marcus (Human Paladin, Level 4, HP: 36/40)\n\nPlayer: I want to buy a healing potion and some rations."},
                {"role": "assistant", "content": "The shopkeeper, a cheerful gnome woman, smiles warmly. 'Of course! I have some fine healing potions fresh from the temple. That'll be 50 gold pieces for a potion of healing, and 2 gold for a day's rations.'\n\n'The potion will restore 2d4+2 hit points when consumed. Will that work for you?' [inventory: -52 gold, +healing_potion, +rations]"}
            ]
        }
    ]

if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)