# Worktree Coordination Runbook

Use worktrees to isolate parallel writes, not as a default cost for every subtask. The coordinator owns decomposition, integration, recovery, and cleanup. Each worker stays within its assigned worktree and writable scope.

## When to Use a Worktree

Use an isolated worktree when multiple workers will modify disjoint writable scopes concurrently, a task is long-running, or isolated commits are needed for dependency-ordered integration.

Do not create worktrees for read-only exploration or verification, a small low-risk single-file change, or a task that must directly consume another unfinished change. In shared-workspace mode, schedule overlapping writes sequentially and instruct workers not to commit unless the coordinator explicitly authorizes it.

## Protect the Existing Workspace

1. Inspect the main workspace with `git status --short`. Existing dirty changes belong to prior work; do not reset, stash, overwrite, or mix them into worker commits.
2. Pin the base with `git rev-parse HEAD` and place that SHA in every worker prompt under `BASE`.
3. Confirm that writable scopes are disjoint and establish dependency order. Assign one branch and one worktree to each worker.
4. Use readable `agent/<task>` names, such as `agent/auth-tests`. Restrict task identifiers to controlled letters, numbers, and hyphens; never interpolate untrusted input directly into paths or commands.
5. Before creating or removing a worktree, verify that its resolved absolute path is inside the intended dedicated worktree parent. Never target the repository root, main workspace, or an unresolved variable with recursive operations.

Example commands to run from the main repository after replacing and verifying every placeholder:

```powershell
git worktree add -b agent/auth-tests <absolute-worktree-path> <base-sha>
git -C <absolute-worktree-path> status --short
git -C <absolute-worktree-path> rev-parse HEAD
```

The generic Git form is `git worktree add -b agent/<task> <path> <base-sha>`. If the branch already exists, inspect its target and worktree usage before running `git worktree add <path> agent/<task>`. Never overwrite or reuse a worktree with unknown state.

## Worker Delivery

Workers modify only their assigned scope, preserve concurrent changes they observe, and do not resolve conflicts from other branches. Each worker runs focused validation, commits its task changes, and reports status, summary, files, validation results, commit SHA, and risks. Shared-workspace workers do not commit unless their prompt explicitly authorizes it.

## Coordinator Integration and Recovery

Integrate completed work in dependency order. Review every report, commit, and diff before accepting it. Check for missing files, partial implementation, out-of-scope changes, failed validation, and conflicts with the pinned base.

Cherry-pick approved commits individually, for example with `git cherry-pick <worker-commit>`, and run combined validation after integration. Only the coordinator resolves integration conflicts or assigns follow-up work.

If a worker result is missing, the process crashes, or a task times out, first verify that the resolved worktree path is still inside the expected dedicated parent. Then inspect the worktree in this order:

```powershell
git -C <absolute-worktree-path> status --short
git -C <absolute-worktree-path> diff
git -C <absolute-worktree-path> log --oneline -n 10
```

If the worktree contains valuable uncommitted changes, commits, or continuation evidence, preserve it and assign a continuation worker to the same path and scope. Do not overwrite it with an automatic retry. Retry at most once from the same pinned base only when no useful work exists. After another failure, let the coordinator finish the scope sequentially or report the blocker; never retry indefinitely.

## Preserve and Clean Up

Preserve failed or incomplete worktrees that contain useful work, and record their state and blocker for coordinator review or continuation. Clean up only after integration has been validated, commits are safely retained, and the worktree is no longer needed.

Verify the path and state again before cleanup:

```powershell
git -C <absolute-worktree-path> status --short
git worktree remove <absolute-worktree-path>
git worktree prune
```

If the worktree contains uncommitted changes, inspect and preserve or commit them as appropriate; do not use forced removal as routine cleanup. After cherry-picking, `git branch -d agent/<task>` may fail because Git does not consider the worker branch directly merged. Use `git branch -D agent/<task>` only after verifying the absolute path, confirming that the commit is safely integrated, ensuring no worktree uses the branch, and deciding that no further recovery value remains. Otherwise preserve the branch for traceability.
