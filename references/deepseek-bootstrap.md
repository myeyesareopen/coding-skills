# DeepSeek 初始化与 Luna 回退

主代理负责安装、凭据配置和后台进程；实施者不处理这些环境决策。本流程供首次使用或环境故障时执行。正常可用的环境直接复用，不重复安装或新增常驻服务。

## 1. 检查并安装

先执行 `node <skill>/scripts/dispatch.mjs doctor`。doctor 只确认 Node、固定 dsh 包和入口，不验证 API key 或模型可用性。无常驻 dsh 进程是正常状态：runner 按任务创建 SDK stdio 子进程。

缺少 `@deepseek-ai/dsh@0.1.5-rc.2` 时，由主代理使用 npm 安装该固定版本，优先选择用户本地独立工具目录，避免覆盖其他版本或修改业务项目依赖。例如 Windows：

```powershell
$harnessPrefix = Join-Path $env:LOCALAPPDATA 'codex-tools/deepseek-harness'
npm install --prefix $harnessPrefix --no-audit --no-fund '@deepseek-ai/dsh@0.1.5-rc.2'
if ($LASTEXITCODE -ne 0) { throw 'DeepSeek harness installation failed' }
$env:DSH_PACKAGE_ROOT = Join-Path $harnessPrefix 'node_modules/@deepseek-ai/dsh'
node '<skill>/scripts/dispatch.mjs' doctor
```

将 `<skill>` 替换为实际技能根目录。后续 doctor/validate/run 必须继承同一 `DSH_PACKAGE_ROOT`；分开的 shell 需要重新设置该非敏感路径。runner 本身不会自动安装包，初始化由主代理完成。已有包只是未被发现时，先修正路径，不重复下载。

若 Node/npm 缺失，先通过当前系统已配置且允许的包管理器安装 Node.js LTS，再安装固定 dsh；不执行未知来源的一键安装脚本。安装工具不可用、网络/权限阻断或安装失败时，记录具体结果并进入回退，不反复尝试相同命令。

## 2. 配置 API key

按 runner 的实际读取顺序配置：运行进程的 `DEEPSEEK_API_KEY` 环境变量优先，否则使用用户 `~/.dsh/.credentials.yaml` 中的 `refs.DEEPSEEK_API_KEY`。

- 优先复用已配置的有效 key；需要补配时，从用户提供的 key、指定的秘密存储或本机该项专用配置安全读取，并注入 runner 的进程环境。不要全盘搜索凭据。
- 不在聊天、命令参数、任务 JSON、日志或版本库中输出 key。若需持久化到 dsh 凭据文件，保留其他字段并限制为当前用户访问；已有有效 key 不覆盖，失效的优先环境变量应修正，避免遮蔽有效文件配置。
- 没有可用 key、无法安全读取/保存或认证失败且无法修复时，视为配置未成功，直接回退 Luna max 并说明缺失项；不要编造 key 或一直等待用户补充。

后台启动前必须确认 runner 子进程收到非空的 `DEEPSEEK_API_KEY`。若来源是凭据文件，先在主代理控制的启动进程中校验格式/访问权限、安全解析并设置进程环境，随后由该进程启动 runner；不能把明文 key 作为工具返回值再拼入下一个 shell 命令。捕获解析异常时只输出固定错误类别和文件路径，不打印异常原文、stack 或 YAML 源码片段。校验失败直接回退，不启动 runner。

现有 runner 在缺少环境变量时仍会自行解析凭据文件；此阶段的解析错误发生在任务日志脱敏之前，不能假设原始 stderr 已安全。上述启动前校验与环境注入用于避开这条未脱敏失败路径，不是脚本已具备自动脱敏的承诺。

## 3. 后台启动与就绪验证

安装和凭据准备完成后，为已经授权的实际实施任务填写 JSON，先 validate，再由主代理启动 `dispatch.mjs run <batch.json>`。使用执行工具提供的后台 session 并持续读取输出；Windows 若使用 `Start-Process`，必须加 `-WindowStyle Hidden`、`-PassThru`，记录 PID，凭据仅通过环境继承。不要为同一批任务重复启动 runner。

`batch.outputDir` 必须保持尚不存在，交由 runner 创建。启动器 stdout/stderr 重定向到已存在的父目录或单独的同级日志目录，绝不能写入 `outputDir` 或为重定向提前创建它。例如 `C:/project/work/harness-001/launcher/stdout.log` 和 `stderr.log` 可预先准备，其同级 `C:/project/work/harness-001/results` 作为 outputDir 保持不存在；runner 启动后才在 results 内生成任务结果与日志。

runner 管理 dsh 的 stdio 协议及生命周期，Windows 子进程已有 `windowsHide: true`。不要单独启动一个未连接 stdin/stdout 的 dsh 进程来充当服务。初始化 RPC 成功后才提交任务；仅有进程存活、doctor/validate 成功或 submitted 回执不证明模型认证及执行成功，仍需检查实际请求结果、`result.json`、`summary.json` 和任务验收。

后台运行是主代理管理方式，任务单仍保持 `foregroundOnly=true`，实施者不得自行创建脱离控制的后台服务。主代理等待同一 session/PID 完成；失败或超时先终止并确认旧进程退出，保留有效产出与脱敏错误，再移交文件所有权。

## 4. 配置失败后的固定回退

无法完成安装、配置 key、启动或认证，或原本可用的 harness 遇到不可恢复的环境故障时，将原 DeepSeek 的受限实施任务交给 native subagent：

```text
model="gpt-5.6-luna"
reasoning_effort="max"
fork_turns="none"
```

沿用 [Codex 实施任务单](codex-worker.md)，传入已确定方案、工作目录、基线、独占可写范围、验收和实际失败证据。Luna 替代 DeepSeek 的实施职责，不替代 sol 的调查/评审或 astra 的复杂推理。确认平台提供 Luna max；不可用时明确报告限制，不静默换模型或强度。

Luna 同样纳入共享容量。dsh/key 缺失不影响 `dispatch.mjs aux`，仍正常预留/释放名额。仅 Node/runner 本身不可用时，主代理读取共享状态目录和平台代理列表、确认已知进程占用，记录临时名额并最多串行运行一个 Luna；无法确认余量时先解决占用问题。保留未知或存活的槽位，不能删锁绕过上限。

任务单格式错误、范围冲突、无空闲槽位或正常等待不触发环境回退；先修正或排队。任务本身的测试失败也不能伪装成安装/配置失败。同一环境问题最多进行一次有新依据的恢复尝试，仍失败即回退；环境恢复后的新实施任务重新使用 DeepSeek，不中断正在执行的 Luna 任务。
