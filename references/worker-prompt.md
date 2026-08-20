# Implementation Worker Prompt Template

Replace bracketed placeholders with task-specific information. Provide only the minimum context needed to complete the assignment.

```text
ROLE: implementation worker
GOAL: [Specific behavior or outcome to deliver]

BASE: [Pinned base commit SHA, or inspected baseline for shared-workspace mode]
WORKTREE/WORKSPACE MODE: [isolated worktree: path and branch] / [shared workspace: reason]

WRITABLE SCOPE:
- [Exclusively owned files, directories, modules, or services]

READ-ONLY CONTEXT:
- [Files, interfaces, tests, or design notes that may be inspected]

DO NOT MODIFY:
- [Shared files, another worker's scope, generated outputs, or explicitly excluded areas]

CONTEXT:
- [Existing behavior, conventions, key call paths, or relevant user requirements]

DEPENDENCIES:
- [Prerequisite tasks, interface contracts, configuration, migrations, or "None"]

IMPLEMENTATION CRITERIA:
- [Observable acceptance criterion 1]
- [Observable acceptance criterion 2]

VALIDATION:
- [Focused tests, static checks, build commands, or manual verification]

WORKING RULES:
- Read local instructions and relevant context first. Modify only WRITABLE SCOPE.
- Preserve concurrent work. Do not revert, format, or rewrite existing changes outside this assignment.
- Report ownership conflicts, missing dependencies, or unsafe conditions instead of expanding scope.
- Compare the result with the acceptance criteria and correct issues before delivery.

COMMIT REQUIREMENT: [Isolated worktree: create one atomic commit and state the message] / [Shared workspace: do not commit unless the coordinator explicitly authorizes it]

DELIVERY (use every field below):
STATUS: [COMPLETE | PARTIAL | BLOCKED]
SUMMARY: [Completed work and behavioral impact]
FILES: [Modified or added files, or "None"]
VALIDATION: [Commands run and results; checks not run and why]
COMMIT: [SHA and message, or "N/A — shared workspace/not required"]
RISKS: [Residual risks, dependencies, or follow-up recommendations, or "None"]
```
