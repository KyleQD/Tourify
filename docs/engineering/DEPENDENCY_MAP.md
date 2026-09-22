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
