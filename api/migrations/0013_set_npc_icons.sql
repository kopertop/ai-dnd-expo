-- Set proper icons for all pre-built NPCs using character images from assets/images/characters/
-- Updates the icon column for NPCs that were created before icons were added

UPDATE `npcs` SET `icon` = 'Characters:Human:HumanFighter' WHERE `id` = 'npc_guard_captain';
UPDATE `npcs` SET `icon` = 'Characters:Human:ArchanistMerchant' WHERE `id` = 'npc_merchant_arcanist';
UPDATE `npcs` SET `icon` = 'Characters:Goblin:GoblinRaider' WHERE `id` = 'npc_goblin_raider';
UPDATE `npcs` SET `icon` = 'Characters:Goblin:GoblinArcher' WHERE `id` = 'npc_goblin_archer';
UPDATE `npcs` SET `icon` = 'Characters:Goblin:GoblinCleric' WHERE `id` = 'npc_goblin_cleric';
UPDATE `npcs` SET `icon` = 'Characters:Goblin:GoblinRogue' WHERE `id` = 'npc_goblin_scout';
