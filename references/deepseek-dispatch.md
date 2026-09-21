# 任务单与真实调用

用于已按 SKILL.md 确定方案、范围和验收的默认实施任务；必须真实运行 harness，不能用 native subagent 代替后仍称为 DeepSeek 执行。不能把未完成设计的复杂任务装入此任务单来绕过分层。

## 每批调用流程与故障分流

1. 本轮首次进入 DeepSeek 通道先执行 doctor，确认本机 Node、固定 dsh 包和版本；环境发生变化后重新检查。doctor 只验证运行入口，不代表凭据或模型调用已成功。
2. 主代理将已确定方案写成实际 JSON 文件。即使只有一个任务，也填写 concurrency=1 并运行；不能因为没有可并行任务就改派 native worker。
3. 对这个文件执行 validate；成功后对同一个文件执行 run。validate 失败时先按实际错误修正字段、路径或分批安排，不因任务单错误宣布 harness 不可用。
4. run 返回 exec session ID 时继续等待同一进程并按需汇报；正常等待、暂无输出、槽位忙均不是切换 subagent 的依据。读取本次 summary.json、各任务 result.json、实际 diff 和检查证据后才判定结果。
5. 只有安装/凭据/进程/服务等实际阻断本轮无法恢复，或一次有新依据的恢复后仍失败，才说明命令、脱敏错误、已采取的恢复和剩余范围，并按 SKILL.md 转交 sol/复杂核心 astra。不能为了满足形式重复付费调用；不自动安装、改凭据、换 provider 或模型。
6. needs_decision 先补足主代理决策，notStarted 先检查容量/所有权；均不自动转交 Codex 实施。任务本身出现新的复杂判断时，先由 sol/astra 调查，方案明确后再次路由 DeepSeek。转交前确认旧进程停止并保留有效修改；恢复正常后的新实施任务回到 harness。

派发记录中保留任务单路径、实际 run 调用、运行目录、终态与主代理验收结论；仅有 doctor/validate 或 submitted 回执不能计为完成了一次 DeepSeek 实施。无适用实施任务时不为增加调用数而启动模型。

## 入口

本机 Node 已验证位置为 `F:/nodejs/node.exe`。如果不存在，用现有 Node 绝对路径；不要为此自动安装依赖。下例路径指安装后 skill：

```powershell
& 'F:/nodejs/node.exe' 'C:/Users/Administrator/.codex/skills/task-arrangement/scripts/dispatch.mjs' doctor
& 'F:/nodejs/node.exe' 'C:/Users/Administrator/.codex/skills/task-arrangement/scripts/dispatch.mjs' validate 'C:/project/work/batch.json'
& 'F:/nodejs/node.exe' 'C:/Users/Administrator/.codex/skills/task-arrangement/scripts/dispatch.mjs' run 'C:/project/work/batch.json'
& 'F:/nodejs/node.exe' 'C:/Users/Administrator/.codex/skills/task-arrangement/scripts/dispatch.mjs' slots
```

有 native Codex 代理时（包括实施、探索和验收），主代理选一个稳定且独占的 coordinatorId（可用当前任务 ID），在创建它们之前执行 `dispatch.mjs aux <coordinatorId> <数量>`。之后各批填写这个 ID 与数量。代理全部结束后执行 `dispatch.mjs aux <coordinatorId> 0`；部分结束可减少数量。预留是独立共享记录，不随批次/runner/DeepSeek 进程退出自动释放。不允许两个主代理共用同一 coordinatorId。没有 native 代理时不需要该字段或预留。预留只计算容量，不登记 native 代理的文件范围，跨通道所有权由主代理核对。

runner 保留 `$CODEX_HOME/deepseek-executor-state`（未配置 CODEX_HOME 时为 `~/.codex/deepseek-executor-state`）以兼容现有槽位与锁。这是运行状态目录，不依赖旧 skill 的安装目录；卸载旧 skill 不应清除它。

跨机器时替换 skill 的实际安装根目录。通过 exec 的 session ID 等待脚本完成；不要以启动脚本、收到 submitted 或暂时无输出当作任务完成。每个任务都有精简 result.json，批次汇总 summary.json；stderr.log 已脱敏当前 API key。脚本不导出模型隐藏推理文本，runtime-home 为 dsh 自身的隔离状态，应留在本地工作目录而非提交或分享。

脚本只查找已安装的 @deepseek-ai/dsh 0.1.5-rc.2，优先尊重环境变量 DSH_PACKAGE_ROOT（包目录，不是 bin.js），否则搜索本机 npm 全局目录和 npm `_npx` 缓存。版本不符时停止，不自动升级或安装。凭据优先用环境变量 DEEPSEEK_API_KEY，否则读取用户 `.dsh/.credentials.yaml` 的 `refs.DEEPSEEK_API_KEY`。凭据不进入任务单；隔离 DSH_HOME 不改动已有 Web 会话配置。

## JSON 格式

以下是格式示例；实际任务必须写入完整项目上下文和可直接执行的方案。相对路径从 task.cwd 解析，允许文件或目录，不接受 glob。readPaths 写实际所需读取范围，writePaths 内的文件允许读写。

```json
{
  "concurrency": 2,
  "auxiliaryAgents": 0,
  "parallelRationale": "分页工具和邮件模板无接口依赖、读写范围独立，测试不共享可变资源，同时执行可缩短等待。",
  "outputDir": "C:/Users/Administrator/.codex/task-arrangement-runs/batch-001",
  "tasks": [
    {
      "id": "pagination",
      "cwd": "C:/project",
      "readPaths": ["package.json", "src/errors.ts", "tests/pagination.test.ts"],
      "writePaths": ["src/pagination.ts"],
      "exclusiveResources": ["project:pagination-test-cache"],
      "projectContext": "TypeScript 项目，npm；已读取 AGENTS.md，其中要求保留公开签名、不增加依赖。ValidationError 位于 src/errors.ts，字段名应与错误参数对应。当前工作树的其他改动不属于此任务。",
      "instructions": "修复 parsePagination：仅 undefined 使用默认 page=1/pageSize=20；接受正安全整数 number 或非空 ASCII 纯数字字符串；pageSize 超过100时抛错，不截断；安全检查 offset；保持输入对象不变，只修改指定文件。",
      "acceptance": ["非法输入抛相应 ValidationError", "保留签名与返回形状", "指定测试通过"],
      "checks": ["npm test -- --run tests/pagination.test.ts"],
      "foregroundOnly": true,
      "timeoutMs": 1200000
    },
    {
      "id": "mail-template",
      "cwd": "C:/project",
      "readPaths": ["package.json", "tests/mail-template.test.ts"],
      "writePaths": ["src/mail-template.ts"],
      "exclusiveResources": ["project:mail-test-cache"],
      "projectContext": "同一 TypeScript 项目，模板函数不依赖分页工具。遵守已读取的 AGENTS.md：保留公开签名、不增加依赖。",
      "instructions": "在现有邮件模板中对用户昵称做 HTML 转义，按项目既有编码风格处理 & < > 双引号和单引号，不改其他模板结构。",
      "acceptance": ["五种字符正确转义", "原有普通昵称输出保持一致"],
      "checks": ["npm test -- --run tests/mail-template.test.ts"],
      "foregroundOnly": true,
      "timeoutMs": 1200000
    }
  ]
}
```

- outputDir 必须是尚不存在的新绝对目录，不能与任何可写范围相交；防止重新派发覆盖旧结果。父目录可以存在。放在项目测试/构建清理范围之外，避免 test-results、playwright-report、.next、dist、build 等清理操作删除会话结果；runner 只检查路径与可写范围，不识别项目清理逻辑，主代理须确认。
- concurrency 显式填写 1–20，超过1必须给 parallelRationale。auxiliaryAgents 填本主代理仍在运行的辅助代理数，两者相加不得超过20；大于0时 coordinatorId 必填。runner 会同步预留，且计算所有主代理的预留总和。填写0不会自动清除过去的预留；必须确认辅助代理结束后显式 aux 释放。
- 同批 concurrency>1 时，任何写写、写读或 exclusiveResources 冲突都会拒绝启动。语义耦合仍由主代理判断；把共享锁文件/接口/数据库/端口登记为统一资源标识。资源名不应为了绕过检查而随意不同。
- foregroundOnly 必须为 true；执行者和验证命令不得遗留后台进程，需要持久服务的验证由主代理另行管理。runner 正常结束只观察 dsh 进程退出，不是 OS 级进程树隔离。
- projectContext、instructions、acceptance 必填；checks 可为空，但应说明没有可用检查的原因。readPaths、writePaths 均必填数组，纯只读任务的 writePaths 可为空。
- 不支持 model/provider/reasoningEffort/maxTokens/profile 覆盖；这是用户固定约定。若用户今后明确变更偏好，应更新 skill 与脚本再验证。
- 依赖前一任务的任务不得混入本批（非空 dependsOn 会拒绝）。主代理验收/集成前置结果后发下一批；本批为独立工作或已明确可串行执行的任务。
- 超时默认20分钟，允许1秒至2小时；按任务预计工作量设定，不因等待自动重跑。30秒内无法获得槽位/所有权时，本批未启动任务会作为 notStarted 返回，先检查占用再安排后续。

## 实际协议与终态

runner 启动：`node <dsh包>/lib/bin.js --profile sdk-minimal`，cwd 为 task.cwd。

1. `initialize`：cwd、provider=deepseek-official、model=deepseek-flash、reasoningEffort=max、maxTokens=393216。
2. `session/prompt`：唯一 sessionId 和 text contentBlocks。回执仅是 messageId。
3. 等待 running、`turn/end`、idle，检查 reason.kind 是否 completed，并解析最终 JSON。
4. `shutdown`，确认退出后才释放槽位；超时或异常终止进程树，不确定是否终止则保留槽位供检查。

`done` 表示 worker 报告完成，仍须主代理审查实际修改并独立验收；`needs_decision` 是前提/范围冲突；`failed` 是运行或任务失败；`incomplete` 包括 max-tokens、缺失结束事件或无效最终 JSON。任何非 done 结果停止启动本批剩余任务，已运行任务完成后保留结果。

runner 检查终态和报告格式，不证明验收语义成立。主代理核对 acceptance、必需 checks 的实际结果、越界修改及 blockers；不得因 status=done 就忽略失败或未运行的必需检查。

usage.inputTokens 为未缓存输入，cacheReadTokens 为缓存输入；两者相加才是全部输入。reasoningTokens 已包含在 outputTokens。只用实际 usage 计量，不以输出上限估算账单。
