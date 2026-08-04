# 13 — Expansion Roadmap

## Provider expansion model

A new provider should require:

1. Provider agreement and terms review.
2. Adapter implementation.
3. Normalizer mapping.
4. Classification mapping.
5. Ticket-offer mapping.
6. Rate-limit configuration.
7. Retention configuration.
8. Fixture coverage.
9. Admin health support.
10. Feature flag.
11. Pilot market or account cohort.
12. Source authority decision.

The search UI and canonical event model should not require provider-specific rewrites.

## Recommended future integrations

### SeatGeek

Potential role:

- Secondary U.S. catalog.
- Venue and performer enrichment.
- Additional ticket links.
- Coverage gap analysis.

### Eventbrite

Potential role:

- OAuth connection for organizers.
- Import organizer-owned events.
- Webhook-driven updates.
- Independent and community event coverage.

### DICE

Potential role:

- Venue/promoter account integration.
- Owned-event synchronization.
- Ticket-holder or operational integrations only where authorized.

### Tixr, See Tickets and AXS

Potential role:

- Venue and promoter connections.
- Affiliate or partner feeds.
- Primary ticket links.
- Owned-event updates.

### Calendar and file imports

- ICS.
- Google Calendar.
- CSV.
- Venue calendar feeds.
- Promoter bulk upload.

All imports still create source records and canonical event matches.

## Future product capabilities

### Map discovery

- Bounding-box queries.
- Clustering.
- “Search this area.”
- Venue density.
- Tour route overlays.

### Follow graph

- Events from followed artists.
- Events at followed venues.
- Friends attending.
- Personalized notifications.

### Tour intelligence

- Group dates into tours.
- Route visualization.
- Nearby-date conflict detection.
- Tour announcement pages.
- Tour-level ticket links.
- Tour follow/notification.

### Native ticketing conversion

A claimed external listing may invite an authorized owner to:

- Add Tourify-native ticket inventory.
- Add an approved primary ticket option.
- Keep external links as secondary.
- Connect ticket analytics.

This must not imply resale or unauthorized inventory access.

### Staffing and operations

Claimed or native events may connect to:

- Jobs.
- Onboarding.
- Scheduling.
- Credentials.
- Logistics.
- Budgets.
- Vendors.
- Site maps.
- Communications.

### Promotions

- Promote native or claimed events.
- Location and date eligibility.
- Dedicated labeled placements.
- Attribution.
- Conversion analytics.
- No silent manipulation of organic distance ordering.

### Notifications

- New local event from a followed artist.
- Date or venue change.
- Ticket on-sale.
- Cancellation.
- Added tour date.
- Saved-event reminder.

### Data quality tooling

- Automated coordinate repair.
- Venue alias management.
- Artist identity review.
- Duplicate regression reports.
- Stale source audits.
- Provider coverage comparison.

## Scaling milestones

### Milestone A

- One launch market.
- Native + Ticketmaster.
- Nearby and date filtering.
- Manual duplicate review.

### Milestone B

- Ten priority markets.
- Claiming.
- Tour links.
- Bandsintown approved pilot.
- Admin health dashboard.

### Milestone C

- Demand-driven national coverage.
- Secondary provider.
- Organizer OAuth integration.
- Automated high-confidence merges.

### Milestone D

- International markets.
- Provider-specific regional routing.
- Personalized discovery.
- Full tour notification system.
