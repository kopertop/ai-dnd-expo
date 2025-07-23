#!/usr/bin/env python3.11
"""
Test Deployed Model Integration
Validates that the deployed model works correctly with the CactusTTS infrastructure
"""

import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer


class DeployedModelTester:
    """Tests deployed models for integration validation."""

    def __init__(self, model_path: str = None):
        self.script_dir = Path(__file__).parent
        self.project_root = self.script_dir.parent

        # Default to deployed model location
        if model_path is None:
            model_path = self.project_root / "assets" / "models" / "custom-dnd-model"

        self.model_path = Path(model_path)
        self.model = None
        self.tokenizer = None
        self.integration_config = None

    def check_deployment(self) -> bool:
        """Check if the model is properly deployed."""
        if not self.model_path.exists():
            print(f"❌ Deployed model not found: {self.model_path}")
            print("Run 'npm run train:deploy' first to deploy the model")
            return False

        # Check for required files
        required_files = [
            "config.json",
            "tokenizer.json",
            "cactus_integration.json",
            "integration_example.ts"
        ]

        missing_files = []
        for file in required_files:
            if not (self.model_path / file).exists():
                missing_files.append(file)

        if missing_files:
            print(f"❌ Missing required files: {missing_files}")
            return False

        print(f"✅ Deployed model found: {self.model_path}")
        return True

    def load_integration_config(self) -> bool:
        """Load the integration configuration."""
        config_file = self.model_path / "cactus_integration.json"

        try:
            with open(config_file, 'r') as f:
                self.integration_config = json.load(f)
            print("✅ Integration config loaded")
            return True
        except Exception as e:
            print(f"❌ Failed to load integration config: {e}")
            return False

    def load_deployed_model(self) -> bool:
        """Load the deployed model for testing."""
        try:
            print(f"📥 Loading deployed model from: {self.model_path}")

            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(str(self.model_path))
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token

            # Load model
            self.model = AutoModelForCausalLM.from_pretrained(
                str(self.model_path),
                torch_dtype=torch.float32,
                device_map="cpu"  # Keep on CPU for testing
            )

            print("✅ Deployed model loaded successfully!")
            return True

        except Exception as e:
            print(f"❌ Failed to load deployed model: {e}")
            return False

    def test_basic_generation(self) -> Dict[str, Any]:
        """Test basic text generation."""
        print("🧪 Testing basic generation...")

        test_prompt = "User: Hello, I'm ready to start our D&D adventure.\nDM:"

        try:
            start_time = time.time()

            inputs = self.tokenizer.encode(test_prompt, return_tensors="pt")

            with torch.no_grad():
                outputs = self.model.generate(
                    inputs,
                    max_length=inputs.shape[1] + 100,
                    num_return_sequences=1,
                    temperature=0.7,
                    top_p=0.9,
                    do_sample=True,
                    pad_token_id=self.tokenizer.eos_token_id,
                )

            response = self.tokenizer.decode(outputs[0][inputs.shape[1]:], skip_special_tokens=True)

            end_time = time.time()
            generation_time = end_time - start_time

            return {
                "success": True,
                "prompt": test_prompt,
                "response": response.strip(),
                "generation_time": round(generation_time, 3),
                "response_length": len(response.strip())
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def test_dnd_scenarios(self) -> List[Dict[str, Any]]:
        """Test D&D-specific scenarios."""
        print("🎲 Testing D&D scenarios...")

        scenarios = [
            {
                "name": "Combat Initiative",
                "prompt": "User: We encounter a group of goblins. What should we do?\nDM:",
                "expects": ["roll", "initiative", "combat", "attack"]
            },
            {
                "name": "Skill Check Request",
                "prompt": "User: I want to search the room for hidden doors.\nDM:",
                "expects": ["perception", "investigation", "roll", "check"]
            },
            {
                "name": "Spellcasting",
                "prompt": "User: I cast Fireball at the enemies.\nDM:",
                "expects": ["damage", "roll", "save", "spell"]
            },
            {
                "name": "Roleplay Interaction",
                "prompt": "User: I approach the tavern keeper and ask about local rumors.\nDM:",
                "expects": ["tavern", "rumors", "information", "talk"]
            }
        ]

        results = []

        for scenario in scenarios:
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

                # Check for expected keywords
                response_lower = response.lower()
                found_keywords = [kw for kw in scenario["expects"] if kw in response_lower]
                relevance_score = len(found_keywords) / len(scenario["expects"])

                results.append({
                    "scenario": scenario["name"],
                    "prompt": scenario["prompt"],
                    "response": response.strip(),
                    "expected_keywords": scenario["expects"],
                    "found_keywords": found_keywords,
                    "relevance_score": relevance_score,
                    "success": relevance_score > 0.2  # At least 20% keyword match
                })

            except Exception as e:
                results.append({
                    "scenario": scenario["name"],
                    "error": str(e),
                    "success": False
                })

        return results

    def test_tool_call_format(self) -> Dict[str, Any]:
        """Test tool call format generation."""
        print("🔧 Testing tool call format...")

        tool_prompts = [
            "User: I want to roll for perception.\nDM:",
            "User: I attack with my sword.\nDM:",
            "User: I'm taking damage, update my health.\nDM:"
        ]

        results = []
        total_tool_calls = 0

        for prompt in tool_prompts:
            try:
                inputs = self.tokenizer.encode(prompt, return_tensors="pt")

                with torch.no_grad():
                    outputs = self.model.generate(
                        inputs,
                        max_length=inputs.shape[1] + 80,
                        num_return_sequences=1,
                        temperature=0.7,
                        do_sample=True,
                        pad_token_id=self.tokenizer.eos_token_id,
                    )

                response = self.tokenizer.decode(outputs[0][inputs.shape[1]:], skip_special_tokens=True)

                # Look for tool call patterns
                import re
                tool_calls = re.findall(r'\[(\w+):\s*([^\]]+)\]', response)

                results.append({
                    "prompt": prompt,
                    "response": response.strip(),
                    "tool_calls": tool_calls,
                    "has_tool_calls": len(tool_calls) > 0
                })

                total_tool_calls += len(tool_calls)

            except Exception as e:
                results.append({
                    "prompt": prompt,
                    "error": str(e),
                    "has_tool_calls": False
                })

        return {
            "results": results,
            "total_prompts": len(tool_prompts),
            "total_tool_calls": total_tool_calls,
            "tool_call_rate": total_tool_calls / len(tool_prompts) if tool_prompts else 0
        }

    def test_performance_metrics(self) -> Dict[str, Any]:
        """Test performance metrics."""
        print("⚡ Testing performance metrics...")

        test_prompts = [
            "User: Tell me about this dungeon.\nDM:",
            "User: What do I see in this room?\nDM:",
            "User: I want to cast a spell.\nDM:"
        ]

        times = []
        token_counts = []

        for prompt in test_prompts:
            try:
                start_time = time.time()

                inputs = self.tokenizer.encode(prompt, return_tensors="pt")

                with torch.no_grad():
                    outputs = self.model.generate(
                        inputs,
                        max_length=inputs.shape[1] + 100,
                        num_return_sequences=1,
                        temperature=0.7,
                        do_sample=True,
                    )

                response = self.tokenizer.decode(outputs[0][inputs.shape[1]:], skip_special_tokens=True)

                end_time = time.time()
                generation_time = end_time - start_time
                token_count = len(self.tokenizer.encode(response))

                times.append(generation_time)
                token_counts.append(token_count)

            except Exception as e:
                print(f"⚠️  Performance test failed for prompt: {e}")

        if times and token_counts:
            avg_time = sum(times) / len(times)
            avg_tokens = sum(token_counts) / len(token_counts)
            tokens_per_second = avg_tokens / avg_time if avg_time > 0 else 0

            return {
                "average_generation_time": round(avg_time, 3),
                "average_tokens_generated": round(avg_tokens, 1),
                "tokens_per_second": round(tokens_per_second, 2),
                "test_count": len(times)
            }
        else:
            return {
                "error": "No successful performance tests",
                "test_count": 0
            }

    def run_integration_validation(self) -> Dict[str, Any]:
        """Run complete integration validation."""
        print("🔗 Starting Deployed Model Integration Validation")
        print("=" * 60)

        # Check deployment
        if not self.check_deployment():
            return {"success": False, "error": "Model not properly deployed"}

        # Load integration config
        if not self.load_integration_config():
            return {"success": False, "error": "Failed to load integration config"}

        # Load model
        if not self.load_deployed_model():
            return {"success": False, "error": "Failed to load deployed model"}

        # Run tests
        basic_test = self.test_basic_generation()
        dnd_scenarios = self.test_dnd_scenarios()
        tool_calls = self.test_tool_call_format()
        performance = self.test_performance_metrics()

        # Calculate overall success
        successful_scenarios = sum(1 for s in dnd_scenarios if s.get("success", False))
        scenario_success_rate = successful_scenarios / len(dnd_scenarios) if dnd_scenarios else 0

        overall_success = (
            basic_test.get("success", False) and
            scenario_success_rate >= 0.5 and  # At least 50% scenarios successful
            performance.get("tokens_per_second", 0) > 1.0  # Reasonable performance
        )

        results = {
            "success": overall_success,
            "model_path": str(self.model_path),
            "integration_config": self.integration_config,
            "basic_generation": basic_test,
            "dnd_scenarios": dnd_scenarios,
            "tool_calls": tool_calls,
            "performance": performance,
            "summary": {
                "total_scenarios": len(dnd_scenarios),
                "successful_scenarios": successful_scenarios,
                "scenario_success_rate": round(scenario_success_rate, 2),
                "tool_call_rate": tool_calls.get("tool_call_rate", 0),
                "performance_adequate": performance.get("tokens_per_second", 0) > 1.0
            }
        }

        return results

    def generate_validation_report(self, results: Dict[str, Any]) -> str:
        """Generate validation report."""
        report = f"""
🔗 Deployed Model Integration Validation Report
{'=' * 60}

📋 Model Information:
- Model Path: {results['model_path']}
- Integration Config: {'✅ Loaded' if results.get('integration_config') else '❌ Missing'}

✅ Test Results:

🧪 Basic Generation:
"""

        basic = results["basic_generation"]
        if basic.get("success"):
            report += f"   ✅ PASS - Generated {basic.get('response_length', 0)} chars in {basic.get('generation_time', 0)}s"
        else:
            report += f"   ❌ FAIL - {basic.get('error', 'Unknown error')}"

        report += f"\n\n🎲 D&D Scenarios:"
        summary = results["summary"]
        report += f"\n   Success Rate: {summary['successful_scenarios']}/{summary['total_scenarios']} ({summary['scenario_success_rate']:.1%})"

        for scenario in results["dnd_scenarios"]:
            status = "✅" if scenario.get("success") else "❌"
            relevance = scenario.get("relevance_score", 0)
            report += f"\n   {status} {scenario['scenario']}: {relevance:.1%} relevance"

        report += f"\n\n🔧 Tool Calls:"
        tool_results = results["tool_calls"]
        report += f"\n   Tool Call Rate: {tool_results.get('tool_call_rate', 0):.1f} calls/prompt"
        report += f"\n   Total Tool Calls: {tool_results.get('total_tool_calls', 0)}"

        report += f"\n\n⚡ Performance:"
        perf = results["performance"]
        if "error" not in perf:
            report += f"\n   Speed: {perf.get('tokens_per_second', 0):.1f} tokens/second"
            report += f"\n   Avg Time: {perf.get('average_generation_time', 0):.2f}s"
        else:
            report += f"\n   ❌ Performance test failed"

        # Overall result
        overall = "✅ PASS" if results["success"] else "❌ NEEDS WORK"
        report += f"\n\n🎯 Overall Result: {overall}"

        if not results["success"]:
            report += "\n\n⚠️  Issues to address:"
            if not basic.get("success"):
                report += "\n   - Basic generation not working"
            if summary["scenario_success_rate"] < 0.5:
                report += "\n   - D&D scenario performance too low"
            if not summary["performance_adequate"]:
                report += "\n   - Performance too slow"

        report += f"\n\n{'=' * 60}"
        return report


def main():
    """Main validation function."""
    import argparse

    parser = argparse.ArgumentParser(description="Test deployed D&D model integration")
    parser.add_argument("--model", help="Path to deployed model (default: assets/models/custom-dnd-model)")

    args = parser.parse_args()

    tester = DeployedModelTester(args.model)
    results = tester.run_integration_validation()

    if 'error' in results:
        print(f"❌ Validation failed: {results['error']}")
        return False

    # Generate and print report
    report = tester.generate_validation_report(results)
    print(report)

    # Save results
    results_file = tester.script_dir / "deployed_model_validation.json"
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\n💾 Results saved to: {results_file}")

    return results["success"]


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
