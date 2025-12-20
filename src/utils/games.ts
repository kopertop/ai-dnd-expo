import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { getRequestUrl } from '@tanstack/react-start/server';

import { resolveApiBaseUrl } from './api-base-url';
import { useAuthSession } from './session';

import type { GameSessionResponse, MyGamesResponse } from '@/types/api/multiplayer-api';
import type { CreateGameBody } from '@/types/games-api';

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

export const fetchMyGames = createServerFn({ method: 'GET' }).handler(
	async () => {
		const session = await useAuthSession();
		const token = session.data.deviceToken;

		if (!token) {
			return { hostedGames: [], joinedGames: [] } as MyGamesResponse;
		}

		const response = await fetch(
			joinApiPath(getServerApiBaseUrl(), '/games/me'),
			{
				headers: {
					Authorization: `Device ${token}`,
				},
			},
		);

		if (response.status === 401 || response.status === 404) {
			await session.clear();
			return { hostedGames: [], joinedGames: [] } as MyGamesResponse;
		}

		if (!response.ok) {
			throw new Error(`Failed to fetch games: ${response.status}`);
		}

		const data = (await response.json()) as MyGamesResponse;
		return data;
	},
);

export const createGame = createServerFn({ method: 'POST' })
	.inputValidator((data: CreateGameBody) => data)
	// @ts-expect-error - Type mismatch due to duplicate type definitions for activityLog.details
	.handler(async ({ data }) => {
		const session = await useAuthSession();
		const token = session.data.deviceToken;

		if (!token) {
			throw new Error('Not authenticated');
		}

		const response = await fetch(
			joinApiPath(getServerApiBaseUrl(), '/games'),
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
			throw new Error(`Failed to create game: ${response.status} ${errorText}`);
		}

		return await response.json() as unknown as GameSessionResponse;
	});

export const fetchGameSession = createServerFn({ method: 'GET' })
	.inputValidator((data: { inviteCode: string }) => data)
	// @ts-expect-error - Type mismatch due to duplicate type definitions for activityLog.details
	.handler(async ({ data }) => {
		const session = await useAuthSession();
		const token = session.data.deviceToken;

		if (!token) {
			throw new Error('Not authenticated');
		}

		const response = await fetch(
			joinApiPath(getServerApiBaseUrl(), `/games/${data.inviteCode}`),
			{
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
			throw new Error(`Failed to fetch game session: ${response.status} ${errorText}`);
		}

		return await response.json() as unknown as GameSessionResponse;
	});

export const myGamesQueryOptions = () =>
	queryOptions({
		queryKey: ['games', 'me'],
		queryFn: fetchMyGames,
	});

export const deleteGame = createServerFn({ method: 'POST' })
	.inputValidator((data: { inviteCode: string }) => data)
	.handler(async ({ data }) => {
		const session = await useAuthSession();
		const token = session.data.deviceToken;

		if (!token) {
			throw new Error('Not authenticated');
		}

		const response = await fetch(
			joinApiPath(getServerApiBaseUrl(), `/games/${data.inviteCode}`),
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
			throw new Error(`Failed to delete game: ${response.status} ${errorText}`);
		}

		const result = (await response.json()) as { ok: boolean; message: string };
		return result;
	});

export const gameSessionQueryOptions = (inviteCode: string) =>
	queryOptions({
		queryKey: ['games', inviteCode],
		queryFn: async () => {
			return fetchGameSession({ data: { inviteCode } });
		},
	});
