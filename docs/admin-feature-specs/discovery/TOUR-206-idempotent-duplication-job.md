# TOUR-206 — Execute idempotent duplication job

## Acceptance criteria

Large copies run as a resumable job, preserve source IDs in audit metadata, generate new tokens/identities, and report per-domain completion/failure.

## Shipped

1. **Migration** — `supabase/migrations/20260720191718_tour_duplicate_jobs_tour206.sql`
   - `tour_duplicate_jobs` with unique `(org_id, idempotency_key)`, `domain_status`, `id_map`, status machine

2. **Job engine**
   - Pure helpers: `lib/admin/tour-duplicate-job.ts`
   - Service: `lib/admin/tour-duplicate-job.service.ts` — `startTourDuplicateJob`, `stepTourDuplicateJob`, `runTourDuplicateJobToCompletion`
   - Domains: metadata (new tour + null calendar token), events (skip protected), team_roles, vendors, budgets (skip paid), logistics skeletons; templates/documents/permissions soft-skipped with status
   - Audit `newValues` includes `source_tour_id`, `source_entity_ids`, `id_map`, `job_id`

3. **API**
   - `POST /api/admin/tours/:id/duplicate` — planToken + Idempotency-Key; optional runToCompletion
   - `GET /api/admin/tours/:id/duplicate?jobId=`
   - `POST /api/admin/tours/:id/duplicate/:jobId/resume`

4. **UI** — Duplicate confirm calls execute job (not shallow POST `/api/admin/tours`)

## Verify

- `npx vitest run __tests__/admin/tour-duplicate-job.test.ts`
- Apply migration when DB credentials available (`supabase db push`) — never `db reset`

## Follow-ups

- TOUR-207 archive/restore
- Worker/cron for large fanout beyond request timeout
- Full document binary + permission grant copy rules
