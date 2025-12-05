---
id: task-21
title: Add support for "basic_attack" actions
status: To Do
assignee: []
created_date: '2025-12-05 03:22'
updated_date: '2025-12-05 03:26'
labels: []
dependencies: []
priority: medium
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When the frontend issues a "basic_attack", the backend needs to validate the attack is possible, and if so run a dice-roll based on the attacking player, using modifiers for the equipped weapon (if available) and strength or dexterity modifiers (depending on the weapon, ranged using dex, melee using str). total calculation should be diceroll + attribute modifier.

Attack rolls should also be a 1d20 to see if it hits (or crits) a 1 automatically misses, a 20 automatically hits AND does maximum damage (i.e. the top dice roll plus modifier, plus any crit modifiers if available).

All roll details should be returned to the frontend to see what was rolled, as well as the final stats (i.e. how much damage happened, if it was a crit hit or crit miss, etc).

Damage should be automatically calculated and then applied, as well as taking the major action away from the attacking character (note that they NEED that major action to even do the action).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Issuing an attack with an available major action should trigger an attack
- [ ] #2 Issuing an attack WITHOUT a major action available should reject the call
- [ ] #3 A 1d20 roll of 1 should be marked a CRITICAL MISS and not do any damage
- [ ] #4 A 1d20 roll of 20 should be marked a CRITICAL HIT and automatically do maximum damage
- [ ] #5 Any roll between a 1 and 20 should calculate agains the target Armor Class (i.e. if the target has an AC of 10, they need above a 10 to hit), including any modifiers (str for meelee, dex for ranged)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
- Validate major action availability before any attack resolution; reuse /games/:inviteCode/characters/:characterId/actions (actionType basic_attack) and block when actionPoints < 1.
- Resolve attacker weapon + style: inspect attacker.equipped for mainHand/offHand; infer melee vs ranged and pick damage dice or fallback defaults; compute attack bonus via STR (melee) or DEX (ranged) + proficiency when applicable.
- Roll to-hit 1d20; on 1 => fumble (auto miss, damage 0); on 20 => crit (auto hit, max damage dice + modifiers); otherwise compare vs target AC with modifiers included.
- Apply damage: subtract from target (character or map token) and persist; decrement attacker major action (actionPoints) atomically with action record/log entry. Return full roll breakdown, hit/crit flags, damage dice/total, remaining HP, and actionPoint deltas.
- Emit activity log and send websocket refresh; invalidate map/state queries on success so clients update tokens and HP immediately.
- Update API docs/types to include new basic_attack payload/response shape and error codes (403/400 for no action points or invalid target).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Relevant touchpoints:
- Backend flow lives in api/src/routes/games/combat.ts (POST /games/:inviteCode/characters/:characterId/actions with actionType basic_attack) and helpers in api/src/utils/combat-helpers.ts (handleBasicAttack, getAttackStyle, getDamageDice, rollDamageDice). Update these to enforce actionPoints guard, crit/fumble rules, and damage application.
- Target resolution uses resolveAttackTarget/applyDamageToTarget in combat-helpers; ensure they support both character rows and map tokens.
- Include dice detail fields in CharacterActionResult (types/combat.ts) so frontend can render rolls/crit flags and remaining HP.
- Ensure actionPoints decrement via db.updateCharacter in combat route remains in sync with returned character payload and activity log.
- If weapon data is expanded, consider looking up equipped item metadata (slot damage dice, range) from character.equipped/inventory before defaulting.
- Emit websocketClient.refresh or equivalent push after successful action so connected clients invalidate map/state; frontend can keep using useSubmitDMAction/useSubmitPlayerAction hooks which already invalidate queries.

Testing ideas:
- Unit: combat-helpers.handleBasicAttack covering hit vs miss, crit (20) max damage, fumble (1) zero damage, STR vs DEX modifiers, AC comparison, and damage application to character/token.
- API: POST /games/:code/characters/:id/actions basic_attack happy path (200) and insufficient actionPoints (400/403) plus invalid target (404). Validate response body contains roll breakdown, critical flags, damage, and updated HP.
- Integration/smoke: issue an attack in a running game, ensure map tokens reflect new HP and activity log records action; assert actionPoints decremented.
<!-- SECTION:NOTES:END -->
