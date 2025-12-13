## 2025-05-19 - Unfiltered Resource Listing Defaults
**Vulnerability:** IDOR / Privacy Leak in `GET /api/images`. The endpoint listed all images from all users because the underlying DB method `listUploadedImages` returns all records when `userId` is undefined, and the route passed `undefined` (or nothing) by default.
**Learning:** Default arguments in data access layers can lead to accidental data exposure if the default behavior is 'permissive' (return all) rather than 'restrictive' (return none or error).
**Prevention:** Data access methods should ideally require explicit arguments for scoping (e.g. `userId`), or default to the most restrictive scope. API routes must always validate that they are passing the necessary scoping parameters.
