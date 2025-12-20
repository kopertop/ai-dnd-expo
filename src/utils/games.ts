import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { getRequestUrl } from '@tanstack/react-start/server';

import { resolveApiBaseUrl } from './api-base-url';
import { useAuthSession } from './session';

import type { MyGamesResponse } from '@/types/api/multiplayer-api';

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

export const myGamesQueryOptions = () =>
	queryOptions({
		queryKey: ['games', 'me'],
		queryFn: fetchMyGames,
	});
