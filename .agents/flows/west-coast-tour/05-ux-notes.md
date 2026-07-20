# UX / UI notes template

Copy into `docs/audits/flow-notes/{stage}.md` (or append dated entries).

```markdown
# Flow notes — {stage} — {YYYY-MM-DD}

## Environment
- Base URL:
- Seed mode: cast / cast+scenario
- Actor:

## Findings

### P0 — Blocks flow
- **Title:**
  - Route / component:
  - Repro:
  - Expected:
  - Actual:
  - Fix suggestion:

### P1 — Severe friction
- **Title:**
  - Route:
  - Repro:
  - Fix suggestion:

### P2 — Polish
- **Title:**
  - Note:

## Optimizations worth shipping
1.
2.

## Passed without issue
-
```

## Severity guide

| Level | Meaning |
|-------|---------|
| P0 | Cannot complete checklist step |
| P1 | Can complete only via API/seed bypass or confusing multi-step workaround |
| P2 | Cosmetic / copy / minor IA |

## Summary file

Orchestrator maintains `docs/audits/flow-notes/SUMMARY.md` with counts and links to per-stage notes.
