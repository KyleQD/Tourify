# Phase 2 Implementation Status

Source of truth: 2026-07-27 UI/UX audit  
Baseline: current working tree  
Database rule: manual additive SQL only; no restore, reset, push, or remote execution

## Current gate

Phase 2 is implemented through the P0 employer-to-worker path and several General
account remediations, but it is not release-accepted. The worker-actions SQL was
reported successfully applied by the operator; recorded postflight evidence,
moderated persona journeys, assistive-technology checks, and the remaining P1
Public/General modules are still open.

## Audit reconciliation

| Module | Audit tasks | Current status | Evidence / remaining gate |
| --- | ---: | --- | --- |
| PUB-01 Landing page | 2 | Not started | Persona proof and conversion acceptance are still open. |
| PUB-02 Login and signup | 2 | Needs remediation | Canonical auth portal and redirect intent exist; complete keyboard/mobile recovery evidence is open. |
| PUB-03 Verification and recovery | 2 | Needs remediation | One status-driven screen now covers sent, waiting, verified, expired, rate-limited, recovery, resend, and support. Delivery-provider and AT evidence remain. |
| PUB-04 Account creation | 2 | Needs remediation | Existing account mutations are preserved; non-sensitive draft recovery, save status, normalized URLs, and trusted availability checks are implemented. Wizard decomposition and responsive acceptance remain. |
| PUB-05 Persona onboarding | 2 | Needs remediation | Canonical Artist/Venue onboarding now restores server-owned responses and steps, autosaves, validates required fields, and safely resumes after account creation. Responsive/AT acceptance remains. |
| PUB-06 Pricing and upgrade | 2 | Not started | Entitlement-aware comparison and billing consequence states remain. |
| PUB-07 Help and education | 2 | Not started | Consistent contextual help contract remains. |
| GEN-01 General dashboard | 2 | Needs remediation | Real action center covers applications, tickets, awaiting messages, profile completion, and assignments with partial/error states. Moderated acceptance remains. |
| GEN-02 Profile editor | 2 | Needs remediation | `/settings/profile` is canonical, links appearance and an accurate public preview, and `/profile` redirects there. Portfolio convergence remains. |
| GEN-03 Public profile | 2 | Needs remediation | `/profile/:username` now remains the General identity, enforces contact visibility before rendering, preserves published layout state, and no longer fabricates views. Renderer convergence remains. |
| GEN-04 Feed and posts | 2 | Not started | Composer/post lifecycle convergence remains. |
| GEN-05 News Pulse | 2 | Not started | `/news` exists; provenance, authoring permissions, and save/share evidence remain. |
| GEN-06 Discover and search | 2 | Not started | Federated entity contract and route convergence remain. |
| GEN-07 Friends and follows | 2 | Not started | Connect/follow lifecycle and synchronized state remain. |
| GEN-08 Community | 2 | Not started | Group/forum/feed/collaboration IA convergence remains. |
| GEN-09 Jobs and applications | 2 | Needs remediation | Canonical application view merges artist/staffing sources, normalizes statuses, handles partial reads, and supports ownership-scoped conflict-safe withdrawal. Draft resume/message evidence remains. |
| GEN-10 Achievements | 2 | Not started | Evidence issuer hierarchy remains. |
| GEN-11 Calendar and bookings | 2 | Needs remediation | `/calendar` now provides a user agenda across assignments, tickets, and bookings with conflict and partial-source states. Subscription/export remains. |
| GEN-12 Work Mode | 2 | Needs remediation / external gate | Canonical workspace, authenticated read APIs, assignment responses, publication modules, telemetry, acknowledgement, and check-in/out are implemented. Worker-actions SQL application was reported successful; feature-flag and persona postflight evidence remain. |
| **Total** | **38** | **18 modules reconciled** | No item is marked verified complete without the full audit evidence bundle. |

## Employer-to-worker vertical

The existing employer contracts remain authoritative:

`job posting → application → approval → onboarding → roster → shift publication → assignment response → Work Mode`

Implemented Phase 2 additions:

- one authenticated worker assignment list and detail contract;
- fail-closed assignment ownership on every worker read/mutation;
- idempotent accept/decline behavior and explicit conflict mapping;
- assignment-scoped Today, Schedule, Tasks, Updates, Maps, Day Sheet,
  Documents, Travel, Pay, Contacts, and Check-in routes;
- worker modules read employer publications and never fabricate operational data;
- append-only acknowledgement and check-in/out APIs behind
  `FEATURE_WORK_MODE_WORKER_ACTIONS`;
- funnel telemetry with a manual-only storage package;
- General dashboard, application tracking, and calendar entry points into the
  same worker journey.

## Manual SQL packages

Neither file has been executed by Codex:

1. `supabase/migrations/20260728181917_work_mode_ux_telemetry.sql` — application
   status not confirmed.
2. `supabase/migrations/20260728185712_work_mode_worker_actions.sql` — operator
   reported successful application on 2026-07-28.

Runbooks:

1. `MANUAL_SQL_WORK_MODE_TELEMETRY.md`
2. `MANUAL_SQL_WORK_MODE_WORKER_ACTIONS.md`

Enable worker mutations only after the second package's postflight and persona
isolation evidence is recorded.

## Automated evidence

- focused Phase 2 TypeScript project passes;
- 25 focused tests pass across onboarding authorization/resume, General profile privacy, General action/status
  models, personal-calendar conflicts, Work Mode APIs, telemetry, and assignment
  idempotency;
- touched-file lint passes;
- migration manifests pass repository validation;
- production debug-route check passes;
- Admin route registry remains complete.

## External release gates

- operator confirms target Supabase project and hosted migration history;
- operator applies and validates the two SQL packages;
- worker feature flag is enabled only after postflight;
- five persona Playwright journeys pass on supported viewports;
- keyboard, screen reader, reduced motion, and 200%/400% zoom checks pass;
- moderated employer-to-worker completion reaches the audit threshold;
- performance and recovery evidence is attached to the acceptance bundle.
