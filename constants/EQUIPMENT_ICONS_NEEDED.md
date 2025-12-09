# Equipment Icons Needed

This document lists all equipment items that need icons created. Items are organized by category and priority.

## ✅ Already Have Icons (from weapons spritesheet or individual files)

### Weapons (from spritesheet)
- Longsword, Shortsword, Dagger, Mace, Handaxe, Greataxe, Scimitar, Rapier, Staff, Shortbow, Light Crossbow, Unarmed Strike

### Armor (individual files - some are placeholders)
- Leather Cap, Cloth Hood, Leather Armor, Robes, Leather Bracers, Cloth Sleeves, Leather Leggings, Cloth Pants, Leather Boots, Cloth Boots

### Shields & Tools
- Shield, Spellbook, Arcane Focus, Druidic Focus, Quiver

### Consumables
- Rations, Healing Potion

---

## ❌ NEEDS ICONS - Armor Pieces

### Metal Armor Set (High Priority - Used by Fighters/Paladins)
1. **item_metal_helmet** - Metal Helmet (currently using leather placeholder)
2. **item_metal_gauntlets** - Metal Gauntlets (currently using leather placeholder)
3. **item_metal_greaves** - Metal Greaves (currently using leather placeholder)
4. **item_metal_boots** - Metal Boots (currently using leather placeholder)

### Chain Armor Set (High Priority - Used by Clerics/Artificers)
5. **item_chain_coif** - Chain Coif/Helmet (currently using leather placeholder)
6. **item_chain_sleeves** - Chain Sleeves (currently using leather placeholder)
7. **item_chain_leggings** - Chain Leggings (currently using leather placeholder)
8. **item_chain_boots** - Chain Boots (currently using leather placeholder)
9. **item_chainmail** - Chainmail Chest (currently using leather placeholder)

### Hide Armor (Medium Priority - Used by Barbarians/Druids)
10. **item_hide_armor** - Hide Armor Chest (currently using leather placeholder)

### Goblin Armor Set (Medium Priority - Used by NPCs)
11. **item_goblin_helmet** - Goblin Helmet (currently using leather placeholder)
12. **item_goblin_armor** - Goblin Armor Chest (currently using leather placeholder)
13. **item_goblin_bracers** - Goblin Bracers (currently using leather placeholder)
14. **item_goblin_leggings** - Goblin Leggings (currently using leather placeholder)
15. **item_goblin_boots** - Goblin Boots (currently using leather placeholder)

---

## ❌ NEEDS ICONS - Off-Hand Items & Tools

16. **item_holy_symbol** - Holy Symbol (currently using wizard-tome placeholder)
17. **item_goblin_holy_symbol** - Goblin Holy Symbol (currently using wizard-tome placeholder)
18. **item_lute** - Lute (currently using wizard-tome placeholder)
19. **item_tinkers_tools** - Tinker's Tools (currently using wizard-tome placeholder)

---

## ❌ NEEDS ICONS - Accessories & Inventory Items

20. **item_backpack** - Backpack (currently using quiver placeholder)
21. **item_thieves_tools** - Thieves' Tools (currently using throwing-knives placeholder)
22. **item_component_pouch** - Component Pouch (currently using quiver placeholder)
23. **item_arrows** - Arrows bundle (currently using quiver placeholder)
24. **item_bolts** - Crossbow Bolts bundle (currently using quiver placeholder)
25. **item_coin_pouch** - Coin Pouch (currently using quiver placeholder)
26. **item_horn** - Horn (currently using quiver placeholder)

---

## 📊 Summary by Priority

### High Priority (Core Player Equipment)
- **Metal Armor Set**: 4 items (helmet, gauntlets, greaves, boots)
- **Chain Armor Set**: 5 items (coif, sleeves, leggings, boots, chainmail)
- **Backpack**: 1 item (used by all classes)

**Total High Priority: 10 items**

### Medium Priority (Class-Specific & NPCs)
- **Hide Armor**: 1 item
- **Goblin Armor Set**: 5 items
- **Off-hand Tools**: 4 items (holy symbol x2, lute, tinker's tools)
- **Accessories**: 5 items (thieves tools, component pouch, arrows, bolts, coin pouch, horn)

**Total Medium Priority: 15 items**

### Grand Total: 25 items need icons

---

## 🎨 Recommended Organization

### Option 1: Armor Spritesheet (Recommended)
Create a spritesheet for armor pieces organized by:
- **Rows**: Material type (Metal, Chain, Leather, Cloth, Hide, Goblin)
- **Columns**: Body part (Helmet, Chest, Arms, Legs, Boots)

This would be a 6x5 grid (30 slots) which could accommodate:
- All armor variants
- Room for future expansion

### Option 2: Individual Icons
Create individual PNG files for each item in `assets/images/items/`:
- `metal-helmet.png`
- `metal-gauntlets.png`
- `chain-coif.png`
- `backpack.png`
- etc.

### Option 3: Hybrid Approach
- **Armor spritesheet**: All armor pieces (metal, chain, hide, goblin variants)
- **Individual icons**: Tools, accessories, and off-hand items

---

## 📝 Notes

- Items marked as "placeholder" are currently using similar items as temporary icons
- All weapons are covered by the weapons spritesheet
- Some items like "leather" variants already have icons
- Goblin equipment could share sprites with regular equipment but with different colors/textures if desired

