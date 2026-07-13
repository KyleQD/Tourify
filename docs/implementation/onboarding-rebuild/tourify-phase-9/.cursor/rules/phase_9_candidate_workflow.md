---
description: Phase 9 rules for Tourify candidate onboarding kanban and workflow UI
globs: ["components/hiring/**", "lib/services/**", "app/api/admin/onboarding/**", "types/**"]
alwaysApply: false
---

# Phase 9 — Candidate Workflow Rules

- Do not use mock candidate data, mock documents, or fake activity.
- Candidate data must come from real `staff_onboarding_candidates` rows.
- Candidate rows must be scoped by `employer_entity_type` and `employer_entity_id`.
- Do not let client components update `staff_members` or `employment_assignments` directly.
- Document review must verify employer scope before updating `staff_documents`.
- Do not add drag-and-drop status mutation until the server has guarded status transitions.
- Keep application status separate from onboarding status.
- Keep onboarding completion separate from final roster assignment.
- Preserve existing credential vault behavior for sensitive onboarding data.
- Empty kanban columns and empty states must represent true empty Supabase results.
