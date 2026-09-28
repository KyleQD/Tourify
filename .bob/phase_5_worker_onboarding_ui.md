---
description: "Phase 5 rules for Tourify worker-facing hiring onboarding UI."
globs: ["app/onboarding/**", "components/hiring/onboarding-module/**", "types/**"]
alwaysApply: false
---

# Phase 5 — Worker Onboarding UI Rules

- Build only the worker-facing onboarding UI in this phase.
- Do not rebuild employer dashboards, application review, roster, or template manager yet.
- The token flow must load real data from `/api/onboarding/[token]`.
- Do not use mock candidates, mock employers, mock templates, or fake progress.
- Do not create staff members or employment assignments from client components.
- Completion must submit to `POST /api/onboarding/[token]` and let the server handle roster + Work Mode writes.
- Uploaded file fields must never store raw `File` objects in final response state.
- Sensitive fields such as `bank_info`, `tax_info`, and `id_document` must be treated as sensitive and routed server-side through the credentials vault during completion.
- Keep `use client` limited to interactive form components.
- Keep `app/onboarding/[token]/page.tsx` and `app/onboarding/hire/[token]/page.tsx` as thin route wrappers.
- Use TypeScript interfaces, named exports, guard clauses, and accessible labels.
