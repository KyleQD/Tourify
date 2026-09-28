# 01 — Executive Overview

## Goal

Create a scalable event-discovery and tour-link ecosystem that makes Tourify immediately useful to fans while strengthening its native artist, venue, promoter, ticketing, staffing and tour-management products.

## Recommended initial stack

### Tourify-native events

Tourify-native records are the highest-authority source. They support:

- Native event creation and editing.
- Native ticketing.
- Staffing and job connections.
- Tour logistics.
- Artist, venue and organization ownership.
- Promotions, analytics and social distribution.
- Event claiming and collaboration.

### Ticketmaster Discovery API

Ticketmaster is the broad discovery source for initial catalog population. It supports event, attraction and venue lookup and geographic event searching.

Tourify should use it to seed:

- Nearby event discovery.
- City and genre pages.
- Search results.
- Artist and venue event candidates.
- External ticket links.

Ticketmaster must remain an **external source**, not Tourify's canonical data owner.

### Bandsintown

Bandsintown should support artist-controlled tour dates and artist profile tour sections. Its normal API access is linked to a single artist unless Bandsintown authorizes broader use. Tourify must therefore build the integration in modes:

1. `disabled`
2. `artist_owned_key` or approved single-artist test mode
3. `partner`

Production-wide crawling must not be enabled without the applicable approval.

## Product outcome

A visitor opening the Events page should see:

1. Events nearest to their chosen or permitted location.
2. The soonest relevant dates within each distance tier.
3. Clear filters and URL-persisted search state.
4. One clean Tourify event card even when multiple providers reference the same show.
5. Ticket options from approved sources.
6. Artist, venue and tour links when Tourify identities are known.
7. Source attribution and freshness indicators where appropriate.

## Strategic advantage for Tourify

The event catalog is not the end product. It is the acquisition layer that routes users into Tourify's deeper ecosystem:

- Follow an artist.
- Save an event.
- Join an event group.
- Buy a ticket.
- Apply for event work.
- View the venue.
- Open the associated tour.
- Share or promote the event.
- Claim and manage the listing.
- Convert an imported event into a fully managed Tourify event.

## Success metrics

### Catalog health

- Percentage of events with coordinates.
- Percentage with an identified venue.
- Percentage with at least one artist or performer.
- Duplicate rate.
- Stale-event rate.
- Provider sync error rate.
- Claimed-event conversion rate.

### User outcomes

- Event card click-through rate.
- Ticket-link click-through rate.
- Save rate.
- Follow rate.
- Search-to-detail conversion.
- Percentage of sessions using a location.
- Nearby result engagement versus generic featured results.
- Tour page visits generated from event pages.

### Platform outcomes

- Imported events claimed by artists, venues or organizations.
- Imported events associated with Tourify tours.
- Native events created after a user claims an external record.
- Native ticketing adoption.
- Promotion spend connected to event listings.
- Staffing and job actions originating from events.

## Release recommendation

Release in controlled phases:

1. Foundation and canonical model.
2. Native event indexing.
3. Ticketmaster ingestion in limited markets.
4. Nearby-first discovery and filters.
5. Claiming, deduplication and ticket options.
6. Bandsintown connection scaffolding and approved pilot.
7. Scale, personalization and provider expansion.
