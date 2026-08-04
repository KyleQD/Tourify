# Venue Builder — Deep Research & Sequential Thinking

Read this once per task before implementing.

## Research checklist

1. **Page entry** — `page.tsx`, loaders, layouts under `app/venue/` or `app/venues/`.
2. **Mounted components** — `app/venue/components/**` and/or `components/venue/**` (note duplication).
3. **APIs** — `app/api/venue/**`, `app/api/venues/**`, shared messages/hiring/events/site-maps.
4. **Active venue** — Does the page use `useCurrentVenue` / `venueService`? Missing `venueId`?
5. **Nav** — In `VenueOperationsShell`? Orphan? Twin of a canonical route?
6. **IA** — Match [`docs/audits/venue-canonical-ia.md`](../../../../docs/audits/venue-canonical-ia.md) redirects and kill-list.
7. **Public parity** — Private profile/settings vs `/venues/[slug]` guest experience.
8. **Account scope** — Venue-owned workforce (`createsHiringEntityType: "venue"`) vs org grants.

## Sequential-thinking protocol

Use the sequential-thinking MCP (typically 6–12 thoughts). Answer:

1. **Intended purpose** — Who uses this (owner, manager, door staff, public booker)? What job?
2. **More useful** — Real data, actionable empty states, door-day workflows, booking → event → staff → tickets chain.
3. **Platform integration** — Cross-links to bookings, events, check-in, hiring, site maps, public slug, admin org events hosted here.

### Suggested thought structure

1. Restate surface + current UI reality.  
2. Map venue operator jobs-to-be-done.  
3. List gaps (mock, twin, missing venueId, weak empty/error).  
4. List integration opportunities.  
5. Rank one best additive change.  
6. Hypothesis: after change, operator can ___ without leaving venue ops.  
7. Verify zero-mock + additive + canonical-IA constraints.  
8. Finalize single implementation target.

## Choosing the one improvement

Good task sizes:

- Wire real booking/event/staff/ticket APIs; remove mocks.
- Ensure `useCurrentVenue` on roles/hiring/scheduling.
- Redirect a twin to the canonical route.
- Add deep links: booking → event ops hub → check-in → staff schedule.
- Improve empty states with the next real action (request, create event, hire, upload site map).
- Align public `/venues/[slug]` with overview fields that guests need.

Avoid:

- Full redesign of the shell in one task.
- Rebuilding social/music/EPK creator surfaces as primary venue product.
- Database resets.

## Chrome preference

Prefer shared venue dashboard primitives under `components/dashboard/venue-*` when present. Match patterns on canonical Command pages (dashboard, bookings, events).

## Verification before logging done

- [ ] No new mock data in live UI.
- [ ] Active venue context preserved or improved.
- [ ] Canonical route preferred over twins.
- [ ] `PROGRESS.md` and `TASK_LOG.md` updated.
- [ ] Next pointer advanced.
