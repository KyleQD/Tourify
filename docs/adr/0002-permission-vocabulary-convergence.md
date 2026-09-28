# ADR 0002 — Permission Vocabulary Convergence & Sunset Plan

- **Status:** Accepted
- **Date:** 2026-08-22
- **Tasks:** VEN-129 (primary), VEN-130, inputs to VEN-142/VEN-144/VEN-292

## 1. Problem

Four coexisting authorization vocabularies govern overlapping Venue capabilities:

| Vocabulary | Form | Where enforced | Example |
|---|---|---|---|
| Venue JSON map | `Record<string, boolean>` on team/staff rows | `canSatisfyPermission` in `lib/venue/venue-access.ts`; RLS predicates | `manage_team` |
| Admin dotted | string lists in admin-context/capabilities | admin surface gates | `workforce.manage`, `hiring.manage`, `workforce.view` |
| Uppercase RBAC seeds | `rbac_permissions.name` rows from entity_rbac_core | `has_entity_permission` RPC (`hiring-permissions.ts`) | `ASSIGN_EVENT_ROLES`, `MANAGE_MEMBERS` |
| Service RPCs | DB functions | hiring gate | `can_manage_hiring(user, entity…)` |

Consequence: "manage staff" means three different checks depending on surface; grants cannot be reasoned about across domains.

## 2. Decision

**D1 — Canonical catalog.** `rbac_permissions` is the single registry. Canonical names use the lowercase dotted form going forward (`domain.capability`), while the nine Venue JSON keys remain canonical-as-seeded because they already back live RLS and API gates (renaming them now would break working enforcement for zero capability gain).

**D2 — Translation table (authoritative).**

| Legacy token | Canonical permission | Alias type | Sunset step |
|---|---|---|---|
| `manage_team` (JSON) | `manage_team` | identity (already canonical row) | none — keep |
| `workforce.view` | `view_analytics` + `roster.view` | composition | admin-surface refactor (non-Venue program) |
| `workforce.manage` | `roster.manage` + `scheduling.manage` + `hiring.manage` | composition | same |
| `hiring.manage` | `hiring.manage` | rename-in-place | seed + swap call sites at VEN-133 |
| `ASSIGN_EVENT_ROLES` | `hiring.manage` | server-only alias | remove check at VEN-133 hire service |
| `MANAGE_MEMBERS` | `roster.manage` | server-only alias | remove check at VEN-133 |
| `can_manage_hiring()` RPC | `venueHasRbacAccess(…, 'hiring.manage')` | wrapper | retire wrapper at VEN-133 |

**D3 — Alias rules.** Aliases resolve ONLY inside server code paths (never exposed as grantable catalog rows to end users); each carries a removal milestone tied to a tracked task. No client code may branch on a legacy token.

**D4 — Granularity floor (VEN-130).** Workforce authority is split so that by default: scheduler ≠ pay/HR viewer; recruiter ≠ finance editor; door staff ≠ roster manager. Seeded granular permissions: `roster.view`, `roster.manage`, `hiring.manage`, `scheduling.manage`, `timekeeping.view`, `timekeeping.manage`, `hr.sensitive_view`.

## 3. Enforcement wiring

- Default roles re-wired in migration `20260823073000` (Scheduler gains `scheduling.manage`+`roster.view`, NOT finance/HR; new `Venue Hiring Manager` gains `hiring.manage`+`roster.view`; Door Staff unchanged — no roster powers).
- `canSatisfyPermission` gains an alias resolution step honoring D2 during the window (server-only).
- Sensitive-field projection (DOB/pay/emergency) additionally requires `hr.sensitive_view` once VEN-142 lands; schedule visibility never implies it.

## 4. Sunset milestones

1. **VEN-133 (Wave 4):** hire service swaps `ASSIGN_EVENT_ROLES`/`MANAGE_MEMBERS`/`can_manage_hiring` → `hiring.manage`.
2. **VEN-144 (Wave 4):** labor metrics read `timekeeping.*` only.
3. **VEN-146 (Wave 8):** legacy JSON columns become read-only after reconciliation report.
4. **VEN-308 (Wave 8):** admin-dotted composition retired outside Venue scope.

Rollback: alias layer is additive; catalog inserts are inert until referenced by policies/code.
