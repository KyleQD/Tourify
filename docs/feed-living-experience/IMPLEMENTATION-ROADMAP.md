# Tourify Living Feed — Engineering Roadmap

Status: **in development** · Owner: Tourify social/feed team · Created: 2026-10-17

## Product intent

Make the logged-in Tourify feed a playful home for community, music, events, artist discovery and creativity. This is an **additive** redesign, not a replacement for the post system.

### Source-of-truth / release safety

- \`app/feed/page.tsx\` redirects to \`/news\`. News Pulse is a **distinct news product**, not the signed-in social feed.
- Signed-in home route: \`app/dashboard/page.tsx\` -> \`components/dashboard/dashboard-page-client.tsx\` -> \`components/dashboard/dashboard-feed.tsx\`.
- Existing social surfaces also live in \`/community\`, artist/venue-specific components, and \`apps/mobile\`. Audit them before shared refactors.
- GitHub \`main\` was last committed 2026-07-20 at \`76d8389\` when this work began; newer Vercel preview deploys use \`v0/epk-design-system-upgrade\` (\`439b2a9\`). The latest Vercel **production-target** deployment record was \`main\`. Do not assume that an unmerged feature branch is production.
- Work branch: \`feat/feed-living-experience-20261017\`, based on \`v0/epk-design-system-upgrade\`. Do not merge it into a divergent base without a reviewed integration plan and CI.

## What is in the initial branch

- [x] Scene hero with verified navigation destinations (music, events, people, discover).
- [x] Reusable accessible horizontal discovery rail.
- [x] Renders genuine event, music, photo, and artist highlights from *already-authorized* feed API responses. No seeded metrics, made-up local recommendations, or additional privileged queries.
- [x] Dedupe entities across multiple posts and reject unsafe metadata URLs.
- [x] Inject contextual event/music/artist discovery modules between the existing post cards.
- [x] Differentiate event, music, and other post cards with non-disruptive gradient treatments.
- [x] Preserve existing \`DashboardFeed\` post/create/like/comment/delete/share endpoints and account scoping.
- [x] Add Vitest selector tests.
- [ ] Run full typecheck, test suite, mobile visual snapshots, and keyboard/screen-reader review in a checked-out worktree.
- [ ] Verify staging preview deployment, then review integration-base reconciliation.

**Important:** The first rails are *highlights from the loaded feed*, not independently ranked "trending" content. They are not expiring 24-hour stories and do not claim proximity. Do not relabel them as such until corresponding services exist.

## Arcade extension (new development slice)

A playable Tourify Arcade is now included on the same feature branch:
- Beat Deck: rhythm highway with keyboard/touch, practice charts, creator-track streaming and synthesized beat.
- DJ Odyssey: original club-themed vinyl-collecting retro platformer.
- Arcade hub and feed shortcuts.
- Gameplay details, QA and artist licensing caveats: [ARCADE-HANDOFF.md](ARCADE-HANDOFF.md).

This is **not yet a full fan-wide music game**: artist-approved interactive soundtrack usage requires a separate, explicit opt-in and rights-cleared charting. Scores are local to the game session. The PR remains draft until testing and branch reconciliation.

## Workstreams and execution order

### F01 — Stable integration base (Blocker / P0)
Agent: Platform Integration.
1. Determine the canonical branch for the application and the production/staging domain bindings; compare \`main\`, \`v0/epk-design-system-upgrade\`, and any newer integration branches.
2. Preserve newer code; never reset the DB or force-push to reconcile.
3. Confirm \`/dashboard\`, \`/community\`, \`/news\` roles and remove only provably dead duplicate feed components.
4. Create a feature-flag rollout contract (\`livingFeed\`) with a safe fallback to the current dashboard.
5. Gate all merges with typecheck, tests, a preview, and designated approval.

Acceptance: working preview against the chosen integration base; no silent code loss; verified rollback path.

### F02 — Feed card design system (P0)
Agent: Feed Frontend.
1. Inventory each post payload type and its existing preview renderer.
2. Create shared styled wrappers for text, artist, event, album/song, image/gallery, video, article, shop listing, and collaboration content.
3. Make layout follow content: hero event poster, artwork-led music tile, cinematic video, compact text and editorial long-form.
4. Reuse existing event, music, poll, gallery, listing, and article components rather than copy handlers.
5. Map existing EPK/profile/post appearance palettes into a sanitized token-only theme contract.
6. Set bounded image aspect ratios, descriptive alternatives, accessible action labels, hover/focus states, and reduced-motion behavior.

Acceptance: each post type has a distinct responsive appearance; equal access to like/comment/share/save and account attribution; no fake engagement data.

### F03 — Creative post composer and templates (P1)
Agent: Creation & Publishing.
1. Audit \`QuickPostCreator\`, \`PostCreator\`, cross-platform composer and \`POST /api/feed/posts\` before changing fields.
2. Add real composition entry points: update, photos, music, event, poll, collaboration. Hide unavailable actions instead of dead buttons.
3. Let authors select previewable post styles with palette/type/layout IDs; reject arbitrary HTML/CSS/JS.
4. Persist the chosen template with versioned metadata only after validating the server contract and RLS.
5. Preserve acting-account selection and friend/public/private visibility.
6. Implement draft recovery, uploads with progress/error retry, keyboard controls, and a preview that matches rendered posts.

Acceptance: appearance persists across refresh and other viewers; existing posts render unchanged by default; unauthorized account publishing denied.

### F04 — Reactions and playful interaction (P1)
Agent: Social Engagement.
1. Keep the current like operation and counts as compatibility behavior.
2. Specify an extensible reaction model (like, love, fire, applause, wow, etc.), with one active reaction per account per post if product-approved.
3. Add per-reaction counts and optimistic updates with rollback, rate limits, and abuse controls.
4. Add celebratory micro-animations that obey \`prefers-reduced-motion\`; never block scrolling.
5. Expand interactive polls, comment previews and copy/share flows on existing endpoints.

Acceptance: no double count under rapid clicks, duplicate sessions or network retries; screen-reader feedback; no RLS bypass.

### F05 — Discovery services and honest rankings (P1)
Agent: Recommendations/Data.
1. Use accessible public event/music/artist records; design separate page-scoped query services for each rail.
2. Scope requests by account, permission, visibility, public content moderation and block/mute relationships.
3. Expose optional city/region filtering **only when user supplies or consents to a location**.
4. Compute trending from defined time windows and approved engagement signals with anti-spam weighting; document scoring and freshness.
5. Add actionable "Not interested", block/report and editorial override tools.
6. Cache public aggregates; avoid mixing private feed rows into globally shared caches.

Acceptance: empty states are honest, local labels have verified local data, rankings are explained, and permissions are tested server-side.

### F06 — Stories, spotlights, and live events (P2)
Agent: Live & Events.
1. Treat existing carousel as highlights until stories are modeled.
2. If ephemeral stories are desired: define owner, visibility, expiry, storage retention, deletion, safe thumbnail, viewed-state and moderation contracts.
3. Pull real event start times and timezone-aware countdowns; avoid displaying stale "LIVE" badges.
4. Wire RSVP/ticket buttons to existing event pages and real availability.
5. Add artist and venue spotlights with attribution and direct profile navigation.

Acceptance: expirations are enforced server-side, not merely hidden in UI; live/counter data uses source-of-truth status.

### F07 — Inline entertainment/media (P1)
Agent: Music & Video.
1. Coordinate one active audio/video source across post players and the dashboard jukebox.
2. Support a persistent player without restarting streams when scrolling, subject to playback rights.
3. Respect audio preview and access modes, signed stream URLs, bandwidth budgets and autoplay policy.
4. Use \`FeedMediaGrid\`, \`FeedMusicPlayer\`, \`FeedVideoPlayer\` and native captions/posters when possible.
5. Lazy-load offscreen embeds, defer heavy player bundles, prevent cumulative layout shift.

Acceptance: no overlapping audio, rights remain enforced, offline/error and reduced-data experiences degrade gracefully.

### F08 — Responsive and native-mobile parity (P1)
Agent: Mobile & Accessibility.
1. Desktop: calm 3-column experience, stable center feed and optional contextual right rail. Mobile: immersive single column with horizontal snap discovery.
2. Port shared model and approved design tokens to \`apps/mobile/app/(tabs)/feed.tsx\` and its feed-list/quick-composer components.
3. Add keyboard navigation, focus-visible styling, accessible carousel labels, alt text, 44px-ish touch targets and tested contrast.
4. Avoid fixed viewport assumptions and keep layouts resilient on small screens and large font sizes.
5. Honor reduced motion, data-saver and lower-memory devices.

Acceptance: QA across common mobile widths and text scaling; no keyboard traps or scroll-jank regressions.

### F09 — Flow ecosystem-ready contracts (P2)
Agent: Shared Platform.
1. Keep the current Tourify service operational throughout the future Flow transition.
2. Extract **presentation primitives and normalized contracts**, not hard-coded Tourify route paths, into a versioned shared package only when multiple products actually adopt them.
3. Define per-product visual tokens and content scopes for Heat, DreamStream, Werk and other future apps.
4. Maintain one identity and permission model; no duplicate user accounts or shadow post databases.

Acceptance: components portable without leaking organization-only fields, credentials, or private content.

### F10 — QA, telemetry and release (P0 / continuous)
Agent: Quality & Release.
1. Run \`npm run typecheck\`, \`npm run test:unit -- --run\` or targeted \`npx vitest run __tests__/feed/feed-discovery.test.ts\`, and app build on a clean branch.
2. Add Playwright coverage for new/empty/busy/following/personal feeds, opening each card, reactions, comments, media, links, and acting account.
3. Audit Supabase policies, feed API authorization, error handling, and moderation paths before adding any DB objects.
4. Instrument real click-through, save/RSVP, media playback, composer completion, and latency with opt-out/privacy controls.
5. Test network throttling, virtualization, media loading, reduced motion, small screens, long posts, and focus order.
6. Use a gated preview and staged release. Monitor error rates and latency; keep feature flag rollback.

Acceptance: no regression in posting/visibility, no unreviewed migrations, no incorrect analytics, and a documented rollback.

## Dependencies / no-go checks

- **DO NOT** create a second social feed source-of-truth or recode News Pulse as a feed.
- **DO NOT** show stubbed "trending", "near you", "live", or ticket/RSVP states as real data.
- **DO NOT** bypass auth scopes, Supabase RLS, blocking, author selection, media access or image ownership/protection.
- **DO NOT** silently publish new pages or deploy to production from an unmerged preview branch.
- **DO NOT** claim full Flow sharing, ephemeral stories, and animated multi-reactions are shipped in the initial UI slice.

## Handoff checklist

Each agent delivers: files changed; legacy behavior preserved; API and data contracts; accessibility and security checks; tests run/results; screenshots of desktop/mobile; reviewer notes; outstanding risks; rollback procedure. Update this document and the central Flow/Tourify implementation tracker at each merge.
