# Worktree 协调运行手册

Worktree 是隔离并行写入的工具，不是每个子任务的默认成本。协调者负责拆分、集成和清理；工作者只在自己获分配的 worktree 和范围内工作。

## 何时使用

适合使用独立 worktree：多个工作者将并行修改互不重叠的文件范围；任务持续时间较长；或需要将提交隔离以便按依赖顺序集成。

不要为只读勘查、验证、很小的单文件低风险改动，或必须直接基于另一项尚未完成改动的任务创建 worktree。共享工作区模式下必须串行安排重叠写入，并明示不得提交（除非协调者授权）。

## 创建前的保护

1. 在主工作区检查状态：`git status --short`。脏工作区中的改动属于既有工作，不得还原、暂存或混入。
2. 固定一个可读 SHA：`git rev-parse HEAD`；将该 SHA 写入每个任务提示词的 `BASE`。
3. 确认任务范围互不重叠，确定依赖顺序；一个工作者只拥有一个分支和一个 worktree。
4. 为名称使用可读、安全的 `agent/<task>` 格式，例如 `agent/auth-tests`。任务标识仅使用受控的字母、数字和连字符，避免把不可信输入直接拼入路径或命令。
5. 在创建或删除前人工核对绝对路径位于预期的专用 worktree 父目录；不要对仓库根目录、主工作区或未解析的变量执行递归操作。

示例（在主仓库执行；先替换并核对占位符）：

```powershell
git worktree add -b agent/auth-tests <absolute-worktree-path> <base-sha>
git -C <absolute-worktree-path> status --short
git -C <absolute-worktree-path> rev-parse HEAD
```

等价的通用 Git 形式为 `git worktree add -b agent/<task> <path> <base-sha>`。若分支已存在，先检查其指向和占用情况，再使用 `git worktree add <path> agent/<task>`；不要覆盖或复用未知状态的 worktree。

## 工作者交付

工作者仅在自己的 worktree 中修改获分配范围，保留观察到的并发改动，不处理其他分支的冲突。完成后运行要求的验证、提交本任务变更，并交付：状态、摘要、文件、验证结果、提交 SHA 与风险。共享工作区工作者不提交，除非任务提示词另有明确授权。

## 协调者集成

协调者按依赖顺序处理完成结果：先检查报告、提交和差异，再集成。不要仅因工作者报告完成就假定结果完整；检查缺失文件、部分实现、越界修改、失败验证和与基线的冲突。

在目标分支上逐个集成并验证，例如 `git cherry-pick <worker-commit>`，然后运行组合验证。只有协调者解决集成冲突或安排后续工作。

若工作者结果缺失、进程崩溃或超时，先人工核对该工作者的绝对 worktree 路径仍位于预期的专用父目录，再在该 worktree 中按以下顺序检查：

```powershell
git -C <absolute-worktree-path> status --short
git -C <absolute-worktree-path> diff
git -C <absolute-worktree-path> log --oneline -n 10
```

若检查到有价值的未提交改动、提交或可继续的线索，保留该 worktree，并将相同路径和现状交给 continuation worker 继续；不要自动重试覆盖它。只有确认结果无价值时，才可基于同一固定基线最多自动重试一次。重试再次失败后，改由协调者在主工作区或顺序流程中处理，并报告原因；不要无限重试。

## 保留与清理

失败或未完成但仍有价值的 worktree 应保留，附上状态和阻塞原因，供协调者审查或恢复。仅在集成已验证、提交已保留且 worktree 不再需要时清理。

清理前再次核对路径与状态：

```powershell
git -C <absolute-worktree-path> status --short
git worktree remove <absolute-worktree-path>
git worktree prune
```

如果 worktree 有未提交改动，先检查并决定保留或提交；不要使用强制删除作为例行清理。若通过 `cherry-pick` 集成，原工作者分支通常仍会存在，且 `git branch -d agent/<task>` 可能因该分支并未被目标分支直接 merge 而失败。只有再次核对绝对路径、确认提交已安全集成、分支不再被任何 worktree 使用且无需保留时，才可考虑 `git branch -D agent/<task>`。必要时保留分支作为可追溯记录。
