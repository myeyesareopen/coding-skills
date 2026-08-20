# task-arrangement

## 中文

`task-arrangement` 是协调广泛代码变更的**策略层**，而非 agent 运行时。它帮助主 agent 判断何时直接完成工作、何时委派，以及如何安全地整合结果。

- 小型、低风险、单文件以及只读审查任务由主 agent 直接处理；跨服务、跨模块或跨独立可写范围的变更，或用户明确要求时，使用委派。
- 主 agent 负责范围分析、依赖与共享契约识别、任务拆分、用户沟通，以及最终集成、验证、失败恢复和清理。
- 默认角色是 main 与一个拥有明确范围的 worker；仅在发现工作量大或独立验证能显著降低风险时，增加 explorer 或 verifier。
- 按角色所需能力选择模型与推理强度，并在首选能力不可用时降级到可用选项；不依赖某个固定模型默认值。
- 共享工作区适合以阅读为主的工作，或隔离后的小型、低风险写入。先检测依赖、共享契约和潜在冲突；共享契约必须串行稳定，worktree 不能消除逻辑冲突。仅当非平凡、写入密集的任务可安全并行时，才使用隔离 worktree。

权威流程见 [SKILL.md](./SKILL.md)。可复用的角色提示与隔离策略：

- [worker prompt](./references/worker-prompt.md)
- [explorer prompt](./references/explorer-prompt.md)
- [verifier prompt](./references/verifier-prompt.md)
- [worktree policy](./references/worktree-policy.md)

## English

`task-arrangement` is a **policy layer** for coordinating broad code changes, not an agent runtime. It helps the main agent decide when to work directly, when to delegate, and how to integrate results safely.

- The main agent handles small, low-risk, single-file, and read-only review work directly; delegate work that spans services, modules, or independent writable scopes, or when the user explicitly asks for delegation.
- The main agent owns scope analysis, dependency and shared-contract detection, decomposition, user communication, and final integration, validation, recovery, and cleanup.
- Use a main agent and one clearly scoped worker by default; add an explorer only for substantial discovery and a verifier only when independent validation materially reduces risk.
- Route models and reasoning effort by role capability, with an available fallback when the preferred capability is unavailable; do not depend on a fixed model default.
- Use a shared workspace for read-heavy work or small, low-risk writes that are isolated. Detect dependencies, shared contracts, and potential conflicts first; stabilize shared contracts sequentially, since worktrees do not remove logical conflicts. Use isolated worktrees only for non-trivial, write-heavy tasks that can safely run in parallel.

The authoritative workflow is in [SKILL.md](./SKILL.md). Reusable role prompts and the isolation policy:

- [worker prompt](./references/worker-prompt.md)
- [explorer prompt](./references/explorer-prompt.md)
- [verifier prompt](./references/verifier-prompt.md)
- [worktree policy](./references/worktree-policy.md)
