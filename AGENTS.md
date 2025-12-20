## Agent Notes

- Movement actions for DM/players rely on token lookup by both `entityId` and `id` because NPC turns use the token id as the active entity. Always resolve the active turn token id before action/movement decisions.
- When resetting turns in the durable game session, ensure `activeTurn` usage fields are cleared and speeds are derived per-entity; also guard paused turn snapshots against nulls.
- In `api-base-url` resolution, `expo-constants` typings don’t expose `expoConfig`; cast the config when reading `extra` values to keep typecheck happy.

## Lint Fixes

- For `react/function-component-definition`, prefer `const MyComponent: React.FC<PropType> = (props) => { ... }; export default MyComponent;` instead of `function MyComponent() { ... }`.

<!-- BACKLOG.MD MCP GUIDELINES START -->

<CRITICAL_INSTRUCTION>

## BACKLOG WORKFLOW INSTRUCTIONS

This project uses Backlog.md MCP for all task and project management activities.

**COMPREHENSIVE GUIDE**: See `.cursor/rules/backlog-workflow.md` for complete workflow documentation including:
- When to create tasks (decision framework)
- Task creation workflow (search first, assess scope, choose structure)
- Task execution workflow (planning phase, execution, scope changes)
- Task completion workflow (Definition of Done, completion steps)
- Task structure reference (fields, editing operations)
- Common workflows and troubleshooting

**QUICK START**:

- **First time working here?** Read `.cursor/rules/backlog-workflow.md` IMMEDIATELY
- **Need MCP tool details?** Call `get_workflow_overview()` for tool-oriented overview
- **When to read**: BEFORE creating tasks, or when you're unsure whether to track work

**Key Principles**:
- Always search before creating tasks (use filters, avoid listing all)
- Plan before coding (non-negotiable: plan must be in task before implementation)
- Never edit backlog markdown files directly - always use MCP tools
- Never autonomously create or start new tasks after completion

**MCP Tools Quick Reference**:
- Guides: `get_workflow_overview`, `get_task_creation_guide`, `get_task_execution_guide`, `get_task_completion_guide`
- Tasks: `task_list`, `task_search`, `task_view`, `task_create`, `task_edit`, `task_archive`
- Documents: `document_list`, `document_view`, `document_create`, `document_update`, `document_search`

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
