# Tourify Work 2.0 / future Werk — Phase 0 activation runbook

> **STATUS: DESIGN + ISOLATED TESTS ONLY. NOTHING IN THIS RUNBOOK IS AUTHORIZED TO SHIP BY ITS EXISTENCE.**  
> Current public product name stays **Tourify**. A future Werk professional identity is linked to the personal/general user; it is **not another login or account silo**.

## Present source state

- Draft PR: https://github.com/KyleQD/Tourify/pull/20
- Existing active `/api/jobs`, `/api/artist-jobs`, hiring and scheduling routes have not been switched to the new publisher policy.
- Feature flags are OFF by default:
  - `WORK_DISCOVERY_V1_ENABLED`: unpaid artist collaboration discovery preview, with strict public DTO; paid work not yet supported.
  - `WORK_EMPLOYER_REVIEW_V1_ENABLED`: internal employer-approval reviewer action.
  - `WORK_HIRING_BILLING_V1_ENABLED`: internal account-to-subscription assignment action.
- Database SQL is documentation only: `docs/work/work-hiring-entitlements-ddl-proposal.sql`.
- Root `npm ci` still fails on `date-fns` / `@base-ui/react` conflict; use isolated Work tests as *developer feedback* only, not a release check.
- No migration was executed or approved; no Vercel or production environment settings were modified.

## Reviewer authorization rules

- All review requests require a real current authenticated session and SAME-ORIGIN POST.
- Reviewer role comes exclusively from protected `auth.users.app_metadata.work_employer_reviewer === true`, read with service-role admin API.
- Billing assignment is a separate privilege: `auth.users.app_metadata.work_hiring_billing_admin === true`.
- Both roles must be provisioned by the protected admin workflow—not client-modifiable user metadata and not the public `accounts.is_verified` badge.
- Reviews apply to one active `accounts.id` whose `account_type`, `profile_table`, and `profile_id` are bound to the reviewed professional identity. Any change must invalidate the approval until reviewed again.
- No raw identity documents, tax information or reviewer notes appear in public Work APIs.

## Required tasks before enabling *any* Work feature

1. **Select the canonical release environment.** Confirm repo SHA, Vercel project/domain, Supabase project, and event/webhook environment; Demo/Staging are not schema equivalent.
2. **Fix dependency tree and root CI.** Do not release on `--legacy-peer-deps` install workaround. Audit package compatibility and lockfile under a separate reviewed PR.
3. **Generate a migration safely.** Use the installed project Supabase CLI and `supabase migration new <name>`; move the reviewed SQL proposal into that generated migration file. Do not invent a timestamp or execute this documentation proposal on a live database.
4. **Review database grants and security.** Confirm RLS enabled, `anon` and `authenticated` cannot SELECT, INSERT, UPDATE, DELETE on four protected Work authority tables and two append-only event tables. Verify service-role only access and the private-schema trigger functions. Treat public privileged RPCs as high risk.
5. **Audit existing verification and account update paths.** Protect mutable `accounts.is_verified`, `verification_requests.status` and account identity fields without silently breaking current account/profile setup. Neither legacy field may be used as employer approval.
6. **Admin reviewer provisioning.** Establish a separately reviewed process to grant/revoke the protected app-metadata roles. Require documented human evidence review and audit of personnel who perform decisions.
7. **Admin review smoke test.** Start with a dedicated test artist account in nonproduction. Ensure unauthorized, general, inactive, unverified and expired reviewer scenarios are denied; verify approval audit/event atomicity, revocation and professional-profile re-binding.
8. **Billing smoke test.** Use a suitable test Stripe subscription; confirm Stripe webhook signature, owner matching, active status, approved price and professional account type. Confirm only ONE active employer binding per subscription, transactionally, and that revocation is audited.
9. **Publication quota implementation.** A runtime `activeJobCount` is insufficient for concurrent publishes. Add a DB-enforced transactional claim/reservation covering **all** paid job sources before wiring `POST/PUT/PATCH/repost`. Check compensation changes, deadline expiry, limit reduction, status transitions and delegated hiring.
10. **Switch on publishing only after cross-source tests.** Separate free artist collaborations from paid jobs and compensated collaborations; do not let the former conceal commercial labor. Preserve legacy job links, applications, shifts and tour scope.
11. **Controlled preview of Work discovery.** Enable canary only in verified preview after RLS and response-redaction tests. Never include internal applicant information, private contact info, unreviewed paid jobs or raw source objects.

## Rollback

1. Disable every Work V1 feature flag.
2. Keep the current `/jobs` and workforce operations routes in place until separate, tested replacement.
3. Disable reviewer and billing-admin app-metadata grants where access must be suspended.
4. Preserve all append-only review/billing events for legal and operational audit. Never delete evidence as a rollback mechanism.
5. Escalate any discovered verification bypass and review all recently created employer approvals; do not auto-approve historical account badges.
6. Use a reviewed forward-fix migration for schema changes after identifying data dependencies.

## Acceptance tests

- Free artist can express interest in or post a genuine unpaid creative collaboration through the new flow.
- Paid work cannot be published without `active` eligible subscription, account-scoped entitlement, independently reviewed employer, role-specific permission and atomic quota slot.
- A user's general account remains separate from their optional linked Werk professional profile.
- No general feed job recommendation without explicit preference opt-in.
- Reviewer and billing assignment require distinct privileged protected claims.
- Account profile or account type changes invalidate approval.
- Stripe subscription cannot be assigned to two active employers.
- Expired/canceled/revoked entitlements are ineffective immediately at the next sensitive operation.
- A public API request never returns reviewer reasons, billing metadata, private contact details or application attachments.
- Root typecheck, lint, security checks, E2E and production deploy smoke tests must all pass before merging.

## Agent handoff

- **Security/DB agent:** review DDL, private role grants, account identity integrity, RLS, atomic triggers and legacy verification hardening.
- **Billing agent:** verify Stripe price mapping, webhook idempotency, account-scoped binding and revocation.
- **Workforce agent:** implement source-wide transactional paid publishing quotas before enabling jobs.
- **API agent:** implement versioned paid discovery backed by protected, real verified employers and cursor pagination.
- **QA agent:** execute test matrix against production-like preview and create a signoff record.
- **UX agent:** build Tourify-branded Work consumer UI and linked Werk professional profile after APIs stabilize.

**No agent should independently activate production flags, seed approvals, merge PR #20 or apply this DDL without explicit release authorization.**
