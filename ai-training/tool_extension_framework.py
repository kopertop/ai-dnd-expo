#!/usr/bin/env python3
"""
Automated Tool Extension Framework
Automatically detects new tool calls in training data and extends the tool vocabulary
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple


class ToolExtensionFramework:
    """Manages automatic detection and extension of tool calls."""

    def __init__(self, data_dir: str = "./data", config_dir: str = "./trained_models"):
        self.data_dir = Path(data_dir)
        self.config_dir = Path(config_dir)
        self.tool_registry_file = self.config_dir / "tool_registry.json"

        # Default supported tools
        self.default_tools = {
            "roll": {
                "description": "Roll dice for D&D mechanics",
                "format": "[roll: dice_expression]",
                "examples": ["[roll: d20]", "[roll: 3d6+2]", "[roll: perception]"],
                "category": "dice"
            },
            "health": {
                "description": "Modify character health",
                "format": "[health: character, modifier]",
                "examples": ["[health: player, -5]", "[health: Sara, +10]"],
                "category": "character"
            },
            "inventory": {
                "description": "Manage character inventory",
                "format": "[inventory: character, action, item]",
                "examples": ["[inventory: player, add, sword]", "[inventory: Sara, remove, potion]"],
                "category": "character"
            },
            "spellcast": {
                "description": "Cast spells and manage spell slots",
                "format": "[spellcast: character, spell, level]",
                "examples": ["[spellcast: Elara, magic_missile, 1]", "[spellcast: player, fireball, 3]"],
                "category": "magic"
            },
            "check": {
                "description": "Perform ability checks",
                "format": "[check: ability, character]",
                "examples": ["[check: perception, player]", "[check: stealth, Sara]"],
                "category": "ability"
            },
            "save": {
                "description": "Make saving throws",
                "format": "[save: type, character, dc]",
                "examples": ["[save: dexterity, player, 15]", "[save: wisdom, Sara, 12]"],
                "category": "ability"
            }
        }

        # Ensure config directory exists
        self.config_dir.mkdir(exist_ok=True)

    def load_tool_registry(self) -> Dict:
        """Load the current tool registry."""
        if self.tool_registry_file.exists():
            try:
                with open(self.tool_registry_file, 'r') as f:
                    registry = json.load(f)
                print(f"📖 Loaded tool registry with {len(registry.get('tools', {}))} tools")
                return registry
            except Exception as e:
                print(f"⚠️  Warning: Could not load tool registry: {e}")

        # Return default registry
        registry = {
            "version": "1.0.0",
            "last_updated": None,
            "tools": self.default_tools.copy(),
            "categories": {
                "dice": "Dice rolling and random generation",
                "character": "Character management and stats",
                "magic": "Spell casting and magical effects",
                "ability": "Ability checks and saving throws",
                "combat": "Combat actions and mechanics",
                "environment": "Environmental interactions",
                "social": "Social interactions and roleplay"
            }
        }

        print("📝 Created default tool registry")
        return registry

    def save_tool_registry(self, registry: Dict):
        """Save the tool registry."""
        try:
            with open(self.tool_registry_file, 'w') as f:
                json.dump(registry, f, indent=2)
            print(f"💾 Tool registry saved to {self.tool_registry_file}")
        except Exception as e:
            print(f"❌ Failed to save tool registry: {e}")

    def extract_tool_calls_from_text(self, text: str) -> List[Tuple[str, str]]:
        """Extract tool calls from text using regex patterns."""
        # Pattern to match [tool_name: arguments]
        pattern = r'\[([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([^\]]+)\]'
        matches = re.findall(pattern, text)

        # Clean up matches
        tool_calls = []
        for tool_name, arguments in matches:
            tool_name = tool_name.lower().strip()
            arguments = arguments.strip()
            tool_calls.append((tool_name, arguments))

        return tool_calls

    def scan_training_data_for_tools(self) -> Dict[str, List[str]]:
        """Scan all training data for tool calls."""
        print("🔍 Scanning training data for tool calls...")

        tool_usage = {}  # tool_name -> list of argument examples

        # Scan markdown files in scenarios directory
        scenario_dir = self.data_dir / "scenarios"
        if not scenario_dir.exists():
            print("⚠️  No scenarios directory found")
            return tool_usage

        md_files = list(scenario_dir.rglob("*.md"))
        print(f"📖 Scanning {len(md_files)} markdown files...")

        for md_file in md_files:
            try:
                with open(md_file, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Extract tool calls from the content
                tool_calls = self.extract_tool_calls_from_text(content)

                for tool_name, arguments in tool_calls:
                    if tool_name not in tool_usage:
                        tool_usage[tool_name] = []

                    # Add unique argument examples
                    if arguments not in tool_usage[tool_name]:
                        tool_usage[tool_name].append(arguments)

            except Exception as e:
                print(f"⚠️  Error scanning {md_file}: {e}")
                continue

        print(f"✅ Found {len(tool_usage)} unique tool types")
        for tool_name, examples in tool_usage.items():
            print(f"  📋 {tool_name}: {len(examples)} usage examples")

        return tool_usage

    def categorize_tool(self, tool_name: str, examples: List[str]) -> str:
        """Automatically categorize a tool based on its name and usage examples."""
        tool_name_lower = tool_name.lower()

        # Dice-related tools
        if any(keyword in tool_name_lower for keyword in ['roll', 'dice', 'random']):
            return "dice"

        # Character-related tools
        if any(keyword in tool_name_lower for keyword in ['health', 'hp', 'inventory', 'stat', 'character']):
            return "character"

        # Magic-related tools
        if any(keyword in tool_name_lower for keyword in ['spell', 'magic', 'cast', 'mana']):
            return "magic"

        # Ability-related tools
        if any(keyword in tool_name_lower for keyword in ['check', 'save', 'ability', 'skill']):
            return "ability"

        # Combat-related tools
        if any(keyword in tool_name_lower for keyword in ['attack', 'damage', 'combat', 'initiative']):
            return "combat"

        # Environment-related tools
        if any(keyword in tool_name_lower for keyword in ['environment', 'weather', 'light', 'trap']):
            return "environment"

        # Social-related tools
        if any(keyword in tool_name_lower for keyword in ['persuasion', 'deception', 'insight', 'social']):
            return "social"

        # Default to character if unsure
        return "character"

    def generate_tool_description(self, tool_name: str, examples: List[str]) -> str:
        """Generate a description for a tool based on its usage examples."""
        tool_name_lower = tool_name.lower()

        # Common patterns
        if 'roll' in tool_name_lower:
            return f"Roll dice or make {tool_name} checks"
        elif 'health' in tool_name_lower or 'hp' in tool_name_lower:
            return f"Manage character health and hit points"
        elif 'inventory' in tool_name_lower:
            return f"Manage character inventory and items"
        elif 'spell' in tool_name_lower or 'cast' in tool_name_lower:
            return f"Cast spells and manage magical effects"
        elif 'check' in tool_name_lower:
            return f"Perform {tool_name} checks and tests"
        elif 'save' in tool_name_lower:
            return f"Make {tool_name} saving throws"
        else:
            return f"Perform {tool_name} actions in the game"

    def detect_new_tools(self) -> Tuple[Dict[str, Dict], List[str]]:
        """Detect new tools in training data."""
        print("🔍 Detecting new tools in training data...")

        # Load current registry
        registry = self.load_tool_registry()
        current_tools = set(registry.get("tools", {}).keys())

        # Scan training data
        tool_usage = self.scan_training_data_for_tools()
        found_tools = set(tool_usage.keys())

        # Find new tools
        new_tools = found_tools - current_tools

        if not new_tools:
            print("✅ No new tools detected")
            return {}, []

        print(f"🆕 Found {len(new_tools)} new tools: {', '.join(new_tools)}")

        # Generate tool definitions for new tools
        new_tool_definitions = {}
        validation_errors = []

        for tool_name in new_tools:
            examples = tool_usage[tool_name]

            # Validate tool name
            if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', tool_name):
                validation_errors.append(f"Invalid tool name: {tool_name}")
                continue

            # Generate tool definition
            tool_def = {
                "description": self.generate_tool_description(tool_name, examples),
                "format": f"[{tool_name}: arguments]",
                "examples": [f"[{tool_name}: {ex}]" for ex in examples[:3]],  # Limit to 3 examples
                "category": self.categorize_tool(tool_name, examples),
                "auto_detected": True,
                "usage_count": len(examples)
            }

            new_tool_definitions[tool_name] = tool_def

        return new_tool_definitions, validation_errors

    def extend_tool_vocabulary(self, auto_approve: bool = False) -> bool:
        """Extend the tool vocabulary with newly detected tools."""
        print("🔧 Extending tool vocabulary...")

        # Detect new tools
        new_tools, errors = self.detect_new_tools()

        if errors:
            print("❌ Validation errors found:")
            for error in errors:
                print(f"  - {error}")

        if not new_tools:
            print("✅ No new tools to add")
            return True

        # Load current registry
        registry = self.load_tool_registry()

        # Show new tools for approval
        print(f"\n📋 New tools detected:")
        for tool_name, tool_def in new_tools.items():
            print(f"\n🔧 {tool_name}")
            print(f"   📝 Description: {tool_def['description']}")
            print(f"   📂 Category: {tool_def['category']}")
            print(f"   📊 Usage count: {tool_def['usage_count']}")
            print(f"   📋 Examples: {', '.join(tool_def['examples'][:2])}")

        # Get approval
        if not auto_approve:
            response = input(f"\n❓ Add these {len(new_tools)} new tools to the registry? (y/N): ")
            if response.lower() not in ['y', 'yes']:
                print("❌ Tool extension cancelled")
                return False

        # Add new tools to registry
        registry["tools"].update(new_tools)
        registry["last_updated"] = str(Path().cwd())  # Use current timestamp

        # Update version
        try:
            version_parts = registry["version"].split(".")
            minor_version = int(version_parts[1]) + 1
            registry["version"] = f"{version_parts[0]}.{minor_version}.0"
        except:
            registry["version"] = "1.1.0"

        # Save updated registry
        self.save_tool_registry(registry)

        print(f"✅ Added {len(new_tools)} new tools to registry")
        print(f"📦 Registry version updated to {registry['version']}")

        return True

    def validate_tool_format(self, tool_calls: List[Tuple[str, str]], registry: Dict) -> Dict:
        """Validate tool call formats against the registry."""
        print("🔍 Validating tool call formats...")

        tools = registry.get("tools", {})
        validation_results = {
            "total_calls": len(tool_calls),
            "valid_format": 0,
            "supported_tools": 0,
            "unsupported_tools": [],
            "format_errors": []
        }

        for tool_name, arguments in tool_calls:
            # Check if tool is supported
            if tool_name in tools:
                validation_results["supported_tools"] += 1
            else:
                if tool_name not in validation_results["unsupported_tools"]:
                    validation_results["unsupported_tools"].append(tool_name)

            # Basic format validation (has arguments)
            if arguments.strip():
                validation_results["valid_format"] += 1
            else:
                validation_results["format_errors"].append(f"Empty arguments for {tool_name}")

        return validation_results

    def generate_documentation(self) -> str:
        """Generate documentation for all supported tools."""
        print("📚 Generating tool documentation...")

        registry = self.load_tool_registry()
        tools = registry.get("tools", {})
        categories = registry.get("categories", {})

        # Group tools by category
        tools_by_category = {}
        for tool_name, tool_def in tools.items():
            category = tool_def.get("category", "other")
            if category not in tools_by_category:
                tools_by_category[category] = []
            tools_by_category[category].append((tool_name, tool_def))

        # Generate documentation
        doc_lines = [
            "# D&D Tool Call Reference",
            "",
            f"This document describes all supported tool calls for the D&D AI system.",
            f"Registry version: {registry.get('version', 'unknown')}",
            f"Last updated: {registry.get('last_updated', 'unknown')}",
            "",
            "## Tool Categories",
            ""
        ]

        # Add category descriptions
        for category, description in categories.items():
            if category in tools_by_category:
                doc_lines.append(f"- **{category.title()}**: {description}")

        doc_lines.append("")

        # Add tools by category
        for category in sorted(tools_by_category.keys()):
            category_tools = tools_by_category[category]
            category_desc = categories.get(category, "")

            doc_lines.extend([
                f"## {category.title()} Tools",
                "",
                f"{category_desc}",
                ""
            ])

            for tool_name, tool_def in sorted(category_tools):
                doc_lines.extend([
                    f"### {tool_name}",
                    "",
                    f"**Description**: {tool_def.get('description', 'No description')}",
                    "",
                    f"**Format**: `{tool_def.get('format', f'[{tool_name}: arguments]')}`",
                    "",
                    "**Examples**:"
                ])

                examples = tool_def.get("examples", [])
                for example in examples:
                    doc_lines.append(f"- `{example}`")

                if tool_def.get("auto_detected"):
                    doc_lines.append(f"\n*Auto-detected tool with {tool_def.get('usage_count', 0)} usage examples*")

                doc_lines.append("")

        return "\n".join(doc_lines)

    def save_documentation(self, output_file: Optional[str] = None) -> str:
        """Save tool documentation to file."""
        if output_file is None:
            output_file = self.config_dir / "tool_documentation.md"
        else:
            output_file = Path(output_file)

        documentation = self.generate_documentation()

        try:
            with open(output_file, 'w') as f:
                f.write(documentation)
            print(f"📚 Documentation saved to {output_file}")
            return str(output_file)
        except Exception as e:
            print(f"❌ Failed to save documentation: {e}")
            return ""

    def run_tool_extension(self, auto_approve: bool = False) -> bool:
        """Run the complete tool extension workflow."""
        print("🔧 Starting Tool Extension Framework")
        print("=" * 50)

        try:
            # Extend vocabulary with new tools
            success = self.extend_tool_vocabulary(auto_approve)

            if success:
                # Generate updated documentation
                doc_file = self.save_documentation()

                print("\n" + "=" * 60)
                print("🎉 TOOL EXTENSION COMPLETED!")
                print("=" * 60)
                print(f"📋 Tool Registry: {self.tool_registry_file}")
                print(f"📚 Documentation: {doc_file}")
                print("=" * 60)

            return success

        except Exception as e:
            print(f"❌ Tool extension failed: {e}")
            return False


def main():
    """Main function for command-line usage."""
    import argparse

    parser = argparse.ArgumentParser(description="Tool Extension Framework")
    parser.add_argument("--scan", action="store_true", help="Scan training data for tools")
    parser.add_argument("--extend", action="store_true", help="Extend tool vocabulary")
    parser.add_argument("--auto-approve", action="store_true", help="Auto-approve new tools")
    parser.add_argument("--docs", action="store_true", help="Generate documentation")
    parser.add_argument("--data-dir", default="./data", help="Training data directory")
    parser.add_argument("--config-dir", default="./trained_models", help="Config directory")

    args = parser.parse_args()

    framework = ToolExtensionFramework(args.data_dir, args.config_dir)

    if args.scan:
        tool_usage = framework.scan_training_data_for_tools()
        print(f"\n📊 Tool Usage Summary:")
        for tool_name, examples in tool_usage.items():
            print(f"  {tool_name}: {len(examples)} examples")

    elif args.extend:
        success = framework.run_tool_extension(args.auto_approve)
        exit(0 if success else 1)

    elif args.docs:
        doc_file = framework.save_documentation()
        if doc_file:
            print(f"📚 Documentation generated: {doc_file}")
        else:
            exit(1)

    else:
        print("Use --help for usage information")


if __name__ == "__main__":
    main()
