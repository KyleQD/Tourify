# Dependency map

## Runtime layers

```text
Next.js / React web UI -> actions and API routes -> services -> Supabase and providers
Expo mobile UI -> mobile API adapters -> Next.js API routes -> same services and policies
```

## Principal dependencies

| Capability | Implementation | Boundary |
| --- | --- | --- |
| Web | Next.js 15, React 18 | `app/` |
| Mobile | Expo and Expo Router | `apps/mobile/` |
| Data and identity | Supabase clients | `lib/supabase/` and migrations |
| Contracts | Zod and shared API contracts | routes and `packages/api-contracts/` |
| Payments | Stripe | server routes and services |
| Email | Resend | server services and workers |
| Storage | Supabase Storage and AWS S3 | signed or server access |
| Rate limiting | Upstash Redis | API boundary with documented fallback |
| Observability | Sentry and OpenTelemetry | instrumentation and runtime configs |
| AI | Vercel AI SDK and OpenAI adapter | server-controlled features |
| Testing | Jest, Vitest, Playwright | unit, contract, RLS, and end-to-end |

A migration can affect API routes, database types, RLS tests, seeds, and mobile contracts. API payload changes can affect web, mobile, tests, and webhooks. Auth changes can affect middleware, actions, API routes, service-role use, and RLS assumptions.

## Production launch critical path — 2026-09-16

```text
ORCH-002 workspace preservation and release curation
  -> RELEASE-006 reproducible runtime/build
  -> RELEASE-007 isolated staging/production
  -> DB-002 + DB-008 hosted permission/history reconciliation
  -> DB-005 + DB-006 + ADMIN-003 + INTG-003/006 + USER-005 + TICKET-005 + MKT-004
  -> DISC-002 + SOCIAL-004 + RELEASE-003/004/008
  -> QA-003 exact-SHA staging certification
  -> RELEASE-005 protected checks and final go/no-go
```

- TICKET-005 consumes DB-002, DB-005, DB-006, and INTG-006.
- MKT-004 consumes MKT-002, DB-008, and INTG-006.
- USER-005 coordinates persistent MFA with INTG-003 and DB-008.
- QA-003 consumes every enabled core capability plus RELEASE-007/008 environment and surface controls.
- RELEASE-005 is terminal: it may not pass without matching-SHA QA-003 evidence, branch protection, migration evidence, observability, recovery, an approver, and a rollback point.
- MUSIC-004 and RELEASE-002 are blocked until the core web release is stable; INTG-007 providers remain disabled until credential-vault acceptance passes.

## Workforce Command Center program — 2026-09-26

```text
WFC-001 program control
  ├─ WFC-002 authenticated baseline (also needs an isolated target)
  ├─ WFC-003 identity boundary → WFC-004 departments and memberships
  │    ├─ WFC-005 department/status commands → WFC-006 command read models
  │    │    └─ WFC-008 command shell → WFC-009 Workforce HQ → WFC-010 department workspace
  │    ├─ WFC-011 scheduling schema → WFC-012 scheduling services → WFC-013 scheduling UI
  │    ├─ WFC-014 action projection → WFC-015 timeline and Action Center
  │    ├─ WFC-016 department communications → WFC-017 communications UI
  │    └─ WFC-018 extended schema → WFC-019 extended services → WFC-020 extended UI
  └─ WFC-007 workforce design system ───────────────────────────────┘

WFC-009 through WFC-020 → WFC-021 integrated certification
WFC-021 → WFC-022 governed rollout
WFC-022 + 30 days at 100% + two schedule/payroll cycles → WFC-023 legacy retirement
```

- The active plan is `docs/engineering/exec-plans/active/WFC-COMMAND-CENTER-20260926.md`.
- Activation state after the WFC-001 first-activation ownership review: `WFC-003` (organization) and `WFC-007` (design-system) are active. Every other WFC record remains blocked on its named dependency. `WFC-002` additionally stays blocked on an isolated authenticated target.
- Identity precedence (CP-102): WFC-003 is the sole author of the canonical organization, active-manager, vendor-identity, and quarantine contract. `DB-012` and `ORG-007` consume that handoff; neither may author a competing vendor identity. WFC-004 is the only lane that turns it into schema.
- Path partitions (CP-101, CP-103) recorded so no two live lanes can claim one path:
  - `components/admin/**` is the admin lane's. WFC-007 ships primitives in `components/ui/**` and publishes a usage contract; the design-system grant is not widened.
  - `app/admin/dashboard/staff/**` and `components/admin/workforce/**` are carved out of ADMVIEW-001 for the WFC admin lanes, except `components/admin/workforce/event-worker-attendance.tsx` (WORK-006) and the seven pre-existing component files (ADMVIEW-001).
  - `app/api/admin/workforce/**` is split across the four WFC service lanes: WFC-005 owns `people`, `health`, `departments`, `memberships`, `status`; WFC-012 owns `schedules`; WFC-014 owns `actions`; WFC-019 owns `attendance`, `conflicts`, `conversions`, `identity-merge`, `payroll-exports`. The seven routes that already exist are a parity surface, not a second implementation.
  - `lib/workforce/**` and `types/workforce/**` are created by WFC-005; WFC-006, WFC-012, WFC-014, and WFC-019 own named subtrees only.
  - `lib/logistics/**` is held by the active logistics overhaul and is read-only to WFC-014.
- `app/globals.css` and the app-wide `--radius` token are frozen by CP-100 pending the QA visual gate. No WFC lane may change `:root`.
- Organization hands identity scope to Database; Database hands schema/RLS/types to Work; Work and Social hand stable contracts to Admin; Design System hands shared interaction primitives to Admin; all implementation lanes hand exact-SHA evidence to QA; QA hands certification to Release.
- The WFC program does not displace existing active agent tasks. The orchestrator may activate a WFC record only after confirming working-set availability and preserving current ownership.
