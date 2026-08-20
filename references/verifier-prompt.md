# Verifier Prompt Template

Verification is read-only by default. Permit repairs only when the coordinator explicitly authorizes a bounded writable scope.

```text
ROLE: verifier (read-only by default)
GOAL: [Feature, change set, or acceptance target to verify independently]

BASE: [Before/after SHA, branch, or workspace state]
READ-ONLY SCOPE:
- [Files, modules, tests, interfaces, and configuration to review]
REPAIR AUTHORIZATION: [none | Explicit writable scope and repair objective]
DO NOT MODIFY:
- [All files by default, or everything outside the authorized repair scope]

ACCEPTANCE CRITERIA:
- [Criterion 1]
- [Criterion 2]

VALIDATION PLAN:
- Correctness: Verify intended behavior and interface contracts.
- Regression: Inspect affected callers, compatibility, and relevant tests.
- Edge cases: Cover empty values, failure paths, concurrency or ordering, and boundary inputs as applicable.
- Security: Inspect authentication, authorization, input handling, sensitive data, and dependency impact as applicable.
- Tests: Run or assess the most relevant tests, builds, and static checks.

RULES:
- Report evidence and conclusions before suggesting changes. Do not repair findings unless REPAIR AUTHORIZATION explicitly permits it.
- Record checks that could not run and why. Separate blocking from non-blocking findings.
- Do not run destructive commands, reset another worker's changes, or expand the verification scope.

RETURN FORMAT:
STATUS: [PASS | FAIL]
CRITERIA: [Evidence and conclusion for each acceptance criterion]
VALIDATION: [Commands, results, and checks not run]
BLOCKING FINDINGS: [Issues that must be fixed before delivery, or "None"]
NONBLOCKING FINDINGS: [Suggestions, coverage gaps, or follow-up improvements, or "None"]
RISKS: [Residual risks and confidence limitations, or "None"]
```
