#!/usr/bin/env python3
"""
Model Deployment Script
Automatically deploys trained models to the assets/models directory and generates integration configuration
"""

import json
import os
import shutil
import sys
from pathlib import Path
from typing import Any, Dict, Optional


class ModelDeployer:
    """Deploys trained models to the assets directory for CactusTTS integration."""

    def __init__(self, model_source: str = None, target_name: str = None):
        self.script_dir = Path(__file__).parent
        self.model_source = Path(model_source) if model_source else self.script_dir / "trained_models/gguf/model"
        self.assets_dir = self.script_dir.parent / "assets/models"
        self.target_name = target_name or "custom-dnd-trained-model"
        self.target_dir = self.assets_dir / self.target_name

    def validate_source_model(self) -> bool:
        """Validate that the source model exists and is ready for deployment."""
        if not self.model_source.exists():
            print(f"❌ Source model not found: {self.model_source}")
            print("Run model training and conversion first")
            return False

        # Check for required files
        required_files = ["config.json", "tokenizer.json"]
        missing_files = []

        for file in required_files:
            if not (self.model_source / file).exists():
                missing_files.append(file)

        if missing_files:
            print(f"⚠️  Missing required files: {missing_files}")
            print("Model may not be complete, but proceeding anyway...")

        print(f"✅ Source model validated: {self.model_source}")
        return True

    def create_target_directory(self) -> bool:
        """Create the target directory in assets/models."""
        try:
            # Remove existing directory if it exists
            if self.target_dir.exists():
                print(f"🗑️  Removing existing model: {self.target_dir}")
                shutil.rmtree(self.target_dir)

            # Create target directory
            self.target_dir.mkdir(parents=True, exist_ok=True)
            print(f"📁 Created target directory: {self.target_dir}")
            return True

        except Exception as e:
            print(f"❌ Failed to create target directory: {e}")
            return False

    def copy_model_files(self) -> bool:
        """Copy model files to the target directory."""
        try:
            print(f"📋 Copying model files from {self.model_source} to {self.target_dir}")

            # Copy all files from source to target
            for item in self.model_source.iterdir():
                if item.is_file():
                    target_file = self.target_dir / item.name
                    shutil.copy2(item, target_file)
                    print(f"   ✅ Copied: {item.name}")
                elif item.is_dir():
                    target_subdir = self.target_dir / item.name
                    shutil.copytree(item, target_subdir)
                    print(f"   ✅ Copied directory: {item.name}")

            print("✅ Model files copied successfully")
            return True

        except Exception as e:
            print(f"❌ Failed to copy model files: {e}")
            return False

    def generate_deployment_config(self) -> Dict[str, Any]:
        """Generate deployment configuration for the model."""
        # Load source config if available
        source_config_path = self.script_dir / "trained_models/gguf/cactus_config.json"
        if source_config_path.exists():
            with open(source_config_path, 'r') as f:
                source_config = json.load(f)
        else:
            source_config = {}

        # Calculate model size
        model_files = list(self.target_dir.glob("*.safetensors")) + list(self.target_dir.glob("*.bin"))
        total_size = sum(f.stat().st_size for f in model_files)
        size_mb = total_size / (1024 * 1024)

        # Generate deployment config
        deployment_config = {
            "model_info": {
                "name": self.target_name,
                "type": "huggingface_merged",
                "format": "safetensors",
                "size_mb": round(size_mb, 2),
                "deployment_date": str(Path().cwd()),
                "source": str(self.model_source),
                "target": str(self.target_dir)
            },
            "cactus_integration": {
                "model_path": f"./assets/models/{self.target_name}",
                "relative_path": f"assets/models/{self.target_name}",
                "config_file": f"./assets/models/{self.target_name}/config.json",
                "tokenizer_file": f"./assets/models/{self.target_name}/tokenizer.json"
            },
            "usage_instructions": {
                "loading": "Use transformers.AutoModelForCausalLM.from_pretrained(model_path)",
                "tokenizer": "Use transformers.AutoTokenizer.from_pretrained(model_path)",
                "integration": "Update cactus.ts with the provided model_path"
            },
            "original_config": source_config
        }

        return deployment_config

    def save_deployment_config(self, config: Dict[str, Any]) -> bool:
        """Save the deployment configuration."""
        try:
            config_file = self.target_dir / "deployment_config.json"
            with open(config_file, 'w') as f:
                json.dump(config, f, indent=2)

            print(f"✅ Deployment config saved: {config_file}")
            return True

        except Exception as e:
            print(f"❌ Failed to save deployment config: {e}")
            return False

    def generate_cactus_integration_example(self, config: Dict[str, Any]) -> str:
        """Generate example code for cactus.ts integration."""
        model_path = config["cactus_integration"]["relative_path"]

        integration_code = f'''
// Example integration for cactus.ts
// Replace the existing model configuration with:

const customModelPath = '{model_path}';

// For HuggingFace transformers integration:
import {{ AutoModelForCausalLM, AutoTokenizer }} from '@huggingface/transformers';

// Load the custom trained model
const loadCustomModel = async () => {{
    const model = await AutoModelForCausalLM.from_pretrained(customModelPath);
    const tokenizer = await AutoTokenizer.from_pretrained(customModelPath);
    return {{ model, tokenizer }};
}};

// Alternative: Update existing CactusVLM configuration
// Note: This model is in HuggingFace format, not GGUF
// For GGUF format, additional conversion is needed
'''

        return integration_code

    def create_integration_example_file(self, config: Dict[str, Any]) -> bool:
        """Create an integration example file."""
        try:
            integration_code = self.generate_cactus_integration_example(config)

            example_file = self.target_dir / "integration-example.ts"
            with open(example_file, 'w') as f:
                f.write(integration_code)

            print(f"✅ Integration example saved: {example_file}")
            return True

        except Exception as e:
            print(f"❌ Failed to create integration example: {e}")
            return False

    def validate_deployment(self) -> Dict[str, Any]:
        """Validate the deployed model."""
        validation_results = {
            "target_exists": self.target_dir.exists(),
            "files_present": [],
            "total_size_mb": 0,
            "config_files": []
        }

        if validation_results["target_exists"]:
            # Check files
            for file in self.target_dir.iterdir():
                if file.is_file():
                    validation_results["files_present"].append(file.name)
                    validation_results["total_size_mb"] += file.stat().st_size / (1024 * 1024)

            # Check for config files
            config_files = ["config.json", "tokenizer.json", "deployment_config.json", "integration-example.ts"]
            for config_file in config_files:
                if (self.target_dir / config_file).exists():
                    validation_results["config_files"].append(config_file)

        validation_results["total_size_mb"] = round(validation_results["total_size_mb"], 2)
        return validation_results

    def deploy(self) -> Dict[str, Any]:
        """Run the complete deployment process."""
        print("🚀 Starting Model Deployment")
        print("=" * 50)

        # Validate source
        if not self.validate_source_model():
            return {"success": False, "error": "Source model validation failed"}

        # Create target directory
        if not self.create_target_directory():
            return {"success": False, "error": "Failed to create target directory"}

        # Copy model files
        if not self.copy_model_files():
            return {"success": False, "error": "Failed to copy model files"}

        # Generate and save deployment config
        deployment_config = self.generate_deployment_config()
        if not self.save_deployment_config(deployment_config):
            return {"success": False, "error": "Failed to save deployment config"}

        # Create integration example
        if not self.create_integration_example_file(deployment_config):
            return {"success": False, "error": "Failed to create integration example"}

        # Validate deployment
        validation = self.validate_deployment()

        result = {
            "success": True,
            "target_directory": str(self.target_dir),
            "deployment_config": deployment_config,
            "validation": validation
        }

        print("\n" + "=" * 60)
        print("🎉 MODEL DEPLOYMENT COMPLETED!")
        print("=" * 60)
        print(f"📁 Model Location: {self.target_dir}")
        print(f"📦 Model Size: {validation['total_size_mb']} MB")
        print(f"📄 Files Deployed: {len(validation['files_present'])}")
        print(f"⚙️  Config Files: {', '.join(validation['config_files'])}")
        print(f"\n🔗 Integration Path: {deployment_config['cactus_integration']['model_path']}")
        print(f"📋 Example Code: {self.target_dir}/integration-example.ts")
        print("=" * 60)

        return result


def main():
    """Main deployment function."""
    import argparse

    parser = argparse.ArgumentParser(description="Deploy trained D&D model to assets directory")
    parser.add_argument("--source", help="Source model directory")
    parser.add_argument("--name", default="custom-dnd-trained-model",
                       help="Target model name in assets/models")

    args = parser.parse_args()

    # Run deployment
    deployer = ModelDeployer(args.source, args.name)
    result = deployer.deploy()

    if result["success"]:
        print("\n🎊 Deployment completed successfully!")
        print("Your trained model is ready for CactusTTS integration!")
        return True
    else:
        print(f"\n💥 Deployment failed: {result['error']}")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
