---
description: Phase 11 upload, PII, and compliance rules for Tourify universal onboarding.
globs: ["app/api/hiring/onboarding/**", "app/api/admin/onboarding/documents/**", "lib/hiring/**", "lib/services/**", "types/**", "supabase/migrations/**"]
alwaysApply: false
---

# Phase 11 — Uploads, PII, and Compliance Rules

- Do not add mock uploaded documents.
- Do not add fake compliance results.
- Do not make staff document buckets public.
- Do not store raw SSN, bank info, or tax data in normal `onboarding_responses` JSON.
- Do not let client components insert directly into `staff_documents`.
- Uploads must go through `/api/hiring/onboarding/upload` or another backend route with equivalent token/session validation.
- Token uploads must resolve `staff_invitations` → candidate → `HiringEntity` before storing metadata.
- Authenticated uploads must validate `can_manage_hiring()` for the supplied employer scope.
- Document reviews must validate employer scope before updating `staff_documents`.
- Use signed URLs for document reads after permission checks.
- Keep `venue_id` as compatibility data only; use `employer_entity_type` + `employer_entity_id` as the canonical scope.
- If an existing credentials vault exists, use it for SSN, bank, tax, and other sensitive fields.
- Do not start Phase 12 persona route separation in this phase.
