# Backlog.md MCP Workflow Guide

This project uses Backlog.md MCP for all task and project management activities. **Never edit backlog markdown files directly** - always use the MCP tools to maintain relationships, metadata, and history.

## Quick Reference: MCP Tools

### Workflow Guides (Read First)
- `get_workflow_overview` - Overview of when and how to use Backlog
- `get_task_creation_guide` - Detailed instructions for creating tasks
- `get_task_execution_guide` - Planning and executing tasks
- `get_task_completion_guide` - Definition of Done and completion workflow

### Task Management
- `task_list` - List tasks with optional filters (status, assignee, labels)
- `task_search` - Search tasks by title/description with filters
- `task_view` - View full task details (ID, title, description, acceptance criteria, plan, notes)
- `task_create` - Create new tasks with metadata
- `task_edit` - Edit tasks (status, plan, notes, acceptance criteria, dependencies)
- `task_archive` - Archive completed tasks

### Document Management
- `document_list` - List documents with optional search
- `document_view` - View document content and metadata
- `document_create` - Create new documents
- `document_update` - Update existing documents
- `document_search` - Search documents using fuzzy index

---

## When to Create Tasks

**Core Principle**: Create a task if the work requires planning or decision-making. Ask: "Do I need to think about HOW to do this?"

### ✅ Create Tasks For:
- Features requiring investigation, design decisions, or multiple steps
- Bug fixes that need root cause analysis
- Refactoring that requires planning
- Work spanning multiple files/components
- Anything that would benefit from tracking progress

### ❌ Skip Tasks For:
- Trivial mechanical changes (typos, version bumps, missing semicolons)
- Questions or exploratory requests
- Knowledge transfer only
- Single-line fixes with obvious solutions

---

## Task Creation Workflow

### Step 1: Search First (CRITICAL)

**Always search before creating** to avoid duplicates:

```typescript
// Use task_search with query
task_search({ query: "desktop app", status: "To Do" })

// Or use task_list with filters
task_list({ status: "In Progress", labels: ["frontend"] })
```

**Important**: 
- Always use filters (status, query, labels) - never list all tasks including "Done"
- Never search without a query or limit - this can overwhelm context
- Use `task_view` to read full context of related tasks

### Step 2: Assess Scope

**Before creating tasks, determine if work is:**
- **Single atomic task** (one focused PR) → Create one task immediately
- **Multi-task feature** (multiple PRs, parent with subtasks) → Create task structure

**Scope Assessment Checklist:**
1. Can this be completed in a single focused pull request?
2. Would a code reviewer be comfortable reviewing all changes in one sitting?
3. Are there natural breaking points for independent delivery?
4. Does the request span multiple subsystems or architectural concerns?
5. Are multiple tasks working on the same component?

### Step 3: Choose Task Structure

**Use Subtasks** (parent-child) when:
- Multiple tasks modify the same component/subsystem
- Tasks are tightly coupled with shared high-level goal
- Tasks represent sequential phases of the same feature
- Example: Parent "Desktop Application" with subtasks for Electron setup, IPC bridge, UI adaptation

**Use Separate Tasks** (with dependencies) when:
- Tasks span different components/subsystems
- Tasks can be worked on independently
- Tasks have loose coupling with clear boundaries
- Example: Separate tasks for "API endpoint", "Frontend component", "Documentation"

### Step 4: Create Task(s)

**Required Fields:**
- `title` - Clear, outcome-focused title
- `description` - Explain desired outcome and user value (the WHY)
- `acceptanceCriteria` - Specific, testable, independent checklist items (the WHAT)

**Best Practices:**
- Never embed implementation details in title/description/acceptance criteria
- Keep acceptance criteria atomic and testable
- Include negative/edge scenarios when relevant
- Record dependencies using `task_edit` after creation
- Ask for clarification if requirements are ambiguous

**After Creation:**
- Report created tasks to user (ID, title, description, acceptance criteria)
- Explain the structure if multiple tasks were created

### Common Anti-patterns:
- ❌ Single task with 10+ acceptance criteria (should be split)
- ❌ Implementation steps in acceptance criteria (should be in plan)
- ❌ Creating task before understanding if it needs splitting

---

## Task Execution Workflow

### Planning Phase (NON-NEGOTIABLE)

**Before writing any code:**

1. **Mark task as In Progress**
   ```typescript
   task_edit({ id: "task-123", status: "In Progress", assignee: ["agent"] })
   ```

2. **Draft implementation plan**
   - Think through approach
   - Review relevant code
   - Identify key files
   - Note risks and checkpoints

3. **Present plan to user**
   - Show proposed approach
   - Highlight key decisions
   - Explain file changes

4. **Wait for explicit approval**
   - Do not start coding until user confirms
   - User may ask to skip review (then proceed)

5. **Record approved plan in task**
   ```typescript
   task_edit({ 
     id: "task-123", 
     planSet: "## Implementation Plan\n\n1. Review existing code...\n2. Create new component..." 
   })
   ```

**IMPORTANT**: The plan must exist in the task record before implementation begins.

### Execution Phase

**While implementing:**

- **Do not touch codebase** until plan is approved AND recorded
- Keep plan accurate - if approach shifts, update it first and get confirmation
- Work in short loops: implement → test → check acceptance criteria
- Log progress with `notesAppend`:
  ```typescript
  task_edit({ id: "task-123", notesAppend: ["Decided to use X approach because Y"] })
  ```
- Check off acceptance criteria as met:
  ```typescript
  task_edit({ id: "task-123", acceptanceCriteriaCheck: [1, 2] })
  ```
- Keep task status aligned with reality

### Handling Scope Changes

**If new work appears during implementation:**

**STOP and ask user:**
> "I discovered [new work needed]. Should I:
> 1. Add acceptance criteria to the current task and continue, or
> 2. Create a follow-up task to handle this separately?"

**Never:**
- Silently expand scope without approval
- Create new tasks on your own initiative
- Add acceptance criteria without confirmation

### Working with Subtasks

**When user assigns "parent task and all subtasks":**
- Work through each subtask sequentially
- Don't ask permission to move to next one

**When completing a single subtask:**
- Present progress
- Ask: "Subtask X is complete. Should I proceed with subtask Y, or would you like to review first?"

**Each subtask should be fully completed** (all acceptance criteria met, tests passing) before moving to the next.

---

## Task Completion Workflow

### Definition of Done Checklist

Before marking a task as "Done", verify:

- ✅ Implementation plan exists in task record and reflects final solution
- ✅ All acceptance criteria are checked
- ✅ Automated and relevant manual tests pass
- ✅ No new warnings or regressions introduced
- ✅ Documentation/config updates completed when required
- ✅ Implementation notes capture what changed and why
- ✅ Status transitions to "Done"

### Completion Steps

1. **Verify all acceptance criteria** - Use `task_view` to see current status
2. **Run Definition of Done checklist** (above)
3. **Summarize the work** - Use `notesAppend` to document changes (like a PR description):
   ```typescript
   task_edit({ 
     id: "task-123", 
     notesAppend: [
       "## Implementation Summary\n\n- Added X component to handle Y\n- Modified Z service to support new flow\n- Tests cover edge cases A, B, C"
     ] 
   })
   ```
4. **Confirm plan is current** - Update plan if executed approach deviated
5. **Update task status**:
   ```typescript
   task_edit({ id: "task-123", status: "Done" })
   ```

### After Completion

**Never autonomously create or start new tasks.**

**If follow-up work is needed:**
- Present idea to user
- Ask whether to create a follow-up task

**If this was a subtask:**
- Check if user explicitly said "parent task and all subtasks"
  - If YES: Proceed directly to next subtask
  - If NO: Ask user: "Subtask X is complete. Should I proceed with subtask Y?"

**If all subtasks complete:**
- Update parent task status if appropriate
- Ask user what to do next

### Implementation Notes (PR Summary)

Use `notesAppend` to record:
- Implementation decisions and rationale
- Blockers encountered and resolutions
- Technical debt or future improvements
- Testing approach and results

Write a structured summary highlighting key points. Don't repeat information clearly understandable from code.

---

## Task Structure Reference

### Task Fields

**Metadata:**
- `id` - Unique identifier (e.g., "task-123")
- `title` - Brief, outcome-focused title
- `status` - "To Do", "In Progress", "Done"
- `priority` - "high", "medium", "low"
- `assignee` - Array of assignee names
- `labels` - Array of label strings
- `dependencies` - Array of task IDs this depends on
- `parentTaskId` - ID of parent task (for subtasks)

**Content:**
- `description` - The WHY (desired outcome, user value)
- `acceptanceCriteria` - Array of testable checklist items (the WHAT)
- `plan` - Implementation plan (set via `planSet` or `planAppend`)
- `notes` - Implementation notes and decisions (set via `notesSet` or `notesAppend`)

### Task Editing Operations

**Status Management:**
```typescript
task_edit({ id: "task-123", status: "In Progress" })
task_edit({ id: "task-123", status: "Done" })
```

**Planning:**
```typescript
// Set complete plan
task_edit({ id: "task-123", planSet: "## Plan\n\n1. Step one..." })

// Append to existing plan
task_edit({ id: "task-123", planAppend: ["Additional step discovered"] })

// Clear plan
task_edit({ id: "task-123", planClear: true })
```

**Notes:**
```typescript
// Set complete notes
task_edit({ id: "task-123", notesSet: "## Notes\n\n..." })

// Append to existing notes
task_edit({ id: "task-123", notesAppend: ["New note", "Another note"] })

// Clear notes
task_edit({ id: "task-123", notesClear: true })
```

**Acceptance Criteria:**
```typescript
// Set complete list
task_edit({ id: "task-123", acceptanceCriteriaSet: ["Criterion 1", "Criterion 2"] })

// Add new criteria
task_edit({ id: "task-123", acceptanceCriteriaAdd: ["New criterion"] })

// Remove criteria (by 1-based index)
task_edit({ id: "task-123", acceptanceCriteriaRemove: [2] })

// Check/uncheck criteria (by 1-based index)
task_edit({ id: "task-123", acceptanceCriteriaCheck: [1, 2] })
task_edit({ id: "task-123", acceptanceCriteriaUncheck: [1] })
```

**Other Fields:**
```typescript
task_edit({ 
  id: "task-123",
  title: "Updated title",
  description: "Updated description",
  priority: "high",
  labels: ["frontend", "urgent"],
  assignee: ["agent"],
  dependencies: ["task-100", "task-101"]
})
```

---

## Common Workflows

### Starting Work on a Task

1. Search for task: `task_search({ query: "feature name" })`
2. View task details: `task_view({ id: "task-123" })`
3. Mark in progress: `task_edit({ id: "task-123", status: "In Progress" })`
4. Draft and present plan
5. Record approved plan
6. Begin implementation

### Creating a Multi-Task Feature

1. Assess scope (single vs multi-task)
2. If multi-task, decide: subtasks vs separate tasks
3. Create parent task (if using subtasks) or first task
4. Create remaining tasks with dependencies
5. Report all created tasks to user

### Completing a Task

1. Verify all acceptance criteria met
2. Run Definition of Done checklist
3. Write implementation summary in notes
4. Update plan if needed
5. Mark as Done: `task_edit({ id: "task-123", status: "Done" })`
6. Ask user about next steps (don't auto-create tasks)

### Handling Interruptions

If work is interrupted:
1. Update notes with current state: `task_edit({ id: "task-123", notesAppend: ["Work paused at X"] })`
2. Update plan if approach changed
3. Future agent can resume by reading `task_view` to see plan and notes

---

## Best Practices Summary

1. **Always search before creating** - Use filters, avoid listing all tasks
2. **Assess scope first** - Single task vs multi-task structure
3. **Plan before coding** - Non-negotiable: plan must be in task before implementation
4. **Get approval** - Present plan, wait for confirmation
5. **Keep plan current** - Update if approach changes
6. **Log progress** - Use notes to document decisions and blockers
7. **Check criteria as met** - Use acceptanceCriteriaCheck
8. **Complete properly** - Run Definition of Done, write summary
9. **Never auto-create tasks** - Always ask user about follow-ups
10. **Use tools, not files** - Never edit backlog markdown directly

---

## Troubleshooting

**"I don't know if I should create a task"**
→ Read `get_workflow_overview` - it has the decision framework

**"I found related work but I'm not sure if it's the same"**
→ Use `task_view` to read full context, compare acceptance criteria

**"The user's request seems too big for one task"**
→ Assess scope, create parent task with subtasks or separate tasks with dependencies

**"I started coding but realized I need to change approach"**
→ Update plan first via `task_edit`, get user confirmation, then continue

**"I completed the task but there's related work"**
→ Present to user, ask if they want a follow-up task (don't create automatically)
