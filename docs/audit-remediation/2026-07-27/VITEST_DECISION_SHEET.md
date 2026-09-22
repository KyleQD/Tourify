# Vitest contract decision sheet

**Run:** July 28, 2026  
**Result after runner repair:** 4,212 passed, 14 failed, 2 skipped  
**Rule:** No remaining behavior assertion is changed without the recorded product
contract being approved.

Runner-only corrections already completed:

- `server-only` is explicitly mapped to a Vitest node stub.
- `@tourify/api-contracts` resolves to the workspace source.
- Four Jest-owned files are excluded from duplicate Vitest execution.
- Cron tests now enforce the handoff’s secret-required contract.
- Time-sensitive poll tests use an explicit clock.

| Test/group | User-visible contract | Current implementation/test disagreement | Recommended decision | Approval status |
|---|---|---|---|---|
| `admin/event-tour-builder` | Creating a tour preserves explicitly attached existing event IDs and new route stops. | Builder emits no `event_ids` for the fixture. | Inspect builder payload and fix source if attachments are still supported; otherwise gate attachment UI and replace with an API behavior test. | BLOCKED_PRODUCT_REVIEW |
| `feed/event-share` | Signed-in users can share an event without leaking auth authority into presentation-only props. | Source-text assertion disagrees with the current `EventHero` composition. | Replace fragile source-text assertion with rendered share-menu behavior after confirming owner/viewer CTA rules. | BLOCKED_PRODUCT_REVIEW |
| `feed/music-post-preview` | Music feed posts use the approved player rather than a cover-image-only card. | Source-text assertion no longer finds the expected component at the old location. | Trace the rendered feed card; fix source if playback is absent, otherwise move the assertion to the current component. | BLOCKED_PRODUCT_REVIEW |
| `logistics-route-contract` — equipment | Authorized logistics item reads expose bounded equipment assignments. | Route source no longer matches the asserted select/shape. | Confirm the canonical equipment assignment relation, then repair the route and add an API contract test. | BLOCKED_SCHEMA_DECISION |
| `logistics-route-contract` — site maps | Site-map creation uses a minimal return projection and optional event scope. | Route source no longer matches the asserted query contract. | Confirm event ownership and minimal response fields, then repair route behavior rather than source text. | BLOCKED_SCHEMA_DECISION |
| `public-artist/owner-only-empty-states` — music/posts | Empty public sections stay hidden while owners receive non-public editing guidance. | Three source-text expectations disagree with the redesigned public page. | Approve owner-preview UX and convert to rendered owner/visitor tests. | BLOCKED_PRODUCT_REVIEW |
| `public-artist/owner-only-empty-states` — storefront/EPK/media/about | Empty sections are not exposed to visitors. | Current conditional composition differs from the expected old strings. | Verify rendered empty states for owner and visitor; fix source only for actual exposure. | BLOCKED_PRODUCT_REVIEW |
| `public-artist/owner-only-empty-states` — owner controls | Owners see edit controls and do not see Follow/Message/Hire actions for themselves. | Expected legacy links/prop strings moved or changed. | Preserve the behavior contract and replace source-text assertions with rendered CTA assertions. | BLOCKED_PRODUCT_REVIEW |
| `social/follow-friend-ecosystem` | Discover uses the canonical follow/friend control, not the legacy raw follow endpoint. | The route delegates to `DiscoverPageClient`, so the test checks the wrong file. | Trace `DiscoverPageClient`; fail only if it uses the legacy endpoint, otherwise move the assertion. | BLOCKED_TEST_REVIEW |
| `profile/account-author-feeds` | Public profile APIs emit canonical author profile IDs. | Expected source token is absent from one or more current API implementations. | Confirm DTO field and add response-schema tests to each active profile API. | BLOCKED_SCHEMA_DECISION |
| `profile/artist-public-profile-parity` — links | Discover music cards link by canonical slug/handle, with UUID only as a compatibility fallback. | Current component source differs from the expected old link construction. | Confirm canonical public path and test resolved href behavior. | BLOCKED_PRODUCT_REVIEW |
| `profile/artist-public-profile-parity` — hero actions | Non-owners see approved Follow/Message actions; owners do not. | Current hero composition differs from the source-text contract. | Approve CTA matrix and use rendered persona tests. | BLOCKED_PRODUCT_REVIEW |
| `profile/artist-public-profile-parity` — signup | Artist onboarding creates the required `artist_profiles` compatibility row. | Signup source no longer contains the asserted creation path. | Decide whether trigger, RPC, or route owns profile creation; test one authoritative transaction. | BLOCKED_SCHEMA_DECISION |
| `profile/artist-url-slug` | Artist onboarding and legacy creation establish a unique public slug. | Expected slug write is missing from current route source. | Decide trigger versus application ownership, then add uniqueness and compatibility tests. | BLOCKED_SCHEMA_DECISION |

These failures remain open under `AUDIT:TST-003`/`AUDIT:TST-004`. They must not
be hidden by weakening the Vitest CI job.

