# Phase 18 Risk Register

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | Perpetual institution by software default | Critical | Non-perpetuity gate; sunset required; silence ≠ renewal |
| R2 | Launch from Phase 17 flags | Critical | Separate `creator_treaty_renewal_*` flags; isolation tests |
| R3 | Inherited authority without successor instrument | Critical | Authority-inheritance gate |
| R4 | Future-person legal representation claim | High | FG impact advisory-only; disclaimer |
| R5 | Irreversible transfer / live dissolution | Critical | Dissolution hard-disabled; asset-lock gate |
| R6 | Table name collision with P14–17 | Critical | ADR P18-001 |
| R7 | Sandbox demo treated as renewal | Critical | Activation gate default-deny |
| R8 | Phase 19 under Phase 18 flags | High | phase19_handoff docs-only; hard-disabled |
