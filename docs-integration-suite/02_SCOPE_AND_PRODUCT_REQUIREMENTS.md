# 02 — Scope and Product Requirements

## In scope

### Event discovery

- Public Events landing page.
- Nearby-first discovery.
- Search by keyword.
- Search by current location, saved location or entered location.
- Date presets and custom date range.
- Radius filtering.
- Category, genre and event-type filters.
- Free and paid event filters.
- Artist, venue and organizer filters.
- Provider/source filters for internal administration.
- Sorting by nearby, soonest, recommended, popularity and recently added.
- Pagination or cursor-based loading.
- List view and future-ready map view.

### Event detail

- Canonical Tourify URL.
- Event title, date, timezone and status.
- Venue and location.
- Performers.
- Description.
- Source attribution.
- Ticket offers.
- Save, share, follow and calendar actions.
- Claim listing action.
- Related tour link.
- Related events.
- Structured metadata for search engines.

### Artist profile and tour links

- Upcoming Tourify-native events.
- Imported and deduplicated events.
- Bandsintown-linked dates where authorized.
- Tour groupings.
- “View Tour” and “All Dates” actions.
- Clear ownership and source state.

### Venue and organization workflows

- Import or discover potential matching events.
- Claim a listing.
- Merge an imported record into an existing native event.
- Attach an event to a tour.
- Correct venue identity.
- Add Tourify-native operational data without altering the external source record.

### Administration

- Provider configuration.
- Feature flags.
- Sync health.
- Rate-limit state.
- Duplicate review queue.
- Claim review queue.
- Source conflicts.
- Provider disable switch.
- Data removal workflow.
- Audit log.

## Explicitly out of scope for the first release

- Reselling tickets.
- Scraping provider websites.
- Automatic nationwide crawling without usage controls.
- Replacing provider checkout.
- Ticket inventory or seat-map synchronization.
- Full map clustering unless the existing platform already has an approved map library.
- Paid event ranking inside organic nearby results.
- Bandsintown platform-wide use before authorization.
- Destructive replacement of existing Tourify event records.

## Primary user stories

### Visitor

- As a visitor, I can see events near me without creating an account.
- As a visitor, I can deny location access and manually choose a city.
- As a visitor, I can change my radius and dates.
- As a visitor, my filters remain in the URL and survive refresh.
- As a visitor, I can open one canonical detail page rather than duplicate provider listings.

### Signed-in user

- As a user, I can save a preferred event location.
- As a user, I can save events and follow artists.
- As a user, I can add an event to my Tourify calendar.
- As a user, I can see distance in my preferred units.
- As a user, I can clear previously stored location preferences.

### Artist

- As an artist, I can connect or verify an external artist identity.
- As an artist, I can see matching imported events.
- As an artist, I can claim or link those events.
- As an artist, I can attach dates to a Tourify tour.
- As an artist, I can retain Tourify-specific descriptions, promotions and operations when a provider refreshes.

### Venue or organization

- As a venue or organizer, I can claim an event.
- As a venue or organizer, I can add native operational data.
- As a venue or organizer, I can correct a venue match.
- As a venue or organizer, I can choose the primary ticket call to action when authorized.

### Administrator

- As an administrator, I can inspect provider syncs, duplicate candidates, claims and removals.
- As an administrator, I can suspend a provider without breaking native events.
- As an administrator, I can audit who changed canonical data.

## Functional requirements

### FR-1 — Location resolution

The application must use this priority order:

1. Location explicitly selected in the current search.
2. Browser device location granted for the current experience.
3. User's saved discovery location.
4. Last manually selected location stored under the approved retention policy.
5. Platform default location or non-location-based featured fallback.

The application must never block event discovery because location permission is denied.

### FR-2 — Nearby ordering

When latitude and longitude are available, the default organic results must place the closest eligible events first. Date ascending is the primary tie-breaker.

Recommended deterministic order:

```text
distance_meters ASC
start_at ASC
quality_score DESC
event_id ASC
```

A future “Recommended” sort may use personalization, but it must be separate from strict “Nearby.”

### FR-3 — Date filtering

Required presets:

- Today
- Tomorrow
- This weekend
- Next 7 days
- Next 30 days
- Custom range
- All upcoming

Date calculations must use the event's timezone for event display and the search location's timezone for preset boundaries.

### FR-4 — Canonical event identity

All displayed records must map to one canonical Tourify event ID.

### FR-5 — Provider isolation

Provider-specific logic must exist behind an adapter interface. UI components must consume normalized Tourify types.

### FR-6 — Graceful failure

If a provider is unavailable:

- Serve cached eligible canonical records.
- Continue showing native events.
- Show no provider error details to end users.
- Log operational errors with correlation IDs.
- Avoid retry storms.

### FR-7 — Claiming and corrections

Claiming must not transfer provider data ownership. It grants approved users permission to manage Tourify-owned enrichment and identity links.

### FR-8 — Accessibility

Search controls, cards, dialogs and location prompts must be keyboard accessible, screen-reader labeled and usable without a map.

## Non-functional requirements

- Additive database changes.
- Stable canonical URLs.
- Server-side secret handling.
- Geospatial indexes.
- Query response target appropriate for current Tourify infrastructure.
- Provider-level throttling.
- Idempotent syncs.
- Structured logs.
- Test fixtures that never require live third-party calls in CI.
- Feature-flagged rollout.
- Mobile-first responsive design.
