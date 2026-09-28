# 05 — Bandsintown Integration

## Purpose

Use Bandsintown for artist-controlled tour dates and artist-profile event synchronization where Tourify has valid authorization.

## Important access boundary

A normal Bandsintown API key is linked to one artist unless Bandsintown authorizes broader use. Tourify must not build platform-wide Bandsintown crawling on an ordinary key.

## Supported integration modes

### Mode 1 — Disabled

- UI may explain that integration is unavailable.
- Existing manual event and tour-link workflows continue.
- Data model and adapter remain deployable but inactive.

### Mode 2 — Artist-owned or approved pilot

- A specific artist or authorized team supplies the permitted credentials or connection details.
- Credentials are stored only through the approved secret-management path.
- Synchronization is scoped to that artist.
- Tourify verifies account ownership before enabling the connection.
- This mode is appropriate for development and a small approved pilot.

### Mode 3 — Partner

- Tourify uses organization-level access approved by Bandsintown.
- Artist identities are connected through the partner process.
- The adapter may synchronize multiple authorized artists.
- Platform-wide product behavior follows the partnership terms.

Required configuration:

```text
BANDSINTOWN_MODE=disabled|artist_owned_key|partner
BANDSINTOWN_APP_ID
BANDSINTOWN_AFFILIATION_CODE
BANDSINTOWN_BASE_URL=https://rest.bandsintown.com
```

## Connection workflow

1. Artist opens **Profile Settings → Integrations → Bandsintown**.
2. Tourify explains data use and synchronization behavior.
3. Artist identifies the Bandsintown artist page or ID.
4. Tourify validates the identity.
5. Artist proves authorization using the available approved method.
6. Tourify creates a provider connection in `pending` state.
7. A verification job retrieves artist metadata.
8. Artist reviews the matched identity.
9. Connection becomes `active`.
10. Tourify retrieves upcoming events and creates source records.
11. Potential duplicates are linked or queued for review.
12. Artist may attach canonical events to a Tourify tour.

## Sync scope

Initially synchronize:

- Upcoming events.
- Date/time.
- Venue and location.
- Lineup.
- Event description where allowed.
- Ticket offers.
- Bandsintown event URL.
- Artist URL.
- Calls to action where approved.

Avoid full historical synchronization in the first release.

## Optimized synchronization

Follow these principles:

- Sync active artists only.
- Prefer confirmed artist IDs over fuzzy names.
- Cache failed or not-found lookups with a timestamp.
- Normalize Unicode and remove misleading artist-name qualifiers.
- Do not loop over Tourify's entire historical artist catalog.
- Use incremental date windows.
- Back off when an artist has no upcoming dates.

## Tourify tour association

An imported date does not automatically create a Tourify tour.

The artist may:

- Add the event to an existing Tourify tour.
- Create a new Tourify tour from selected events.
- Leave the event ungrouped.
- Mark it as a one-off appearance.
- Invite a manager or organization to manage the tour.

Suggested linking table:

```text
tour_event_links
- id
- tour_id
- event_id
- position
- relationship_type
- linked_by
- linked_at
```

Kimi must reuse an existing relationship if Tourify already has one.

## Conflict rules

- Artist-supplied Tourify copy is not overwritten by provider refresh.
- Provider ticket offers remain source-specific.
- Provider event status may raise a conflict alert.
- Venue identity changes require rematching, not destructive replacement.
- Removed Bandsintown dates disable that source record but do not delete a verified Tourify-native event.

## User-facing states

- Not connected.
- Pending verification.
- Connected and healthy.
- Sync delayed.
- Action required.
- Provider unavailable.
- Disconnected.

## Acceptance criteria

- No cross-artist data leakage.
- Only approved artists are synchronized.
- Connection can be revoked.
- Credentials remain server-only.
- Upcoming dates appear through canonical Tourify event records.
- Tourify-native edits survive refresh.
- Artist can attach dates to a Tourify tour.
- Integration remains disabled in production until the correct access mode is authorized.
