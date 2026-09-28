# WORK-105 — Identity merge / reconciliation

**Date:** 2026-07-20  
**Spec:** `06_Workforce_Hiring_Roster_and_Scheduling.md`

## Acceptance criteria

Authorized workflow identifies likely duplicates, previews references, merges safely, retains audit/aliases, and never auto-merges on weak signals.

## What shipped

- `lib/admin/workforce-identity-merge.service.ts`
  - `findWorkforceDuplicateCandidates` — strong (`same_user_id`, `same_email_employer`) vs weak (`same_name_only`)
  - `previewWorkforceMerge` — reference counts; `canMerge` only for strong
  - `executeWorkforceMerge` — requires `confirmPreview`; retires alias row; writes `workforce_identity_aliases`
- Migration `20260720174000_workforce_identity_aliases_work105.sql` + `can_workforce` RLS
- API `GET/POST /api/admin/workforce/identity-merge` (capability-gated)

## Policy

Weak signals are listed for review but **blocked** from merge execution. No background auto-merge.

## Follow-ups

- Admin UI surface for merge preview (optional polish)
- TRAVEL-101 next in phase order
