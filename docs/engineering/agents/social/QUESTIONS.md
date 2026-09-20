# Social Domain — Questions for Product Owner and Release Owners

> Reconciled 2026-09-11. CP-020 (feed), CP-021 (groups), and CP-022 (full realtime messaging) are accepted decisions and are therefore recorded as resolved, not repeated as open product questions.

## P1 — resolve before the next Social implementation batch

### Q1 — What is the launch acceptance for delivered realtime surfaces?

`SOCIAL-004` has membership-authorized opaque topics, typing, presence, and read receipts, while Groups has member-scoped live channels. Should launch require a staging test with two members plus a non-member proving no cross-conversation/group leakage, or is focused contract coverage sufficient until later?

**Recommended:** Require the three-person isolation test before closing `SOCIAL-004` or making realtime a release gate. This is a verification decision, not a request to reimplement the feature.

### Q2 — Is Groups discovery membership-only or public?

`GET /api/groups/threads` currently derives results from the viewer’s active `thread_members` rows (`app/api/groups/threads/route.ts:19-77`), while the UI labels the page discovery (`app/groups/groups-page-client.tsx:96-129`). Should Social add a public catalog and join/request flow, keep it as an authenticated group inbox, or defer public discovery?

**Recommended:** Keep the current membership inbox for launch and create a separate, explicitly scoped public-discovery task if product requires it.

### Q3 — Who owns collaboration outside Artist?

`/collaboration`, `/collaboration/projects`, and `/collaboration/discover` redirect away from the Social surface. Should collaboration remain Artist-only, become a standalone Social capability, or be deferred?

**Recommended:** Keep Artist as owner and mark Social collaboration routes as compatibility redirects unless product needs non-Artist participants.

### Q4 — What is the notification RPC deployment policy?

The `should_send_notification` function is present in migration source but not verified on the approved runtime target. Should the release gate require the function and grants to exist, should application code replace it, or should both remain with a tested fallback?

**Recommended:** Verify the migration on staging/production first; retain the RPC as the source of preference truth, add an explicit observable fallback policy, and do not apply migrations implicitly.

### Q5 — What should happen when notification preference checks fail?

The current application fallback returns `true`, which is safe for eventual delivery but can spam users (`lib/services/optimized-notification-service.ts:740-747`). Should failures fail closed for normal notifications, fail open only for urgent notifications, or remain fail open?

**Recommended:** Fail closed for normal notifications, fail open only for explicitly urgent notifications, and emit an alert/metric for every fallback.

## P2 — schedule after the P1 decisions

### Q6 — Which Social critical paths are release-gated in E2E?

The existing browser suite only checks that `/messages` does not redirect to login (`tests/e2e/04-qa-multi-persona-clickthrough.spec.ts:114-117`). Should the required gate include feed compose/engagement, group member isolation, DM realtime/read receipts, notification read state, collaboration redirects, and XSS payload handling?

**Recommended:** Require all of those except collaboration implementation behavior; collaboration should have a redirect/ownership assertion until its product decision changes.

### Q7 — Which Social mutations need rate limits first?

Static review found no rate-limit marker on most feed, post, follow, relationship, group, or notification route families. Should Social rate-limit every mutation or only high-volume/abusable actions?

**Recommended:** Start with post creation, comments, likes, follow/friend actions, group messages, and notification test/delivery triggers, with per-user and IP-aware limits where unauthenticated exposure exists.

### Q8 — Who owns post moderation?

The schema has moderation status/visibility fields (`supabase/migrations/20260604100000_content_moderation.sql:1-16`), but no Social report/flag workflow is visible. Should Social own reporting and queue creation, should Admin own the full workflow, or should moderation be deferred?

**Recommended:** Social owns report creation and user-facing visibility responses; Admin owns review, removal, and audit outcomes through an explicit contract.

### Q9 — Is the follow/friend dual model permanent?

`follows`, `follow_requests`, and `account_follows` are all active in the relationship/messaging paths. Should Social retain the model and publish one canonical status contract, unify storage later, or simplify to mutual follows?

**Recommended:** Retain storage semantics for now and document one canonical status/read contract before any schema consolidation.

### Q10 — Are entity-account notification preferences required for launch?

Notifications support target profiles/account types, but the current UI/API evidence does not establish a complete team/entity settings experience. Should preferences be per entity account, per human member, or all-or-nothing?

**Recommended:** Keep per-human delivery preferences plus account-scoped inbox visibility for launch; schedule entity-team controls as a separate task if operationally required.

## Handoff questions

| Question | Owner needed | Why it matters |
|---|---|---|
| Approved Supabase target and two-user test credentials | Database/Auth + Release | Needed to close realtime RLS and verify `should_send_notification` without changing migrations. |
| Collaboration route ownership | Product + Artist | Prevents Social and Artist from rebuilding or deleting the same surface. |
| Moderation workflow boundary | Social + Admin | Separates report creation from privileged review and audit. |
| Required E2E checks and branch-protection name | QA + Release | Makes Social acceptance enforceable rather than advisory. |
