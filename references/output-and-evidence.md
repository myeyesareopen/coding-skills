# 输出与证据操作

仅在需要处理长输出、SSH 查询或复用检查证据时读取。返回预算遵循 [主规则](../SKILL.md)，不再给任务引入一个日志管理阶段。

## 读取与返回

| 要回答的问题 | 优先取得的证据 |
|---|---|
| 定位实现或调用方 | 在所属模块用 `rg -n` 搜索符号，随后读取命中附近行段；小文件首次可全文读 |
| 验收改动 | 先看 `git diff --stat`/路径清单，再按实际改动读取 diff 与必要调用方；不把大 diff 一次性全打印 |
| 构建或测试是否通过 | 原退出码、完成/通过/失败/跳过统计；长日志仅返回相关摘要 |
| 容器是否正常 | 指定容器的状态、健康状态和必要计数；出问题再读对应容器的有界近期日志 |
| 数据库现状或优化效果 | 必要字段、聚合或受限样本；需要总量时单独聚合，不能用样本行数冒充总量 |
| 后台任务是否有进展 | 完成事件、增量输出或单次关键状态；不每轮重读整个日志 |

对 SSH 在远端先筛选日志/字段、限定行数和时间范围，避免取回整份 `inspect`、全表、全部容器日志后才本地过滤。只在互不依赖时合并远端只读查询；更新、迁移、重启仍按依赖顺序执行并分别保留退出状态。

同一次工具调用包含多个命令时，共享返回预算；缩小每项返回内容，不给每个命令都配置完整预算。输出不足时补读缺失的文件/行段，而不是从头重读。行数限制不保证字符数受限，单行 JSON、压缩文件和堆栈也需要字符预算或字段选择。

## Windows 原生命令长日志示例

以下例子只适用于 PowerShell 启动的原生可执行程序，如 `node.exe`、`python.exe`、`npm.cmd`、`ssh.exe`；替换路径、命令和参数。PowerShell cmdlet 应用 `-ErrorAction Stop` 和异常处理，不能依赖其不会设置的 `$LASTEXITCODE`。优先使用检查工具已有的简洁 reporter。

日志目录须属于当前任务，不覆盖已有文件；只读任务由主代理指定可写证据目录。命令预期输出凭据或敏感数据时先选择不含敏感值的 reporter/字段，不先落原始日志再称其已脱敏。

```powershell
$taskLogDir = Join-Path $PWD 'work/task-id/logs'
[IO.Directory]::CreateDirectory($taskLogDir) | Out-Null
$taskLog = Join-Path $taskLogDir ('check-' + [guid]::NewGuid().ToString('N') + '.log')
# 示例：在项目工作目录执行；具体命令按验收要求替换。
$LASTEXITCODE = $null
try {
    & npm.cmd test *> $taskLog
    $taskExit = $LASTEXITCODE
    if ($null -eq $taskExit) { throw 'No native process exit code received' }
} catch {
    Write-Output 'check could not complete; result unverified'
    exit 1
}
Write-Output "check=npm test exit=$taskExit log=$taskLog"
# 成功优先返回测试工具的最终统计；这里给出有界尾部供核对。
$taskPreview = (Get-Content -LiteralPath $taskLog -Tail 30) -join "`n"
if ($taskPreview.Length -gt 6000) {
    $taskPreview = $taskPreview.Substring($taskPreview.Length - 6000)
    Write-Output '[preview limited; full log preserved]'
}
Write-Output $taskPreview
exit $taskExit
```

这是一次性子 shell 的示例；不要在用户持久交互终端中用 `exit`。保存原退出码后再读取摘要，工具执行层和摘要都报告这个退出码。若命令未成功启动、进程尚在运行或摘要看不出必要检查完成，结果记为未验证，不依据空日志或先前的退出码判定通过。

失败时不要只凭尾部猜根因：对已有日志搜索错误标识，读取首个有意义的失败及附近堆栈，按需要扩展。先保留证据再修复，不为了拿日志重新跑同一失败操作。Linux/macOS 的原生命令可用 `command > "$task_log" 2>&1`，紧接着 `task_rc=$?`；使用管道时必须取原程序状态，不能把 `tee`/过滤器成功当作测试成功。

## 复用检查证据

现有交付摘要中保留一行即可：`检查/命令 | 退出码与必要结果 | 相关代码状态 | 关键环境 | 证据路径（如有）`。不为此另建提交、全项目哈希或逐工具台账。

可用提交号标识干净代码；未提交修改用已有基线加相关 diff/文件标识，不能只报未包含当前修改的 HEAD。已有证据对应相同代码与环境时直接复用。若只是缺少报告中的细节，先读取已存在的日志或询问原所有者；确实无法核验才补跑。相关依赖、配置、测试输入或在线状态变化会使对应证据失效，只重新验证受影响部分。
