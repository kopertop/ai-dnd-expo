# Testing Rules

1. **Backend tests**
   - All backend/API tests live under `api/tests/`.
   - File names must end with `.spec.ts`.
   - These specs can cover Hono routes, shared database helpers, and utility modules that run on the server/runtime side.

2. **Frontend tests**
   - Do **not** add React Native/Jest unit tests in this repo right now.
   - Future frontend coverage will be handled exclusively through Playwright end-to-end suites; no action required until the Playwright plan is scheduled.

3. **Legacy suites**
   - Remove or avoid reintroducing the old Expo-dependent Vitest suites (`dnd-model-*`, etc.) since Expo modules are no longer mocked in this project.

Follow these rules before adding or renaming any tests.
