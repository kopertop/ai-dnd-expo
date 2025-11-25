## Agent Notes

- Movement actions for DM/players rely on token lookup by both `entityId` and `id` because NPC turns use the token id as the active entity. Always resolve the active turn token id before action/movement decisions.
- When resetting turns in the durable game session, ensure `activeTurn` usage fields are cleared and speeds are derived per-entity; also guard paused turn snapshots against nulls.
- In `api-base-url` resolution, `expo-constants` typings don’t expose `expoConfig`; cast the config when reading `extra` values to keep typecheck happy.
