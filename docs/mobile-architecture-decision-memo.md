# Mobile Architecture Decision Memo and 30/60/90 Backlog

Date: 2026-04-09

## Recommendation

Choose `Expo-first` as the fastest production path, with explicit native escape hatches.

Rationale:
- The repository already contains a working Expo foundation (`apps/mobile`) with Supabase auth and bearer-based API client patterns.
- Most launch-critical backend routes are callable from mobile with targeted normalization.
- Full separate native codebases (Swift/Kotlin) would duplicate product work immediately and delay launch without solving current backend contract/ops gaps.

## Option comparison (scored 1-5, higher is better)

| Criterion | Expo-first | Separate native iOS + Android |
|---|---:|---:|
| Time to first production release | 5 | 2 |
| Team leverage with current codebase | 5 | 2 |
| Incremental migration flexibility | 4 | 3 |
| Long-term native optimization headroom | 3 | 5 |
| Maintenance cost over next 12 months | 4 | 2 |
| **Total** | **21** | **14** |

Decision rule:
- Revisit full-native only if hard blockers emerge (required native SDK gaps, sustained performance constraints, or platform-specific compliance requirements).

## Native migration checkpoints (while staying Expo-first)

1. Keep all new mobile features behind stable API contracts, not direct table writes.
2. Isolate device-dependent features behind small adapters to swap to custom native modules later.
3. Reevaluate after two production cycles with telemetry on crash rate, startup, and feature constraints.

## Ranked 30/60/90-day backlog

### 0-30 days (stabilize contracts and quality gates)

1. **Auth standardization**
   - Unify mobile-facing endpoints on a single auth helper contract.
   - Remove cookie-only outliers from mobile-targeted route surface.
2. **Contract fixes**
   - Fix portfolio upload payload mismatch (`kind` + `tos` alignment).
   - Wire mobile checkout helper into bookings UI and add status reconciliation.
3. **CI baseline for mobile**
   - Add `mobile-lint`, `mobile-typecheck`, and mobile API contract tests as required checks.
4. **Observability baseline**
   - Integrate crash capture provider and attach `feature`, `userId`, release/environment tags.

### 31-60 days (close security and release gaps)

1. **Security governance**
   - Publish mobile route access matrix with ownership/role expectations.
   - Restrict production API CORS origins to known surfaces.
2. **Release automation**
   - Add CI workflows for EAS preview builds and gated production builds.
   - Add environment/secret management checklist for mobile channels.
3. **API-first venue ops**
   - Replace direct mobile writes for booking operations with dedicated API handlers.

### 61-90 days (harden and scale)

1. **Reliability hardening**
   - Add end-to-end smoke suite for auth -> discover -> follow -> notification -> payment.
   - Add policy regression tests for RLS and ownership checks on mobile-critical endpoints.
2. **Feature parity expansion**
   - Implement prioritized parity items from product roadmap (venue ops depth, upload UX, profile completeness).
3. **Architecture checkpoint**
   - Review telemetry and product requirements to decide if any feature should move to custom native modules.

## Exit criteria for production launch readiness

- All mobile-critical journeys have stable API contracts with bearer auth tests.
- Mobile CI includes lint, typecheck, contract tests, and preview build validation.
- Crash reporting is live with actionable context.
- Security docs include mobile route RBAC/access expectations and are reflected in implementation.
