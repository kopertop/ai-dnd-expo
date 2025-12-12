import { Hono } from 'hono';

import type { CloudflareBindings } from '@/api/src/env';
import { uploadImage, type ImageType } from '@/api/src/utils/image-upload';
import { createDatabase } from '@/api/src/utils/repository';
import { User } from '@/types/models';

type Bindings = CloudflareBindings;

const images = new Hono<{ Bindings: Bindings; Variables: { user: User } }>();

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

		const fileInput = Array.isArray(body['file']) ? body['file'][0] : body['file'];
		const title = body['title'] as string | undefined;
		const description = body['description'] as string | undefined;
		const imageType = (body['image_type'] as 'npc' | 'character' | 'both') || 'both';
		const folder = body['folder'] as 'map' | 'character' | 'npc' | 'misc' | undefined;

		if (!fileInput || typeof fileInput === 'string') {
			return c.json({ error: 'No file provided' }, 400);
		}

		// Determine image folder type
		// Priority: explicit folder param > image_type mapping
		let folderType: ImageType;
		if (folder && (folder === 'map' || folder === 'character' || folder === 'npc' || folder === 'misc')) {
			folderType = folder;
		} else {
			// Fallback to image_type mapping
			if (imageType === 'character') {
				folderType = 'character';
			} else if (imageType === 'npc') {
				folderType = 'npc';
			} else {
				folderType = 'misc';
			}
		}

		const db = createDatabase(c.env);
		const requestUrl = new URL(c.req.url);

		// Use unified upload function
		const result = await uploadImage(
			{
				fileInput,
				type: folderType,
				userId: user.id,
				isAdmin: user.is_admin || false,
				title,
				description,
				imageType,
			},
			c.env.IMAGES_BUCKET,
			c.env,
			requestUrl,
			db,
		);

		// Return the image record (fetch from DB to get full record)
		const imageRecord = await db.getUploadedImageById(result.id);
		if (!imageRecord) {
			return c.json({ error: 'Failed to retrieve uploaded image' }, 500);
		}

		return c.json({ image: imageRecord });
	} catch (error) {
		console.error('Failed to upload image:', error);
		const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
		return c.json({ error: errorMessage }, 400);
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
		const isAdmin = user && user.is_admin;

		if (!image.is_public && !isOwner && !isAdmin) {
			return c.json({ error: 'Forbidden' }, 403);
		}

		// Fetch image from R2
		const bucket = c.env.IMAGES_BUCKET;
		if (!bucket) {
			return c.json({ error: 'Image storage not available' }, 503);
		}
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
		const isAdmin = user.is_admin;
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
