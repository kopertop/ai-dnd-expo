#!/usr/bin/env python3
"""
GGUF Conversion Script
Converts trained HuggingFace models to GGUF format for CactusTTS integration
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional


class GGUFConverter:
    """Converts HuggingFace models to GGUF format."""

    def __init__(self, model_path: str, output_dir: str = None):
        self.model_path = Path(model_path)
        self.output_dir = Path(output_dir) if output_dir else self.model_path.parent / "gguf"
        self.llama_cpp_dir = Path("./llama.cpp")
        self.temp_dir = None

    def check_llama_cpp(self) -> bool:
        """Check if llama.cpp is available."""
        if self.llama_cpp_dir.exists():
            convert_script = self.llama_cpp_dir / "convert_hf_to_gguf.py"
            quantize_bin = self.llama_cpp_dir / "llama-quantize"

            if convert_script.exists() and quantize_bin.exists():
                print("✅ llama.cpp found and ready")
                return True

        print("⚠️  llama.cpp not found or incomplete")
        return False

    def install_llama_cpp(self) -> bool:
        """Install llama.cpp if not available."""
        print("📦 Installing llama.cpp...")

        try:
            # Clone llama.cpp
            if not self.llama_cpp_dir.exists():
                print("📥 Cloning llama.cpp repository...")
                subprocess.run([
                    "git", "clone", "https://github.com/ggerganov/llama.cpp.git",
                    str(self.llama_cpp_dir)
                ], check=True)

            # Build llama.cpp
            print("🔨 Building llama.cpp...")
            subprocess.run(["make", "-C", str(self.llama_cpp_dir)], check=True)

            # Install Python requirements
            requirements_file = self.llama_cpp_dir / "requirements.txt"
            if requirements_file.exists():
                print("📦 Installing Python requirements...")
                subprocess.run([
                    sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
                ], check=True)

            print("✅ llama.cpp installed successfully!")
            return True

        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install llama.cpp: {e}")
            return False
        except Exception as e:
            print(f"❌ Unexpected error installing llama.cpp: {e}")
            return False

    def merge_lora_adapter(self) -> Path:
        """Merge LoRA adapter with base model."""
        print("🔗 Merging LoRA adapter with base model...")

        try:
            from peft import PeftModel
            from transformers import AutoModelForCausalLM, AutoTokenizer

            # Create temporary directory for merged model
            self.temp_dir = Path(tempfile.mkdtemp(prefix="merged_model_"))
            print(f"📁 Using temporary directory: {self.temp_dir}")

            # Load base model
            base_model_name = "microsoft/DialoGPT-medium"
            print(f"📥 Loading base model: {base_model_name}")

            base_model = AutoModelForCausalLM.from_pretrained(
                base_model_name,
                torch_dtype="auto",
                device_map="cpu",  # Keep on CPU for merging
            )

            tokenizer = AutoTokenizer.from_pretrained(base_model_name)

            # Load and merge LoRA adapter
            print(f"🔧 Loading LoRA adapter from: {self.model_path}")
            model = PeftModel.from_pretrained(base_model, self.model_path)

            print("🔀 Merging adapter with base model...")
            merged_model = model.merge_and_unload()

            # Save merged model
            print(f"💾 Saving merged model to: {self.temp_dir}")
            merged_model.save_pretrained(self.temp_dir)
            tokenizer.save_pretrained(self.temp_dir)

            print("✅ Model merged successfully!")
            return self.temp_dir

        except Exception as e:
            print(f"❌ Failed to merge model: {e}")
            if self.temp_dir and self.temp_dir.exists():
                shutil.rmtree(self.temp_dir)
            raise

    def convert_to_gguf(self, merged_model_path: Path) -> Path:
        """Convert merged model to GGUF format."""
        print("🔄 Converting to GGUF format...")

        # Create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Output file path
        gguf_file = self.output_dir / "model.gguf"

        try:
            # Use llama.cpp conversion script
            convert_script = self.llama_cpp_dir / "convert_hf_to_gguf.py"

            cmd = [
                sys.executable, str(convert_script),
                str(merged_model_path),
                "--outfile", str(gguf_file),
                "--outtype", "f16"
            ]

            print(f"🚀 Running conversion: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True)

            if result.returncode != 0:
                print(f"❌ Conversion failed:")
                print(f"STDOUT: {result.stdout}")
                print(f"STDERR: {result.stderr}")
                raise subprocess.CalledProcessError(result.returncode, cmd)

            print("✅ GGUF conversion completed!")
            return gguf_file

        except Exception as e:
            print(f"❌ GGUF conversion failed: {e}")
            raise

    def quantize_model(self, gguf_file: Path, quantization: str = "Q4_K_M") -> Path:
        """Quantize GGUF model for optimal size/performance."""
        print(f"⚡ Quantizing model with {quantization}...")

        quantized_file = gguf_file.parent / f"model-{quantization.lower()}.gguf"

        try:
            quantize_bin = self.llama_cpp_dir / "llama-quantize"

            cmd = [
                str(quantize_bin),
                str(gguf_file),
                str(quantized_file),
                quantization
            ]

            print(f"🚀 Running quantization: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True)

            if result.returncode != 0:
                print(f"❌ Quantization failed:")
                print(f"STDOUT: {result.stdout}")
                print(f"STDERR: {result.stderr}")
                raise subprocess.CalledProcessError(result.returncode, cmd)

            print("✅ Model quantization completed!")
            return quantized_file

        except Exception as e:
            print(f"❌ Quantization failed: {e}")
            raise

    def validate_gguf_model(self, gguf_file: Path) -> Dict[str, Any]:
        """Validate the generated GGUF model."""
        print("🔍 Validating GGUF model...")

        try:
            # Check file exists and size
            if not gguf_file.exists():
                return {"valid": False, "error": "GGUF file not found"}

            file_size = gguf_file.stat().st_size
            size_mb = file_size / (1024 * 1024)

            # Check if under mobile limit (2GB)
            mobile_limit_mb = 2048
            under_limit = size_mb < mobile_limit_mb

            # Try to get model info using llama.cpp
            info_cmd = [str(self.llama_cpp_dir / "llama-ls"), str(gguf_file)]

            try:
                result = subprocess.run(info_cmd, capture_output=True, text=True, timeout=30)
                model_info = result.stdout if result.returncode == 0 else "Info not available"
            except (subprocess.TimeoutExpired, FileNotFoundError):
                model_info = "Info not available"

            validation_result = {
                "valid": True,
                "file_path": str(gguf_file),
                "size_mb": round(size_mb, 2),
                "under_mobile_limit": under_limit,
                "mobile_limit_mb": mobile_limit_mb,
                "model_info": model_info
            }

            print(f"✅ GGUF model validated: {size_mb:.2f} MB")
            return validation_result

        except Exception as e:
            return {"valid": False, "error": str(e)}

    def generate_cactus_config(self, gguf_file: Path) -> Dict[str, Any]:
        """Generate CactusTTS configuration for the GGUF model."""
        print("⚙️  Generating CactusTTS configuration...")

        # Load original cactus config if available
        original_config_path = self.model_path / "cactus_config.json"
        if original_config_path.exists():
            with open(original_config_path, 'r') as f:
                base_config = json.load(f)
        else:
            base_config = {}

        # Create GGUF-specific config
        gguf_config = {
            "model": {
                "name": f"{base_config.get('model', {}).get('name', 'dnd_model')}_gguf",
                "type": "gguf",
                "path": f"./assets/models/{gguf_file.name}",
                "quantization": "q4_k_m",
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
            "gguf_info": {
                "original_model": str(self.model_path),
                "conversion_date": str(Path().cwd()),
                "file_size_mb": round(gguf_file.stat().st_size / (1024 * 1024), 2)
            }
        }

        # Save config
        config_file = gguf_file.parent / "cactus_gguf_config.json"
        with open(config_file, 'w') as f:
            json.dump(gguf_config, f, indent=2)

        print(f"✅ Configuration saved to: {config_file}")
        return gguf_config

    def cleanup(self):
        """Clean up temporary files."""
        if self.temp_dir and self.temp_dir.exists():
            print(f"🧹 Cleaning up temporary files: {self.temp_dir}")
            shutil.rmtree(self.temp_dir)

    def convert(self, quantization: str = "Q4_K_M") -> Dict[str, Any]:
        """Run the complete conversion process."""
        print("🔄 Starting GGUF Conversion Process")
        print("=" * 50)

        try:
            # Check/install llama.cpp
            if not self.check_llama_cpp():
                if not self.install_llama_cpp():
                    return {"success": False, "error": "Failed to install llama.cpp"}

            # Merge LoRA adapter
            merged_model_path = self.merge_lora_adapter()

            # Convert to GGUF
            gguf_file = self.convert_to_gguf(merged_model_path)

            # Quantize model
            quantized_file = self.quantize_model(gguf_file, quantization)

            # Validate result
            validation = self.validate_gguf_model(quantized_file)

            # Generate Cactus config
            cactus_config = self.generate_cactus_config(quantized_file)

            result = {
                "success": True,
                "gguf_file": str(quantized_file),
                "validation": validation,
                "cactus_config": cactus_config,
                "output_dir": str(self.output_dir)
            }

            print("\n" + "=" * 60)
            print("🎉 GGUF CONVERSION COMPLETED!")
            print("=" * 60)
            print(f"📁 GGUF Model: {quantized_file}")
            print(f"📦 Size: {validation.get('size_mb', 0)} MB")
            print(f"📱 Mobile Compatible: {'✅' if validation.get('under_mobile_limit') else '❌'}")
            print(f"⚙️  Config: {self.output_dir}/cactus_gguf_config.json")
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

    parser = argparse.ArgumentParser(description="Convert trained D&D model to GGUF format")
    parser.add_argument("--model", default="./trained_models/dnd_model",
                       help="Path to trained model directory")
    parser.add_argument("--output", help="Output directory for GGUF files")
    parser.add_argument("--quantization", default="Q4_K_M",
                       choices=["Q4_0", "Q4_1", "Q5_0", "Q5_1", "Q8_0", "Q4_K_M", "Q5_K_M"],
                       help="Quantization level")

    args = parser.parse_args()

    # Check if model exists
    model_path = Path(args.model)
    if not model_path.exists():
        print(f"❌ Model path not found: {model_path}")
        print("Make sure you've run training first with 'npm run train'")
        return False

    # Run conversion
    converter = GGUFConverter(args.model, args.output)
    result = converter.convert(args.quantization)

    if result["success"]:
        print("\n🎊 GGUF conversion completed successfully!")
        print("Your model is ready for CactusTTS integration!")
        return True
    else:
        print(f"\n💥 Conversion failed: {result['error']}")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
