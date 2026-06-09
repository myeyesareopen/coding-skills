---
name: task-arrangement
description: Coordinate all project code modifications through subagents. Use whenever Codex is asked to modify project code, tests, build configuration, migrations, or implementation-adjacent project files, especially when any file edit is expected.
---

# Task Arrangement

Use this skill to make subagent delegation the required execution path for project code changes.

## Core Rule

When modifying project code, always use subagents to perform the code edits. The main agent must not directly edit project code. The main agent owns analysis, planning, delegation, integration review, and the final response.

If a code modification is required but no subagent mechanism is available, stop before editing code and tell the user that the requested workflow cannot be followed until subagents are available.

## Subagent Model

When spawning any subagent for this workflow, explicitly set:

- `model`: `gpt-5.4`
- `reasoning_effort`: `high`

Apply this configuration to every worker, explorer, verifier, or follow-up subagent created for a code modification task unless a higher-priority instruction requires a different model.

## Main Agent Responsibilities

Before delegating, analyze the task and produce a concrete implementation plan:

1. Identify the user's goal, expected behavior, and acceptance criteria.
2. Inspect the codebase enough to choose the exact files, modules, services, or layers that need changes.
3. Split the work into subagent tasks with non-overlapping ownership whenever possible.
4. Define the order of work, including which tasks can run in parallel and which must wait for another result.
5. Spawn each subagent with `model: gpt-5.4` and `reasoning_effort: high`.
6. Give each subagent a specific task, explicit file or module ownership, the intended behavior change, and the concrete modification approach.

Delegation instructions must be specific, unambiguous, and easy to understand. Include enough context for the subagent to implement the change without guessing:

- The purpose of the change.
- The files, directories, modules, or service boundaries the subagent owns.
- The files or areas the subagent must avoid.
- The expected implementation strategy.
- Relevant existing patterns or APIs to preserve.
- Required validation commands or checks.
- The expected final report format.

Always tell subagents that they are not alone in the codebase, must not revert work from others, and must adapt to concurrent changes if they encounter them.

## Subagent Responsibilities

Each subagent must perform the assigned code modification inside its owned scope. After implementation, the subagent must self-check the result against the assigned goal.

The subagent workflow is:

1. Read the assigned files and relevant local context.
2. Implement the requested change using the concrete approach provided by the main agent.
3. Run focused validation when practical.
4. Compare the result against the task goal and acceptance criteria.
5. If the goal is not fully met, continue modifying and self-checking until the task is complete.
6. Report changed files, implementation details, validation results, and any residual risks or blockers to the main agent.

Subagents should not broaden their scope without a clear reason. If the assigned goal cannot be achieved within the owned files or modules, the subagent must report the dependency or blocker instead of editing unrelated areas.

## Parallel Work

When multiple code changes are independent and their file scopes do not overlap, the main agent should decide this without waiting for user confirmation and launch multiple subagents concurrently.

Use parallel subagents for separate services, modules, layers, or independently testable changes. Avoid parallel delegation when tasks share the same files, require tight sequencing, or would create avoidable merge conflicts.

## Integration Review

After all subagents finish, the main agent must review their summaries and inspect the resulting changes enough to confirm the full user goal is satisfied.

The main agent must:

1. Check that every delegated task completed its stated purpose.
2. Confirm that subagent changes are compatible with one another.
3. Run or review final verification appropriate to the overall change.
4. Request follow-up subagent work if any task is incomplete, inconsistent, or insufficiently validated.
5. Only finish after determining that all tasks are complete and the original goal has been met.

## Final Response

In the final user response, summarize the completed work in Chinese when the user requires Chinese responses. Include:

- The overall change completed.
- Which subagent tasks were performed.
- Key files or modules changed.
- Verification performed and any commands that could not be run.
- Any remaining risks or follow-up actions, if applicable.
