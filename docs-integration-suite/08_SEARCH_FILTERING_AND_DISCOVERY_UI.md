# 08 — Search, Filtering and Discovery UI

## Canonical route

Kimi must inspect existing routes before choosing final paths. Preferred public route:

```text
/events
```

Legacy event routes must redirect or remain supported.

## URL query contract

Suggested public parameters:

```text
q
lat
lng
location
radius
start
end
date_preset
timezone
category
genre
event_type
artist
venue
organizer
free
price_min
price_max
currency
age
accessibility
source
sort
cursor
view
```

### Example

```text
/events?location=Las+Vegas%2C+NV&lat=36.1716&lng=-115.1391&radius=50&date_preset=next_30_days&genre=rock,electronic&sort=nearby
```

Precise coordinates do not need to remain in a shareable URL if privacy review prefers a server-issued location token or rounded coordinates.

## Required filters

### Date

- Today
- Tomorrow
- This weekend
- Next 7 days
- Next 30 days
- Custom range
- All upcoming

### Location

- Use my location
- City
- State/region
- Postal code
- Radius
- Map viewport in future

### Classification

- Music
- Festival
- Nightlife
- Community
- Conference
- Arts
- Sports if Tourify decides to include them
- Other Tourify categories

Music genre filters should map providers to a Tourify-owned taxonomy.

### Price

- Free
- Paid
- Price range
- Unknown price

Unknown price must not be treated as free.

### Identity

- Artist
- Venue
- Organizer
- Tour

### Experience

- All ages
- 18+
- 21+
- Accessibility attributes where known
- In-person
- Livestream
- Hybrid

### Source

Source filter should be hidden from ordinary users unless it has a clear product benefit. It is useful for admins and diagnostics.

## Default experience

### With location

Header:

```text
Events near [location]
```

Defaults:

- `sort=nearby`
- `radius=50`
- `date_preset=next_30_days`
- All categories.

### Without location

Header:

```text
Discover events
```

Show:

- Location chooser.
- Upcoming featured events.
- Popular cities.
- Events from followed artists for signed-in users.
- Native Tourify events.

## Layout

### Desktop

- Search bar.
- Filter row or side panel.
- Active filter chips.
- Sort control.
- Result count.
- List view.
- Optional map panel behind feature flag.

### Mobile

- Sticky compact search/location bar.
- Filter sheet.
- Sort sheet.
- Active filter chips.
- Infinite load or “Load more.”
- No interaction that requires hover.

## Event card content

Required:

- Image with fallback.
- Date.
- Event title.
- Performer summary.
- Venue.
- City.
- Approximate distance when available.
- Price state.
- Event status.
- Primary ticket or detail action.
- Save action.
- Native/claimed indicator only when useful.

Avoid overwhelming cards with provider branding. Attribution may appear in a compact source area or detail page as required.

## Event detail page

Suggested sections:

1. Hero.
2. Date, status and venue.
3. Ticket actions.
4. Performers.
5. Description.
6. Tour association.
7. Venue map/directions.
8. Organizer.
9. Related Tourify jobs or operational modules for eligible users.
10. Related events.
11. Source and update information.
12. Claim or report action.

## Empty states

### No events in radius

- Offer wider radius.
- Offer later dates.
- Preserve current filters.
- Show nearest matching events in a clearly separated section.

### No events for filters

- Explain which filters are active.
- Provide one-click reset.
- Do not silently ignore filters.

### Location denied

- Show manual location input.
- Explain how to enable location later.
- Continue with non-location results.

## Loading and errors

- Use skeletons for first load.
- Keep prior results visible during filter transitions when possible.
- Show retry only for Tourify API failure.
- Never expose provider names, keys or raw errors in end-user messages.

## SEO

Public canonical event pages should include:

- Stable slug and ID resolution.
- Event structured data where valid.
- Canonical URL.
- Event title and location metadata.
- Accurate event status.
- Noindex for private, draft, duplicate or expired placeholder pages.
- Redirect merged duplicate slugs to the surviving canonical event.

## Accessibility checklist

- Search form has a programmatic label.
- Every filter has accessible name and state.
- Date picker works by keyboard.
- Filter sheet traps focus correctly.
- Cards have one clear primary link.
- Save button has state text.
- Status is not communicated only by color.
- Location permission is not required to access content.
