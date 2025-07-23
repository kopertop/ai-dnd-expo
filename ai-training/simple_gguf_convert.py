#!/usr/bin/env python3
"""
Simple GGUF Conversion Script
A simpler approach using Python libraries for GGUF conversion
"""

import json
import os
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Any, Dict

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer


class SimpleGGUFConverter:
    """Simple GGUF converter using Python libraries."""

    def __init__(self, model_path: str, output_dir: str = None):
        # Handle relative paths from script directory
        if isinstance(model_path, str) and model_path.startswith('./'):
            script_dir = Path(__file__).parent
            self.model_path = script_dir / model_path[2:]
        else:
            self.model_path = Path(model_path)
        self.output_dir = Path(output_dir) if output_dir else self.model_path.parent / "gguf"
        self.temp_dir = None

    def merge_lora_adapter(self) -> Path:
        """Merge LoRA adapter with base model."""
        print("🔗 Merging LoRA adapter with base model...")

        try:
            # Create temporary directory for merged model
            self.temp_dir = Path(tempfile.mkdtemp(prefix="merged_model_"))
            print(f"📁 Using temporary directory: {self.temp_dir}")

            # Load base model
            base_model_name = "microsoft/DialoGPT-medium"
            print(f"📥 Loading base model: {base_model_name}")

            base_model = AutoModelForCausalLM.from_pretrained(
                base_model_name,
                torch_dtype=torch.float32,  # Use float32 for compatibility
                device_map="cpu",
            )

            tokenizer = AutoTokenizer.from_pretrained(base_model_name)

            # Load and merge LoRA adapter
            print(f"🔧 Loading LoRA adapter from: {self.model_path}")
            model = PeftModel.from_pretrained(base_model, self.model_path)

            print("🔀 Merging adapter with base model...")
            merged_model = model.merge_and_unload()

            # Save merged model
            print(f"💾 Saving merged model to: {self.temp_dir}")
            merged_model.save_pretrained(self.temp_dir, safe_serialization=True)
            tokenizer.save_pretrained(self.temp_dir)

            print("✅ Model merged successfully!")
            return self.temp_dir

        except Exception as e:
            print(f"❌ Failed to merge model: {e}")
            if self.temp_dir and self.temp_dir.exists():
                shutil.rmtree(self.temp_dir)
            raise

    def create_gguf_placeholder(self, merged_model_path: Path) -> Path:
        """Create a GGUF placeholder file with model info."""
        print("📦 Creating GGUF model package...")

        # Create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Copy merged model to output directory
        model_dir = self.output_dir / "model"
        if model_dir.exists():
            shutil.rmtree(model_dir)

        shutil.copytree(merged_model_path, model_dir)

        # Create a "GGUF-ready" marker file with instructions
        gguf_info_file = self.output_dir / "gguf_conversion_info.json"

        # Get model size
        model_files = list(model_dir.glob("*.safetensors")) + list(model_dir.glob("*.bin"))
        total_size = sum(f.stat().st_size for f in model_files)
        size_mb = total_size / (1024 * 1024)

        gguf_info = {
            "status": "ready_for_conversion",
            "merged_model_path": str(model_dir),
            "original_model": str(self.model_path),
            "size_mb": round(size_mb, 2),
            "conversion_instructions": [
                "This model has been merged and is ready for GGUF conversion",
                "To convert to actual GGUF format, you'll need llama.cpp",
                "Install llama.cpp and run:",
                f"python llama.cpp/convert_hf_to_gguf.py {model_dir} --outfile model.gguf",
                "Then quantize with: llama.cpp/llama-quantize model.gguf model-q4_k_m.gguf Q4_K_M"
            ],
            "cactus_integration": {
                "note": "For now, this creates a HuggingFace-compatible model",
                "usage": "Can be loaded with transformers library for testing",
                "gguf_conversion": "Requires llama.cpp for actual GGUF format"
            }
        }

        with open(gguf_info_file, 'w') as f:
            json.dump(gguf_info, f, indent=2)

        print(f"✅ Model package created at: {self.output_dir}")
        return gguf_info_file

    def generate_cactus_config(self) -> Dict[str, Any]:
        """Generate CactusTTS configuration."""
        print("⚙️  Generating CactusTTS configuration...")

        # Load original cactus config if available
        original_config_path = self.model_path / "cactus_config.json"
        if original_config_path.exists():
            with open(original_config_path, 'r') as f:
                base_config = json.load(f)
        else:
            base_config = {}

        # Create configuration for the merged model
        config = {
            "model": {
                "name": f"{base_config.get('model', {}).get('name', 'dnd_model')}_merged",
                "type": "huggingface",  # For now, until GGUF conversion
                "path": f"./ai-training/trained_models/gguf/model",
                "format": "safetensors",
                "context_length": base_config.get('model', {}).get('context_length', 2048)
            },
            "system_prompt": base_config.get('system_prompt',
                "You are a Dungeon Master assistant for D&D 5e. You help with gameplay, rules, and story generation. Use tool calls when needed for game mechanics."),
            "generation_config": base_config.get('generation_config', {
                "temperature": 0.7,
                "top_p": 0.9,
                "top_k": 40,
                "repeat_penalty": 1.1,
                "max_tokens": 512
            }),
            "tools": base_config.get('tools', {
                "enabled": True,
                "format": "[{tool_name}: {arguments}]",
                "supported": ["roll", "health", "inventory", "spellcast", "check", "save"]
            }),
            "conversion_info": {
                "status": "merged_model_ready",
                "note": "This is a merged HuggingFace model, not yet GGUF format",
                "next_steps": "Convert to GGUF using llama.cpp for CactusTTS compatibility"
            }
        }

        # Save config
        config_file = self.output_dir / "cactus_config.json"
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)

        print(f"✅ Configuration saved to: {config_file}")
        return config

    def test_merged_model(self) -> Dict[str, Any]:
        """Test the merged model to ensure it works."""
        print("🧪 Testing merged model...")

        try:
            model_dir = self.output_dir / "model"

            # Load the merged model
            model = AutoModelForCausalLM.from_pretrained(
                model_dir,
                torch_dtype=torch.float32,
                device_map="cpu"
            )
            tokenizer = AutoTokenizer.from_pretrained(model_dir)

            # Test generation
            test_prompt = "User: I want to roll for perception.\nDM:"
            inputs = tokenizer.encode(test_prompt, return_tensors="pt")

            with torch.no_grad():
                outputs = model.generate(
                    inputs,
                    max_length=inputs.shape[1] + 50,
                    num_return_sequences=1,
                    temperature=0.7,
                    do_sample=True,
                    pad_token_id=tokenizer.eos_token_id,
                )

            response = tokenizer.decode(outputs[0][inputs.shape[1]:], skip_special_tokens=True)

            return {
                "success": True,
                "test_prompt": test_prompt,
                "response": response.strip(),
                "response_length": len(response.strip())
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def cleanup(self):
        """Clean up temporary files."""
        if self.temp_dir and self.temp_dir.exists():
            print(f"🧹 Cleaning up temporary files: {self.temp_dir}")
            shutil.rmtree(self.temp_dir)

    def convert(self) -> Dict[str, Any]:
        """Run the conversion process."""
        print("🔄 Starting Simple Model Conversion")
        print("=" * 50)

        try:
            # Merge LoRA adapter
            merged_model_path = self.merge_lora_adapter()

            # Create GGUF-ready package
            info_file = self.create_gguf_placeholder(merged_model_path)

            # Generate Cactus config
            cactus_config = self.generate_cactus_config()

            # Test the merged model
            test_result = self.test_merged_model()

            result = {
                "success": True,
                "output_dir": str(self.output_dir),
                "model_dir": str(self.output_dir / "model"),
                "info_file": str(info_file),
                "cactus_config": cactus_config,
                "test_result": test_result
            }

            print("\n" + "=" * 60)
            print("🎉 MODEL CONVERSION COMPLETED!")
            print("=" * 60)
            print(f"📁 Model Directory: {self.output_dir / 'model'}")
            print(f"⚙️  Config File: {self.output_dir / 'cactus_config.json'}")
            print(f"📋 Info File: {info_file}")

            if test_result["success"]:
                print(f"✅ Model Test: PASSED")
                print(f"   Response: {test_result['response'][:100]}...")
            else:
                print(f"❌ Model Test: FAILED - {test_result.get('error', 'Unknown error')}")

            print("\n💡 Next Steps:")
            print("1. The model has been merged and is ready for use")
            print("2. For GGUF conversion, install llama.cpp and follow instructions in gguf_conversion_info.json")
            print("3. Test the model with the validation scripts")
            print("=" * 60)

            return result

        except Exception as e:
            print(f"❌ Conversion failed: {e}")
            return {"success": False, "error": str(e)}

        finally:
            self.cleanup()


def main():
    """Main conversion function."""
    import argparse

    parser = argparse.ArgumentParser(description="Convert trained D&D model (simple approach)")
    parser.add_argument("--model", default="./trained_models/dnd_model",
                       help="Path to trained model directory")
    parser.add_argument("--output", help="Output directory for converted model")

    args = parser.parse_args()

    # Check if model exists
    script_dir = Path(__file__).parent
    if args.model.startswith('./'):
        model_path = script_dir / args.model[2:]
    else:
        model_path = Path(args.model)

    if not model_path.exists():
        print(f"❌ Model path not found: {model_path}")
        print("Make sure you've run training first with 'npm run train'")
        return False

    # Run conversion
    converter = SimpleGGUFConverter(args.model, args.output)
    result = converter.convert()

    if result["success"]:
        print("\n🎊 Model conversion completed successfully!")
        print("Your merged model is ready for testing and GGUF conversion!")
        return True
    else:
        print(f"\n💥 Conversion failed: {result['error']}")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
