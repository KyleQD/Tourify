# Ticketing backlog

The canonical work item is a task JSON. Launch priorities remain in `docs/DEVELOPMENT_BACKLOG.md` (WS-0.3, WS-0.5, WS-1.2, WS-1.3, DB Q4). Canonical feature plan: `docs/admin-feature-specs/09_Ticketing_Admissions_and_Guest_Lists.md` (TIX-101..105, 501..513, 601..603). Gap/evidence triage: `GAPS.md`. Owner questions: `QUESTIONS.md`.

## Active

- TICKET-001 — Audit Ticketing workspace (baseline, gaps, questions). Read-only; completed 2026-09-09.

## Candidate (from GAPS.md; awaiting owner answers in QUESTIONS.md P1)

- Fix false-zero fallbacks in ticketing read surfaces (F1) — admin shell, workspace metrics, financials step.
- Make settlement movements versioned/append-only (F3/M13) — coordinate with finance agent (TIX-513 handoff contract).
- Reconcile admin ticketing endpoints against the active migration chain (F6) — incl. locating object-creation migration for admin ticketing overview RPCs.
- Define purchase GA contract: always-authenticated purchase, idempotency, quantity/availability ledger path (F4/F8, WS-0.5).
- Promo/referral abuse control decision (F9): canonical campaigns (TIX-505), tighter caps, or disable self-service.
- Wire per-org canonical-mode flag + command blocking on dual-read mismatch (F14, TIX-601).
- Credential signing/rotation + server-side QR issuance (M8, TIX-508, WS-1.2).
- Guest-list consolidation: retire legacy `app/api/events/[id]/guestlist/route.ts` path after reconciliation (F11, TIX-504).

## Done

- Control-plane bootstrap created.
- TICKET-001 audit: BASELINE.md, GAPS.md (18 missing / 16 incomplete / 9 improve), QUESTIONS.md (5 P1), STATE.md updated.

## P0 production launch task — 2026-09-16

- **TICKET-005** — certify the deployed event-publication through purchase, wallet/QR, transfer, check-in, refund, and settlement lifecycle against the reconciled staging schema.

## TICKET-005 execution checkpoint — 2026-09-16

- Local transaction hardening and focused tests are complete.
- Next is deployed create-to-settlement certification after hosted schema reconciliation, Stripe test-mode setup, distributed purchase race coverage, and refund replay verification.
