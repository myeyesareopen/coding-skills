---
name: task-arrangement
description: Plan and coordinate broad code changes through dependency-aware subagents, dynamic capability routing, safe workspace isolation, recovery, and coordinator-owned integration. Use when work spans services, modules, or independent writable scopes; discovery is substantial; migrations, security, or major refactors need independent verification; or the user explicitly requests subagent delegation. Keep small, low-risk, single-file work with the main agent unless delegation is required.
---

# Task Arrangement

Act as the architect, coordinator, and integrator. Delegate only when **Delegation Benefit > Coordination Cost**: expected independent progress, expertise, or risk reduction must exceed discovery, prompting, integration, and validation overhead. Keep small, low-risk, single-file work; tightly coupled changes; and quick read-only checks local. Delegate independent scopes, substantial discovery, or material-risk validation when clear ownership and a useful parallel path exist. When the user or a higher-priority instruction explicitly requires subagents, comply while still choosing the smallest safe role set.

## Phase 1 — Plan safely

1. Read repository instructions and inspect enough code to state the goal, acceptance criteria, affected scopes, dependencies, and validation plan.
2. Build a dependency graph. Mark shared mutable contracts: common files, schemas, generated outputs, APIs, configuration, lockfiles, migrations, and test fixtures. These owners must work sequentially or through an explicit interface contract.
3. Stabilize any shared mutable contract or logical dependency serially before parallel work. Then select an execution mode:
   - **Direct:** main agent performs narrow work.
   - **Shared workspace:** use for read-heavy work or small, low-risk, isolated writes with disjoint paths.
   - **Isolated worktrees:** MUST be used for each non-trivial, write-heavy scope that will run concurrently. Use them only when ownership is isolated and the base is stable; never treat a worktree as permission to parallelize overlapping changes or unresolved dependencies.
4. Inspect the working tree before writes. Preserve existing dirty changes; never reset, overwrite, or “clean up” work outside an assigned scope. If ownership or intent is ambiguous, stop and ask.

## Roles and prompts

Use the smallest role set that solves the task.

- **Main:** plan, create the graph, assign ownership, coordinate dependencies, review integration, communicate, and deliver.
- **Explorer:** read-only discovery when scope or existing conventions are unclear; report evidence and recommendations, not edits.
- **Worker:** implement and focused-validate one explicit writable scope.
- **Verifier:** independently inspect and validate material risk, such as migrations, security-sensitive changes, broad refactors, or weak test coverage.

Give every agent minimum sufficient context: goal, owned paths, no-touch paths, relevant contracts/patterns, acceptance criteria, focused checks, and required report. Always use `fork_turns: "none"`; do not copy full conversation history.

Before delegating an implementation worker, read and fill the complete [worker prompt](references/worker-prompt.md). Before assigning an explorer or verifier, read the corresponding [explorer prompt](references/explorer-prompt.md) or [verifier prompt](references/verifier-prompt.md). Before creating, integrating, recovering, or cleaning up isolated worktrees, read the complete [worktree policy](references/worktree-policy.md). Do not delegate from memory when the relevant reference applies.

Route by capability first, then reasoning:

- Narrow search, repetitive inspection, or a simple explorer → lightest available capable model with `medium` reasoning.
- Complex discovery or routine implementation → mid-tier available model with `medium` reasoning.
- Ordinary independent review → mid-tier available model with `high` reasoning when supported.
- Architecture, difficult algorithms, or complex refactors → strongest available model with `high` reasoning.
- Security, migrations, or critical integration → strongest available model with `high`/`xhigh` reasoning when supported.

Inspect the runtime's callable model overrides instead of guessing names. For example, when both are actually offered, use `gpt-5.6-terra` for routine work and `gpt-5.6-sol` for complex or critical work; never invent an unavailable lighter tier. Do not substitute extra reasoning for a required model capability. Overrides are optional: if the intended override is unavailable, inherit the runtime default, reduce scope/parallelism, or keep the work with the main agent. Do not require unavailable tools.

## Phase 2 — Execute and coordinate

Assign one worker per independent writable scope. Parallelize only after confirming disjoint writes, no order dependency, and sufficient capacity. Parallel reads are normally safe; concurrent edits to the same file or shared mutable contract are not.

At capacity, wait for progress, reuse an idle agent, or queue the next dependency-ready task. Do not abandon useful work merely because capacity is temporarily full.

Workers MUST stay within ownership, inspect local changes before editing, preserve concurrent work, and run focused checks. Their final report MUST contain `STATUS`, `SUMMARY`, `FILES`, `VALIDATION`, `COMMIT`, and `RISKS`; use `COMMIT: N/A` in shared-workspace mode. Explorers and verifiers MUST remain read-only unless the main agent explicitly reassigns them.

For worktrees, first protect and record any dirty main workspace; capture a fixed integration base SHA; create exactly one `agent/<task>` branch and one worktree for each worker; and require that worker's atomic commit SHA in its report. The main agent reviews and cherry-picks approved commits in dependency order, resolves integration conflicts, and validates the combined result. Clean up and prune only after successful validation; preserve failed worktrees for inspection and recovery. Follow [worktree policy](references/worktree-policy.md) for detailed commands.

## Phase 3 — Integrate, recover, and report

Review every report and diff against acceptance criteria and the dependency graph. Re-check shared contracts after all dependent changes land. Validate in layers: local static/format checks, focused unit or component tests, integration/build checks, then targeted manual or end-to-end checks when risk warrants. Record skipped checks and why.

On a missing result or timeout, first inspect the worker worktree's `git status`, `git diff`, and `git log`. If useful work exists, preserve it and assign a continuation worker with that evidence. Only if no useful work exists, make at most one focused automatic retry with corrected context. If that retry fails, the main agent completes a serial fallback or reports the blocker. Never automatically discard valuable work, spin indefinitely, or silently broaden scope.

Finish only when the original goal is integrated and validated proportionally. Report status, outcome, delegated roles, changed files/modules, validation and skipped checks, integration/worktree actions, and remaining risks or blockers. When the runtime exposes evaluation data, also record task type, agent count, model/reasoning route, workspace mode, conflicts, retry count, token usage, and whether the main agent had to redo work; use these observations to refine future routing rather than adding runtime infrastructure.
