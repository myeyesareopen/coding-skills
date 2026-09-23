# task-arrangement

[中文](#中文) · [English](#english)

## 中文

`task-arrangement` 是一个 Codex skill，用任务范围和风险决定由谁负责规划、调查与实施。它优先减少交接，同时保留可核对的改动和验收证据。

### 模型分工

| 任务 | 负责人 | 主要交付 |
|---|---|---|
| 范围明确、低风险且容易验证的局部修改 | 主代理直接处理 | 修改和定向检查结果 |
| 边界明确的单模块常规功能或修复 | `gpt-6-luna` · `max` | 定位、实施、自测 |
| 根因未知，需要独立调查 | `gpt-6-sol` · `medium` | 根因证据、影响范围、修复依据 |
| 共享接口、迁移、认证、安全或并发边界需要判断失败影响 | `gpt-6-sol` · `high` | 契约、失败场景、针对性验证 |
| 复杂功能升级、跨服务或新项目规划；难算法、协议或相互制约的一致性问题 | `gpt-6-astra` · `high` | 完整规划或复杂核心方案 |

Astra 负责的规划应明确目标与范围、架构和服务职责、共享契约、实施阶段与依赖、关键风险及验收方式；迁移、发布和回退按任务需要纳入。规划确定后，再按模块和风险分配实施。

### 工作原则

- 主代理确认需求、分配文件与共享资源的所有权，并核对方案、实际 diff 和验收证据。
- 多个独立模块可并行推进；先确定共享契约，再为每个模块指定一个所有者。
- Sol 查清问题后，如原任务已授权范围内的修复，可继续实施和自测，减少重复交接。
- 普通任务不例行增加独立评审，也不重复运行同一代码状态下已通过的检查。长日志按任务保存，并保留真实退出码和关键错误。
- Skill 只能为新建或可配置的执行者选择模型，不能切换当前主代理的模型。用户指定的模型与推理强度优先。

### 使用与安装

在任务中使用 `$task-arrangement`，并说明目标、范围与验收条件。将仓库中的 `SKILL.md`、`agents/` 和 `references/` 放入 `~/.codex/skills/task-arrangement/`；`README.md` 可一并保留。修改 skill 后检查格式、文档链接和规则一致性。

### 文档索引

- [SKILL.md](SKILL.md)：分工规则、派发、并发与验收。
- [角色任务单](references/codex-worker.md)：实施、调查、规划与评审的交付格式。
- [路由与验收](references/routing-and-acceptance.md)：典型场景和验证边界。
- [工作区与恢复](references/workspaces.md)：所有权、隔离和失败结果保护。
- [路由器评估](references/router-evaluation.md)：可选的动态路由评估；当前未启用外部路由服务。

---

## English

`task-arrangement` is a Codex skill that assigns planning, investigation, and implementation by task scope and risk. It aims to reduce handoffs while keeping changes and acceptance evidence reviewable.

### Model roles

| Task | Owner | Main deliverable |
|---|---|---|
| Bounded, low-risk edit with a clear check | Primary agent | Change and focused check result |
| Routine feature or fix within one well-defined module | `gpt-6-luna` · `max` | Investigation, implementation, focused checks |
| Unknown root cause requiring independent investigation | `gpt-6-sol` · `medium` | Evidence, impact scope, basis for a fix |
| Shared interfaces, migration, authentication, security, or concurrency boundaries with meaningful failure impact | `gpt-6-sol` · `high` | Contract, failure cases, targeted verification |
| Complex feature-upgrade, cross-service, or new-project planning; difficult algorithms, protocols, or coupled consistency constraints | `gpt-6-astra` · `high` | Complete plan or complex core solution |

An Astra planning deliverable should cover goals and scope, architecture and service responsibilities, shared contracts, phases and dependencies, key risks, and acceptance criteria. Include migration, release, and rollback when relevant. Once the plan is settled, assign implementation by module and risk.

### Working principles

- The primary agent confirms requirements, assigns file and shared-resource ownership, and reviews the plan, actual diff, and acceptance evidence.
- Independent modules may proceed in parallel after shared contracts are defined, with one owner per module.
- A Sol agent may continue into a fix and focused checks when the original task already authorizes that scope.
- Routine work does not require a separate review agent or a rerun of checks that passed on the same code state. Save long logs per task and preserve actual exit codes and key errors.
- This skill selects models only for new or configurable agents; it cannot switch the current primary agent's model. User-specified model and reasoning settings take precedence.

### Use and installation

Invoke `$task-arrangement` in a task and provide the goal, scope, and acceptance criteria. Place `SKILL.md`, `agents/`, and `references/` from this repository in `~/.codex/skills/task-arrangement/`; you may keep `README.md` there too. After editing the skill, check its format, documentation links, and rule consistency.

### Documentation

- [SKILL.md](SKILL.md): Routing, dispatch, concurrency, and acceptance rules.
- [Worker roles](references/codex-worker.md): Deliverables for implementation, investigation, planning, and review.
- [Routing and acceptance](references/routing-and-acceptance.md): Example tasks and verification boundaries.
- [Workspaces and recovery](references/workspaces.md): Ownership, isolation, and protection of partial results.
- [Router evaluation](references/router-evaluation.md): Optional dynamic routing evaluation; no external routing service is enabled by default.
