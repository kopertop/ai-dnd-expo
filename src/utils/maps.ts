import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { getRequestUrl } from '@tanstack/react-start/server';

import { resolveApiBaseUrl } from './api-base-url';
import { useAuthSession } from './session';

export type AdminMapSummary = {
	id: string;
	slug: string;
	name: string;
	description: string | null;
	width: number;
	height: number;
	world?: string | null;
	world_id?: string | null;
	background_image_url?: string | null;
	cover_image_url?: string | null;
	grid_columns?: number;
	grid_size?: number;
	grid_offset_x?: number;
	grid_offset_y?: number;
	metadata?: Record<string, unknown>;
};

export type AdminMapDetail = AdminMapSummary & {
	default_terrain?: Record<string, unknown> | unknown[] | string | null;
	fog_of_war?: Record<string, unknown> | unknown[] | string | null;
	terrain_layers?: Record<string, unknown> | unknown[] | string | null;
	tokens?: Array<Record<string, unknown>>;
	tiles?: Array<Record<string, unknown>>;
};

export type AdminMapUpsertPayload = Partial<AdminMapDetail> & {
	slug?: string;
	name?: string;
};

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

export const fetchMaps = createServerFn({ method: 'GET' }).handler(async () => {
	const response = await fetch(joinApiPath(getServerApiBaseUrl(), '/maps'));

	if (!response.ok) {
		throw new Error(`Failed to fetch maps: ${response.status}`);
	}

	return (await response.json()) as AdminMapSummary[];
});

export const mapsQueryOptions = () =>
	queryOptions({
		queryKey: ['maps'],
		queryFn: () => fetchMaps(),
	});

export const fetchMap = createServerFn({ method: 'GET' })
	.inputValidator((data: { id: string }) => data)
	.handler(async ({ data }) => {
		const response = await fetch(joinApiPath(getServerApiBaseUrl(), `/maps/${data.id}`));

		if (response.status === 404) {
			return null;
		}

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to fetch map: ${response.status} ${errorText}`);
		}

		return (await response.json()) as AdminMapDetail;
	});

export const saveMap = createServerFn({ method: 'POST' })
	.inputValidator((data: AdminMapUpsertPayload) => data)
	.handler(async ({ data }) => {
		const session = await useAuthSession();
		const token = session.data.deviceToken;

		if (!token) {
			throw new Error('Not authenticated');
		}

		const response = await fetch(joinApiPath(getServerApiBaseUrl(), '/maps'), {
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
			throw new Error(`Failed to save map: ${response.status} ${errorText}`);
		}

		return (await response.json()) as { success: boolean; id: string };
	});

export const updateMap = createServerFn({ method: 'POST' })
	.inputValidator((data: { id: string; patch: AdminMapUpsertPayload }) => data)
	.handler(async ({ data }) => {
		const session = await useAuthSession();
		const token = session.data.deviceToken;

		if (!token) {
			throw new Error('Not authenticated');
		}

		const response = await fetch(joinApiPath(getServerApiBaseUrl(), `/maps/${data.id}`), {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Device ${token}`,
			},
			body: JSON.stringify(data.patch),
		});

		if (response.status === 401 || response.status === 404) {
			await session.clear();
			throw new Error('Not authenticated');
		}

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to update map: ${response.status} ${errorText}`);
		}

		return (await response.json()) as { success: boolean; id: string };
	});

