# Social state

- Last reviewed SHA: `7cf660ad8422dbd3adbdb77369d94638cdc2231b`
- Last reviewed at: 2026-09-11
- Completed audit: `SOCIAL-001`
- Active implementation task: `SOCIAL-004` (bounded realtime DM slice; verification pending)
- Confidence: high for static inventory and focused contracts; medium for live Realtime/RLS and deployed notification-RPC behavior

## Durable facts

- Mission: own feed, posts, follows, friends, groups, messaging, notifications, and collaboration.
- Default source paths are recorded in `WORKING_SET.json`; Social-001’s evidence-based scope expansions are recorded in its task checkpoint.
- Accepted product direction is CP-020 standalone feed, CP-021 full community groups, and CP-022 full realtime messaging in `docs/engineering/DECISIONS.md`.

## Current state

- **Feed — working:** `/feed` renders `SocialFeed` with Following/Discover/Your Posts tabs and embedded composition. The feed API/query and engagement paths exist. Remaining risk is release-grade browser coverage and compatibility-fallback observability.
- **Posts — partial:** CRUD/engagement/polls/appearance paths exist, but composition is embedded rather than a standalone route. Moderation status columns exist without a Social report workflow.
- **Follows/friends — working/complex:** entity follows and general-user friend requests are both active. The relationship contract is tested, but the canonical public status contract and management UI are not unified.
- **Groups — working/partial:** authenticated membership hub, group feed, member panel, roles, reactions, and live message/reaction channels exist. Public discovery semantics and multi-user isolation evidence remain open.
- **Messaging — working/partial:** account-scoped inboxes, trust tiers, attachments, task links, and the bounded realtime DM slice exist. `SOCIAL-004` still needs authenticated two-member plus outsider Realtime/RLS evidence and clean full verification.
- **Notifications — working/partial:** inbox, API, account scoping, preferences, channels, quiet hours, analytics, and realtime subscription exist. Deployed RPC verification, fail-open policy, entity settings, and delivery-log observability remain open.
- **Collaboration — redirect-only:** Social entrypoints route to Artist or Discover; ownership is unresolved.
- **Social integrations/analytics — partial:** connect/disconnect and analytics cron/service paths exist; user-facing analytics ownership is unresolved.

## Priority next steps

1. Close `SOCIAL-004` only after staging two-member/non-member isolation, then retain the evidence in the task record.
2. Define whether Groups discovery is membership-only or public; do not add another route until the contract is decided.
3. Verify `should_send_notification` and grants on the approved target under CP-051; decide and test the failure fallback.
4. Add Social critical-path E2E/security coverage: feed, groups, realtime messaging, notification state, route ownership, rate limits, and XSS.
5. Resolve collaboration ownership, moderation ownership, entity notification settings, and the canonical follow/friend status contract.

## Known risks

- Live Realtime/RLS isolation is unverified for both DM and group channels.
- `should_send_notification` source evidence exists, but deployed state is unknown; application fallback is fail-open.
- Notification delivery-log failures are swallowed after a warning.
- Principal Social mutation families lack consistent visible rate-limit markers.
- E2E coverage is not yet representative of Social release risk.
- Feed schema fallback variants can mask deployment drift.

See `BASELINE.md`, `GAPS.md`, and `QUESTIONS.md` for the evidence-backed inventory and follow-up sequencing.

## Production launch graph — 2026-09-16

- SOCIAL-004 is a P1 core launch dependency. Conversation membership must guard reads, sends, topics, typing, presence, and read state at the server or data boundary.
- Closure requires cross-user and cross-tenant denial, reconnect/duplicate/offline behavior, and a live two-member isolated-staging verification.
