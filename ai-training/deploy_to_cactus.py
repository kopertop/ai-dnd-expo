#!/usr/bin/env python3.11
"""
Deploy Trained Model to CactusTTS
Copies trained models to assets/models and provides integration configuration
"""

import json
import os
import shutil
import sys
from pathlib import Path
from typing import Any, Dict, Optional


class CactusDeployment:
    """Handles deployment of trained models to CactusTTS infrastructure."""

    def __init__(self, model_source: str = None):
        self.script_dir = Path(__file__).parent
        self.project_root = self.script_dir.parent
        self.assets_models_dir = self.project_root / "assets" / "models"

        # Default to the converted model
        if model_source is None:
            model_source = self.script_dir / "trained_models" / "gguf" / "model"
        self.model_source = Path(model_source)

        self.cactus_ts_path = self.project_root / "components" / "cactus.ts"

    def check_model_source(self) -> bool:
        """Check if the model source exists."""
        if not self.model_source.exists():
            print(f"❌ Model source not found: {self.model_source}")
            print("Make sure you've run model conversion first with 'npm run train:convert'")
            return False

        # Check for required files
        required_files = ["config.json", "tokenizer.json"]
        missing_files = []

        for file in required_files:
            if not (self.model_source / file).exists():
                missing_files.append(file)

        if missing_files:
            print(f"⚠️  Missing required files: {missing_files}")
            print("Model may not be complete")

        print(f"✅ Model source found: {self.model_source}")
        return True

    def create_assets_directory(self) -> bool:
        """Create assets/models directory if it doesn't exist."""
        try:
            self.assets_models_dir.mkdir(parents=True, exist_ok=True)
            print(f"✅ Assets directory ready: {self.assets_models_dir}")
            return True
        except Exception as e:
            print(f"❌ Failed to create assets directory: {e}")
            return False

    def copy_model_to_assets(self) -> Optional[Path]:
        """Copy the trained model to assets/models directory."""
        try:
            # Create a unique model directory name
            model_name = "custom-dnd-model"
            target_dir = self.assets_models_dir / model_name

            # Remove existing model if present
            if target_dir.exists():
                print(f"🗑️  Removing existing model: {target_dir}")
                shutil.rmtree(target_dir)

            # Copy model files
            print(f"📦 Copying model from {self.model_source} to {target_dir}")
            shutil.copytree(self.model_source, target_dir)

            # Get model size info
            model_files = list(target_dir.glob("*.safetensors")) + list(target_dir.glob("*.bin"))
            total_size = sum(f.stat().st_size for f in model_files)
            size_mb = total_size / (1024 * 1024)

            print(f"✅ Model copied successfully!")
            print(f"   Location: {target_dir}")
            print(f"   Size: {size_mb:.2f} MB")
            print(f"   Files: {len(list(target_dir.iterdir()))} files")

            return target_dir

        except Exception as e:
            print(f"❌ Failed to copy model: {e}")
            return None

    def generate_integration_config(self, model_dir: Path) -> Dict[str, Any]:
        """Generate integration configuration for cactus.ts."""

        # Load the original cactus config if available
        config_source = self.script_dir / "trained_models" / "gguf" / "cactus_config.json"
        if config_source.exists():
            with open(config_source, 'r') as f:
                base_config = json.load(f)
        else:
            base_config = {}

        # Create relative path from project root
        relative_model_path = f"./{model_dir.relative_to(self.project_root)}"

        integration_config = {
            "deployment_info": {
                "model_name": "custom-dnd-model",
                "model_type": "huggingface_transformers",
                "deployment_date": str(Path().cwd()),
                "source_model": str(self.model_source)
            },
            "cactus_integration": {
                "model_path": relative_model_path,
                "config_file": f"{relative_model_path}/config.json",
                "tokenizer_file": f"{relative_model_path}/tokenizer.json",
                "model_files": [f.name for f in model_dir.glob("*.safetensors")] + [f.name for f in model_dir.glob("*.bin")]
            },
            "usage_instructions": {
                "loading": "Use transformers.AutoModelForCausalLM.from_pretrained(model_path)",
                "tokenizer": "Use transformers.AutoTokenizer.from_pretrained(model_path)",
                "generation": "Standard HuggingFace generation with the provided generation_config"
            },
            "model_config": base_config.get("model", {}),
            "system_prompt": base_config.get("system_prompt", ""),
            "generation_config": base_config.get("generation_config", {}),
            "tools": base_config.get("tools", {})
        }

        return integration_config

    def create_cactus_integration_example(self, model_dir: Path) -> str:
        """Create example code for integrating with cactus.ts."""

        relative_path = f"./{model_dir.relative_to(self.project_root)}"

        example_code = f'''
// Example integration with your custom D&D model
// Add this to your cactus.ts or create a new custom model manager

import {{ AutoModelForCausalLM, AutoTokenizer }} from '@fugood/transformers';

class CustomDnDModel {{
    private model: any = null;
    private tokenizer: any = null;
    private isInitialized = false;

    async initialize(): Promise<void> {{
        if (this.isInitialized) return;

        try {{
            // Load your custom trained model
            this.tokenizer = await AutoTokenizer.from_pretrained('{relative_path}');
            this.model = await AutoModelForCausalLM.from_pretrained('{relative_path}');

            this.isInitialized = true;
            console.log('✅ Custom D&D model loaded successfully!');
        }} catch (error) {{
            console.error('❌ Failed to load custom D&D model:', error);
            throw error;
        }}
    }}

    async generateResponse(prompt: string): Promise<string> {{
        if (!this.isInitialized) {{
            await this.initialize();
        }}

        try {{
            const inputs = await this.tokenizer.encode(prompt);
            const outputs = await this.model.generate(inputs, {{
                max_length: inputs.length + 128,
                temperature: 0.7,
                top_p: 0.9,
                do_sample: true,
            }});

            const response = await this.tokenizer.decode(outputs[0].slice(inputs.length));
            return response.trim();
        }} catch (error) {{
            console.error('❌ Generation failed:', error);
            throw error;
        }}
    }}

    async generateDnDResponse(userMessage: string): Promise<string> {{
        const systemPrompt = "You are a Dungeon Master assistant for D&D 5e. You help with gameplay, rules, and story generation. Use tool calls when needed for game mechanics.";
        const fullPrompt = `System: ${{systemPrompt}}\\nUser: ${{userMessage}}\\nDM:`;

        return await this.generateResponse(fullPrompt);
    }}
}}

// Usage example:
// const customModel = new CustomDnDModel();
// const response = await customModel.generateDnDResponse("I want to roll for perception");
'''

        return example_code

    def save_integration_files(self, model_dir: Path, config: Dict[str, Any]) -> bool:
        """Save integration configuration and example files."""
        try:
            # Save integration config
            config_file = model_dir / "cactus_integration.json"
            with open(config_file, 'w') as f:
                json.dump(config, f, indent=2)

            # Save example code
            example_code = self.create_cactus_integration_example(model_dir)
            example_file = model_dir / "integration_example.ts"
            with open(example_file, 'w') as f:
                f.write(example_code)

            # Save deployment info
            deployment_info = {
                "deployment_date": str(Path().cwd()),
                "model_location": str(model_dir),
                "relative_path": f"./{model_dir.relative_to(self.project_root)}",
                "integration_files": [
                    str(config_file.relative_to(self.project_root)),
                    str(example_file.relative_to(self.project_root))
                ],
                "usage_instructions": [
                    "1. Import the example code into your project",
                    "2. Create an instance of CustomDnDModel",
                    "3. Call generateDnDResponse() with user input",
                    "4. The model will generate D&D-appropriate responses"
                ]
            }

            deployment_file = model_dir / "deployment_info.json"
            with open(deployment_file, 'w') as f:
                json.dump(deployment_info, f, indent=2)

            print(f"✅ Integration files saved:")
            print(f"   Config: {config_file}")
            print(f"   Example: {example_file}")
            print(f"   Deployment: {deployment_file}")

            return True

        except Exception as e:
            print(f"❌ Failed to save integration files: {e}")
            return False

    def deploy(self) -> Dict[str, Any]:
        """Run the complete deployment process."""
        print("🚀 Starting CactusTTS Model Deployment")
        print("=" * 50)

        # Check model source
        if not self.check_model_source():
            return {"success": False, "error": "Model source not found"}

        # Create assets directory
        if not self.create_assets_directory():
            return {"success": False, "error": "Failed to create assets directory"}

        # Copy model to assets
        model_dir = self.copy_model_to_assets()
        if not model_dir:
            return {"success": False, "error": "Failed to copy model"}

        # Generate integration config
        config = self.generate_integration_config(model_dir)

        # Save integration files
        if not self.save_integration_files(model_dir, config):
            return {"success": False, "error": "Failed to save integration files"}

        result = {
            "success": True,
            "model_location": str(model_dir),
            "relative_path": f"./{model_dir.relative_to(self.project_root)}",
            "integration_config": config,
            "files_created": [
                f"{model_dir}/cactus_integration.json",
                f"{model_dir}/integration_example.ts",
                f"{model_dir}/deployment_info.json"
            ]
        }

        print("\n" + "=" * 60)
        print("🎉 DEPLOYMENT COMPLETED!")
        print("=" * 60)
        print(f"📁 Model Location: {model_dir}")
        print(f"🔗 Relative Path: {result['relative_path']}")
        print(f"📄 Integration Files: {len(result['files_created'])} files created")
        print("\n💡 Next Steps:")
        print("1. Check the integration_example.ts file for usage code")
        print("2. Import and use the CustomDnDModel class in your app")
        print("3. Test the model with D&D scenarios")
        print("4. Validate responses using the validation scripts")
        print("=" * 60)

        return result


def main():
    """Main deployment function."""
    import argparse

    parser = argparse.ArgumentParser(description="Deploy trained D&D model to CactusTTS")
    parser.add_argument("--model", help="Path to model directory (default: converted model)")

    args = parser.parse_args()

    # Run deployment
    deployer = CactusDeployment(args.model)
    result = deployer.deploy()

    if result["success"]:
        print("\n🎊 Deployment completed successfully!")
        print("Your custom D&D model is ready for integration!")

        # Save result for reference
        result_file = deployer.script_dir / "deployment_result.json"
        with open(result_file, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"📋 Deployment details saved to: {result_file}")

        return True
    else:
        print(f"\n💥 Deployment failed: {result['error']}")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
