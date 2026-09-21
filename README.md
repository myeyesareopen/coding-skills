# task-arrangement

协调 Codex 与 DeepSeek 的项目代码工作。主代理负责设计、任务分解与最终集成；仅一处无需调查/设计的明显修正可直接完成。方案、范围和验收明确的代码实施必须实际调用 DeepSeek harness；调查和评审默认显式使用 gpt-5.6-sol medium/high，仅有具体复杂推理需求时使用 gpt-6-astra high。调查结束后重新路由实施，不能直接让 subagent 顺手改代码；跳过 harness 的实际阻断和升级 astra 的理由需要记录。

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

Coordinate code work through one policy layer: the main agent owns decisions and integration; bounded implementation must run through the bundled DeepSeek dsh harness. Explicitly default native investigation and review to gpt-5.6-sol; reserve gpt-6-astra for identified complex reasoning. Re-route implementation after investigation instead of letting a native explorer keep writing. Allow only trivial direct edits, inseparable complex core implementation, or evidenced harness failures as exceptions. Preserve the fixed DeepSeek protocol and parameters. See SKILL.md for routing, ownership, capacity and acceptance rules.
