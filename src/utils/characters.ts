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

export const updateCharacter = createServerFn({ method: 'PUT' })
	.inputValidator((data: { path: string; data: Character }) => data)
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
			const errorText = await response.text();
			throw new Error(
				`Failed to update character: ${response.status} ${errorText}`,
			);
		}

		return (await response.json()) as Character;
	});

export const deleteCharacter = createServerFn({ method: 'DELETE' })
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
