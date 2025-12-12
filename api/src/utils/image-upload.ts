import { createId } from './games-utils';

export interface ImageUploadResult {
	key: string;
	url: string;
	filename: string;
	contentType: string;
	size: number;
}

export type ImageType = 'map' | 'character' | 'npc' | 'misc';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILE_SIZE_ADMIN = 20 * 1024 * 1024; // 20MB for admins
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * Validate image file
 * @param file - The file to validate
 * @param isAdmin - Whether the user is an admin (allows larger files)
 * @returns Error message if invalid, null otherwise
 */
export const validateImageFile = (file: File, isAdmin: boolean = false): string | null => {
	if (!ALLOWED_TYPES.includes(file.type)) {
		return `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}`;
	}

	const maxSize = isAdmin ? MAX_FILE_SIZE_ADMIN : MAX_FILE_SIZE;
	if (file.size > maxSize) {
		const maxSizeMB = maxSize / 1024 / 1024;
		return `File too large. Maximum size is ${maxSizeMB}MB`;
	}

	return null;
};

/**
 * Generate a unique key for the image in R2, organized by type
 * @param type - Type of image (map, character, npc, misc)
 * @param filename - Original filename
 * @param userId - Optional user ID for user-specific organization
 * @returns Unique key for R2 storage (e.g., "maps/timestamp-id.ext" or "characters/userId/timestamp-id.ext")
 */
export const generateImageKey = (
	type: ImageType,
	filename: string,
	userId?: string,
): string => {
	const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
	const timestamp = Date.now();
	const uniqueId = createId('img');
	const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^/.]+$/, '');

	// Organize by type: maps/, characters/, npcs/, misc/
	const folder = type === 'misc' ? 'misc' : `${type}s`;

	// For user-specific types (characters, npcs), include userId
	// For maps and misc, just use the folder
	let key: string;
	if (userId && (type === 'character' || type === 'npc')) {
		key = `${folder}/${userId}/${timestamp}-${uniqueId}.${ext}`;
	} else {
		key = `${folder}/${timestamp}-${uniqueId}-${sanitizedFilename.substring(0, 20)}.${ext}`;
	}
	return key;
};

/**
 * Get the public URL for an R2 key
 *
 * Defaults to https://images.dnd.coredumped.org for production.
 * Can be overridden with R2_PUBLIC_URL environment variable.
 *
 * @param key - R2 object key (e.g., "maps/timestamp-id.ext")
 * @param env - Cloudflare environment bindings
 * @param requestUrl - Request URL for determining domain (optional)
 * @returns Public URL for direct R2 access
 */
export const getPublicR2Url = (key: string, env: { R2_PUBLIC_URL?: string }): string => {
	// Check for explicit R2_PUBLIC_URL environment variable
	const r2PublicUrl = env.R2_PUBLIC_URL;
	if (r2PublicUrl) {
		return `${r2PublicUrl.replace(/\/$/, '')}/${key}`;
	}

	// Default production URL: https://images.dnd.coredumped.org
	// This is the configured public R2 bucket domain
	return `https://images.dnd.coredumped.org/${key}`;
};

/**
 * Normalize file input to File object
 * Handles both web File objects and React Native file format { uri, name, type }
 * @param fileInput - File object or React Native file format
 * @returns Normalized File object and metadata
 */
export const normalizeFileInput = async (
	fileInput: File | { uri: string; name: string; type?: string },
): Promise<{ file: File; fileName: string; fileType: string }> => {
	if (fileInput instanceof File) {
		// Web: File object
		return {
			file: fileInput,
			fileName: fileInput.name,
			fileType: fileInput.type,
		};
	}

	if (typeof fileInput === 'object' && 'uri' in fileInput && 'name' in fileInput) {
		// React Native: { uri, name, type } format
		const uri = fileInput.uri;
		const fileName = fileInput.name || 'image.jpg';
		const fileType = fileInput.type || 'image/jpeg';

		// Fetch the file from the URI and convert to File/Blob
		const response = await fetch(uri);
		const blob = await response.blob();
		const file = new File([blob], fileName, { type: fileType });

		return { file, fileName, fileType };
	}

	throw new Error('Invalid file format');
};

/**
 * Upload image to R2 bucket
 * @param bucket - R2 bucket binding
 * @param file - File to upload
 * @param key - R2 key
 * @param contentType - Content type (MIME type)
 * @returns Upload result with key
 */
export const uploadImageToR2 = async (
	bucket: R2Bucket,
	file: File,
	key: string,
	contentType: string,
): Promise<string> => {
	await bucket.put(key, file, {
		httpMetadata: {
			contentType,
		},
	});
	return key;
};

/**
 * Unified image upload function
 * Handles file normalization, validation, R2 upload, and database record creation
 */
export interface UploadImageParams {
	fileInput: File | { uri: string; name: string; type?: string };
	type: ImageType;
	userId: string;
	isAdmin: boolean;
	title?: string;
	description?: string;
	imageType?: 'npc' | 'character' | 'both'; // For database record
}

export interface UploadImageResult {
	id: string;
	key: string;
	publicUrl: string;
	filename: string;
}

/**
 * Upload an image with full processing
 */
interface ImageRecord {
	id: string;
	user_id: string;
	filename: string;
	r2_key: string;
	public_url: string;
	title: string | null;
	description: string | null;
	image_type: 'npc' | 'character' | 'both';
	is_public: number;
	created_at: number;
	updated_at: number;
}

export const uploadImage = async (
	params: UploadImageParams,
	bucket: R2Bucket | null | undefined,
	env: { R2_PUBLIC_URL?: string },
	requestUrl: URL,
	db: { saveUploadedImage: (record: ImageRecord) => Promise<void> },
): Promise<UploadImageResult> => {
	const { fileInput, type, userId, isAdmin, title, description, imageType = 'both' } = params;

	// Normalize file input (handles both web and React Native formats)
	const normalized = await normalizeFileInput(fileInput);
	const file = normalized.file;
	const fileName = normalized.fileName;
	const fileType = normalized.fileType;

	// Validate file
	const validationError = validateImageFile(file, isAdmin);
	if (validationError) {
		throw new Error(validationError);
	}

	// Generate R2 key organized by type
	const key = generateImageKey(type, fileName, userId);

	// Upload to R2
	const isLocalDev = requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1';

	// In local dev, R2 might not be available - handle gracefully
	if (!bucket) {
		if (!isLocalDev) {
			throw new Error('R2 bucket not configured');
		}
		// Continue - we'll use API endpoint for serving
	} else {
		try {
			await uploadImageToR2(bucket, file, key, fileType);
		} catch (error) {
			// In local dev, allow R2 upload to fail gracefully
			if (!isLocalDev) {
				throw error;
			}
			// Continue - we'll use API endpoint for serving
		}
	}

	// Create database record
	const imageId = createId('img');
	const now = Date.now();

	// Generate public URL
	let publicUrl: string;
	if (isLocalDev && !env.R2_PUBLIC_URL) {
		// Local dev without R2_PUBLIC_URL: use API endpoint (requires imageId lookup)
		publicUrl = `${requestUrl.origin}/api/images/${imageId}`;
	} else {
		// Production or local dev with R2_PUBLIC_URL: use direct R2 access
		publicUrl = getPublicR2Url(key, env);
	}

	// Save to database
	await db.saveUploadedImage({
		id: imageId,
		user_id: userId,
		filename: fileName,
		r2_key: key,
		public_url: publicUrl,
		title: title || null,
		description: description || null,
		image_type: imageType,
		is_public: 1,
		created_at: now,
		updated_at: now,
	});

	return {
		id: imageId,
		key,
		publicUrl,
		filename: fileName,
	};
};
