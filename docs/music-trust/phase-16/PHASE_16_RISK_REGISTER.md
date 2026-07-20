# Phase 16 Risk Register

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | False treaty/IO/privilege/UN claims | Critical | Hard-disabled flags + gates + gated route + disclaimer |
| R2 | Table name collision with P14/P15 | Critical | ADR P16-001 `creator_interop_institution_*` |
| R3 | Launch from Phase 15 flags | Critical | Separate institution flags; isolation tests |
| R4 | Infer membership from Tourify account | High | Participant-authority gate |
| R5 | Collective/market coordination | High | `collective_action` / `global_representation` hard-disabled |
| R6 | Formal depositary without law | Critical | formal_depositary hard-disabled |
| R7 | Remote migration without ops approval | Medium | Documented blocker |
| R8 | Sandbox demo treated as activation | Critical | Activation gate default-deny |
