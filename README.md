# task-arrangement

用最少交接协调代码任务：低风险局部修改由主代理直接完成；普通模块默认一个 Luna max 代理连贯定位、修改、自测；需要 Sol 调查的任务可在已授权范围内继续修复；复杂核心使用 Astra high。多个独立模块按所有权并行，主代理检查实际 diff 和验收证据。

当前保留 Luna max 默认，优先优化流程。纯 native 不调用 DeepSeek runner 的 aux/doctor，不例行增加独立评审或重复已通过的检查。只有用户明确要求 DeepSeek 时才使用保留的安装、配置、后台运行及 Luna 回退流程。

- [SKILL.md](SKILL.md)：默认路由、并发、验证和等待规则。
- [角色任务单](references/codex-worker.md)：简短任务与交付格式。
- [路由与验收](references/routing-and-acceptance.md)：场景和验证边界。
- [工作区与恢复](references/workspaces.md)：隔离、已有修改及失败产出保护。
- [路由器评估](references/router-evaluation.md)：Jev 与动态模型/推理等级的评估边界，尚未启用外部服务。
- [DeepSeek 协议](references/deepseek-dispatch.md) / [初始化与回退](references/deepseek-bootstrap.md)：仅显式选择 DeepSeek 时读取。

安装时将 SKILL.md、agents、references、scripts（可含 README）复制到 Codex skills/task-arrangement，不复制 .git。保留已有 legacy 状态，不能为提速删除未知锁或其他任务的槽位。

legacy runner 修改时可运行 `node --test scripts/dispatch.test.mjs`；`node scripts/dispatch.mjs doctor` 只用于检查明确选择的 DeepSeek 环境。仅修改文档时检查技能格式、链接和规则一致性即可。
