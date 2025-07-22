#!/usr/bin/env python3
"""
CactusTTS Integration Test
Tests trained models for compatibility with the existing Cactus infrastructure
"""

import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer


class CactusIntegrationTester:
    """Tests trained models for CactusTTS compatibility."""

    def __init__(self, model_path: str):
        self.model_path = Path(model_path)
        self.model = None
        self.tokenizer = None
        self.cactus_config = None

    def load_cactus_config(self) -> bool:
        """Load the cactus configuration for the trained model."""
        config_path = self.model_path / "cactus_config.json"

        if not config_path.exists():
            print(f"❌ Cactus config not found: {config_path}")
            return False

        try:
            with open(config_path, 'r') as f:
                self.cactus_config = json.load(f)
            print(f"✅ Loaded Cactus config: {self.cactus_config['model']['name']}")
            return True
        except Exception as e:
            print(f"❌ Failed to load Cactus config: {e}")
            return False

    def load_model(self) -> bool:
        """Load the trained model."""
        try:
            print(f"🔍 Loading model from {self.model_path}")

            # Load base model and tokenizer
            base_model_name = "microsoft/DialoGPT-medium"

            base_model = AutoModelForCausalLM.from_pretrained(
                base_model_name,
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                device_map="auto" if torch.cuda.is_available() else None,
            )

            self.tokenizer = AutoTokenizer.from_pretrained(base_model_name)
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token

            # Load the trained adapter
            self.model = PeftModel.from_pretrained(base_model, self.model_path)

            print("✅ Model loaded successfully!")
            return True

        except Exception as e:
            print(f"❌ Failed to load model: {e}")
            return False

    def test_cactus_message_format(self) -> Dict[str, Any]:
        """Test compatibility with Cactus message format."""
        print("🧪 Testing Cactus message format compatibility...")

        # Simulate Cactus-style messages
        test_messages = [
            {
                "role": "system",
                "content": self.cactus_config["system_prompt"]
            },
            {
                "role": "user",
                "content": "I want to roll for perception to look around the room."
            }
        ]

        # Format as expected by the model
        formatted_prompt = ""
        for msg in test_messages:
            if msg["role"] == "system":
                formatted_prompt += f"System: {msg['content']}\n"
            elif msg["role"] == "user":
                formatted_prompt += f"User: {msg['content']}\n"

        formatted_prompt += "DM:"

        try:
            # Generate response
            inputs = self.tokenizer.encode(formatted_prompt, return_tensors="pt")

            with torch.no_grad():
                outputs = self.model.generate(
                    inputs,
                    max_length=inputs.shape[1] + 128,
                    num_return_sequences=1,
                    temperature=self.cactus_config["generation_config"]["temperature"],
                    top_p=self.cactus_config["generation_config"]["top_p"],
                    do_sample=True,
                    pad_token_id=self.tokenizer.eos_token_id,
                    eos_token_id=self.tokenizer.eos_token_id,
                )

            response = self.tokenizer.decode(outputs[0][inputs.shape[1]:], skip_special_tokens=True)

            return {
                "success": True,
                "prompt": formatted_prompt,
                "response": response.strip(),
                "response_length": len(response.strip())
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def test_tool_call_format(self) -> Dict[str, Any]:
        """Test tool call format compatibility."""
        print("🔧 Testing tool call format...")

        supported_tools = self.cactus_config["tools"]["supported"]
        tool_format = self.cactus_config["tools"]["format"]

        results = {
            "supported_tools": supported_tools,
            "expected_format": tool_format,
            "test_results": []
        }

        # Test each supported tool
        for tool in supported_tools[:3]:  # Test first 3 tools
            test_prompt = f"User: I want to use {tool}.\nDM:"

            try:
                inputs = self.tokenizer.encode(test_prompt, return_tensors="pt")

                with torch.no_grad():
                    outputs = self.model.generate(
                        inputs,
                        max_length=inputs.shape[1] + 64,
                        num_return_sequences=1,
                        temperature=0.7,
                        do_sample=True,
                        pad_token_id=self.tokenizer.eos_token_id,
                    )

                response = self.tokenizer.decode(outputs[0][inputs.shape[1]:], skip_special_tokens=True)

                # Check if response contains expected tool format
                has_tool_call = f"[{tool}:" in response or f"[{tool} " in response

                results["test_results"].append({
                    "tool": tool,
                    "prompt": test_prompt,
                    "response": response.strip(),
                    "has_tool_call": has_tool_call
                })

            except Exception as e:
                results["test_results"].append({
                    "tool": tool,
                    "error": str(e)
                })

        return results

    def test_memory_usage(self) -> Dict[str, Any]:
        """Test memory usage for mobile deployment."""
        print("💾 Testing memory usage...")

        try:
            # Get model size information
            model_files = list(self.model_path.glob("*.safetensors")) + list(self.model_path.glob("*.bin"))
            total_size = sum(f.stat().st_size for f in model_files)
            size_mb = total_size / (1024 * 1024)

            # Check if under mobile limit (2GB as specified in requirements)
            mobile_limit_mb = 2048
            under_limit = size_mb < mobile_limit_mb

            return {
                "model_size_mb": round(size_mb, 2),
                "mobile_limit_mb": mobile_limit_mb,
                "under_mobile_limit": under_limit,
                "model_files": [f.name for f in model_files]
            }

        except Exception as e:
            return {
                "error": str(e)
            }

    def test_performance_benchmark(self) -> Dict[str, Any]:
        """Basic performance benchmark."""
        print("⚡ Running performance benchmark...")

        test_prompt = "User: Tell me about this dungeon.\nDM:"

        try:
            import time

            # Warm up
            inputs = self.tokenizer.encode(test_prompt, return_tensors="pt")
            with torch.no_grad():
                self.model.generate(inputs, max_length=inputs.shape[1] + 32)

            # Benchmark
            start_time = time.time()

            with torch.no_grad():
                outputs = self.model.generate(
                    inputs,
                    max_length=inputs.shape[1] + 128,
                    num_return_sequences=1,
                    temperature=0.7,
                    do_sample=True,
                )

            end_time = time.time()

            response = self.tokenizer.decode(outputs[0][inputs.shape[1]:], skip_special_tokens=True)

            generation_time = end_time - start_time
            tokens_generated = len(self.tokenizer.encode(response))
            tokens_per_second = tokens_generated / generation_time if generation_time > 0 else 0

            return {
                "generation_time_seconds": round(generation_time, 3),
                "tokens_generated": tokens_generated,
                "tokens_per_second": round(tokens_per_second, 2),
                "response": response.strip()
            }

        except Exception as e:
            return {
                "error": str(e)
            }

    def run_integration_tests(self) -> Dict[str, Any]:
        """Run complete integration test suite."""
        print("🔗 Starting CactusTTS Integration Tests")
        print("=" * 50)

        # Load configuration
        if not self.load_cactus_config():
            return {"error": "Failed to load Cactus config", "success": False}

        # Load model
        if not self.load_model():
            return {"error": "Failed to load model", "success": False}

        # Run tests
        results = {
            "model_path": str(self.model_path),
            "cactus_config": self.cactus_config,
            "message_format_test": self.test_cactus_message_format(),
            "tool_call_test": self.test_tool_call_format(),
            "memory_test": self.test_memory_usage(),
            "performance_test": self.test_performance_benchmark()
        }

        # Determine overall success
        success_criteria = [
            results["message_format_test"].get("success", False),
            results["memory_test"].get("under_mobile_limit", False),
            results["performance_test"].get("tokens_per_second", 0) > 1.0
        ]

        results["overall_success"] = all(success_criteria)
        results["success_criteria"] = {
            "message_format": results["message_format_test"].get("success", False),
            "memory_under_limit": results["memory_test"].get("under_mobile_limit", False),
            "performance_adequate": results["performance_test"].get("tokens_per_second", 0) > 1.0
        }

        return results

    def generate_integration_report(self, results: Dict[str, Any]) -> str:
        """Generate integration test report."""
        report = f"""
🔗 CactusTTS Integration Test Report
{'=' * 50}

📋 Model Information:
- Model Path: {results['model_path']}
- Model Name: {results['cactus_config']['model']['name']}
- Model Type: {results['cactus_config']['model']['type']}

✅ Test Results:
"""

        # Message format test
        msg_test = results["message_format_test"]
        if msg_test.get("success"):
            report += f"\n✅ Message Format: PASS"
            report += f"\n   Response Length: {msg_test.get('response_length', 0)} chars"
        else:
            report += f"\n❌ Message Format: FAIL"
            if "error" in msg_test:
                report += f"\n   Error: {msg_test['error']}"

        # Memory test
        mem_test = results["memory_test"]
        if "error" not in mem_test:
            status = "✅ PASS" if mem_test["under_mobile_limit"] else "❌ FAIL"
            report += f"\n{status} Memory Usage: {mem_test['model_size_mb']} MB"
            report += f"\n   Mobile Limit: {mem_test['mobile_limit_mb']} MB"
        else:
            report += f"\n❌ Memory Test: ERROR - {mem_test['error']}"

        # Performance test
        perf_test = results["performance_test"]
        if "error" not in perf_test:
            status = "✅ PASS" if perf_test["tokens_per_second"] > 1.0 else "❌ SLOW"
            report += f"\n{status} Performance: {perf_test['tokens_per_second']} tok/s"
            report += f"\n   Generation Time: {perf_test['generation_time_seconds']}s"
        else:
            report += f"\n❌ Performance Test: ERROR - {perf_test['error']}"

        # Tool call test
        tool_test = results["tool_call_test"]
        tool_success = sum(1 for t in tool_test["test_results"] if t.get("has_tool_call", False))
        total_tools = len(tool_test["test_results"])
        report += f"\n🔧 Tool Calls: {tool_success}/{total_tools} tools generated calls"

        # Overall result
        overall = "✅ PASS" if results["overall_success"] else "❌ NEEDS WORK"
        report += f"\n\n🎯 Overall Result: {overall}"

        if not results["overall_success"]:
            report += "\n\n⚠️  Issues to address:"
            criteria = results["success_criteria"]
            if not criteria["message_format"]:
                report += "\n   - Message format compatibility"
            if not criteria["memory_under_limit"]:
                report += "\n   - Model size too large for mobile"
            if not criteria["performance_adequate"]:
                report += "\n   - Performance too slow"

        report += f"\n\n{'=' * 50}"
        return report


def main():
    """Main integration test function."""
    # Get the directory of this script
    script_dir = Path(__file__).parent
    model_path = script_dir / "trained_models/dnd_model"

    if not os.path.exists(model_path):
        print(f"❌ Model path not found: {model_path}")
        print("Make sure you've run training first with 'npm run train'")
        return False

    tester = CactusIntegrationTester(model_path)
    results = tester.run_integration_tests()

    if 'error' in results:
        print(f"❌ Integration test failed: {results['error']}")
        return False

    # Generate and print report
    report = tester.generate_integration_report(results)
    print(report)

    # Save results
    results_file = script_dir / "trained_models/integration_test_results.json"
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\n💾 Results saved to: {results_file}")

    return results["overall_success"]


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
