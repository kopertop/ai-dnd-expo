#!/usr/bin/env python3
"""
Deployed Model Testing Script
Tests deployed models for integration with the existing Cactus infrastructure
"""

import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer


class DeployedModelTester:
    """Tests deployed models for CactusTTS integration."""

    def __init__(self, model_name: str = "custom-dnd-trained-model"):
        self.script_dir = Path(__file__).parent
        self.assets_dir = self.script_dir.parent / "assets/models"
        self.model_dir = self.assets_dir / model_name
        self.model_name = model_name
        self.model = None
        self.tokenizer = None

    def validate_deployment(self) -> Dict[str, Any]:
        """Validate that the model is properly deployed."""
        print("🔍 Validating model deployment...")

        validation = {
            "model_exists": self.model_dir.exists(),
            "required_files": [],
            "missing_files": [],
            "config_valid": False,
            "size_mb": 0
        }

        if not validation["model_exists"]:
            validation["error"] = f"Model directory not found: {self.model_dir}"
            return validation

        # Check required files
        required_files = [
            "config.json",
            "tokenizer.json",
            "model.safetensors",
            "deployment_config.json"
        ]

        for file in required_files:
            file_path = self.model_dir / file
            if file_path.exists():
                validation["required_files"].append(file)
                validation["size_mb"] += file_path.stat().st_size / (1024 * 1024)
            else:
                validation["missing_files"].append(file)

        # Validate config
        config_path = self.model_dir / "config.json"
        if config_path.exists():
            try:
                with open(config_path, 'r') as f:
                    config = json.load(f)
                validation["config_valid"] = "model_type" in config
                validation["model_type"] = config.get("model_type", "unknown")
            except Exception as e:
                validation["config_error"] = str(e)

        validation["size_mb"] = round(validation["size_mb"], 2)

        print(f"✅ Model directory: {validation['model_exists']}")
        print(f"📄 Required files: {len(validation['required_files'])}/{len(required_files)}")
        if validation["missing_files"]:
            print(f"⚠️  Missing files: {validation['missing_files']}")
        print(f"📦 Total size: {validation['size_mb']} MB")

        return validation

    def load_model(self) -> bool:
        """Load the deployed model for testing."""
        print("📥 Loading deployed model...")

        try:
            # Load model
            self.model = AutoModelForCausalLM.from_pretrained(
                str(self.model_dir),
                torch_dtype=torch.float32,
                device_map="cpu",
                local_files_only=True
            )

            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(
                str(self.model_dir),
                local_files_only=True
            )

            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token

            print("✅ Model and tokenizer loaded successfully")
            return True

        except Exception as e:
            print(f"❌ Failed to load model: {e}")
            return False

    def test_basic_generation(self) -> Dict[str, Any]:
        """Test basic text generation capabilities."""
        print("🧪 Testing basic text generation...")

        test_prompts = [
            "User: I want to roll for perception.\nDM:",
            "User: What do I see in this room?\nDM:",
            "User: I attack the goblin with my sword.\nDM:"
        ]

        results = []

        for prompt in test_prompts:
            try:
                # Tokenize
                inputs = self.tokenizer.encode(prompt, return_tensors="pt")

                # Generate
                with torch.no_grad():
                    outputs = self.model.generate(
                        inputs,
                        max_length=inputs.shape[1] + 100,
                        num_return_sequences=1,
                        temperature=0.7,
                        top_p=0.9,
                        do_sample=True,
                        pad_token_id=self.tokenizer.eos_token_id,
                        eos_token_id=self.tokenizer.eos_token_id,
                    )

                # Decode
                response = self.tokenizer.decode(outputs[0][inputs.shape[1]:], skip_special_tokens=True)

                result = {
                    "prompt": prompt,
                    "response": response.strip(),
                    "response_length": len(response.strip()),
                    "success": True
                }

                print(f"   ✅ Prompt: {prompt[:30]}...")
                print(f"      Response: {response.strip()[:60]}...")

            except Exception as e:
                result = {
                    "prompt": prompt,
                    "error": str(e),
                    "success": False
                }
                print(f"   ❌ Failed: {prompt[:30]}... - {e}")

            results.append(result)

        success_count = sum(1 for r in results if r["success"])
        print(f"✅ Generation test: {success_count}/{len(results)} prompts successful")

        return {
            "total_prompts": len(results),
            "successful": success_count,
            "success_rate": success_count / len(results),
            "results": results
        }

    def test_dnd_scenarios(self) -> Dict[str, Any]:
        """Test D&D-specific scenarios."""
        print("🎲 Testing D&D scenario responses...")

        dnd_scenarios = [
            {
                "name": "Perception Check",
                "prompt": "Context:\nRole: Dungeon Master\nLocation: Tavern\nParty: Thordak (Fighter, Level 5)\n\nPlayer: I want to look around the room carefully.\nDM:",
                "expects_tools": True
            },
            {
                "name": "Combat Action",
                "prompt": "Context:\nRole: Dungeon Master\nLocation: Combat\nParty: Elara (Wizard, Level 5)\n\nPlayer: I cast Magic Missile at the orc.\nDM:",
                "expects_tools": True
            },
            {
                "name": "Roleplay Interaction",
                "prompt": "Context:\nRole: Dungeon Master\nLocation: Village\nParty: Grimm (Cleric, Level 5)\n\nPlayer: I approach the village elder and ask about the recent troubles.\nDM:",
                "expects_tools": False
            }
        ]

        results = []

        for scenario in dnd_scenarios:
            try:
                inputs = self.tokenizer.encode(scenario["prompt"], return_tensors="pt")

                with torch.no_grad():
                    outputs = self.model.generate(
                        inputs,
                        max_length=inputs.shape[1] + 150,
                        num_return_sequences=1,
                        temperature=0.7,
                        top_p=0.9,
                        do_sample=True,
                        pad_token_id=self.tokenizer.eos_token_id,
                    )

                response = self.tokenizer.decode(outputs[0][inputs.shape[1]:], skip_special_tokens=True)

                # Check for tool calls
                has_tool_calls = "[" in response and "]" in response

                result = {
                    "scenario": scenario["name"],
                    "response": response.strip(),
                    "has_tool_calls": has_tool_calls,
                    "expects_tools": scenario["expects_tools"],
                    "tool_expectation_met": has_tool_calls == scenario["expects_tools"],
                    "success": True
                }

                status = "✅" if result["tool_expectation_met"] else "⚠️"
                print(f"   {status} {scenario['name']}: Tool calls = {has_tool_calls}")

            except Exception as e:
                result = {
                    "scenario": scenario["name"],
                    "error": str(e),
                    "success": False
                }
                print(f"   ❌ {scenario['name']}: Failed - {e}")

            results.append(result)

        success_count = sum(1 for r in results if r["success"])
        tool_accuracy = sum(1 for r in results if r.get("tool_expectation_met", False))

        print(f"✅ D&D scenarios: {success_count}/{len(results)} successful")
        print(f"🔧 Tool accuracy: {tool_accuracy}/{len(results)} correct")

        return {
            "total_scenarios": len(results),
            "successful": success_count,
            "tool_accuracy": tool_accuracy,
            "success_rate": success_count / len(results),
            "tool_accuracy_rate": tool_accuracy / len(results),
            "results": results
        }

    def test_cactus_compatibility(self) -> Dict[str, Any]:
        """Test compatibility with Cactus infrastructure requirements."""
        print("🔗 Testing CactusTTS compatibility...")

        compatibility_tests = {
            "model_format": False,
            "tokenizer_format": False,
            "size_acceptable": False,
            "config_valid": False,
            "generation_works": False
        }

        # Check model format
        model_files = list(self.model_dir.glob("*.safetensors")) + list(self.model_dir.glob("*.bin"))
        compatibility_tests["model_format"] = len(model_files) > 0

        # Check tokenizer format
        tokenizer_files = ["tokenizer.json", "vocab.json"]
        compatibility_tests["tokenizer_format"] = all(
            (self.model_dir / f).exists() for f in tokenizer_files
        )

        # Check size (should be reasonable for mobile)
        total_size = sum(f.stat().st_size for f in model_files) / (1024 * 1024)
        compatibility_tests["size_acceptable"] = total_size < 3000  # 3GB limit

        # Check config
        config_path = self.model_dir / "config.json"
        if config_path.exists():
            try:
                with open(config_path, 'r') as f:
                    config = json.load(f)
                compatibility_tests["config_valid"] = "model_type" in config
            except:
                pass

        # Check generation
        if self.model and self.tokenizer:
            try:
                test_input = self.tokenizer.encode("Test", return_tensors="pt")
                with torch.no_grad():
                    output = self.model.generate(test_input, max_length=test_input.shape[1] + 5)
                compatibility_tests["generation_works"] = output.shape[1] > test_input.shape[1]
            except:
                pass

        # Print results
        for test, passed in compatibility_tests.items():
            status = "✅" if passed else "❌"
            print(f"   {status} {test.replace('_', ' ').title()}")

        compatibility_score = sum(compatibility_tests.values()) / len(compatibility_tests)
        print(f"🎯 Overall compatibility: {compatibility_score:.1%}")

        return {
            "tests": compatibility_tests,
            "score": compatibility_score,
            "model_size_mb": total_size,
            "passed": compatibility_score >= 0.8
        }

    def generate_test_report(self, validation: Dict, generation: Dict, dnd: Dict, compatibility: Dict) -> str:
        """Generate a comprehensive test report."""
        report = f"""
🧪 Deployed Model Test Report
{'=' * 50}

📋 Model Information:
- Model Name: {self.model_name}
- Model Path: {self.model_dir}
- Model Size: {validation.get('size_mb', 0)} MB

✅ Deployment Validation:
- Model Exists: {'✅' if validation['model_exists'] else '❌'}
- Required Files: {len(validation['required_files'])}/{len(validation['required_files']) + len(validation['missing_files'])}
- Config Valid: {'✅' if validation['config_valid'] else '❌'}

🔧 Generation Testing:
- Success Rate: {generation['success_rate']:.1%}
- Successful Prompts: {generation['successful']}/{generation['total_prompts']}

🎲 D&D Scenario Testing:
- Success Rate: {dnd['success_rate']:.1%}
- Tool Call Accuracy: {dnd['tool_accuracy_rate']:.1%}
- Scenarios Passed: {dnd['successful']}/{dnd['total_scenarios']}

🔗 CactusTTS Compatibility:
- Compatibility Score: {compatibility['score']:.1%}
- Model Size: {compatibility['model_size_mb']:.1f} MB
- Overall Status: {'✅ COMPATIBLE' if compatibility['passed'] else '❌ NEEDS WORK'}

{'=' * 50}
"""

        if not compatibility['passed']:
            report += "\n⚠️  Issues to Address:\n"
            for test, passed in compatibility['tests'].items():
                if not passed:
                    report += f"   - {test.replace('_', ' ').title()}\n"

        return report

    def run_tests(self) -> Dict[str, Any]:
        """Run complete test suite."""
        print("🧪 Starting Deployed Model Testing")
        print("=" * 50)

        # Validate deployment
        validation = self.validate_deployment()
        if not validation["model_exists"]:
            return {"success": False, "error": "Model not deployed", "validation": validation}

        # Load model
        if not self.load_model():
            return {"success": False, "error": "Failed to load model", "validation": validation}

        # Run tests
        generation_test = self.test_basic_generation()
        dnd_test = self.test_dnd_scenarios()
        compatibility_test = self.test_cactus_compatibility()

        # Generate report
        report = self.generate_test_report(validation, generation_test, dnd_test, compatibility_test)

        results = {
            "success": True,
            "validation": validation,
            "generation_test": generation_test,
            "dnd_test": dnd_test,
            "compatibility_test": compatibility_test,
            "report": report
        }

        print(report)

        # Save results
        results_file = self.model_dir / "test_results.json"
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)

        print(f"💾 Test results saved to: {results_file}")

        return results


def main():
    """Main testing function."""
    import argparse

    parser = argparse.ArgumentParser(description="Test deployed D&D model")
    parser.add_argument("--model", default="custom-dnd-trained-model",
                       help="Model name in assets/models directory")

    args = parser.parse_args()

    # Run tests
    tester = DeployedModelTester(args.model)
    results = tester.run_tests()

    if results["success"]:
        compatibility_passed = results["compatibility_test"]["passed"]
        if compatibility_passed:
            print("\n🎉 All tests passed! Model is ready for CactusTTS integration!")
            return True
        else:
            print("\n⚠️  Tests completed but compatibility issues found.")
            print("Check the report above for details.")
            return False
    else:
        print(f"\n💥 Testing failed: {results['error']}")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
