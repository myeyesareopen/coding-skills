---
name: task-arrangement
description: Coordinate broad project code changes through delegated subagents. Use when a change spans multiple services, modules, or independently owned file scopes and benefits from delegated implementation, or when the user explicitly requests subagent delegation. Keep read-only reviews and small, low-risk, single-file changes with the main agent unless the user specifically requires a subagent.
---

# Task Arrangement

Coordinate code changes through explicitly owned subagent tasks while keeping analysis, integration review, and user communication with the main agent.

## Core Rule

Use subagents when a code change spans multiple services, modules, or independently owned file scopes, or when the user specifically requests subagent delegation.

For delegated work, assign code edits to subagents. Keep analysis, task decomposition, integration review, and the final response with the main agent. Follow higher-priority instructions when they require a different execution path.

Keep read-only reviews and small, low-risk, single-file changes with the main agent. Delegate them only when the user specifically requires a subagent or a higher-priority instruction requires delegation.

## Subagent Configuration

Unless a higher-priority instruction requires different values, use:

- `model`: `gpt-5.6-terra`
- `fork_turns`: `"none"`
- `reasoning_effort`: `medium` for explorers, verifiers, and routine implementation workers
- `reasoning_effort`: `high` only for workers implementing genuinely complex changes

Always set `fork_turns: "none"`. Never copy the full conversation history into a subagent.

Provide only the minimum context needed to complete the assigned task: relevant repository paths, acceptance criteria, ownership boundaries, essential constraints, existing patterns that must be preserved, and focused validation commands. Omit unrelated conversation history, prior exploration, and duplicated instructions.

Treat an implementation as complex only when it involves demanding algorithms, migrations, security-sensitive behavior, substantial cross-module reasoning, or similarly high-risk logic where stronger reasoning is expected to improve the result. Keep routine workers at `medium`.

## Main Agent Workflow

Before delegating:

1. Identify the goal, acceptance criteria, affected scope, and relevant repository instructions.
2. Inspect enough code and configuration to identify the required files, modules, services, and dependencies.
3. Keep small, low-risk, single-file work with the main agent; split broader work only where ownership can be explicit and non-overlapping.
4. Determine which tasks must run sequentially and which can safely run concurrently.
5. Inspect current agent capacity when the runtime provides that capability.
6. Spawn each subagent with the required role-based effort and minimum sufficient task-local context.

For every delegation, specify:

- The purpose and intended behavior change.
- Owned files, directories, modules, or service boundaries.
- Files or areas that must not be modified.
- The implementation approach and existing patterns to preserve.
- Required validation commands or checks.
- The expected report: changed files, implementation details, verification results, and residual risks.

Tell each subagent to preserve concurrent work, avoid reverting changes it does not own, and adapt to changes already present in the workspace.

## Role Selection

Default to one implementation worker per independent writable scope. Require that worker to inspect the relevant local context, implement the change, and validate its own result.

Create a separate explorer only when discovery is substantial or the correct implementation scope cannot be determined efficiently by the main agent. Create a separate verifier only when independent validation materially reduces risk, such as for security-sensitive changes, migrations, broad refactors, or weak test coverage.

Do not create separate explorer, implementer, and verifier agents for the same scope by default. Use all three roles only when the task's complexity or risk clearly justifies their additional calls.

## Subagent Workflow

Require each subagent to:

1. Read the assigned files and relevant local instructions.
2. Modify only its owned scope.
3. Run focused validation when practical.
4. Compare the result with the stated acceptance criteria.
5. Continue correcting issues until its assigned goal is complete.
6. Report dependencies or blockers instead of expanding into unrelated files.

## Capacity and Parallelism

Run tasks concurrently only when their writable scopes do not overlap, they do not depend on each other's output, and enough concurrency capacity is available.

Never assign the same writable file to concurrent subagents. Run shared-file or sequentially dependent tasks in order.

When capacity is temporarily exhausted, wait for an active agent, reuse an idle agent, or queue remaining tasks for sequential execution. Do not treat temporary capacity exhaustion as permanent unavailability.

If delegation is required but no subagent mechanism exists, stop before editing and explain the constraint. Otherwise, allow the main agent to complete small, low-risk, single-file work directly.

## Integration Review

After delegated work completes:

1. Review every subagent report and inspect the resulting changes.
2. Confirm that each task meets its acceptance criteria and that combined changes are compatible.
3. Run or review final validation appropriate to the full change.
4. Delegate follow-up work for incomplete, conflicting, or insufficiently validated results.
5. Finish only after the original goal is satisfied.

## Final Response

Report the overall result, delegated tasks, changed files or modules, validation performed, commands that could not run, and any remaining risks. Reply in Chinese when the user or repository instructions require Chinese.
