# AI Code Smells & Refactoring Report

## Executive Summary
This report identifies patterns typical of AI-generated or rapidly iterated code that affect maintainability, scalability, and readability. Key findings include monolithic architecture in the database layer, repetitive API handlers, and documentation drift.

## 1. High Priority: Database Architecture (God Object)
**Issue**: `shared/workers/db.ts`
- **Description**: A single ~700-line file contains the `Database` class and all interface definitions (`GameRow`, `MapRow`, `NpcRow`, etc.). It handles logic for every entity in the system.
- **Why it's a smell**: AI often piles code into one file to maintain context. In a real project, this violates the Single Responsibility Principle and creates merge conflicts.
- **Recommendation**: Refactor into a `db/` module with a repository pattern.

## 2. API Design & Cleanliness
**Issue**: Repetitive Middleware Logic
- **Description**: `const db = createDatabase(c.env);` is manually called in nearly every route handler (e.g., `api/src/routes/maps.ts`, `api/src/routes/games/core.ts`).
- **Recommendation**: Use a Hono middleware to inject `db` into `c.var.db`.

**Issue**: `GameStateService` Complexity
- **Description**: `api/src/services/game-state.ts` is another large service mixing business logic (turns, combat) with infrastructure (serialization, dice rolling).
- **Recommendation**: Extract `DiceService`, `TurnService`, and `CombatService`.

**Issue**: Dangerous Admin Routes
- **Description**: `api/src/routes/admin.ts` exposes a raw SQL endpoint `POST /sql/query`. While useful for debugging, it's a security risk if not strictly controlled.

## 3. Code Quality, Style & Documentation
**Issue**: Documentation Drift
- **Description**: `README.md` instructs users to use `npm` (e.g., `npm run dev`), but `package.json` specifies `bun` as the package manager.
- **Recommendation**: Update `README.md` to use `bun` commands.

**Issue**: Repetitive Helper Logic
- **Description**: `JSON.parse(map.metadata)` is repeated multiple times in `api/src/routes/maps.ts` and `api/src/utils/games-utils.ts`.
- **Recommendation**: Use a `MapMapper` function or Zod schema transformation.

**Issue**: Verbose Comments
- **Description**: Comments like `// Google OAuth callback handler` above code that clearly handles Google OAuth.
- **Recommendation**: Remove redundant comments that just restate the function name.

**Issue**: Hardcoded Constants
- **Description**: Hex colors (e.g., `#F5E6D3`) are hardcoded in `app/admin/index.tsx`.
- **Recommendation**: Use the existing theme system constants.

## 4. Frontend Hooks Duplication
**Issue**: `hooks/api/use-character-queries.ts`
- **Description**: `useDealDamage`, `useHealCharacter`, etc., all repeat the exact same query invalidation logic.
- **Recommendation**: Create a generic `useGameAction` hook that handles the common invalidation pattern.

---

## 5. Detailed Plan: DB Refactoring

**Objective**: Move `shared/workers/db.ts` to a top-level `db/` directory and split it up.

### Step 1: Create Directory Structure
```
/db
  ├── index.ts        # Exports the main Database class
  ├── types.ts        # Exports all Row interfaces (GameRow, CharacterRow, etc.)
  └── repos/          # (Optional) Future home for specific repositories
```

### Step 2: Migration
1.  **Extract Types**: Move all `interface *Row` definitions from `shared/workers/db.ts` to `db/types.ts`.
2.  **Move Class**: Move the `Database` class to `db/index.ts`. Update it to import types from `./types`.
3.  **Update References**:
    - Update `api/src/utils/repository.ts` to import from `@/db`.
    - Update `api/src/services/game-state.ts` to import from `@/db`.
    - Update `api/src/utils/games-utils.ts` to import from `@/db`.
    - Update all other files importing `shared/workers/db`.

### Step 3: Cleanup
- Delete `shared/workers/db.ts` (and the folder if empty).
- Ensure `tsconfig.json` paths are correct (already supports `@/*` mapping to `./*`).

## 6. Next Steps
1.  **Approval**: Confirm if you want to proceed with the DB Refactoring immediately.
2.  **Execution**: I can execute the file moves and import updates.
