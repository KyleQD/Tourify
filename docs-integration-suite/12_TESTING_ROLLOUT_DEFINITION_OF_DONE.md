# 12 — Testing, Rollout and Definition of Done

## Testing strategy

### Unit tests

- Provider query builder.
- Provider response validation.
- Normalization.
- Title, venue and performer normalization.
- Date and timezone conversion.
- Distance query parameter validation.
- Filter parsing.
- Cursor encoding/decoding.
- Deduplication score.
- Source authority resolution.
- Ticket URL validation.
- Retry classification.
- Rate-limit accounting.

### Database tests

- RLS for anon, owner, account member and admin.
- Unique provider identity.
- Nearby function radius filtering.
- Distance ordering.
- Date boundaries.
- Geographic indexes.
- Search vector.
- Job claiming concurrency.
- Stale lock recovery.
- Merge transaction.
- Redirect resolution.
- Backfill idempotency.

### Integration tests

Use recorded fixtures, not live provider calls in normal CI.

- Ticketmaster fixture search.
- Ticketmaster 401, 429 and 500.
- Bandsintown valid artist.
- Bandsintown not found.
- Bandsintown unauthorized cross-artist request.
- Duplicate from two providers.
- Provider cancellation.
- Provider event removal.
- Claimed event refresh.
- Tour association.
- Source disable.

### End-to-end tests

- Open Events without location.
- Grant location.
- Deny location.
- Enter a city.
- Filter today.
- Filter custom date range.
- Change radius.
- Filter genre.
- Sort nearby.
- Open event.
- Open external ticket link.
- Save event.
- Claim event.
- Connect approved artist provider.
- Attach event to tour.
- Admin reviews duplicate.
- Provider failure does not remove native events.

### Performance tests

Representative volumes:

- 10,000 events.
- 100,000 events.
- 1,000,000 discovery-index rows if growth requires.

Measure:

- Nearby query latency.
- Filtered query latency.
- Index size.
- Sync throughput.
- Job-lock contention.
- Cache hit rate.
- Detail-page response.
- Mobile rendering.

## Rollout phases

### Phase 0 — Audit

Deliver:

- Existing architecture map.
- Existing schema map.
- Route map.
- RLS audit.
- Conflict list.
- Revised file targets.
- Go/no-go risks.

No behavior changes.

### Phase 1 — Foundation

- Provider adapter types.
- Feature flags.
- Additive source tables.
- Discovery index.
- PostGIS.
- Search service using native events only.
- Tests.

### Phase 2 — Discovery UI

- Events route.
- Location chooser.
- Nearby sort.
- Date/location/category filters.
- URL state.
- Event cards and detail integration.
- Native data only behind flag.

### Phase 3 — Ticketmaster pilot

- Adapter.
- Limited launch markets.
- Rate limiter.
- Sync jobs.
- Attribution.
- Admin health.
- Terms-aware expiry.
- Duplicate queue.

### Phase 4 — Claiming and canonical quality

- Claim workflow.
- Merge workflow.
- Source conflicts.
- Tour associations.
- Redirects.
- Admin tools.

### Phase 5 — Bandsintown pilot

- Connection UX.
- Approved access mode.
- Artist sync.
- Tour attachment.
- Disconnect.
- Pilot cohort.

### Phase 6 — Scale

- More markets.
- Improved caching.
- Personalized sort behind separate flag.
- Provider expansion.
- Enhanced analytics.

## Release gates

A phase may not advance until:

- Migration is reviewed.
- RLS tests pass.
- Lint passes.
- Type checking passes.
- Unit and integration tests pass.
- Production build passes.
- No secret is present in client output.
- Rollback is documented.
- Feature flag is off by default unless explicitly approved.
- Observability exists.
- Provider terms checklist is complete.

## Rollback

Each phase must have:

- Feature flag disable path.
- Cron disable path.
- Provider disable path.
- Migration rollback or forward-fix strategy.
- Index rebuild procedure.
- Cache purge procedure.
- Native event fallback.

Avoid destructive rollback migrations.

## Definition of done

The implementation is complete when:

1. Tourify-native events appear through the new canonical search path.
2. A user with location permission sees closest eligible events first.
3. A user without permission can manually choose a location.
4. Date, location, radius and category filters work and persist in the URL.
5. Ticketmaster can populate a limited market through a server-side adapter.
6. Rate limits and errors are controlled.
7. Duplicate provider events resolve to one canonical Tourify event or a review candidate.
8. Claimed events preserve Tourify-owned edits after sync.
9. Artist events can be associated with Tourify tours.
10. Bandsintown remains permission-safe and disabled or scoped unless authorized.
11. All new tables have reviewed RLS.
12. No provider secret is exposed.
13. Admins can inspect health, syncs, duplicates and claims.
14. Native events survive provider outage or disablement.
15. Test evidence and final documentation are committed.
