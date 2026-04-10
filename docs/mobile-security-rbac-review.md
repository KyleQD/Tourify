# Mobile Security, RBAC, and RLS Review

Audit date: 2026-04-09

## What is already in place

- API access model guidance exists in `docs/api-security-map.md` with clear access classes (`public`, `auth`, `admin`, `internal`, `cron`).
- Staffing RBAC is documented in `docs/JOBS_STAFFING_RBAC_MATRIX.md`, including service-role caution notes.
- Mobile redirect hardening exists in `lib/auth/mobile-redirect.ts` and callback routes (`app/auth/mobile-callback/route.ts`, `app/auth/callback/route.ts`) with allowlisted scheme/host behavior.
- Supabase migration history is robust and includes org RBAC and entity policy migrations under `supabase/migrations`.

## Key risk findings for mobile readiness

### 1) Auth and privilege model is inconsistent across APIs

- Some routes use `lib/auth/api-auth.ts` and operate on user-scoped clients.
- Others use `lib/auth/production-auth.ts`, which authenticates user identity then uses service-role client for data access.
- Risk: policy enforcement may differ route-by-route, which is hard to reason about for native clients and difficult to audit.

### 2) RBAC documentation is deep for staffing, shallow for broader mobile surfaces

- Current RBAC matrix focuses on jobs/staffing, but mobile-facing consumer routes (discover/follow/notifications/payments/profile updates) do not have an equivalent matrix.
- Risk: gaps in documented ownership checks and role expectations for newly exposed endpoints.

### 3) CORS posture is permissive by default

- `vercel.json` sets `Access-Control-Allow-Origin: *` for `/api/*`.
- This can be acceptable for bearer-protected APIs, but still increases exposure of misconfigured public routes.
- Risk: accidental data leak on endpoints that were intended to be private but under-guarded.

### 4) Direct-from-mobile table access bypasses API policy layer

- Mobile screens currently perform direct Supabase reads/writes for venue booking requests/profile-adjacent stats.
- Risk: policy intent is split between DB RLS and API logic, reducing auditability and consistency.

### 5) RLS/policy regression checks are not enforced in CI

- No dedicated CI gate validates RLS behavior for mobile-critical paths after migration changes.
- Risk: policy drift is only discovered in runtime/manual testing.

## Security readiness decision

Current status: `yellow` (acceptable for controlled preview, not production-scale mobile rollout without remediation).

## Required remediations before production launch

1. **Unify API auth policy**
   - Standardize mobile-facing routes on one helper contract and explicitly annotate when service-role is required.
2. **Publish mobile route access matrix**
   - Extend RBAC documentation to include mobile-critical endpoints and ownership checks.
3. **Constrain CORS by environment**
   - Keep wildcard for local/dev if needed, restrict production origins to known domains/apps.
4. **Reduce direct table writes from mobile**
   - Introduce API endpoints for sensitive venue booking operations and mutate through audited handlers.
5. **Add policy contract tests**
   - Add CI tests for auth, ownership, and RLS expectations on mobile-critical routes.

## Suggested policy doc additions

- `docs/mobile-api-access-matrix.md`: route-level auth model, ownership checks, role restrictions.
- `docs/mobile-threat-model.md`: token handling, redirect/deeplink abuse cases, replay/session abuse mitigations, logging requirements.
