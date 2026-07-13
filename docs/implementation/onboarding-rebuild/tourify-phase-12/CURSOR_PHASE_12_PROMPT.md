You are implementing Phase 12 of the Tourify Universal Hiring & Onboarding rebuild.

Use the attached Phase 12 files only. Do not start Phase 13.

Add or merge:
- types/persona-onboarding.ts
- lib/onboarding/onboarding-route-utils.ts
- lib/onboarding/persona-onboarding-config.ts
- components/hiring/onboarding-module/persona-onboarding-flow.tsx
- app/onboarding/page.tsx
- app/onboarding/[token]/page.tsx
- app/onboarding/hire/page.tsx
- app/onboarding/complete/page.tsx
- app/onboarding/enhanced-onboarding-flow/page.tsx
- patches/next-config-redirects.snippet.ts
- docs/phase-12-persona-onboarding-separation.md
- .cursor/rules/phase_12_persona_onboarding_separation.md

Critical:
1. Do not blindly overwrite existing signup or account-creation logic in /onboarding/page.tsx.
2. Keep platform/persona onboarding on /onboarding.
3. Keep staff hiring onboarding on /onboarding/hire/[token].
4. Redirect legacy /onboarding/[token] to /onboarding/hire/[token].
5. Redirect /onboarding?token= to /onboarding/hire/[token].
6. Do not create staff_members, staff_invitations, staff_onboarding_candidates, or employment_assignments from persona onboarding.
7. Do not add mock users, mock profiles, mock staff, mock candidates, or fake onboarding activity.
8. If POST /api/onboarding/unified differs in this repo, adapt PersonaOnboardingFlow to the existing platform onboarding endpoint only.
9. Merge next-config-redirects.snippet.ts into next.config.ts only if centralized redirects are preferred.

Run:
pnpm typecheck
pnpm lint

Manual route validation:
- /onboarding
- /onboarding?type=artist
- /onboarding?type=venue
- /onboarding?type=organization
- /onboarding?token=<valid-token>
- /onboarding/<valid-token>
- /onboarding/hire/<valid-token>
- /onboarding/enhanced-onboarding-flow
- /onboarding/complete

Stop after Phase 12 validation. Do not start Phase 13 real-data testing yet.
