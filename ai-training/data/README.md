# D&D Training Data

This directory contains structured D&D scenarios in markdown format for training custom GGUF models.

## Structure

```
data/
├── scenarios/
│   ├── combat/          # Combat encounters and tactical situations
│   ├── roleplay/        # Social interactions and character development
│   ├── exploration/     # Dungeon exploration, traps, and investigation
│   └── shopping/        # Equipment purchases and merchant interactions
└── README.md           # This file
```

## Scenario Format

Each scenario follows this markdown structure:

```markdown
# SYSTEM

Role: Dungeon Master
World: [Campaign Setting]
Location: [Specific Location]
Party:

- [Character Name] ([Race Class], Level [X], HP: [current/max])

# USER

[Player's action or question]

# DM

[Dungeon Master's response and narrative]

# TOOLCALL (if applicable)

[Tool results, dice rolls, game mechanics]
```

## Available Scenarios

### Combat (`combat/`)

- **goblin_ambush.md** - Initiative, positioning, and multi-enemy combat
- **spellcasting_combat.md** - Healing spells, tactical movement, cover mechanics

### Roleplay (`roleplay/`)

- **tavern_information.md** - Social interaction, information gathering, persuasion

### Exploration (`exploration/`)

- **dungeon_trap.md** - Trap detection, investigation, problem-solving options

### Shopping (`shopping/`)

- **magic_items.md** - Item purchasing, magical equipment, merchant interactions

## Tool Call Format

The training data uses consistent tool call formatting:

- `[roll: dice_expression]` - Any dice roll (d20, 3d6+2, etc.)
- `[health: character, +/-amount]` - Health changes
- `[inventory: character, +/-item]` - Inventory updates
- `[spellcast: spell_name, level, target]` - Spell casting
- `[check: skill_name]` - Skill/ability checks
- `[save: save_type]` - Saving throws

## Adding New Scenarios

When creating new training scenarios:

1. **Use consistent formatting** - Follow the SYSTEM/USER/DM/TOOLCALL structure
2. **Include context** - Provide character details, location, and situation
3. **Show tool usage** - Demonstrate when and how to use game mechanics
4. **Vary complexity** - Include both simple and complex interactions
5. **Cover edge cases** - Include unusual situations and creative solutions

## Quality Guidelines

- **Accurate D&D 5e rules** - Follow official rules and mechanics
- **Rich narrative** - Provide descriptive, engaging storytelling
- **Clear structure** - Maintain consistent formatting and organization
- **Diverse scenarios** - Cover different types of gameplay situations
- **Tool integration** - Show natural integration of game mechanics

## Usage

These scenarios are processed by the `DnDDataProcessor` class in the training notebook to create properly formatted training data for the Gemma3N model fine-tuning process.
