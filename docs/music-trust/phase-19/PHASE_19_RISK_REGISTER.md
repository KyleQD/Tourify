# Phase 19 Risk Register

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | Launch from Phase 18 flags | High | Separate `creator_treaty_legacy_*`; isolation tests; Phase 18 phase19_handoff stays hard-disabled |
| R2 | Perpetual authority claim by software | Critical | Hard-disabled + activation gate + disclaimer |
| R3 | Future-person representation | Critical | Hard-disabled gated surface |
| R4 | Privacy / creator-rights override via archives | Critical | Sensitive ethics gate; public dump hard-disabled |
| R5 | Universal identity / ownership adjudication | High | Hard-disabled; no adjudication APIs |
| R6 | Blocked local exit | High | Local-exit-block hard-disabled; continuity preserves exit |
| R7 | Fake century-scale evidence | High | Residual blockers; deny activation without real proofs |
| R8 | Schema collision with Phase 18 | Medium | ADR P19-001 namespaces |
| R9 | Phase 20 under Phase 19 flags | High | phase20_handoff docs-only; hard-disabled |
| R10 | Remote migration without ops | Medium | Unauthorized until approval |
