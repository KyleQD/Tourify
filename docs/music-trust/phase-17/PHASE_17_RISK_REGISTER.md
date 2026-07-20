# Phase 17 Risk Register

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | Competence expansion by software/admin | Critical | Competence + expansion gates; competence_change hard-disabled |
| R2 | False treaty/depositary/privilege claims | Critical | Hard-disabled flags + gated route + disclaimer |
| R3 | Launch from Phase 16 flags | Critical | Separate `creator_treaty_ops_*` flags; isolation tests |
| R4 | Simulated multi-year evidence treated as real | Critical | Activation gate; audit blocker recorded |
| R5 | Collective authority / market coordination | High | collective_authority hard-disabled |
| R6 | Universal identity mandate | High | universal_identity hard-disabled |
| R7 | Table name collision with P14–16 | Critical | ADR P17-001 |
| R8 | Sandbox demo treated as activation | Critical | Activation gate default-deny + exact scope/sunset |
