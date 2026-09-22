# Integration Conflicts & Risks

## C1. Triple event stores already merged at read time
`/api/events/discover` and `resolve-public-event` merge `events`, `events_v2`, `artist_events`. Any new canonical layer must keep this behavior or provide a compatibility path. **Resolution:** discovery index ingests all three as native sources; `/api/events/discover` stays live until `/api/events/search` passes parity checks (dual-read behind `EVENT_DISCOVERY_V2`).

## C2. Slug namespace collision
`events.slug` is globally unique; `events_v2.slug` is unique **per org only**. Public URL `/events/[slug]` resolves `events` first. An imported event must never reuse an `events_v2`-only slug. **Resolution:** canonical slugs are generated/verified against all three tables + `event_slug_redirects`.

## C3. `events_v2` payload hidden in `settings` jsonb
Discovery fields (venue, ticket url, poster) live in settings. Index builders must normalize via the existing mapping in `lib/events/resolve-public-event.ts` (`normalizeV2`) — reuse it, don't fork it.

## C4. Dual date/time models
`events` uses `event_date` (date) + time columns; `events_v2` uses `start_at` timestamptz + `timezone`; `artist_events` uses date+time. Providers deliver ISO datetimes + timezone. **Resolution:** discovery index stores canonical `start_at timestamptz` + `timezone`; builders convert per source. DST tests required.

## C5. RLS split-brain on `events`
2024 policy "Events are viewable by everyone" (`using true`) may still coexist with the 2026 "published only" policy. Public select may be broader than intended. **Resolution:** Phase 1 RLS audit migration reconciles select policy to owner-or-published **after** verifying with the live DB (blocker EVT-000-B1 — project currently INACTIVE).

## C6. Service-role reads bypass RLS everywhere in discovery
`/api/events/discover` uses the service-role client. Leak risk for unpublished events. New search API must apply visibility rules in-query (`status='published'`, `is_public`, listability), not rely on RLS. Service-role allowlist must be updated for new routes.

## C7. Feature-flag public twins
Flags read by the browser need `NEXT_PUBLIC_` twins and registration in `ENVIRONMENT_CONTRACT` (build fails otherwise — `validate:env:production` runs pre-build). Provider secrets must never get a `NEXT_PUBLIC_` variant.

## C8. `artist_id` NOT NULL constraint is conditional
`20260325123000` only sets NOT NULL if no nulls exist. Imported provider events have no artist user. **Resolution:** imported events get `artist_id = null` rows allowed (do **not** force the constraint) — ownership is expressed via `event_claims`/`event_field_overrides` instead.

## C9. `events.status` check is `draft|published|cancelled`
Provider statuses (postponed/rescheduled) don't fit. **Resolution:** canonical status mapping stores provider detail in `event_external_sources.provider_status`; `events.status` only gets `published`/`cancelled`.

## C10. Venue identity is denormalized text in 2 of 3 stores
Only `events.venue_id` exists (nullable). Dedup by venue requires normalized text matching. **Resolution:** discovery index carries `venue_id` + normalized venue text; matcher uses both.

## C11. Cron collision / quota
Existing crons at :00 minutes. New sync cron must use off-peak minute and verify `Authorization: Bearer ${CRON_SECRET}` per existing `social-analytics` pattern.

## C12. Admin route registry & service-role allowlist CI gates
New admin pages/routes fail CI unless registered (`check:admin-route-registry`, `check:service-role-allowlist`). Register in the same commit.

## C13. Live DB unavailable
Supabase project `ndqaenaejzoxxengthsk` is INACTIVE. Live-schema diff, advisor runs, and RLS verification against the real DB are blocked until restored (EVT-000-B1). All SQL is written defensively (`if not exists`, `drop ... if exists`, `NOT VALID` constraints).

## C14. Uncommitted work inherited from `main`
The branch point carried pre-existing modified files (unrelated). Event-discovery commits must stay scoped to event-discovery paths to keep the branch reviewable.
