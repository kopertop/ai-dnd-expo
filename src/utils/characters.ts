import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { getRequestUrl } from '@tanstack/react-start/server';

import { resolveApiBaseUrl } from './api-base-url';
import { useAuthSession } from './session';

import type { CharacterListResponse } from '@/types/api/multiplayer-api';
import type { Character } from '@/types/character';


const joinApiPath = (baseUrl: string, path: string) => {
	const trimmed = path.startsWith('/') ? path.slice(1) : path;
	return `${baseUrl}${trimmed}`;
};

const getServerApiBaseUrl = () => {
	const requestUrl = new URL(getRequestUrl({ xForwardedHost: true }));
	const base = resolveApiBaseUrl(requestUrl.origin);
	if (base.startsWith('http')) {
		return base;
	}
	return `${requestUrl.origin}${base.startsWith('/') ? '' : '/'}${base}`;
};

export const fetchCharacters = createServerFn({ method: 'GET' }).handler(
	async () => {
		const session = await useAuthSession();
		const token = session.data.deviceToken;

		if (!token) {
			return [] as Character[];
		}

		const response = await fetch(
			joinApiPath(getServerApiBaseUrl(), '/characters'),
			{
				headers: {
					Authorization: `Device ${token}`,
				},
			},
		);

		if (response.status === 401 || response.status === 404) {
			await session.clear();
			return [] as Character[];
		}

		if (!response.ok) {
			throw new Error(`Failed to fetch characters: ${response.status}`);
		}

		const data = (await response.json()) as CharacterListResponse | Character[];
		return Array.isArray(data) ? data : data.characters;
	},
);

export const charactersQueryOptions = () =>
	queryOptions({
		queryKey: ['characters'],
		queryFn: () => fetchCharacters(),
	});

export const fetchAllCharacters = createServerFn({ method: 'GET' }).handler(
	async () => {
		const session = await useAuthSession();
		const token = session.data.deviceToken;

		if (!token) {
			return [] as Character[];
		}

		const response = await fetch(
			joinApiPath(getServerApiBaseUrl(), '/characters/all'),
			{
				headers: {
					Authorization: `Device ${token}`,
				},
			},
		);

		if (response.status === 401 || response.status === 404) {
			await session.clear();
			return [] as Character[];
		}

		if (!response.ok) {
			throw new Error(`Failed to fetch all characters: ${response.status}`);
		}

		const data = (await response.json()) as CharacterListResponse | Character[];
		return Array.isArray(data) ? data : data.characters;
	},
);

export const allCharactersQueryOptions = () =>
	queryOptions({
		queryKey: ['characters', 'all'],
		queryFn: () => fetchAllCharacters(),
	});

export const fetchCharacterById = createServerFn({ method: 'GET' })
	.inputValidator((data: { id: string }) => data)
	.handler(async ({ data }) => {
		const session = await useAuthSession();
		const token = session.data.deviceToken;

		if (!token) {
			return null;
		}

		const response = await fetch(
			joinApiPath(getServerApiBaseUrl(), `/characters/${data.id}`),
			{
				headers: {
					Authorization: `Device ${token}`,
				},
			},
		);

		if (response.status === 401 || response.status === 404) {
			await session.clear();
			return null;
		}

		if (!response.ok) {
			throw new Error(`Failed to fetch character: ${response.status}`);
		}

		const result = (await response.json()) as { character: Character };
		return result.character;
	});

export const characterByIdQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ['characters', id],
		queryFn: () => fetchCharacterById({ data: { id } }),
	});

export const cloneCharacter = createServerFn({ method: 'POST' })
	.inputValidator((data: { characterId: string }) => data)
	.handler(async ({ data }) => {
		const session = await useAuthSession();
		const token = session.data.deviceToken;

		if (!token) {
			throw new Error('Not authenticated');
		}

		const response = await fetch(
			joinApiPath(getServerApiBaseUrl(), `/characters/${data.characterId}/clone`),
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Device ${token}`,
				},
			},
		);

		if (response.status === 401 || response.status === 404) {
			await session.clear();
			throw new Error('Not authenticated');
		}

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`Failed to clone character: ${response.status} ${errorText}`,
			);
		}

		const result = await response.json();
		return (result.character || result) as Character;
	});

export const createCharacter = createServerFn({ method: 'POST' })
	.inputValidator((data: Character) => data)
	.handler(async ({ data }) => {
		const session = await useAuthSession();
		const token = session.data.deviceToken;

		if (!token) {
			throw new Error('Not authenticated');
		}

		const response = await fetch(
			joinApiPath(getServerApiBaseUrl(), '/characters'),
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Device ${token}`,
				},
				body: JSON.stringify(data),
			},
		);

		if (response.status === 401 || response.status === 404) {
			await session.clear();
			throw new Error('Not authenticated');
		}

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`Failed to create character: ${response.status} ${errorText}`,
			);
		}

		return (await response.json()) as Character;
	});

export const updateCharacter = createServerFn({ method: 'POST' })
	.inputValidator((data: { path: string; data: Partial<Character> }) => data)
	.handler(async ({ data }) => {
		const session = await useAuthSession();
		const token = session.data.deviceToken;

		if (!token) {
			throw new Error('Not authenticated');
		}

		const response = await fetch(
			joinApiPath(getServerApiBaseUrl(), data.path),
			{
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Device ${token}`,
				},
				body: JSON.stringify(data.data),
			},
		);

		if (response.status === 401 || response.status === 404) {
			await session.clear();
			throw new Error('Not authenticated');
		}

		if (!response.ok) {
			let errorText: string;
			try {
				const errorJson = await response.json();
				errorText = errorJson.error || errorJson.message || JSON.stringify(errorJson);
			} catch {
				errorText = await response.text();
			}
			throw new Error(
				`Failed to update character: ${response.status} ${errorText}`,
			);
		}

		const result = await response.json();

		// API returns { character: ... }
		let character: Character;
		if (result && typeof result === 'object' && 'character' in result) {
			character = result.character as Character;
		} else {
			character = result as Character;
		}

		// Ensure all required fields are present and properly typed to avoid deserialization issues
		// This prevents undefined values that could cause "startsWith" errors
		return {
			id: character.id || '',
			name: character.name || '',
			level: character.level || 1,
			race: character.race || '',
			class: character.class || '',
			stats: character.stats || { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
			skills: character.skills || [],
			inventory: character.inventory || [],
			equipped: character.equipped || {},
			health: character.health ?? 10,
			maxHealth: character.maxHealth ?? 10,
			actionPoints: character.actionPoints ?? 3,
			maxActionPoints: character.maxActionPoints ?? 3,
			statusEffects: character.statusEffects || [],
			preparedSpells: character.preparedSpells || [],
			trait: character.trait,
			icon: character.icon,
			description: character.description,
			weaknesses: character.weaknesses,
			resistances: character.resistances,
			immunities: character.immunities,
		};
	});

export const deleteCharacter = createServerFn({ method: 'POST' })
	.inputValidator((data: { path: string }) => data)
	.handler(async ({ data }) => {
		const session = await useAuthSession();
		const token = session.data.deviceToken;

		if (!token) {
			throw new Error('Not authenticated');
		}

		const response = await fetch(
			joinApiPath(getServerApiBaseUrl(), data.path),
			{
				method: 'DELETE',
				headers: {
					Authorization: `Device ${token}`,
				},
			},
		);

		if (response.status === 401 || response.status === 404) {
			await session.clear();
			throw new Error('Not authenticated');
		}

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`Failed to delete character: ${response.status} ${errorText}`,
			);
		}

		return { success: true };
	});
