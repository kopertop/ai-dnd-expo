## Agent Notes

- Movement actions for DM/players rely on token lookup by both `entityId` and `id` because NPC turns use the token id as the active entity. Always resolve the active turn token id before action/movement decisions.
- When resetting turns in the durable game session, ensure `activeTurn` usage fields are cleared and speeds are derived per-entity; also guard paused turn snapshots against nulls.
- In `api-base-url` resolution, `expo-constants` typings don’t expose `expoConfig`; cast the config when reading `extra` values to keep typecheck happy.

<!-- BACKLOG.MD MCP GUIDELINES START -->

<CRITICAL_INSTRUCTION>

## BACKLOG WORKFLOW INSTRUCTIONS

This project uses Backlog.md MCP for all task and project management activities.

**CRITICAL GUIDANCE**

- If your client supports MCP resources, read `backlog://workflow/overview` to understand when and how to use Backlog for this project.
- If your client only supports tools or the above request fails, call `backlog.get_workflow_overview()` tool to load the tool-oriented overview (it lists the matching guide tools).

- **First time working here?** Read the overview resource IMMEDIATELY to learn the workflow
- **Already familiar?** You should have the overview cached ("## Backlog.md Overview (MCP)")
- **When to read it**: BEFORE creating tasks, or when you're unsure whether to track work

These guides cover:
- Decision framework for when to create tasks
- Search-first workflow to avoid duplicates
- Links to detailed guides for task creation, execution, and completion
- MCP tools reference

You MUST read the overview resource to understand the complete workflow. The information is NOT summarized here.

</CRITICAL_INSTRUCTION>

<!-- BACKLOG.MD MCP GUIDELINES END -->

## GitHub CLI (`gh`) Usage

When reviewing pull requests or managing GitHub operations:

### Common Commands:
- `gh pr list` - List all open PRs
- `gh pr view <number>` - View PR details (title, description, author, status)
- `gh pr view <number> --json <fields>` - Get structured JSON data (e.g., `mergeable`, `mergeStateStatus`)
- `gh pr diff <number>` - View the diff for a PR
- `gh pr checks <number>` - Check CI/CD status (may return "no checks reported" if CI not configured)
- `gh pr view <number> --comments` - View comments on a PR
- `gh pr comment <number> --body "<text>"` - Add a comment to a PR (use quotes for multi-line)

### PR Review Workflow:
1. List PRs: `gh pr list`
2. View details: `gh pr view <number>`
3. Check mergeability: `gh pr view <number> --json mergeable,mergeStateStatus`
4. Review diff: `gh pr diff <number>`
5. Check CI status: `gh pr checks <number>`
6. Add feedback: `gh pr comment <number> --body "<review>"`

### Notes:
- Always check `mergeStateStatus` (should be "CLEAN" for mergeable PRs)
- DRAFT PRs should not be merged until marked ready
- When commenting, use `@jules` to tag the bot if requesting changes
- For multi-line comments, use heredoc or escape quotes properly in shell
