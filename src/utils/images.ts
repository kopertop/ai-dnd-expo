import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { getRequestUrl } from '@tanstack/react-start/server';

import { resolveApiBaseUrl } from './api-base-url';
import { useAuthSession } from './session';

import type { UploadedImage } from '@/hooks/api/use-image-queries';
import type { UploadedImageCategory } from '@/shared/workers/db';

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

export const fetchUploadedImages = createServerFn({ method: 'GET' })
	.inputValidator((data: { type?: 'npc' | 'character' | 'both' }) => data)
	.handler(async ({ data }) => {
		const session = await useAuthSession();
		const token = session.data.deviceToken;

		if (!token) {
			return [] as UploadedImage[];
		}

		const queryParams = data.type ? `?type=${data.type}` : '';
		const response = await fetch(
			joinApiPath(getServerApiBaseUrl(), `/images${queryParams}`),
			{
				headers: {
					Authorization: `Device ${token}`,
				},
			},
		);

		if (response.status === 401 || response.status === 404) {
			await session.clear();
			return [] as UploadedImage[];
		}

		if (!response.ok) {
			throw new Error(`Failed to fetch images: ${response.status}`);
		}

		const result = (await response.json()) as { images: UploadedImage[] };
		return result.images;
	});

export const uploadedImagesQueryOptions = (type?: 'npc' | 'character' | 'both') =>
	queryOptions({
		queryKey: ['uploaded-images', type],
		queryFn: () => fetchUploadedImages({ data: { type } }),
	});

// Server function to get auth token (no File objects, so safe to serialize)
const getAuthToken = createServerFn({ method: 'GET' }).handler(async () => {
	const session = await useAuthSession();
	return session.data.deviceToken || null;
});

// Client-side upload function that bypasses createServerFn to avoid File serialization
export const uploadImageClient = async (payload: {
	file: File;
	title?: string;
	description?: string;
	image_type: 'npc' | 'character' | 'both';
	category?: UploadedImageCategory;
}): Promise<UploadedImage> => {
	// Get token from server function (no File objects involved)
	const token = await getAuthToken({ data: {} });
	if (!token) {
		throw new Error('Not authenticated');
	}

	const formData = new FormData();
	formData.append('file', payload.file);
	if (payload.title) formData.append('title', payload.title);
	if (payload.description) formData.append('description', payload.description);
	formData.append('image_type', payload.image_type);
	if (payload.category) formData.append('category', payload.category);

	// Construct API URL - check for explicit base URL first, then use default dev port
	const explicitBase = process.env.VITE_API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL;
	let apiBaseUrl: string;
	if (explicitBase) {
		apiBaseUrl = explicitBase.endsWith('/') ? explicitBase : `${explicitBase}/`;
	} else {
		// Default to localhost:8787 for development (API server port)
		// In production, this would be handled by the proxy/routing
		const isDev = process.env.NODE_ENV === 'development' || import.meta.env.DEV;
		if (isDev) {
			apiBaseUrl = 'http://localhost:8787/api/';
		} else {
			// Production: use relative path (will be proxied)
			apiBaseUrl = '/api/';
		}
	}
	const uploadUrl = joinApiPath(apiBaseUrl, '/images/upload');

	const response = await fetch(uploadUrl, {
		method: 'POST',
		headers: {
			Authorization: `Device ${token}`,
		},
		body: formData,
	});

	if (response.status === 401 || response.status === 404) {
		throw new Error('Not authenticated');
	}

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to upload image: ${response.status} ${errorText}`);
	}

	const result = (await response.json()) as { image: UploadedImage };
	return result.image;
};

// Server-side version (kept for backward compatibility, but won't work with File objects)
export const uploadImage = createServerFn({ method: 'POST' })
	.inputValidator((data: { file: File; title?: string; description?: string; image_type: 'npc' | 'character' | 'both'; category?: UploadedImageCategory }) => data)
	.handler(async ({ data }) => {
		const session = await useAuthSession();
		const token = session.data.deviceToken;

		if (!token) {
			throw new Error('Not authenticated');
		}

		const formData = new FormData();
		formData.append('file', data.file);
		if (data.title) formData.append('title', data.title);
		if (data.description) formData.append('description', data.description);
		formData.append('image_type', data.image_type);
		if (data.category) formData.append('category', data.category);

		const response = await fetch(
			joinApiPath(getServerApiBaseUrl(), '/images/upload'),
			{
				method: 'POST',
				headers: {
					Authorization: `Device ${token}`,
				},
				body: formData,
			},
		);

		if (response.status === 401 || response.status === 404) {
			await session.clear();
			throw new Error('Not authenticated');
		}

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to upload image: ${response.status} ${errorText}`);
		}

		const result = (await response.json()) as { image: UploadedImage };
		return result.image;
	});

export const deleteImage = createServerFn({ method: 'POST' })
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
			throw new Error(`Failed to delete image: ${response.status} ${errorText}`);
		}

		return { success: true };
	});

export const fetchAdminImages = createServerFn({ method: 'GET' })
	.inputValidator((data: { category?: UploadedImageCategory; limit?: number; offset?: number }) => data)
	.handler(async ({ data }) => {
		const session = await useAuthSession();
		const token = session.data.deviceToken;

		if (!token) {
			return [] as UploadedImage[];
		}

		const params = new URLSearchParams();
		if (data.category) params.set('category', data.category);
		if (typeof data.limit === 'number') params.set('limit', String(data.limit));
		if (typeof data.offset === 'number') params.set('offset', String(data.offset));
		const queryString = params.toString();

		const response = await fetch(
			joinApiPath(getServerApiBaseUrl(), `/admin/images${queryString ? `?${queryString}` : ''}`),
			{
				headers: {
					Authorization: `Device ${token}`,
				},
			},
		);

		if (response.status === 401 || response.status === 404) {
			await session.clear();
			return [] as UploadedImage[];
		}

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to fetch admin images: ${response.status} ${errorText}`);
		}

		const result = (await response.json()) as { images: UploadedImage[] };
		return result.images;
	});

export const adminImagesQueryOptions = (category?: UploadedImageCategory) =>
	queryOptions({
		queryKey: ['admin-images', category],
		queryFn: () => fetchAdminImages({ data: { category } }),
	});

export const updateImage = createServerFn({ method: 'POST' })
	.inputValidator((data: { id: string; title?: string | null; description?: string | null; category?: UploadedImageCategory; is_public?: boolean | number }) => data)
	.handler(async ({ data }) => {
		const session = await useAuthSession();
		const token = session.data.deviceToken;

		if (!token) {
			throw new Error('Not authenticated');
		}

		const response = await fetch(
			joinApiPath(getServerApiBaseUrl(), `/images/${data.id}`),
			{
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Device ${token}`,
				},
				body: JSON.stringify({
					title: data.title,
					description: data.description,
					category: data.category,
					is_public: data.is_public,
				}),
			},
		);

		if (response.status === 401 || response.status === 404) {
			await session.clear();
			throw new Error('Not authenticated');
		}

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to update image: ${response.status} ${errorText}`);
		}

		const result = (await response.json()) as { image: UploadedImage };
		return result.image;
	});
