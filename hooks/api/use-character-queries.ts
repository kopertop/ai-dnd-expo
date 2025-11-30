import { useQueryClient } from '@tanstack/react-query';
import { useMutationApi, useQueryApi } from 'expo-auth-template/frontend';

import type { CharacterListResponse } from '@/types/api/multiplayer-api';
import type { Character } from '@/types/character';
import type { CharacterActionResult } from '@/types/combat';

/**
 * Get current user's characters
 */
export function useMyCharacters() {
	return useQueryApi<CharacterListResponse>('/characters');
}

/**
 * Get characters in a game
 */
export function useGameCharacters(inviteCode: string | null | undefined) {
	return useQueryApi<CharacterListResponse>(
		inviteCode ? `/games/${inviteCode}/characters` : '',
		{
			enabled: !!inviteCode,
		},
	);
}

/**
 * Create a new character
 */
export function useCreateCharacter() {
	const queryClient = useQueryClient();

	return useMutationApi<Character>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate my characters list
			queryClient.invalidateQueries({ queryKey: ['/characters'] });
		},
	});
}

/**
 * Update a character
 */
export function useUpdateCharacter() {
	const queryClient = useQueryClient();

	return useMutationApi<Character>({
		method: 'PUT',
		onSuccess: () => {
			// Invalidate my characters list
			queryClient.invalidateQueries({ queryKey: ['/characters'] });
		},
	});
}

/**
 * Delete a character
 */
export function useDeleteCharacter() {
	const queryClient = useQueryClient();

	return useMutationApi<void>({
		method: 'DELETE',
		onSuccess: () => {
			// Invalidate my characters list
			queryClient.invalidateQueries({ queryKey: ['/characters'] });
		},
	});
}

/**
 * Deal damage to a character
 */
export function useDealDamage(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<{ character: Character | null }>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate game characters and state
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/characters`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/state`] });
		},
	});
}

/**
 * Heal a character
 */
export function useHealCharacter(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<{ character: Character | null }>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate game characters and state
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/characters`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/state`] });
		},
	});
}

/**
 * Cast a spell for a character
 */
export function useCastSpell(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<{
		character: Character | null;
		actionPerformed: string;
		actionResult?: CharacterActionResult;
	}>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate game characters and state
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/characters`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/state`] });
		},
	});
}

/**
 * Perform an action for a character
 */
export function usePerformAction(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<{
		character: Character | null;
		actionPerformed: string;
		actionResult?: CharacterActionResult;
	}>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate game characters and state
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/characters`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}`] });
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/state`] });
		},
	});
}

/**
 * Roll a perception check for a character
 */
export function useRollPerceptionCheck(inviteCode: string) {
	const queryClient = useQueryClient();

	return useMutationApi<{
		characterId: string;
		mode: 'active' | 'passive';
		total: number;
		roll?: number;
		modifier?: number;
		breakdown?: string;
		dc?: number;
		success?: boolean;
	}>({
		method: 'POST',
		onSuccess: () => {
			// Invalidate game characters
			queryClient.invalidateQueries({ queryKey: [`/games/${inviteCode}/characters`] });
		},
	});
}

