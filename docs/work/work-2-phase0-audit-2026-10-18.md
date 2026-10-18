# Tourify Work 2.0 — Phase 0 findings and implementation handoff
**Audit:** 2026-10-18 | **Status:** foundation utilities committed, NOT wired to production routes | **Brand:** Tourify until Flow transition

## Confirmed product decisions
1. Flow will ultimately provide the general-user Home feed. Tourify is the artist/venue/organization SaaS. Keep current product branding **Tourify**.
2. Werk is a linked professional identity under the general user account; certificates, experience, credentials and private professional documents must have granular disclosure controls.
3. Job-seeking is opt-in. Ask about work interest on entering Work; do not inject jobs into Home unless the user explicitly enables it.
4. Start with live entertainment and adjacent industries, with an extensible future for broader careers.
5. TWO publishing levels:
   - **Creative collaboration**: eligible artist account, without an employer subscription; clearly label nonmonetary terms. Must not disguise legally compensable labor.
   - **Paid employment / compensated collaboration**: eligible paid subscription **and** verified employer **and** hiring permission. Enforce the full rule for create, update, reopen, duplicate/repost, and every other publishing path.
6. Browser/search/apply is available for general users; account registration only when an action requires identity.

## GitHub audit (Tourify main)
- `app/jobs/page.tsx` is the seven-tab combined jobs/operations page. The new Work consumer UX must not remove staffing workflows.
- `app/api/jobs/route.ts` merges `artist_jobs` and `job_posting_templates` in memory and returns raw `artist_jobs` and `staff_postings` arrays with the unified feed. Replace with allowlisted v1 DTO. Review merged pagination after source count exceeds fetch cap.
- `lib/rebuild/unified-jobs-list.ts` handles the older normalized fields; Work v1 needs clear opportunity kind, pay, verification, location and state.
- `app/api/artist-jobs/route.ts` POST resolves acting context, but does not in that route check a trusted active plan, independently verified employer or paid publishing entitlement. Defaults payment to `paid`.
- `app/api/artist-jobs/[id]/repost/route.ts` can clone and immediately open a paid listing; must invoke the SAME policy.
- `app/api/artist-jobs/[id]/route.ts` has separate edit and reopen paths; update/change of kind or compensation must revalidate policy.
- `components/collaboration/enhanced-collaboration-feed.tsx` contains a Math.random()-based example matcher; do not expose those scores as true compatibility.
- `lib/job-board/publish-template-to-board.ts` writes multiple public job representations. Define canonical ownership and reconciliation for updates/fills/expiry.
- `app/collaboration/page.tsx` redirects to `/artist/collaborations`. `/work/site-maps` is unrelated operational tooling and must not be overwritten.

## Supabase findings (read-only)
- Projects: Tourify Demo `auqddrodjezjlypkzfpi` (active), Staging `dlcqfpabbgltgteqtuko` (active), Tourify-dev `jfguijrghezwfpllzsir` (inactive).
- Demo has `artist_jobs`, `artist_job_applications`, `job_posting_templates`, `job_applications`, `employment_assignments`, `profile_certifications`, `profile_experiences`, `collaboration_projects`, `skill_endorsements` and `worker_onboarding_profiles`.
- `worker_availability` and `worker_work_history` appeared in Demo, not in the Staging catalog inspection. Treat schema divergence as a release blocker.
- Staging has PostGIS 3.3.7; Demo does not. Neither had `vector` installed in the inspected `pg_extension` list. Rule-based matching should precede optional vector scoring.
- **CRITICAL:** Demo `accounts` RLS allows owner UPDATE. Staging `accounts` RLS likewise grants owner ALL. Since `accounts.is_verified` lives on that table, treating it alone as proof of employer verification is unsafe unless column-level grants/triggers specifically prevent user edits. Audit table grants and every verification write path before using it.
- Demo has `verification_requests` policies that allow owners to submit and administrators to manage reviews. Staging did not expose this table in the inspected catalog. Do not assume equivalence.
- `subscriptions` records were empty in both inspected environments, so user-facing account tier strings are NOT sufficient proof of a paid entitlement. Confirm authoritative Stripe-to-account mapping, including renewal, canceled, and grace-period behavior.

## Vercel findings
- `tourify-beta-k2` is associated with `tourify.live` and `demo.tourify.live`, but inspect domain routing/production deployment before choosing target.
- The initial five recent deployments for this project were ERROR, associated with `feat/news-index-foundation-m2`. Do not attribute this to Work; investigate release health independently.
- The Vercel project reports Node 22.x while Tourify `package.json` declares Node 20.x. Establish a runtime upgrade/matrix separately before release.

## Branch foundation changes
- `lib/work/opportunity-publication-policy.ts` defines deterministic two-tier classification and a fail-closed authorization decision over *trusted, server-supplied* authority facts.
- `lib/work/public-work-opportunity.ts` maps source rows into an explicit public field allowlist; it excludes closed/expired/unverified-paid listings when supplied correct trusted publisher eligibility.
- `lib/work/__tests__/opportunity-foundation.test.ts` covers free creative collaboration, denied paid work without required facts, financial/revenue-share classification, listing limits, expiry, and sensitive-field omission.
- **No existing API uses these modules yet.** These are safe reviewable foundations, NOT an applied enforcement fix. Do not enable a live route by passing hard-coded `true` verification/entitlement values.

## Follow-up implementation order

### 0A — Establish trusted authority and staging parity
1. Identify Stripe subscription owner, authoritative price-to-entitlement mapping and server webhook freshness.
2. Establish a protected, independently administered employer verification status. Users must be unable to self-approve through account update/RLS.
3. Verify `hiring.manage` scope against delegated account permissions, including organization/venue/tour actions.
4. Define plan limits for concurrent active paid listings and recruiter seats; reject ambiguous account status by default.
5. Reconcile Demo/Staging migration state, publication tables and necessary indexes; verify RLS with anon/authenticated/service roles.
6. Identify deployment-to-repo SHA, Vercel runtime, and actual production DB target without exposing credentials.

### 0B — Integrate publishing policy
7. Wire `canPublishWorkOpportunity` into POST artist jobs, repost, edit (PUT), reopen (PATCH), and every employer job publishing API. Require actual resolver-supplied facts.
8. Block category manipulation, mismatched paid terms, absent subscription, missing verification, and exceeded posting limits. Return consistent 400/403/409 responses and safe user-facing errors.
9. Add boundary integration tests for general, free artist, verified paid artist, venue, organization, delegated recruiter, expired subscription and permission revocation.
10. Preserve existing internal unpublished drafts but never allow unauthorized publication.

### 0C — Create new discovery read API
11. Build `GET /api/work/v1/opportunities` as a NEW endpoint using the public allowlisted projector. Resolve publisher eligibility using protected server data; no blind trusted booleans.
12. Add canonical `source + source_id` IDs and dedupe, stable ordering/cursor pagination, strict status/expiry checks and redaction.
13. Separate compensated work and genuine collaborations in query and UI. Never silently label a revenue-share project as unpaid.
14. Publish contract tests with real RLS modes and adversarial input for injected search strings.
15. Keep legacy `/jobs` and hiring dashboards operational during migration.

### 1 — Consumer Work redesign
16. Work welcome/status: actively looking, open to opportunities, browsing collaborations or just exploring; store preferences with no Home recommendations by default.
17. Discovery feed + filters + saved + applications; coherent mobile-first card system and separate collaborations.
18. Linked Werk professional profile, credential permission screens, opted-in general-profile cross-link.
19. PostGIS location discovery + explainable deterministic ranker; map and calendar.
20. Launch behind feature flag after E2E, accessibility, privacy, ranking-quality and performance checks.

## Release gates
- Never change Tourify public branding prematurely.
- Never deploy directly to production from this audit.
- CI lint/typecheck/unit tests and authenticated/anonymous API probes must pass.
- Client must not be able to set `isVerifiedPaidEmployer` or `hasPaidPostingEntitlement`.
- Unauthorized create, edit, reopen and repost must all be blocked server-side.
- Public discovery must not contain application details, contact_email, contact_phone, onboarding documents, or internal staff metadata.
- Distinct general/Werk visibility and opt-in Home feed status must be enforced.
- Record rollback strategy, tested PR commit and canonical DB target before release.
