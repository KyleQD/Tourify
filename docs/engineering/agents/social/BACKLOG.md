# Social backlog

The canonical work item is a task JSON. This backlog records sequencing only; it does not replace product decisions or release evidence.

## Active

- `SOCIAL-004`: close bounded realtime DM implementation after staging two-member/non-member Realtime/RLS isolation and full verification.

## Completed

- `SOCIAL-001`: audit baseline, gaps, questions, and state.
- `SOCIAL-002`: standalone `/feed` destination.
- `SOCIAL-003`: authenticated community-groups surface.

## Next batch — P1

| Order | Outcome | Depends on | Evidence |
|---:|---|---|---|
| 1 | Close DM and group realtime isolation evidence | Approved staging Supabase target and two-member credentials | `GAPS.md` M-1, G-1 |
| 2 | Verify notification RPC/grants and record fallback policy | Database/Release target approval; CP-051 | `GAPS.md` N-1–N-3 |
| 3 | Add Social critical-path E2E/security gate | QA/Release required-check decision | `GAPS.md` F-1, X-1, X-2, X-3, X-4 |
| 4 | Resolve collaboration ownership and group discovery semantics | Product owner answers Q2–Q3 | `GAPS.md` C-1, G-2 |

## Following batch — P2

- Canonical follow/friend status and graph-management surface (`FF-1`, `FF-2`).
- Entity-account notification settings and target-profile isolation (`N-4`).
- Moderation report-to-admin review contract (`X-4`).
- Feed fallback telemetry and composition deep-link decision (`F-2`, `F-3`).
- User-facing analytics ownership (`SI-1`).

## Roadmap dependencies

- WS-1.3 messaging fanout Redis layer remains a scale decision after the Supabase realtime contract is proven.
- WS-1.6 CI/test recovery and Phase 4 notification/navigation unification remain cross-domain roadmap work.
- CSP/XSS follow-up still requires a browser payload test, even though escaping and core CSP hardening are already recorded in `docs/DEVELOPMENT_BACKLOG.md:54-57`.

## Core launch task — 2026-09-16

- **SOCIAL-004 (P1)** — certify tenant-safe Realtime messaging, durable read state, reconnect behavior, and two-user deployed isolation evidence.
