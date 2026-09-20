# task-arrangement

协调 Codex 与 DeepSeek 的项目代码工作。主代理负责设计、任务分解与最终集成；小型低风险修改直接完成；方案明确、范围受限的实现交给 DeepSeek；较复杂的实现和独立风险验收交给 Codex gpt-5.6-sol，复杂工作使用 high。

DeepSeek 仍通过随附 scripts/dispatch.mjs 调用本机 @deepseek-ai/dsh 0.1.5-rc.2：SDK stdio JSON-RPC、sdk-minimal、deepseek-flash、max、393216输出上限。无需单独安装 deepseek-executor skill，也不改变 dsh、凭据或本地 Web 会话配置。

权威规则见 [SKILL.md](SKILL.md)。按任务选择阅读：

- [路由与验收](references/routing-and-acceptance.md)：任务分层、状态边界、验收场景。
- [DeepSeek 调用协议](references/deepseek-dispatch.md)：固定配置、JSON任务单、运行与终态。
- [Codex 角色任务单](references/codex-worker.md)：实现、探索、独立验收。
- [工作区与恢复](references/workspaces.md)：基线、隔离、集成和失败产出保护。

两个通道共用20个活跃名额上限，并服从运行平台更低的上限。Codex名额需通过runner预留；跨通道的文件所有权仍由主代理检查。单次运行目录应独立于项目测试/构建清理目录。

本地验证（不调用付费模型）：

```powershell
node --test scripts/dispatch.test.mjs
node scripts/dispatch.mjs doctor
```

安装时将 SKILL.md、agents、references、scripts（可含本 README）复制到 Codex skills 目录下的 task-arrangement 文件夹，不复制 .git。runner保留历史 deepseek-executor-state 状态目录，以兼容共享槽位；这不依赖旧skill文件夹，也不应随旧skill卸载而清理。

## English

Coordinate code work through one policy layer: the main agent owns decisions and integration, bounded implementation uses the bundled DeepSeek dsh harness, and more complex implementation or verification uses Codex gpt-5.6-sol. Keep narrow low-risk work local. Preserve the fixed DeepSeek protocol and parameters; do not silently route complex work down to DeepSeek or upgrade the Codex model. See SKILL.md for routing, ownership, capacity and acceptance rules.
