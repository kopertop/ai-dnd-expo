<!-- bce8d8ea-4173-43db-8535-049a17250f45 3212a39f-6a6e-4021-9691-e50f8e992615 -->
# Character States and Delete Improvements

## 1. Add Status Effects Constants

Create [`constants/status-effects.ts`](constants/status-effects.ts) with all D&D 5e conditions:

- Blinded, Charmed, Deafened, Exhaustion (1-6 levels), Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious
- Include icons/colors for visual distinction

## 2. Extend Character Schema

Update [`types/character.ts`](types/character.ts):

- Add `statusEffects: z.array(z.string()).default([])` field

## 3. Backend: Character Status Effects Support

Update [`api/src/routes/games.ts`](api/src/routes/games.ts):

- Extend character PATCH endpoint to accept `statusEffects` array
- Store in character row (may need DB schema update or use metadata field)

Update [`shared/workers/db.ts`](shared/workers/db.ts):

- Add `status_effects` to `CharacterRow` if not using metadata

## 4. Status Effects UI in Character DM Modal

Update [`components/character-dm-modal.tsx`](components/character-dm-modal.tsx):

- Add status effects section with toggleable chips/badges
- Display current status effects
- Allow DM to add/remove effects
- Visual indicators (icons, colors) for each condition

## 5. Delete Confirmation Dialog

Update [`components/token-detail-modal.tsx`](components/token-detail-modal.tsx):

- Add confirmation prompt before deletion ("Are you sure you want to remove X from the map?")

## 6. Fix Delete Query Refresh

Check [`app/host-game/[id]/[mapId].tsx`](app/host-game/[id]/[mapId].tsx) and [`hooks/api/use-map-queries.ts`](hooks/api/use-map-queries.ts):

- Ensure `useDeleteMapToken` properly invalidates queries
- May need to also invalidate `/games/${inviteCode}/state` and `/games/${inviteCode}/npc-instances`

## 7. Display Status Effects on Tokens/Cards

Update [`components/player-character-list.tsx`](components/player-character-list.tsx):

- Show status effect badges/icons on character cards in initiative list

### To-dos

- [ ] Create constants/status-effects.ts with D&D 5e conditions
- [ ] Add statusEffects field to Character schema
- [ ] Extend backend to support character status effects
- [ ] Add status effects management UI to CharacterDMModal
- [ ] Add delete confirmation dialog to TokenDetailModal
- [ ] Fix query invalidation on token delete
- [ ] Show status effects on character cards in initiative list