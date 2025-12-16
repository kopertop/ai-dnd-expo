## 2025-05-19 - Unfiltered Resource Listing Defaults
**Vulnerability:** IDOR / Privacy Leak in `GET /api/images`. The endpoint listed all images from all users because the underlying DB method `listUploadedImages` returns all records when `userId` is undefined, and the route passed `undefined` (or nothing) by default.
**Learning:** Default arguments in data access layers can lead to accidental data exposure if the default behavior is 'permissive' (return all) rather than 'restrictive' (return none or error).
**Prevention:** Data access methods should ideally require explicit arguments for scoping (e.g. `userId`), or default to the most restrictive scope. API routes must always validate that they are passing the necessary scoping parameters.

## 2025-05-20 - Unsanitized File Extension in R2 Keys
**Vulnerability:** Path traversal and special character injection in R2 keys via `generateImageKey`. The function extracted the extension from the filename without sanitization, allowing inputs like `file.png/../../hack` to manipulate the generated key. It also ignored a defined `sanitizedFilename` variable.
**Learning:** Extracting file extensions using string splitting without validation is risky. Unused variables (`sanitizedFilename`) can mask security intent that isn't actually implemented.
**Prevention:** Always sanitize extracted file extensions using an allowlist (alphanumeric only). Use defensive coding to ensure sanitized values are actually used in the final output.

## 2025-05-23 - Authorization Bypass in Game Join
**Vulnerability:** ID Spoofing and Character Stealing in `POST /api/games/:inviteCode/join`. The endpoint accepted `playerId` from the request body, allowing attackers to join as any user. It also failed to verify ownership of `characterId`, allowing attackers to steal or modify other users' characters.
**Learning:** Never trust client-provided identity parameters (like `playerId`) when an authenticated session (`user.id`) is available. Explicitly checking ownership of linked resources (like characters) is mandatory before linking them to a new context.
**Prevention:** Always use the authenticated `user.id` as the source of truth for identity. Validate ownership of all referenced resources (characters, items, etc.) before performing actions on them.
