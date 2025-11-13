#!/usr/bin/env python3
"""
D&D Model Validation Script
Tests trained models against D&D scenarios and validates tool call accuracy
"""

import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer


class DnDModelValidator:
    """Validates trained D&D models against scenarios and tool calls."""

    def __init__(self, model_path: str):
        self.model_path = Path(model_path)
        self.model = None
        self.tokenizer = None
        self.validation_results = {}

    def load_model(self) -> bool:
        """Load the trained model for validation."""
        try:
            print(f"🔍 Loading model from {self.model_path}")

            # Load base model and tokenizer
            base_model_name = "microsoft/DialoGPT-medium"  # From adapter config

            print(f"📥 Loading base model: {base_model_name}")
            base_model = AutoModelForCausalLM.from_pretrained(
                base_model_name,
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                device_map="auto" if torch.cuda.is_available() else None,
            )

            self.tokenizer = AutoTokenizer.from_pretrained(base_model_name)
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token

            # Load the trained adapter
            print(f"🔧 Loading trained adapter from {self.model_path}")
            self.model = PeftModel.from_pretrained(base_model, self.model_path)

            print("✅ Model loaded successfully!")
            return True

        except Exception as e:
            print(f"❌ Failed to load model: {e}")
            return False

    def generate_response(self, prompt: str, max_length: int = 256) -> str:
        """Generate a response from the model."""
        if not self.model or not self.tokenizer:
            raise ValueError("Model not loaded. Call load_model() first.")

        # Tokenize input
        inputs = self.tokenizer.encode(prompt, return_tensors="pt")

        # Generate response
        with torch.no_grad():
            outputs = self.model.generate(
                inputs,
                max_length=inputs.shape[1] + max_length,
                num_return_sequences=1,
                temperature=0.7,
                top_p=0.9,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id,
                eos_token_id=self.tokenizer.eos_token_id,
            )

        # Decode response (remove input prompt)
        response = self.tokenizer.decode(outputs[0][inputs.shape[1]:], skip_special_tokens=True)
        return response.strip()

    def extract_tool_calls(self, text: str) -> List[str]:
        """Extract tool calls from generated text."""
        # Look for [tool: argument] pattern
        tool_pattern = r'\[(\w+):\s*([^\]]+)\]'
        matches = re.findall(tool_pattern, text)
        return [f"[{tool}: {arg}]" for tool, arg in matches]

    def validate_tool_call_format(self, tool_calls: List[str]) -> Dict[str, Any]:
        """Validate tool call format and supported tools."""
        supported_tools = ["roll", "health", "inventory", "spellcast", "check", "save"]

        results = {
            "total_calls": len(tool_calls),
            "valid_format": 0,
            "supported_tools": 0,
            "unsupported_tools": [],
            "format_errors": []
        }

        for call in tool_calls:
            # Check format
            if re.match(r'\[\w+:\s*[^\]]+\]', call):
                results["valid_format"] += 1

                # Extract tool name
                tool_match = re.match(r'\[(\w+):', call)
                if tool_match:
                    tool_name = tool_match.group(1).lower()
                    if tool_name in supported_tools:
                        results["supported_tools"] += 1
                    else:
                        results["unsupported_tools"].append(tool_name)
            else:
                results["format_errors"].append(call)

        return results

    def test_dnd_scenario(self, scenario: Dict[str, Any]) -> Dict[str, Any]:
        """Test model against a single D&D scenario."""
        print(f"🎲 Testing scenario: {scenario.get('name', 'Unknown')}")

        # Format prompt
        system_context = scenario.get('system', '')
        user_input = scenario.get('user', '')
        expected_response = scenario.get('expected', '')

        prompt = f"Context:\n{system_context}\n\nPlayer: {user_input}\n\nDM:"

        # Generate response
        try:
            generated_response = self.generate_response(prompt)

            # Extract tool calls
            tool_calls = self.extract_tool_calls(generated_response)
            tool_validation = self.validate_tool_call_format(tool_calls)

            # Basic quality checks
            quality_score = self.assess_response_quality(generated_response, expected_response)

            result = {
                "scenario_name": scenario.get('name', 'Unknown'),
                "prompt": prompt,
                "generated_response": generated_response,
                "tool_calls": tool_calls,
                "tool_validation": tool_validation,
                "quality_score": quality_score,
                "success": len(tool_calls) > 0 if scenario.get('expects_tools', False) else True
            }

            print(f"✅ Generated response: {generated_response[:100]}...")
            if tool_calls:
                print(f"🔧 Tool calls found: {tool_calls}")

            return result

        except Exception as e:
            print(f"❌ Error testing scenario: {e}")
            return {
                "scenario_name": scenario.get('name', 'Unknown'),
                "error": str(e),
                "success": False
            }

    def assess_response_quality(self, generated: str, expected: str = "") -> float:
        """Assess response quality with basic metrics."""
        score = 0.0

        # Length check (not too short, not too long)
        if 20 <= len(generated) <= 500:
            score += 0.3

        # D&D context keywords
        dnd_keywords = ["roll", "dice", "check", "damage", "hit", "miss", "save", "spell", "attack"]
        keyword_count = sum(1 for keyword in dnd_keywords if keyword.lower() in generated.lower())
        score += min(keyword_count * 0.1, 0.4)

        # Coherence (basic check for complete sentences)
        if generated.endswith('.') or generated.endswith('!') or generated.endswith('?'):
            score += 0.2

        # Tool call presence (if expected)
        if '[' in generated and ']' in generated:
            score += 0.1

        return min(score, 1.0)

    def load_test_scenarios(self) -> List[Dict[str, Any]]:
        """Load test scenarios for validation."""
        scenarios = [
            {
                "name": "Tavern Rumor Investigation",
                "system": "Role: Dungeon Master\nWorld: Forgotten Realms\nLocation: Tavern\nParty: Thordak (Dragonborn Fighter, Level 5, HP: 45/45)",
                "user": "I want to approach the bartender and ask about rumors in town.",
                "expects_tools": True,
                "expected": "Should include perception check or similar tool call"
            },
            {
                "name": "Combat Magic Missile",
                "system": "Role: Dungeon Master\nWorld: Forgotten Realms\nLocation: Combat\nParty: Elara (Elf Wizard, Level 5, HP: 28/28)",
                "user": "I want to cast Magic Missile at the goblin.",
                "expects_tools": True,
                "expected": "Should include damage roll"
            },
            {
                "name": "Healing Second Wind",
                "system": "Role: Dungeon Master\nWorld: Forgotten Realms\nLocation: Combat\nParty: Sara (Human Fighter, Level 6, HP: 32/58)",
                "user": "I'm badly injured. I want to use my Second Wind ability.",
                "expects_tools": True,
                "expected": "Should include healing roll and health update"
            },
            {
                "name": "Simple Roleplay",
                "system": "Role: Dungeon Master\nWorld: Forgotten Realms\nLocation: Village\nParty: Adventuring party",
                "user": "I want to talk to the village elder about the recent troubles.",
                "expects_tools": False,
                "expected": "Should provide narrative response"
            }
        ]

        return scenarios

    def run_validation(self) -> Dict[str, Any]:
        """Run complete validation suite."""
        print("🧪 Starting D&D Model Validation")
        print("=" * 50)

        if not self.load_model():
            return {"error": "Failed to load model", "success": False}

        # Load test scenarios
        scenarios = self.load_test_scenarios()

        # Test each scenario
        results = []
        for scenario in scenarios:
            result = self.test_dnd_scenario(scenario)
            results.append(result)

        # Calculate overall metrics
        total_scenarios = len(results)
        successful_scenarios = sum(1 for r in results if r.get('success', False))
        total_tool_calls = sum(len(r.get('tool_calls', [])) for r in results)
        valid_tool_calls = sum(r.get('tool_validation', {}).get('valid_format', 0) for r in results)

        overall_results = {
            "total_scenarios": total_scenarios,
            "successful_scenarios": successful_scenarios,
            "success_rate": successful_scenarios / total_scenarios if total_scenarios > 0 else 0,
            "total_tool_calls": total_tool_calls,
            "valid_tool_calls": valid_tool_calls,
            "tool_call_accuracy": valid_tool_calls / total_tool_calls if total_tool_calls > 0 else 0,
            "scenario_results": results
        }

        self.validation_results = overall_results
        return overall_results

    def generate_report(self) -> str:
        """Generate a validation report."""
        if not self.validation_results:
            return "No validation results available. Run validation first."

        results = self.validation_results

        report = f"""
🎯 D&D Model Validation Report
{'=' * 50}

📊 Overall Performance:
- Scenarios Tested: {results['total_scenarios']}
- Successful Scenarios: {results['successful_scenarios']}
- Success Rate: {results['success_rate']:.1%}

🔧 Tool Call Analysis:
- Total Tool Calls: {results['total_tool_calls']}
- Valid Tool Calls: {results['valid_tool_calls']}
- Tool Call Accuracy: {results['tool_call_accuracy']:.1%}

📝 Scenario Details:
"""

        for scenario in results['scenario_results']:
            if 'error' in scenario:
                report += f"\n❌ {scenario['scenario_name']}: ERROR - {scenario['error']}"
            else:
                status = "✅" if scenario['success'] else "❌"
                tool_count = len(scenario.get('tool_calls', []))
                quality = scenario.get('quality_score', 0)
                report += f"\n{status} {scenario['scenario_name']}: {tool_count} tools, {quality:.1f} quality"

        report += f"\n\n{'=' * 50}"
        return report


def main():
    """Main validation function."""
    model_path = "./trained_models/dnd_model"

    if not os.path.exists(model_path):
        print(f"❌ Model path not found: {model_path}")
        print("Make sure you've run training first with 'npm run train'")
        return False

    validator = DnDModelValidator(model_path)
    results = validator.run_validation()

    if 'error' in results:
        print(f"❌ Validation failed: {results['error']}")
        return False

    # Print report
    report = validator.generate_report()
    print(report)

    # Save results
    results_file = "./trained_models/validation_results.json"
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\n💾 Results saved to: {results_file}")

    # Return success based on performance
    success_rate = results.get('success_rate', 0)
    tool_accuracy = results.get('tool_call_accuracy', 0)

    if success_rate >= 0.7 and tool_accuracy >= 0.5:
        print("🎉 Validation PASSED!")
        return True
    else:
        print("⚠️  Validation needs improvement")
        print(f"   Success rate: {success_rate:.1%} (need ≥70%)")
        print(f"   Tool accuracy: {tool_accuracy:.1%} (need ≥50%)")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
