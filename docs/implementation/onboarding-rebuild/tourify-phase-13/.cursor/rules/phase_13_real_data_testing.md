---
description: Phase 13 real-data testing rules for the Tourify Universal Hiring & Onboarding rebuild.
globs: ["scripts/**", "tests/**", "supabase/tests/**", "docs/**", "app/**", "components/**", "lib/**", "types/**"]
alwaysApply: false
---

# Phase 13 Real-Data Testing Rules

- Do not add mock jobs, mock applicants, mock candidates, mock staff members, mock documents, mock activity, or fake AI data.
- Do not make product behavior changes while validating Phase 13 unless required to fix a failing acceptance test.
- Use real Supabase preview/branch data for every end-to-end scenario.
- Use `HiringEntity` for all scenario scope.
- Validate Venue, Organization, and Artist hiring scopes separately.
- Keep application status separate from onboarding candidate status.
- Confirm token onboarding resolves the candidate employer scope and not a blind global default.
- Confirm completed onboarding creates or updates both `staff_members` and `employment_assignments`.
- Confirm sensitive fields are not present in normal `onboarding_responses.responses` JSON.
- Confirm private document storage remains private.
- Never reset the database.
- Never drop `venue_id` during compatibility validation.
