# Phase 15 Risk Register

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | False IO/treaty/privilege claims via UI/API | Critical | Hard-disabled flags + gates + gated route + disclaimer |
| R2 | Phase 14 table name collision / data corruption | Critical | ADR P15-001 `creator_interop_org_*` |
| R3 | Launch from Phase 14 flags | Critical | Separate `creator_interop_org_*` flags; isolation tests |
| R4 | Infer membership from Tourify account | High | Participant-authority gate; no inference |
| R5 | Collective/market coordination | High | `collective_action` hard-disabled |
| R6 | UN/specialized-agency branding | High | Flags + gated surfaces |
| R7 | Remote migration without ops approval | Medium | Documented blocker; local migrations only |
| R8 | Incomplete legal feasibility treated as activation | Critical | Activation gate default-deny |
