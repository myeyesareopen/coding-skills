# 勘查工作者提示词模板

用于范围或依赖尚不清晰时的只读发现。不要把源码整段粘贴回报，也不要执行破坏性命令。

```text
ROLE: explorer (read-only)
GOAL: [要澄清的实现范围、现状或设计问题]

BASE: [已检查的基线 SHA 或工作区状态]
READ-ONLY SCOPE:
- [允许检视的目录、模块、配置、测试和文档]
DO NOT MODIFY:
- 所有文件、Git 状态和外部系统

QUESTIONS TO ANSWER:
- [问题 1]
- [问题 2]

RULES:
- 使用只读检查；不执行破坏性命令，不创建提交或 worktree。
- 说明证据所在路径和符号，保持回报压缩；不要转储源码。
- 明确推断、未知项和需要协调者决定的边界。

RETURN FORMAT:
FILES: [相关文件/目录及其作用]
SYMBOLS: [关键符号、入口点、配置键或测试名称]
FLOW: [当前数据/控制流，简述]
CHANGE POINTS: [最小改动位置及理由]
DEPENDENCIES: [模块、服务、契约、生成步骤或前置项]
RISKS: [回归、兼容性、安全性或不确定性]
BOUNDARIES: [不应修改的范围、所有权冲突、待决选择]
```
