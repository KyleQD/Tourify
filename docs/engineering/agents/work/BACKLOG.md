# Work backlog

The canonical work item is a task JSON. Launch priorities remain in `docs/DEVELOPMENT_BACKLOG.md`.

## Active

- **WORK-001** — Audit Work workspace (baseline, gaps, questions). Status: active → audit complete; awaiting owner answers to QUESTIONS.md (P1: Q1 staged-PII/check-in apply; Q2 canonical hiring surface; Q3 staffing persona matrix).

## Candidate (from WORK-001 gaps; convert after owner answers)

- P1: Apply-and-verify worker check-in contract + PII vault integration tests (`worker_shift_check_in/out`, `can_view_hiring_pii`, `staff_onboarding_sensitive_vault`) once gated pipeline clears. (GAPS M1/M2/M8)
- P1: Draft staffing persona matrix rows (worker, workforce manager, operations manager, finance manager, revoked/cross-org/unauthenticated) for the WS-1.1 acceptance pass. (GAPS M3)
- P2: Hiring surface consolidation per owner decision — applications, job postings, roster, audit across `/api/hiring/**` vs `/api/admin/**` vs `/api/venue/hiring/**`. (GAPS I1/I2/I6, QUESTIONS Q2)
- P2: Data-model reconciliation truth table — assignments, onboarding, applications, jobs families (bridge or retire). (GAPS I3/I4/I5, QUESTIONS Q4)
- P2: Work-mode publication type contract (shared enum; publisher↔reader parity). (GAPS R2, QUESTIONS Q6)
- P3: Resolve `hiring-audit-panel` consumer or expose audit route under `/api/hiring/**`. (GAPS M5, QUESTIONS Q7)
- P3: Retire or document legacy universal onboarding stack. (GAPS I3 legacy leg, QUESTIONS Q8)
- Paperwork: close `docs/work-packets/TA-PH0.md` checklist or convert unchecked items. (GAPS I9, QUESTIONS Q9)

## Metadata (no code)

- Expand WORKING_SET.json + ARCHITECTURE.md with `app/api/work-mode/**`, `hooks/use-work-mode.ts`, `types/hiring-roster-work-mode.ts` (or move worker actions under `/api/hiring/**`). (GAPS R1, QUESTIONS Q5)

## Done

- Control-plane bootstrap created.
- WORK-001 baseline/gaps/questions deliverables produced (BASELINE.md, GAPS.md, QUESTIONS.md) — read-only audit; no production code changed.