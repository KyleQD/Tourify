---
description: Phase 3 rules for Tourify universal onboarding template resolution and token onboarding.
globs: ["app/api/onboarding/**", "lib/services/**", "lib/hiring/**", "types/**", "supabase/migrations/**"]
alwaysApply: true
---

# Phase 3 — Template Resolver and Token Onboarding Rules

- Token onboarding must never blindly load a global default template.
- Resolve the employer from candidate/invitation/job data before resolving the onboarding template.
- Prefer `employer_entity_type` + `employer_entity_id` over `venue_id`.
- Keep `venue_id` fallback support during migration.
- Use the resolver priority:
  1. explicit template id
  2. employer position/department match
  3. legacy venue match
  4. employer default
  5. global position/department match
  6. global default
  7. static safe fallback
- Static fallback is only a safety net, not normal production behavior.
- All production dashboard/template data must come from Supabase rows.
- Do not introduce mock candidates, mock invitations, mock templates, or local-only stats.
- Service-role client usage is allowed only for server token validation and must not be imported into client components.
- If existing token POST logic already creates `staff_members` and `employment_assignments`, merge resolver changes instead of deleting proven completion logic.
- Do not begin Phase 4 API cleanup until Phase 3 route/template resolution is validated.
