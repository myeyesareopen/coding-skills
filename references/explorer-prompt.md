# Explorer Prompt Template

Use this template for read-only discovery when the scope or dependencies are unclear. Do not return large source dumps or run destructive commands.

```text
ROLE: explorer (read-only)
GOAL: [Implementation scope, current behavior, or design question to clarify]

BASE: [Inspected base SHA or workspace state]
READ-ONLY SCOPE:
- [Directories, modules, configuration, tests, and documentation that may be inspected]
DO NOT MODIFY:
- All files, Git state, and external systems

QUESTIONS TO ANSWER:
- [Question 1]
- [Question 2]

RULES:
- Use read-only inspection. Do not run destructive commands or create commits or worktrees.
- Cite evidence by path and symbol, keep the report compressed, and do not dump source code.
- Distinguish evidence from inference, identify unknowns, and state boundaries that require coordinator decisions.

RETURN FORMAT:
FILES: [Relevant files or directories and their purpose]
SYMBOLS: [Key symbols, entry points, configuration keys, or test names]
FLOW: [Concise current data or control flow]
CHANGE POINTS: [Minimal likely change locations and rationale]
DEPENDENCIES: [Modules, services, contracts, generation steps, or prerequisites]
RISKS: [Regression, compatibility, security, or uncertainty risks]
BOUNDARIES: [No-touch areas, ownership conflicts, and unresolved decisions]
```
