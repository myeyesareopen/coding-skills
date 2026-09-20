---
name: task-arrangement
description: Coordinate broad code changes with explicit ownership, dependency-aware task tiers, bounded DeepSeek implementation through the bundled dsh harness, and Codex workers for more complex tasks. Use for multi-module changes or requested delegation; keep small low-risk edits and quick reviews with the main agent.
---

# Task Arrangement

主代理负责需求理解、架构与契约决策、任务分层、集成验收和用户沟通。DeepSeek 负责已确定方案中的受限实施；较复杂任务使用 Codex 的较低级别模型。只有预期独立进展或风险降低足以覆盖交接与验收成本时才委派。向用户用中文汇报。

本 skill 自带 DeepSeek runner，不依赖单独安装的 deepseek-executor skill。两种执行通道由同一个主代理协调，不让执行者递归派发任务。

## 分层与路由

| 层级 | 判断依据 | 执行方式 |
|---|---|---|
| 主代理直接处理 | 小型、低风险、紧密耦合修改；快速只读检查；需求、架构和关键契约决策；最终集成 | 当前主代理 |
| DeepSeek 受限执行 | 主代理已确定方案和契约、相关上下文可明确列出、可写范围独立、结果有定向验收；局部实现、修复、重构及其定向核对/自测 | 本 skill 的 scripts/dispatch.mjs |
| Codex 较复杂执行 | 需要跨模块推理、未知根因调查、复杂算法、状态/并发/事务逻辑、迁移或安全敏感实现；独立风险验收 | native subagent，优先 gpt-5.6-sol |

DeepSeek 保留原执行技能的任务边界：主代理先给出可实施方案，执行者不能自行决定需求、重新设计系统、选择架构或接管关键集成。不要把未完成的设计问题以“实现模块”的名称交给 DeepSeek，也不要因 Codex 忙或不可用而将复杂任务降级给 DeepSeek。

多文件不一定复杂，单文件也可能包含高风险状态机。按未决问题和失败影响判断，不能仅按行数、文件数或模型价格分类。复杂状态、迁移或路由边界不明确时先读 [路由与验收](references/routing-and-acceptance.md)。

### DeepSeek 固定通道

- @deepseek-ai/dsh 0.1.5-rc.2，SDK stdio JSON-RPC，sdk-minimal；保持现有 harness 调用方式。
- provider=deepseek-official，model=deepseek-flash（DeepSeek-V4.1-Flash），reasoningEffort=max，maxTokens=393216。
- 不通过 native spawn_agent 冒充 DeepSeek，不改为网页、HTTP/WebSocket、其他 CLI，不自动安装/升级或静默切换模型参数。384K 是单次输出上限，不是输出目标或总任务额度。
- 派发前读 [DeepSeek 调用协议](references/deepseek-dispatch.md)，填写任务单，依次执行 validate、run，检查实际终态。
- foregroundOnly=true；禁止子代理、dsh 递归和遗留后台服务。真实数据库迁移、外部模型联调及持久服务由主代理管理。

### Codex 通道

- 使用当前运行环境实际提供的 native subagent 工具。优先 model="gpt-5.6-sol"，fork_turns="none"。
- Explorer 和常规执行使用 medium；较复杂实现、并发/事务、安全或迁移验收使用 high。默认不升级为更高级别模型。
- 调用前确认该模型及强度可用；不可用时由主代理缩小范围、接手或说明限制，不猜模型名、不静默降给 DeepSeek。
- 不复制整段对话。读取并填写 [Codex 角色任务单](references/codex-worker.md)，只传最小充分上下文。除非用户明确要求新任务，否则使用 subagent，不创建用户侧新任务。

## 派发前准备

1. 阅读项目指令与必要实现，明确目标、当前状态、验收条件和需要保留的已有修改。
2. 标出依赖、共享契约与资源：公共类型、API、schema、迁移、锁文件、生成输出、测试缓存、端口和数据库。先串行确定共享契约，再并行实施独立范围。
3. 为每个任务指定一个所有者、路由理由、只读/可写/禁止范围、实施方案及可执行检查。任务需要未提交的前置成果时，明确其基线或补丁；不能假定新 worktree 已包含它们。
4. 涉及状态、幂等、异步完成、迁移或安全边界时，先确定必须成立的规则和失败场景。没有确定处理策略时由主代理设计，不让执行者自行猜测。
5. 按 [工作区与恢复](references/workspaces.md) 选择共享工作区或隔离 worktree。主代理也不能在执行者持有的范围内并发写入。

不要按文件数机械拆小，也不要让每个模块默认跑 explorer、worker、verifier 三套流程。只有较大探索或独立验收能减少实质风险时才增加对应角色。

## 两种通道共用容量与所有权

- 活跃的 DeepSeek 执行者和 Codex subagent 合计不超过20；平台提供更小上限时服从该上限。20是上限，不是启动目标。
- runner 自动管理 DeepSeek 槽位；创建 Codex subagent 前，用同一 runner 的 aux <coordinatorId> <数量> 预留本主代理所有仍在执行的 Codex subagent 名额。结束后更新数量，全部结束时显式 aux <coordinatorId> 0。
- 名额预留不是文件锁。主代理维护跨 DeepSeek/Codex 的所有权清单，检查写写、写读和共享资源冲突；runner 不会自动检测 native agent 的文件范围。
- 仅并发执行无依赖、范围互不冲突、资源足够的任务。依赖任务放到下一批，前一批经主代理验收并进入所需工作区后再开始。
- 容量暂满时等待、复用空闲 agent 或排队；不要丢弃任务或绕开容量检查。所有 worker 禁止再次派发子代理。

## 验收、恢复和交付

- 执行者比较实现与验收条件，报告实际检查和未验证项。DeepSeek 使用 runner 的 JSON 格式；Codex 使用角色任务单报告。接收回执、idle 或 worker 自报 done 均不代表已验收。
- 主代理检查实际 diff、范围、契约和结果，按风险运行独立的定向/集成验证。必需检查失败、未验证关键条件或存在阻断项时，不能宣布完成。
- 主代理开始补修前，保留执行者交付补丁和检查证据；以派发时基线区分执行者修改、用户原有修改与主代理返工。不要将后续修复计作执行者原始成绩。
- 超时、进程退出或结果丢失时先确认旧进程停止，检查 status/diff/log 并保留有效产出。needs_decision 先由主代理处理；只有用户意图确实缺失时再向用户询问。
- 同一未解决失败最多进行一次有明确新依据的自动重试，不重复付费碰运气。已有有用修改时优先保留并安排有具体缺口的接续任务；不同问题的定向修复不能伪装成无限循环。
- 最终汇报变更、路由、验证、未完成项和风险；有数据时记录耗时、重试、tokens及主代理返工。缓存输入与推理输出不重复计数，不用小样本宣称普遍能力提升。
