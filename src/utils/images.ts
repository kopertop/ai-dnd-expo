import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { getRequestUrl } from '@tanstack/react-start/server';

import { resolveApiBaseUrl } from './api-base-url';
import { useAuthSession } from './session';

import type { UploadedImage } from '@/hooks/api/use-image-queries';

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

export const uploadImage = createServerFn({ method: 'POST' })
	.inputValidator((data: { file: File; title?: string; description?: string; image_type: 'npc' | 'character' | 'both' }) => data)
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
