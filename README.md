# task-arrangement

## 中文

### 项目简介

`task-arrangement` 是一个 Codex skill, 用于在需要修改项目代码时强制采用 subagent 协作模式。它的目标不是直接提供业务逻辑, 而是约束执行方式: 主 agent 负责分析、规划、委派、集成审查和最终回复, 实际代码修改与自检由 subagent 完成。

当前 agent 配置中的关键信息包括:

- `display_name`: `Task Arrangement`
- `short_description`: `Coordinate code changes through delegated subagents.`
- `default_prompt`: `Use $task-arrangement to coordinate a code modification with clearly delegated subagent work.`

### 适用场景

- 需要修改项目代码、测试、构建配置、迁移或实现相关文件。
- 变更跨多个模块, 需要拆分所有权并减少主 agent 直接改代码的风险。
- 需要把任务分成可并行或可顺序执行的子任务, 并要求每个子任务独立自检。
- 需要在最终交付前做集成审查, 确认多个修改结果兼容。

### 核心工作流

1. 主 agent 明确目标、验收标准和影响范围。
2. 主 agent 读取足够的代码和配置上下文, 决定需要变更的文件或模块。
3. 主 agent 按文件或模块边界拆分 subagent 任务, 尽量避免所有权重叠。
4. 每个 subagent 在自己的作用域内完成修改和自检, 不扩大范围, 不回滚他人改动。
5. 主 agent 复核 subagent 结果, 做集成检查, 必要时发起后续委派。
6. 只有在整体目标满足后, 主 agent 才向用户汇总结果。

### Subagent 模型配置

当前约定的 subagent 配置如下:

- `model`: `gpt-5.6-terra`
- `reasoning_effort`: `high`

该配置应应用于执行代码修改任务的 worker、explorer、verifier 及后续跟进 subagent, 除非有更高优先级指令覆盖。

### 目录结构

当前仓库的核心文件如下:

```text
task-arrangement/
|- README.md
|- SKILL.md
`- agents/
   `- openai.yaml
```

- `README.md`: 本说明文档。
- `SKILL.md`: skill 的行为规则与职责定义。
- `agents/openai.yaml`: 面向 agent 的展示名、简述和默认提示词配置。

### 使用方式

当你希望 Codex 通过委派 subagent 来协调代码修改时, 使用 `task-arrangement` skill。实践上应遵循以下原则:

1. 先让主 agent 完成范围分析和任务拆分。
2. 为每个 subagent 指定明确的文件或模块所有权。
3. 让 subagent 只在授权范围内修改并完成自检。
4. 由主 agent 统一做集成审查和最终回复。

如果任务只是单文件文档调整, 是否需要委派可结合当前仓库规则判断。但一旦进入项目代码修改流程, 应以 subagent 协调为默认路径。

### 维护注意事项

- 更新 `SKILL.md` 时, 同步检查 README 中的工作流、职责和模型配置描述。
- 更新 `agents/openai.yaml` 时, 同步检查 README 中的名称、简介和默认用途说明。
- 保持描述聚焦于协作机制, 不要虚构构建、测试或运行命令。
- 变更验证以文档审阅和配置一致性检查为主。

## English

### Overview

`task-arrangement` is a Codex skill that enforces subagent-based execution for project code changes. It does not provide product logic by itself. Its purpose is to define how work is carried out: the main agent handles analysis, planning, delegation, integration review, and the final reply, while subagents perform the actual code edits and focused self-checks.

Key values from the current agent configuration are:

- `display_name`: `Task Arrangement`
- `short_description`: `Coordinate code changes through delegated subagents.`
- `default_prompt`: `Use $task-arrangement to coordinate a code modification with clearly delegated subagent work.`

### When To Use It

- When Codex is asked to modify project code, tests, build configuration, migrations, or implementation-adjacent files.
- When a change spans multiple modules and needs explicit ownership boundaries.
- When work should be split into parallel or sequential sub-tasks with local verification.
- When final integration review is needed before reporting completion.

### Core Workflow

1. The main agent defines the goal, acceptance criteria, and affected scope.
2. The main agent reads enough repository context to identify the right files or modules.
3. The main agent splits the work into subagent tasks with clear, non-overlapping ownership where possible.
4. Each subagent edits only within its assigned scope, validates its own result, and avoids reverting other people's work.
5. The main agent reviews the delegated results, checks integration, and requests follow-up delegation if needed.
6. The main agent replies to the user only after the overall goal is satisfied.

### Subagent Model Configuration

The current subagent configuration is:

- `model`: `gpt-5.6-terra`
- `reasoning_effort`: `high`

This configuration should be used for workers, explorers, verifiers, and follow-up subagents involved in code modification tasks unless a higher-priority instruction overrides it.

### Repository Layout

The key files in this repository are:

```text
task-arrangement/
|- README.md
|- SKILL.md
`- agents/
   `- openai.yaml
```

- `README.md`: this document.
- `SKILL.md`: the operational rules and responsibility model for the skill.
- `agents/openai.yaml`: the display name, short description, and default prompt used by the agent configuration.

### Usage

Use the `task-arrangement` skill when you want Codex to coordinate code changes through delegated subagents. In practice:

1. Let the main agent analyze scope and split the work first.
2. Assign each subagent an explicit file or module boundary.
3. Keep each subagent inside its owned scope and require local self-checks.
4. Let the main agent perform the final integration review and user-facing summary.

For a small documentation-only edit, delegation may depend on the local repository rules. For actual project code changes, subagent coordination should be treated as the default path.

### Maintenance Notes

- If `SKILL.md` changes, re-check the README sections that describe workflow, responsibilities, and model settings.
- If `agents/openai.yaml` changes, re-check the README sections that describe naming, summary, and default usage.
- Keep the documentation focused on orchestration behavior rather than inventing build, test, or runtime commands.
- Validation for this repository is primarily a document review and a configuration consistency check.
