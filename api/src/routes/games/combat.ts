import { Hono } from 'hono';

import type { GamesContext } from './types';

import { GameStateService } from '@/api/src/services/game-state';
import { handleBasicAttack, handleSpellCast } from '@/api/src/utils/combat-helpers';
import { createId, deserializeCharacter, isHostUser } from '@/api/src/utils/games-utils';
import { createDatabase } from '@/api/src/utils/repository';
import type { Character } from '@/types/character';
import type {
    CharacterActionResult,
} from '@/types/combat';
import {
    calculatePassivePerception,
    calculateProficiencyBonus,
    getAbilityModifier,
    getAbilityScore,
    isSkillProficient,
} from '@/utils/combat-utils';

const combat = new Hono<GamesContext>();

/**
 * Apply damage or healing to a character or NPC
 * POST /api/games/:inviteCode/characters/:characterId/:action
 *
 * Applies damage or healing to a character or NPC token.
 * Only the host can use this endpoint.
 *
 * @param action - Either 'damage' or 'heal'
 * @returns Updated character or NPC data
 */
combat.post('/:inviteCode/characters/:characterId/:action{damage|heal}', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = createDatabase(c.env);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const characterId = c.req.param('characterId');
	const action = c.req.param('action');
	const body = (await c.req.json().catch(() => ({}))) as { amount?: number };
	const amount = typeof body.amount === 'number' ? body.amount : 0;

	// Check if this is a player character or an NPC token
	let characterRow = await db.getCharacterById(characterId);
	let npcToken = null;
	let isNPC = false;

	if (!characterRow) {
		// Try to find as NPC token
		npcToken = await db.getMapTokenById(characterId);
		if (npcToken && npcToken.token_type === 'npc') {
			isNPC = true;
			console.log(`[Damage/Heal] Found NPC token ${characterId}`);
		}
	}

	if (!characterRow && !npcToken) {
		return c.json({ error: 'Character or NPC not found' }, 404);
	}

	let currentHealth: number;
	let maxHealth: number;
	let nextHealth: number;

	if (isNPC && npcToken) {
		// Handle NPC token
		currentHealth = npcToken.hit_points ?? npcToken.max_hit_points ?? 10;
		maxHealth = npcToken.max_hit_points ?? 10;

		console.log(`[Damage/Heal] NPC ${characterId}: currentHealth=${currentHealth}, maxHealth=${maxHealth}, amount=${amount}, action=${action}`);

		if (action === 'damage') {
			const damageAmount = Math.max(0, amount);
			nextHealth = Math.max(0, currentHealth - damageAmount);
			console.log(`[Damage] NPC Calculation: ${currentHealth} - ${damageAmount} = ${currentHealth - damageAmount}, clamped to ${nextHealth}`);
			await db.updateMapToken(characterId, {
				hit_points: nextHealth,
			});
		} else if (action === 'heal') {
			nextHealth = Math.min(maxHealth, currentHealth + Math.max(0, amount));
			console.log(`[Heal] NPC Updating health: ${currentHealth} -> ${nextHealth}`);
			await db.updateMapToken(characterId, {
				hit_points: nextHealth,
			});
		} else {
			return c.json({ error: 'Unsupported action' }, 400);
		}
	} else if (characterRow) {
		// Handle player character
		// Log raw database values for debugging
		console.log(`[Damage/Heal] Raw DB values for ${characterId}:`, {
			health: characterRow.health,
			healthType: typeof characterRow.health,
			max_health: characterRow.max_health,
			max_healthType: typeof characterRow.max_health,
		});

		// Ensure health values are valid numbers
		currentHealth =
			characterRow.health !== null && characterRow.health !== undefined && typeof characterRow.health === 'number'
				? characterRow.health
				: (characterRow.max_health && typeof characterRow.max_health === 'number' ? characterRow.max_health : 10);
		maxHealth = typeof characterRow.max_health === 'number' ? characterRow.max_health : 10;

		console.log(`[Damage/Heal] Character ${characterId}: currentHealth=${currentHealth}, maxHealth=${maxHealth}, amount=${amount}, action=${action}`);

		if (action === 'damage') {
			const damageAmount = Math.max(0, amount);
			nextHealth = Math.max(0, currentHealth - damageAmount);
			console.log(`[Damage] Calculation: ${currentHealth} - ${damageAmount} = ${currentHealth - damageAmount}, clamped to ${nextHealth}`);
			console.log(`[Damage] Updating health: ${currentHealth} -> ${nextHealth}`);
			await db.updateCharacter(characterId, { health: nextHealth });
		} else if (action === 'heal') {
			nextHealth = Math.min(maxHealth, currentHealth + Math.max(0, amount));
			console.log(`[Heal] Updating health: ${currentHealth} -> ${nextHealth}`);
			await db.updateCharacter(characterId, { health: nextHealth });
		} else {
			return c.json({ error: 'Unsupported action' }, 400);
		}
	} else {
		return c.json({ error: 'Character or NPC not found' }, 404);
	}

	// Also update the character in the game state
	try {
		const gameStateService = new GameStateService(db);
		await gameStateService.updateCharacter(game, characterId, { health: nextHealth });
		console.log(`[Damage/Heal] Updated ${isNPC ? 'NPC' : 'character'} ${characterId} in game state`);
	} catch (error) {
		console.error('[Damage/Heal] Failed to update game state:', error);
		// Don't fail the request if game state update fails - database is source of truth
	}

	// Return updated character or NPC data
	if (isNPC && npcToken) {
		const updated = await db.getMapTokenById(characterId);
		if (updated) {
			const updatedHealth = updated.hit_points ?? updated.max_hit_points ?? 0;
			const updatedMaxHealth = updated.max_hit_points ?? 0;
			console.log(`[Damage/Heal] Verification - Updated NPC health: ${updatedHealth}/${updatedMaxHealth}`);
			console.log(`[Damage/Heal] Expected health: ${nextHealth}, Actual DB health: ${updatedHealth}`);
			if (updatedHealth !== nextHealth) {
				console.error(`[Damage/Heal] MISMATCH! Expected ${nextHealth} but got ${updatedHealth}`);
			}
		}
		// Return NPC token data in a format similar to character
		return c.json({
			character: updated ? {
				id: updated.id,
				health: updated.hit_points ?? updated.max_hit_points ?? 0,
				maxHealth: updated.max_hit_points ?? 0,
			} : null,
		});
	} else {
		const updated = await db.getCharacterById(characterId);
		if (updated) {
			console.log(`[Damage/Heal] Verification - Updated character health: ${updated.health}/${updated.max_health}`);
			console.log(`[Damage/Heal] Expected health: ${nextHealth}, Actual DB health: ${updated.health}`);
			if (updated.health !== nextHealth) {
				console.error(`[Damage/Heal] MISMATCH! Expected ${nextHealth} but got ${updated.health}`);
			}
		}
		return c.json({ character: updated ? deserializeCharacter(updated) : null });
	}
});

/**
 * Perform a character action (attack, spell, etc.)
 * POST /api/games/:inviteCode/characters/:characterId/actions
 *
 * Performs a combat action such as a basic attack or spell cast.
 * DM can perform actions for any character, players can only act for their own character.
 *
 * @returns Character data and action result
 */
combat.post('/:inviteCode/characters/:characterId/actions', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = createDatabase(c.env);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	// DM can cast for any character, players can only cast for themselves
	const characterId = c.req.param('characterId');
	const isHost = isHostUser(game, user);

	if (!isHost) {
		// Check if this is the player's own character
		const characterRow = await db.getCharacterById(characterId);
		if (!characterRow || characterRow.player_id !== user.id) {
			return c.json({ error: 'Forbidden' }, 403);
		}
	}

	const body = (await c.req.json().catch(() => ({}))) as {
		actionType: 'cast_spell' | 'basic_attack' | 'use_item' | 'heal_potion';
		spellName?: string;
		targetId?: string;
		itemId?: string;
		params?: Record<string, unknown>;
	};

	if (!body.actionType) {
		return c.json({ error: 'actionType is required' }, 400);
	}

	const characterRow = await db.getCharacterById(characterId);
	let actingAsNpc = false;
	let npcToken: Awaited<ReturnType<typeof db.getMapTokenById>> | null = null;
	let npcDefinition: Awaited<ReturnType<typeof db.getNpcById>> | null = null;

	if (!characterRow) {
		npcToken = await db.getMapTokenById(characterId);
		if (npcToken && npcToken.token_type === 'npc' && npcToken.npc_id) {
			if (!isHost) {
				return c.json({ error: 'Forbidden' }, 403);
			}
			actingAsNpc = true;
			npcDefinition = await db.getNpcById(npcToken.npc_id);
		} else {
			return c.json({ error: 'Character not found' }, 404);
		}
	}

	// Check target status if applicable
	if (body.targetId && !isHost) {
		const targetRow = await db.getCharacterById(body.targetId);
		let targetHp = 10;
		let targetFound = false;

		if (targetRow) {
			targetHp = targetRow.health ?? targetRow.max_health ?? 10;
			targetFound = true;
		} else {
			const targetToken = await db.getMapTokenById(body.targetId);
			if (targetToken) {
				targetHp = targetToken.hit_points ?? targetToken.max_hit_points ?? 10;
				targetFound = true;
			}
		}

		if (targetFound && targetHp <= 0) {
			// Target is unconscious/dead
			// Only allow specific actions (resurrection) - for now, block attacks
			if (body.actionType === 'basic_attack') {
				return c.json({ error: 'Target is unconscious' }, 400);
			}

			// For spells/items, we ideally want to check if it's a resurrection effect
			// But for now we'll allow them to proceed (could be Revivify)
			// The restriction "cannot take damage or healing from other sources"
			// might need to be enforced in the effect handler or just rely on DM supervision for complex spell effects
		}
	}

	const character: Character = actingAsNpc
		? (() => {
			const parsedStats =
				(typeof npcDefinition?.stats === 'string' && npcDefinition.stats
					? JSON.parse(npcDefinition.stats)
					: {}) ?? {};
			return {
				id: npcToken!.id,
				name: npcToken!.label || npcDefinition?.name || 'NPC',
				level: 1,
				race: npcDefinition?.role || 'NPC',
				class: npcDefinition?.archetype || 'NPC',
				stats: parsedStats,
				skills: [],
				inventory: [],
				equipped: {},
				health: npcToken!.hit_points ?? npcDefinition?.base_health ?? 10,
				maxHealth: npcToken!.max_hit_points ?? npcDefinition?.base_health ?? 10,
				actionPoints: 99,
				maxActionPoints: 99,
				statusEffects: [],
				preparedSpells: [],
			};
		})()
		: deserializeCharacter(characterRow!);

	// Validate action points
	const actionPointCost = body.actionType === 'cast_spell' ? 2 : body.actionType === 'basic_attack' ? 1 : 1;
	if (!actingAsNpc && character.actionPoints < actionPointCost) {
		return c.json({ error: 'Not enough action points' }, 400);
	}

	let actionResult: CharacterActionResult | null = null;

	switch (body.actionType) {
		case 'basic_attack': {
			const outcome = await handleBasicAttack({
				db,
				attacker: character,
				targetId: body.targetId,
				params: body.params,
			});

			if ('error' in outcome) {
				return c.json({ error: outcome.error }, (outcome.status ?? 400) as 400 | 404);
			}

			actionResult = outcome.result;
			break;
		}

		case 'cast_spell': {
			const outcome = await handleSpellCast({
				db,
				attacker: character,
				spellName: body.spellName,
				targetId: body.targetId,
				params: body.params,
			});

			if ('error' in outcome) {
				return c.json({ error: outcome.error }, (outcome.status ?? 400) as 400 | 404);
			}

			actionResult = outcome.result;
			break;
		}

		default:
			break;
	}

	if (!actingAsNpc) {
		const updatedActionPoints = character.actionPoints - actionPointCost;
		await db.updateCharacter(characterId, { action_points: updatedActionPoints });
	}

	try {
		let description: string;
		if (actionResult?.type === 'basic_attack') {
			description = `${character.name} ${actionResult.hit ? 'hits' : 'misses'} ${actionResult.target.name}`;
		} else if (actionResult?.type === 'spell') {
			const spellOutcome =
				typeof actionResult.hit === 'boolean'
					? actionResult.hit
						? 'succeeds'
						: 'fails'
					: 'casts';
			description = `${character.name} casts ${actionResult.spellName} (${spellOutcome})`;
		} else {
			description = `${character.name} performed ${body.actionType}${body.spellName ? `: ${body.spellName}` : ''}`;
		}

		await db.saveActivityLog({
			id: createId('log'),
			game_id: game.id,
			invite_code: inviteCode,
			type: 'action',
			timestamp: Date.now(),
			description,
			actor_id: user.id,
			actor_name: user.name || user.email || null,
			data: JSON.stringify({
				characterId,
				actionType: body.actionType,
				spellName: body.spellName,
				targetId: body.targetId,
				itemId: body.itemId,
				params: body.params,
				result: actionResult,
			}),
		});
	} catch (error) {
		console.error('Failed to log action:', error);
	}

	const updated = await db.getCharacterById(characterId);
	return c.json({
		character: updated ? deserializeCharacter(updated) : null,
		actionPerformed: body.actionType,
		actionResult,
	});
});

/**
 * Perform a perception check
 * POST /api/games/:inviteCode/characters/:characterId/perception-check
 *
 * Performs a perception check (active or passive) for a character.
 * DM can check for any character, players can only check for their own character.
 *
 * @returns Perception check result
 */
combat.post('/:inviteCode/characters/:characterId/perception-check', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const characterId = c.req.param('characterId');
	const db = createDatabase(c.env);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	const body = (await c.req.json().catch(() => ({}))) as { dc?: number; passive?: boolean };
	const dc = typeof body.dc === 'number' && Number.isFinite(body.dc) ? body.dc : undefined;

	const characterRow = await db.getCharacterById(characterId);
	if (!characterRow) {
		return c.json({ error: 'Character not found' }, 404);
	}

	const isHost = isHostUser(game, user);
	if (!isHost && characterRow.player_id !== user.id) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const character = deserializeCharacter(characterRow);
	const mode: 'passive' | 'active' = body.passive ? 'passive' : 'active';

	if (mode === 'passive') {
		const total = calculatePassivePerception(character);
		const responsePayload = {
			characterId,
			mode,
			total,
			dc,
			success: typeof dc === 'number' ? total >= dc : undefined,
		};
		return c.json(responsePayload);
	}

	const wisScore = getAbilityScore(character, 'WIS');
	const wisModifier = getAbilityModifier(wisScore);
	const proficiencyBonus = isSkillProficient(character, 'perception')
		? calculateProficiencyBonus(character.level)
		: 0;
	const modifier = wisModifier + proficiencyBonus;
	const roll = Math.floor(Math.random() * 20) + 1;
	const total = roll + modifier;
	const breakdownParts = [`${roll}`];
	if (modifier !== 0) {
		breakdownParts.push(modifier > 0 ? `+ ${modifier}` : `- ${Math.abs(modifier)}`);
	}
	const breakdown = `${breakdownParts.join(' ')} = ${total}`;

	const payload = {
		characterId,
		mode,
		roll,
		modifier,
		total,
		breakdown,
		dc,
		success: typeof dc === 'number' ? total >= dc : undefined,
	};

	try {
		await db.saveActivityLog({
			id: createId('log'),
			game_id: game.id,
			invite_code: inviteCode,
			type: 'dice_roll',
			timestamp: Date.now(),
			description: `${character.name} rolled a Perception check (${total})${dc ? ` vs DC ${dc}` : ''}`,
			actor_id: user.id,
			actor_name: user.name || user.email || null,
			data: JSON.stringify({
				...payload,
				purpose: 'perception',
			}),
		});
	} catch (error) {
		console.error('Failed to log perception check:', error);
	}

	return c.json(payload);
});

/**
 * Generic action endpoint (placeholder)
 * POST /api/games/:inviteCode/action
 *
 * Placeholder for future generic action implementation.
 *
 * @returns Success response
 */
combat.post('/:inviteCode/action', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}
	// Action endpoint - placeholder for future implementation
	return c.json({ ok: true });
});

/**
 * DM action endpoint
 * POST /api/games/:inviteCode/dm-action
 *
 * Allows the DM to perform various actions such as updating character properties.
 * Only the host can use this endpoint.
 *
 * @returns Updated character or success response
 */
combat.post('/:inviteCode/dm-action', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const inviteCode = c.req.param('inviteCode');
	const db = createDatabase(c.env);
	const game = await db.getGameByInviteCode(inviteCode);

	if (!game) {
		return c.json({ error: 'Game not found' }, 404);
	}

	if (!isHostUser(game, user)) {
		return c.json({ error: 'Forbidden' }, 403);
	}

	const payload = (await c.req.json().catch(() => ({}))) as {
		actionType: string;
		characterId?: string;
		updates?: Partial<import('@/types/character').Character>;
		statusEffects?: string[];
		health?: number;
		maxHealth?: number;
		actionPoints?: number;
		maxActionPoints?: number;
		[key: string]: unknown;
	};

	if (payload.actionType === 'update_character' && payload.characterId) {
		const characterId = payload.characterId;
		// Handle both nested updates object and flattened structure
		const updates: Partial<import('@/types/character').Character> = payload.updates || {};

		// Merge flattened fields if they exist
		if (payload.statusEffects !== undefined) updates.statusEffects = payload.statusEffects;
		if (payload.health !== undefined) updates.health = payload.health;
		if (payload.maxHealth !== undefined) updates.maxHealth = payload.maxHealth;
		if (payload.actionPoints !== undefined) updates.actionPoints = payload.actionPoints;
		if (payload.maxActionPoints !== undefined) updates.maxActionPoints = payload.maxActionPoints;
		if (payload.icon !== undefined) updates.icon = payload.icon as string;

		console.log('[DM Action] Updating character:', { characterId, updates, payload });

		// Get existing character
		const characterRow = await db.getCharacterById(characterId);
		if (!characterRow) {
			return c.json({ error: 'Character not found' }, 404);
		}

		// Serialize updates for database
		const serializedUpdates: Partial<import('../../../../shared/workers/db').CharacterRow> = {};
		if (updates.health !== undefined) serializedUpdates.health = updates.health;
		if (updates.maxHealth !== undefined) serializedUpdates.max_health = updates.maxHealth;
		if (updates.actionPoints !== undefined) serializedUpdates.action_points = updates.actionPoints;
		if (updates.maxActionPoints !== undefined) serializedUpdates.max_action_points = updates.maxActionPoints;
		if (updates.statusEffects !== undefined) {
			console.log('[DM Action] Setting status effects:', updates.statusEffects);
			serializedUpdates.status_effects = JSON.stringify(updates.statusEffects);
		}
		if (updates.icon !== undefined) {
			serializedUpdates.icon = updates.icon || null;
		}

		// Update character in database
		await db.updateCharacter(characterId, serializedUpdates);
		console.log('[DM Action] Character updated in database');

		// Update character in game state if game is active
		if (game.status === 'active') {
			try {
				const gameStateService = new GameStateService(db);
				await gameStateService.updateCharacter(game, characterId, updates);
				console.log('[DM Action] Character updated in game state');
			} catch (error) {
				console.error('Failed to update character in game state:', error);
				// Don't fail the request if game state update fails
			}
		}

		// Return updated character
		const updated = await db.getCharacterById(characterId);
		const deserialized = updated ? deserializeCharacter(updated) : null;
		console.log('[DM Action] Returning updated character:', deserialized?.statusEffects);
		return c.json({
			character: deserialized,
		});
	}

	// Placeholder for other DM actions
	return c.json({ ok: true });
});

export default combat;
