# Phase 9 Risk Register

| Risk | Severity | Mitigation in shell | Residual |
|---|---|---|---|
| Implied membership from Tourify account | High | Separate membership tables + APIs; tests | Counsel launch review |
| Raw vault leakage to clients/researchers | High | Metadata-only APIs; default-deny research | Privacy assessment |
| Collective action via feature flag | High | `production_authority=false`; activation gate | Entity/counsel package |
| Competitive pricing coordination | High | No rate cards; competition screens | Competition counsel |
| Benefit/tax/securities misclassification | High | Benefits gated off; allocation helper unused in prod | Tax/securities counsel |
| Phase 1–8 mutation | High | Consume extracts only; no write paths to SoT | Code review |
| Premature public launch | Medium | All flags off; kill switches | Pilot approvals |
