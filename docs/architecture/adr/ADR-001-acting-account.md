# ADR-001 — Acting account (Admin organization context)

**Status:** Accepted  
**Date:** 2026-07-20  
**Spec:** `docs/admin-feature-specs/00_Master_Roadmap.md`, `01_Platform_Tenancy_RBAC_and_Audit.md`  
**Implements toward:** `SEC-002`, `SEC-101`

## Context

Admin APIs must resolve exactly one organization for every sensitive read/write. The platform already has:

- Client account switcher (`CompactAccountSwitcher` / `AccountSwitcher`)
- Persisted session in `user_sessions` (`active_profile_id`, `active_account_type`)
- Request headers `x-acting-profile-id`, `x-acting-account-type`, optional `x-acting-org-id`
- Server resolver `resolveActingAdminContext()` in [`lib/auth/admin-context.ts`](../../../lib/auth/admin-context.ts)

Gaps remain: not every Admin route uses the resolver; some services still pick the first membership; body/query `org_id` is sometimes trusted.

## Decision

### Selection UX

1. An Admin selects an **organization account** (`organizer_accounts` profile) from the account switcher.
2. The switch command verifies the authenticated user, active organization profile, membership, and requested target before persisting the selection. A body/query/path `org_id` never bypasses this lookup.
3. The server increments a monotonically increasing selection epoch, persists the selected profile and organization in the user's server-side session, and issues the signed acting-context envelope below.
4. The response carries a complete `actingContextKey`; the shell clears the previous account's in-memory data before rendering the new account and refetches capability-scoped navigation.
5. Client display headers may mirror the last rendered context and epoch to detect stale tabs, but they are never an authority source.

### Signed / trusted session state

1. The Admin acting selection is an HTTP-only, `Secure`, `SameSite=Lax`, `Path=/` cookie. The value is `v1.<kid>.<base64url-json>.<hmac-sha256>` (an equivalent standards-compliant JWS is acceptable). Key material is server-only and supports overlap during rotation.
2. Version 1 signed claims are exactly:

   | Claim | Meaning |
   |---|---|
   | `v` | Integer format version, initially `1` |
   | `sub` | Authenticated Supabase user UUID |
   | `sid` | One-way binding to the current Supabase auth session identifier; never the access token |
   | `profile_id` | Selected `organizer_accounts.id` |
   | `org_id` | Verified `organizer_accounts.ops_org_id` |
   | `account_type` | Literal `organization` |
   | `epoch` | Monotonic selection version for this authenticated session |
   | `iat` / `exp` | UTC NumericDate issue and absolute expiry |
   | `nonce` | Random replay/collision-resistant identifier |

3. The server-side session record carries the same `profile_id`, `org_id`, `epoch`, `selected_at`, and `expires_at`. A request is accepted only when signature, key ID, auth-session binding, subject, expiry, profile/org binding, server epoch, active profile, active membership, and capability resolution all pass.
4. The signed envelope plus matching server session is the only selection authority. Unsigned `x-acting-profile-id`, `x-acting-account-type`, and `x-acting-org-id` values are display/race assertions only and must exactly match the resolved envelope when present.
5. There is no membership-derived fallback. A missing, expired, or cleared selection returns `409 acting_context_required`, even when the user currently has one membership.
6. Body, query, and path `org_id` values **never establish authority**. If supplied, they must equal the resolved `orgId` or the request fails with `403 acting_context_mismatch`.
7. Resolved context includes `userId`, `profileId`, `orgId`, `membershipRole`, sorted effective `capabilities`, `epoch`, `supportGrantId | null`, `correlationId`, and `actingContextKey = sha256(userId, sid, profileId, orgId, epoch, membership/capability version)`.
8. `user_sessions.active_profile_id` and `active_account_type` are compatibility fields only until `SEC-101` adds the complete server record. They may not be treated as a signed format by themselves.

### Ambiguous membership rejection

1. If no valid header/session organization selection exists → `409 acting_context_required` (“Select an organization account before continuing.”).
2. Once selected, a missing or revoked membership → `403 organization_access_denied`.
3. **Never** derive acting context from membership count or array order.

### Multi-tab and switch behavior

1. A successful switch is compare-and-swap on the current `epoch`, increments it once, records an audit event, and sets the new cookie. Concurrent switches with an old epoch return `409 acting_context_stale`; the later caller must reload and explicitly choose again.
2. Cookies are shared across same-browser tabs, but every client-originated organization-scoped request sends the last rendered epoch/key as a non-authoritative assertion. If it differs from the signed/server context, the server performs no domain read or mutation and returns `409 acting_context_stale` with a fresh-context remediation signal.
3. On `acting_context_stale`, the shell immediately removes previous-account query/cache/state, closes sensitive dialogs, refreshes the visible account/capabilities, and asks the user to retry. It must not automatically replay a mutation in the newly selected organization.
4. Every organization-scoped cache, request deduplication key, optimistic update, realtime channel, and durable draft is keyed by the complete `actingContextKey`, not only `orgId`. Switch begins with synchronous cancellation/invalidation of the old key before new data is rendered.
5. Capability-controlled navigation and commands fail closed while the new context is loading or unavailable. A stale response whose key no longer equals the shell key is discarded.
6. Deep links into `/admin/*` require a valid signed selection. Missing selection shows an account chooser and returns `409` from organization APIs; it never selects from membership order.
7. Server-to-server/background work does not reuse a browser cookie. It carries its immutable `orgId`, initiating principal, reason, capability/job allowlist, and correlation/idempotency evidence under the service-job contract.

### Expiry and support access

1. The acting envelope expires at the earliest of eight hours after selection, the bound Supabase session expiry, support-grant expiry, membership expiry, or explicit logout/revocation. An expired envelope is cleared and returns `409 acting_context_required`; it is never silently renewed by a domain request.
2. Membership state and target ownership are checked on every request. Effective capabilities may be cached for at most 60 seconds and the cache key includes membership/role/grant version; revocation events invalidate it immediately where realtime invalidation is available.
3. Logout, password/security-session revocation, membership removal, profile deactivation, or support-grant revocation invalidates the server record and increments/revokes its epoch. Previously signed envelopes then fail closed.
4. Support access is a separate platform workflow, never implied by an organization role. It requires an active named support grant containing approver, operator, target profile/org, reason/ticket, allowed capabilities/resources, issue/expiry time, and a maximum 30-minute lifetime.
5. Support context uses the same signed format with `support_grant_id`, displays a persistent non-dismissible banner, and writes immutable start, privileged-read, mutation, export, and end/expiry events. It cannot be chained or delegated.
6. Support grants deny finance approval/payment, contract signature, role/grant management, destructive lifecycle actions, and bulk protected-data export unless each action is explicitly approved by the separate break-glass policy. Default Admin contains no implicit support bypass.

### Typed response contract

| Condition | HTTP/code | Mutation/retry behavior |
|---|---|---|
| No selection, expired selection, or selection cleared | `409 acting_context_required` | No domain operation; prompt selection |
| Old tab/epoch or concurrent switch | `409 acting_context_stale` | No domain operation; clear old data, reload, never auto-replay mutation |
| Signed value is malformed, bad-signature, wrong subject/session, or replay-revoked | `401 invalid_acting_context` | Clear cookie, security-audit result, require fresh authentication/selection |
| Body/path/query org disagrees with resolved org | `403 acting_context_mismatch` | No existence details and no domain operation |
| Profile inactive or membership revoked/absent | `403 organization_access_denied` | Clear context; do not reveal target existence |
| Context/session/capability dependency cannot be verified | `503 acting_context_unavailable` | No operation; retry is explicit and idempotent |

### Threat model (summary)

| Threat | Mitigation |
|--------|------------|
| Client forges `org_id` in body | Ignored for authority; mismatch rejected |
| Client forges acting headers for another org | Headers are assertions only; signed envelope/server epoch plus profile/membership binding establish authority |
| Membership-derived organization selection | Explicit `409 acting_context_required`; selection must come from the signed envelope plus matching server session |
| Stale tab after switch | Epoch assertion, `409 acting_context_stale`, no mutation replay, complete context cache key |
| Stolen envelope used with another auth session | `sub` and one-way `sid` binding must match the authenticated session |
| Replayed pre-switch envelope | Server epoch must match; switch/logout/revocation invalidates old epochs |
| Tampered server session row | Restricted RLS/write path, signature/server equality, membership and profile re-check, immutable audit |
| Cross-tab response arrives after switch | Response context key mismatch causes discard before cache/UI commit |
| Support operator escalates laterally | Separate short grant, explicit allowlist, hard-denied actions, persistent banner, per-action audit |
| Signing key exposure/rotation | Server-only versioned keys, overlapping verification window, revocation runbook, no key in client/logs |

## Consequences

- All new Admin commands must call `resolveActingAdminContext` (or a wrapper that does).
- `SEC-101` implements this exact signed/server epoch contract, replaces header authority, and adds stale-tab/switch/expiry/support tests. Until then, the current unsigned-header-first resolver is compatibility code and does not satisfy `SEC-101`.
- Legacy membership fallback helpers must be retired; membership is authorization evidence, never account-selection state.

## References

- [`lib/auth/admin-context.ts`](../../../lib/auth/admin-context.ts)
- [`lib/auth/acting-context.ts`](../../../lib/auth/acting-context.ts)
- [`docs/architecture/multi-account-system.md`](../multi-account-system.md) §6
