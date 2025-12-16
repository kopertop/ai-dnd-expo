import { User } from 'expo-auth-template/backend';
import { Hono } from 'hono';

import type { CloudflareBindings } from '@/api/src/env';
import { createId } from '@/api/src/utils/games-utils';
import { generateImageKey, validateImageFile } from '@/api/src/utils/image-upload';
import { createDatabase } from '@/api/src/utils/repository';

type Bindings = CloudflareBindings;

const images = new Hono<{ Bindings: Bindings; Variables: { user: User | null } }>();

/**
 * List uploaded images
 * GET /api/images
 */
images.get('/', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const imageType = c.req.query('type') as 'npc' | 'character' | 'both' | undefined;
	const limit = parseInt(c.req.query('limit') || '50', 10);
	const offset = parseInt(c.req.query('offset') || '0', 10);
	const db = createDatabase(c.env);

	try {
		const result = await db.listUploadedImages(undefined, imageType, limit, offset);
		return c.json({ images: result });
	} catch (error) {
		console.error('Failed to list images:', error);
		return c.json({ error: 'Failed to list images' }, 500);
	}
});

/**
 * Upload an image
 * POST /api/images/upload
 */
images.post('/upload', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	try {
		const body = await c.req.parseBody({
			all: true,
		});

		const file = Array.isArray(body['file']) ? body['file'][0] : body['file'];
		const title = body['title'] as string | undefined;
		const description = body['description'] as string | undefined;
		const imageType = (body['image_type'] as 'npc' | 'character' | 'both') || 'both';

		if (!file || !(file instanceof File)) {
			return c.json({ error: 'No file provided' }, 400);
		}

		// Validate file
		const validationError = validateImageFile(file);
		if (validationError) {
			return c.json({ error: validationError }, 400);
		}

		// Generate key and upload to R2
		const key = generateImageKey(user.id, file.name);
		const bucket = c.env.IMAGES_BUCKET;

		await bucket.put(key, file, {
			httpMetadata: {
				contentType: file.type,
			},
		});

		// Save metadata to database
		const db = createDatabase(c.env);
		const now = Date.now();
		const imageId = createId('img');

		// Construct public URL using the worker endpoint
		// For local dev, use localhost:8787 (the worker port)
		// For production, use the request origin
		const requestUrl = new URL(c.req.url);
		const isLocalDev = c.env.__DEV__ || requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1';
		const origin = isLocalDev ? 'http://localhost:8787' : requestUrl.origin;
		const publicUrl = `${origin}/api/images/${imageId}`;

		const imageRecord = {
			id: imageId,
			user_id: user.id,
			filename: file.name,
			r2_key: key,
			public_url: publicUrl,
			title: title || null,
			description: description || null,
			image_type: imageType,
			is_public: 1,
			created_at: now,
			updated_at: now,
		};

		await db.saveUploadedImage(imageRecord);

		return c.json({ image: imageRecord });
	} catch (error) {
		console.error('Failed to upload image:', error);
		return c.json({ error: 'Failed to upload image' }, 500);
	}
});

/**
 * Serve an image from R2
 * GET /api/images/:id
 * This endpoint serves images from R2 storage, allowing them to be accessed
 * through the worker instead of requiring public R2 bucket access.
 * Note: This route must be defined after /upload to avoid route conflicts.
 */
images.get('/:id', async (c) => {
	const imageId = c.req.param('id');
	const db = createDatabase(c.env);

	try {
		const image = await db.getUploadedImageById(imageId);
		if (!image) {
			return c.json({ error: 'Image not found' }, 404);
		}

		// Check if image is public or user is the owner/admin
		const user = c.get('user');
		const isOwner = user && image.user_id === user.id;
		const isAdmin = user && (user.role === 'admin' || user.isAdmin);

		if (!image.is_public && !isOwner && !isAdmin) {
			return c.json({ error: 'Forbidden' }, 403);
		}

		// Fetch image from R2
		const bucket = c.env.IMAGES_BUCKET;
		const object = await bucket.get(image.r2_key);

		if (!object) {
			return c.json({ error: 'Image not found in storage' }, 404);
		}

		// Get content type from object metadata or infer from filename
		const contentType = object.httpMetadata?.contentType ||
			(image.filename.endsWith('.png') ? 'image/png' :
				image.filename.endsWith('.jpg') || image.filename.endsWith('.jpeg') ? 'image/jpeg' :
					image.filename.endsWith('.webp') ? 'image/webp' :
						'image/jpeg');

		// Return the image with appropriate headers
		const body = await object.arrayBuffer();
		return new Response(body, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=31536000, immutable',
			},
		});
	} catch (error) {
		console.error('Failed to serve image:', error);
		return c.json({ error: 'Failed to serve image' }, 500);
	}
});

/**
 * Delete an image
 * DELETE /api/images/:id
 */
images.delete('/:id', async (c) => {
	const user = c.get('user');
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const imageId = c.req.param('id');
	const db = createDatabase(c.env);

	try {
		const image = await db.getUploadedImageById(imageId);
		if (!image) {
			return c.json({ error: 'Image not found' }, 404);
		}

		// Only owner or admin can delete
		const isAdmin = user.role === 'admin' || user.isAdmin;
		if (image.user_id !== user.id && !isAdmin) {
			return c.json({ error: 'Forbidden' }, 403);
		}

		// Delete from R2
		const bucket = c.env.IMAGES_BUCKET;
		await bucket.delete(image.r2_key);

		// Delete from database
		await db.deleteUploadedImage(imageId);

		return c.json({ success: true });
	} catch (error) {
		console.error('Failed to delete image:', error);
		return c.json({ error: 'Failed to delete image' }, 500);
	}
});

export default images;
