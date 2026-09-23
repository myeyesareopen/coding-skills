# task-arrangement

用最少交接协调代码任务：低风险局部修改由主代理直接完成；普通模块默认一个 Luna max 代理连贯定位、修改、自测；未知根因由 Sol medium 调查，共享契约或高影响边界由 Sol high 判断；复杂功能升级、跨服务和新项目规划，以及复杂推理，由 Astra high 完成。多个独立实施模块按所有权并行，主代理检查方案、实际 diff 和验收证据。

当前保留 Luna max 默认，优先优化流程。不例行增加独立评审或重复已通过的检查。

工具输出采用短结果直接返回、长日志按任务落盘的方式；聊天保留真实退出码、检查摘要和关键错误，失败时定向补读。重要阶段保留简短恢复状态，避免重复整文件、旧日志和交接上下文。日志仅按已定义保留期清理已结束且已验收任务，不删除聊天记录或自动创建定时任务。实际耗时与 token 收益需从后续任务测量。

- [SKILL.md](SKILL.md)：默认路由、并发、验证和等待规则。
- [角色任务单](references/codex-worker.md)：简短任务与交付格式。
- [路由与验收](references/routing-and-acceptance.md)：场景和验证边界。
- [工作区与恢复](references/workspaces.md)：隔离、已有修改及失败产出保护。
- [路由器评估](references/router-evaluation.md)：Jev 与动态模型/推理等级的评估边界，尚未启用外部服务。

安装时将 SKILL.md、agents、references（可含 README）复制到 Codex skills/task-arrangement，不复制 .git。

修改文档时检查技能格式、链接和规则一致性。
