import { createId } from './games-utils';

export interface ImageUploadResult {
	key: string;
	url: string;
	filename: string;
	contentType: string;
	size: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * Validate image file
 * @param file - The file to validate
 * @returns Error message if invalid, null otherwise
 */
export const validateImageFile = (file: File): string | null => {
	if (!ALLOWED_TYPES.includes(file.type)) {
		return `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}`;
	}

	if (file.size > MAX_FILE_SIZE) {
		return `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`;
	}

	return null;
};

/**
 * Generate a unique key for the image in R2
 * @param userId - ID of the user uploading the image
 * @param filename - Original filename
 * @returns Unique key for R2 storage
 */
export const generateImageKey = (userId: string, filename: string): string => {
	const parts = filename.split('.');
	// Get extension only if there is one (length > 1 means at least name + dot + ext)
	// If filename starts with dot (hidden file), parts[0] is empty, which is fine.
	let ext = parts.length > 1 ? parts.pop() || '' : '';

	// Sanitize extension: allow only alphanumeric characters
	// This prevents path traversal (..) and special characters
	ext = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

	const timestamp = Date.now();
	const uniqueId = createId('img');

	// If no valid extension found or empty after sanitization, default to 'bin' or just append nothing?
	// Given we only allow specific image types in validation, we could infer ext, but here we just sanitize.
	// If ext is empty, the key will end with a dot. Let's avoid that.
	const suffix = ext ? `.${ext}` : '';

	return `images/${userId}/${timestamp}-${uniqueId}${suffix}`;
};

/**
 * Get the public URL for an R2 key
 * This assumes the R2 bucket is connected to a custom domain or worker route
 * For now we'll use a placeholder structure that can be updated with the actual domain
 */
export const getPublicUrl = (key: string, accountId: string = 'pub'): string => {
	// TODO: Update this with your actual R2 public bucket URL or Worker URL
	// For dev/test we might need a different strategy if not using a custom domain
	return `https://${accountId}.r2.dev/${key}`;
};

/**
 * Upload image to R2
 * @param bucket - R2 bucket binding
 * @param file - File to upload
 * @param key - R2 key
 * @returns Upload result
 */
export const uploadImageToR2 = async (
	bucket: R2Bucket,
	file: File,
	key: string,
): Promise<ImageUploadResult> => {
	await bucket.put(key, file, {
		httpMetadata: {
			contentType: file.type,
		},
	});

	// For now, construct a URL assuming public access is enabled on the bucket
	// or served via a worker.
	// You might need to configure a custom domain in Cloudflare dashboard
	const url = `https://r2.your-domain.com/${key}`;

	return {
		key,
		url, // This will be updated in the route handler with the correct domain
		filename: file.name,
		contentType: file.type,
		size: file.size,
	};
};
