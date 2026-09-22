---
description: Phase 4 API cleanup rules for Tourify universal hiring and onboarding.
globs: ["app/api/**", "lib/api/**", "lib/services/**", "types/**"]
alwaysApply: false
---

# Phase 4 API Cleanup Rules

- Every employer-scoped route must resolve a `HiringEntity` before reading or writing data.
- Prefer canonical `/api/hiring/*` routes for new UI work.
- Legacy `/api/admin/*` routes may remain as adapters during migration.
- Do not duplicate application approval bridge logic in route handlers.
- Approval must delegate to `HiringOnboardingService.approveApplication()`.
- `POST /api/job-applications` must copy employer scope from the job posting row.
- Do not trust client-submitted `employer_entity_type` or `employer_entity_id` for applicant submissions.
- Do not add mock API responses.
- Expected errors must return structured `{ ok: false, error }` payloads.
- Keep `venue_id` compatibility until the planned migration window ends.
```
