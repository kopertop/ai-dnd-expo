import type { CloudflareBindings } from '@/api/src/env';
import { createId } from '@/api/src/utils/games-utils';
import { generateImageKey, validateImageFile } from '@/api/src/utils/image-upload';
import { createDatabase } from '@/api/src/utils/repository';
import { Hono } from 'hono';

type Bindings = CloudflareBindings;

const images = new Hono<{ Bindings: Bindings; Variables: { user: any } }>();

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
		const body = await c.req.parseBody();
		const file = body['file'];
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

		// Construct public URL
		// NOTE: You need to configure a public domain for your R2 bucket in Cloudflare dashboard
		// or set up a worker to serve the files. For now we use the r2.dev URL pattern
		// which requires the bucket to be public.
		// A better approach for production is a custom domain.
		const accountId = 'pub-c637775971434c44917a153200925e0e'; // Replace with your actual R2 public ID
		const publicUrl = `https://${accountId}.r2.dev/${key}`;

		// Save metadata to database
		const db = createDatabase(c.env);
		const now = Date.now();
		const imageId = createId('img');

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

		// Only owner can delete (admins could too if we had that role checked here)
		if (image.user_id !== user.id) {
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
