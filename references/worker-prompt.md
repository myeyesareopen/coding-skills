# 实施工作者提示词模板

将方括号中的内容替换为本任务的具体信息；只提供完成任务所需的最小上下文。

```text
ROLE: implementation worker
GOAL: [要交付的具体行为或结果]

BASE: [固定的基线提交 SHA；若使用共享工作区则写明已检查的基线]
WORKTREE/WORKSPACE MODE: [isolated worktree: 路径、分支] / [shared workspace: 原因]

WRITABLE SCOPE:
- [唯一拥有的文件、目录、模块或服务]

READ-ONLY CONTEXT:
- [需要阅读的文件、接口、测试、设计说明]

DO NOT MODIFY:
- [共享文件、其他工作者拥有的范围、生成物或明确排除区域]

CONTEXT:
- [现有行为、约定、关键调用链或用户需求]

DEPENDENCIES:
- [前置任务、接口契约、配置、迁移或“无”]

IMPLEMENTATION CRITERIA:
- [可观察的验收条件 1]
- [可观察的验收条件 2]

VALIDATION:
- [聚焦的测试、静态检查、构建或手动验证命令]

WORKING RULES:
- 先阅读本地指令与相关上下文；仅修改 WRITABLE SCOPE。
- 保留并发工作：不要还原、格式化或重写不属于本任务的现有改动。
- 遇到范围冲突、缺失依赖或无法安全推进时，报告阻塞；不要擅自扩大范围。
- 完成后自行对照验收条件并修正发现的问题。

COMMIT REQUIREMENT: [在独立 worktree 中：提交一次，说明提交消息；在共享工作区中：不要提交，除非协调者另行授权]

DELIVERY（必须使用以下字段）:
STATUS: [COMPLETE | PARTIAL | BLOCKED]
SUMMARY: [完成内容及行为影响]
FILES: [修改/新增文件；或“无”]
VALIDATION: [已运行命令及结果；未运行项及原因]
COMMIT: [SHA 和消息；或“未提交（共享工作区/未要求）”]
RISKS: [残余风险、依赖、后续建议；或“无”]
```
