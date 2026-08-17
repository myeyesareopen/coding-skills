# task-arrangement

## 中文

`task-arrangement` 用于通过职责清晰的 subagent 协调广泛的项目代码变更。任务跨多个服务、模块或独立文件范围，或用户明确要求 subagent 时使用；小型、低风险、单文件任务继续由主 agent 直接完成。

默认 subagent 配置：

- `model`: `gpt-5.6-terra`
- `fork_turns`: `"none"`
- `reasoning_effort`: explorer、verifier 和常规 worker 使用 `medium`
- `reasoning_effort`: 仅复杂实现 worker 使用 `high`

默认由一个 worker 完成所属范围的检查、实现和自验。只有任务风险或复杂度确实需要时，才额外创建 explorer 或 verifier；委派提示只包含最小充分上下文。完整且权威的执行规则见 [SKILL.md](./SKILL.md)。

## English

`task-arrangement` coordinates broad project code changes through subagents with explicit ownership. Use it when work spans multiple services, modules, or independent file scopes, or when the user specifically requests subagent delegation. Keep small, low-risk, single-file work with the main agent.

Default subagent configuration:

- `model`: `gpt-5.6-terra`
- `fork_turns`: `"none"`
- `reasoning_effort`: `medium` for explorers, verifiers, and routine workers
- `reasoning_effort`: `high` only for complex implementation workers

Default to one worker that inspects, implements, and validates its owned scope. Add separate explorer or verifier roles only when risk or complexity justifies them, and provide only minimum sufficient context. See [SKILL.md](./SKILL.md) for the authoritative workflow.
