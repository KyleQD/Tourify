# Guestlist Games — Embedded Feed Mini-Games
**Status:** Implemented on unmerged development branch; browser QA and final build verification pending.
**Date:** October 18, 2026
**Branch:** `feat/feed-living-experience-20261017` · [Draft PR #17](https://github.com/KyleQD/Tourify/pull/17)

## Product decision

**Guestlist Games** is the official name of lightweight playable experiences inserted among genuine Tourify social posts. **Tourify Arcade** remains the directory for full Beat Deck and DJ Odyssey adventures. This replaces the proposed name "Arcade Moments". Do not advertise these as sponsored posts, third-party ads, prizes, verified rankings, or licensed club competitions.

### MVP user experience
1. Logged-in `/dashboard` > Friends / Discover tabs render genuine posts via `DashboardFeed`.
2. After organic post **#10**, show a **Guestlist Games** 20-second Beat Deck preview card.
3. After organic post **#30**, show a 30-second **DJ Odyssey: Santa Barbara Sprint** preview card. Both modules are displayed even though the posts API loads in batches of 20.
4. No other game cards in that feed render. No cards in **Your Posts**, separate News or Work flows.
5. The card is *preview-only by default*. Play Now lazy-loads the small original mini-game into that same card; Play Again and full-size Arcade links work after completion.
6. Beat Deck: four colored falling-note lanes with D/F/J/K or tap pads, 20-second clock, judged score and streak; keyboard events scoped to focused mini-game section only, never intercepted globally.
7. DJ Odyssey: 30-second Santa Barbara sprint; the DJ runs along a stylized coast, vinyl is collected at checkpoints, the player taps Jump or uses W/Space/Up to avoid incoming wave obstacles. Three hearts; scores based on vinyl and successful waves.
8. Mini-games remain **silent**, do not autoplay media, do not create audio contexts, and **do not pause or alter the existing jukebox**. The full games continue their independent audio rules.
9. IntersectionObserver pauses an active mini-game when less than ~12% visible. Switching to a background tab pauses; Resume requires deliberate user action. Paused games do not tick timers. Unmounting ends the timer.
10. Results are device-only `localStorage` best scores; they are not verified, published posts, prizes or anti-cheat protected leaderboards.

## Placement architecture

- `lib/feed/guestlist-games.ts` is the single deterministic insertion policy. Inputs: 1-based number of **already-rendered organic posts**, active tab, selected frequency. Outputs: `GuestlistSlot` or null.
- Default frequency `normal`: post 10 Beat Deck, post 30 DJ Odyssey, max **2 slots** per view. `fewer`: **one** Beat Deck after post 30. `off`: no games.
- `GUESTLIST_PREFERENCE_KEY = tourify:guestlist-games:frequency:v1`; stored locally only. A control above the feed exposes Occasionally / Show fewer / Hide games so hidden cards can always be restored. Each card offers Show fewer and Hide actions.
- Keep the original `/api/feed/posts` pagination (**20 genuine posts/page**) and returned post objects unmodified. Do not write game modules to `posts` or change offsets, engagement counts, cursor semantics or RLS.
- Original discovery rail slots: events #3, music #6, artists #10. With Guestlist Games visible, artist rail shifts to **#14** to avoid colliding with the first inserted game. When off, rail returns to post #10.
- `components/dashboard/dashboard-page-client.tsx` no longer shows the redundant pre-feed Arcade teaser. `/arcade` and the `FeedArcadeTeaser` component are preserved for use elsewhere.
- Kill switch: `NEXT_PUBLIC_GUESTLIST_GAMES_ENABLED=false` at **build time** (redeploy) suppresses feed game cards and restores default discovery placement; preview branch defaults enabled. No database switches or migrations.

### Components
- `components/arcade/guestlist-game-card.tsx`: first-party card UI with name, preview, opt-in Play, full-game link, visible preference controls, lazy import.
- `components/arcade/guestlist-game-session.tsx`: playable Beat Deck and Santa Barbara Sprint timers and input, touch controls, score, pause/resume/replay, intersection visibility.
- `components/dashboard/dashboard-feed.tsx`: only post-loop placement wiring and preference control; existing posts, reactions, comments, deletion and infinite scrolling remain as before.
- `__tests__/arcade/guestlist-games.test.ts`: placement, cross-page 20-post pagination, insertion isolation, tabs, opt-out and rail regression suite.
- `.github/workflows/arcade-unit-tests.yml`: extended to test Guestlist Games alongside existing Arcade rules on relevant changes.

## Non-negotiable safety and UX constraints

- No personal identifying data collected or shared from gameplay. Local bests are optional browser data. The MVP adds no analytics endpoints. If tracking is added later, obtain the appropriate privacy/legal review, aggregate minimally, support consent and retention limits, and do not silently record keypress streams.
- Don't infer employment seeking, protected traits or age from gameplay; don't use games to camouflage sponsored content or job advertisements.
- No licensed music or scraped venue media in the mini-games. Venue themes are independent, original vector/CSS illustrations with no claimed commercial partnership. The Santa Barbara mini references an EOS themed setting, not an official EOS-sponsored contest.
- Keyboard controls must be active **only within the focused game**; they must not interfere with typing, screen-reader controls, post composition, navigation, or other focused components.
- No scroll jacking, autoplay music, forced game completion, blocking modal, or hijacked touch scrolling.
- If JS is disabled, ordinary feed posts must remain accessible according to existing product behavior. A guestlist module loading failure should not prevent a post from rendering.
- Avoid introducing additional network/API calls for every game card: the micro challenges are local and lazy-load only after explicit activation.

## Release acceptance checklist (required before merging)

1. CI: Guestlist Games unit tests plus existing Arcade CI pass; Vercel final feature branch compiles and is **READY**. Inspect failures and fix before release. Existing independent root dependency / Mobile CI issues remain tracked.
2. Run actual desktop Chrome, Firefox, Safari and mobile Safari/Chrome tests: first 20 organic posts has exactly one game after #10; scrolling to #30 shows the second card (no extra posts or duplicated discovery rails). Test 0, 9, 10, 20, 30 and >50-post feeds.
3. Switch Friends, Discover and Your Posts tabs; no games in Your Posts and no interference with News or Work routing. Game sessions unmount safely on tab changes.
4. Click Show fewer, Hide games, and restore via the feed selector; verify persistence after refresh and responsive layout with the browser's storage disabled.
5. Start Beat Deck, press D/F/J/K and touch pads, intentionally hit/miss targets; ensure no double scoring. Focus a comment box: typing must not trigger game input. Verify screen readers and keyboard-only tab flow.
6. Start DJ Sprint, jump across six waves and collect nine vinyl; test missed waves/life exhaustion, play again, early quit, scrolling out/in, minimized browser tab, and zero background timers.
7. Play music in the Tourify Jukebox before starting Guestlist Games. It must continue uninterrupted; no mini-game sound should start.
8. Confirm the 20s and 30s games function on low-end mobile hardware and that the full Arcade links open the correct routes.
9. Verify no database writes, posts endpoint changes, permissions grants or premium entitlements were added and that cards are clearly first-party Guestlist Games rather than real posts.
10. Rollout: first preview QA, then opt-in staged audience and engagement guardrails, including post engagement, dismissal rates, voluntary game starts/completions, reload errors and page performance; add telemetry **only after** event/privacy design approval.

## Future extensions — NOT implemented in MVP
- Server-managed feature rollout, frequency experiments and user-level preferences across devices.
- Artist opt-in licensed challenges/beatmaps, pre-moderated game cards, editorial rotation by genre, special guestlists, accessible alternative gameplay modes.
- Verified scores, friends challenges and server-side leaderboards with anti-cheat.
- Share-as-post results through the normal authorized post composer with explicit user action and consent.
- Real venue partnerships and prize redemption, conditional on contracts, eligibility and rights review.

The draft PR is not production. Do not merge solely based on targeted unit tests.
