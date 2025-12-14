import { describe, it, expect } from 'vitest';
import { generateImageKey } from '@/api/src/utils/image-upload';

describe('generateImageKey', () => {
    it('should generate a key with properly sanitized filename', () => {
        const userId = 'user-123';
        // Simulating a filename with directory traversal attempt
        const filename = 'test/../../file.png';
        const key = generateImageKey(userId, filename);

        // Current implementation is buggy:
        // filename.split('.').pop() returns "png" (correct for this case)

        // But what if the extension itself has traversal?
        const filename2 = 'image.png/../../hack';
        const key2 = generateImageKey(userId, filename2);

        // If the implementation splits by dot, the last part is "png/../../hack"
        // This confirms if the vulnerability exists

        // We expect the key to strictly NOT contain ".."
        expect(key2).not.toContain('..');

        // Also check for special characters
        const filename3 = 'image.php';
        const key3 = generateImageKey(userId, filename3);
        // We might want to allow only specific extensions, but at least
        // it shouldn't just blindly take whatever is after the dot if it contains weird chars.

        const filename4 = 'image.weird$ext';
        const key4 = generateImageKey(userId, filename4);
        expect(key4).not.toContain('$');
    });
});
