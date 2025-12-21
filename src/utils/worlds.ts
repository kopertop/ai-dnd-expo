import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { getRequestUrl } from '@tanstack/react-start/server';

import { resolveApiBaseUrl } from './api-base-url';
import { useAuthSession } from './session';

import type { WorldRow } from '@/shared/workers/db';

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

export const fetchWorlds = createServerFn({ method: 'GET' }).handler(async () => {
	const response = await fetch(joinApiPath(getServerApiBaseUrl(), '/worlds'));

	if (!response.ok) {
		throw new Error(`Failed to fetch worlds: ${response.status}`);
	}

	return (await response.json()) as WorldRow[];
});

export const worldsQueryOptions = () =>
	queryOptions({
		queryKey: ['worlds'],
		queryFn: () => fetchWorlds(),
	});

export const fetchWorld = createServerFn({ method: 'GET' })
	.inputValidator((data: { id: string }) => data)
	.handler(async ({ data }) => {
		const response = await fetch(joinApiPath(getServerApiBaseUrl(), `/worlds/${data.id}`));

		if (response.status === 404) {
			return null;
		}

		if (!response.ok) {
			throw new Error(`Failed to fetch world: ${response.status}`);
		}

		return (await response.json()) as WorldRow;
	});

export const saveWorld = createServerFn({ method: 'POST' })
	.inputValidator((data: Partial<WorldRow>) => data)
	.handler(async ({ data }) => {
		const session = await useAuthSession();
		const token = session.data.deviceToken;

		if (!token) {
			throw new Error('Not authenticated');
		}

		const response = await fetch(joinApiPath(getServerApiBaseUrl(), '/worlds'), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Device ${token}`,
			},
			body: JSON.stringify(data),
		});

		if (response.status === 401 || response.status === 404) {
			await session.clear();
			throw new Error('Not authenticated');
		}

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to save world: ${response.status} ${errorText}`);
		}

		return (await response.json()) as { success: boolean; id: string };
	});

export const deleteWorld = createServerFn({ method: 'POST' })
	.inputValidator((data: { id: string }) => data)
	.handler(async ({ data }) => {
		const session = await useAuthSession();
		const token = session.data.deviceToken;

		if (!token) {
			throw new Error('Not authenticated');
		}

		const response = await fetch(joinApiPath(getServerApiBaseUrl(), `/worlds/${data.id}`), {
			method: 'DELETE',
			headers: {
				Authorization: `Device ${token}`,
			},
		});

		if (response.status === 401 || response.status === 404) {
			await session.clear();
			throw new Error('Not authenticated');
		}

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to delete world: ${response.status} ${errorText}`);
		}

		return (await response.json()) as { success: boolean };
	});

