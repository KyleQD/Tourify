# PUB-207 — Retract / supersede

**Date:** 2026-07-20  
**Spec:** `04_Publication_Sharing_and_Work_Mode.md`

## Acceptance criteria

Access reflects current state immediately; recipients receive correction/retraction; old versions remain in authorized audit/history.

## Implementation

| Piece | Path |
|---|---|
| Pure lifecycle helpers | `lib/admin/publication-lifecycle.ts` |
| Retract / supersede / history / invalidate | `lib/admin/publication-lifecycle.service.ts` |
| APIs | `POST .../snapshots/[id]/retract`, `POST .../supersede`, `GET .../history` |
| Auto-supersede on republish | `publishTourBookTransactionally` → `supersedePriorCommittedSnapshots` |
| UI | Share dialog history + retract; public viewer messages for retracted/superseded |

## Immediate access invalidation

1. Snapshot status → `retracted` or `superseded` (payload untouched)  
2. Active share tokens → `revoked_at` set  
3. Open deliveries → `status=revoked`  
4. Outbox notice → `publication.retracted` / `publication.superseded` for recipients  
5. Audit + history list retain superseded/retracted rows  

## Upstream

PUB-102 schema fields (`status`, `superseded_by`, `retracted_*`); PUB-204 commits; PUB-206 share gate already denies retracted/superseded snapshots.
