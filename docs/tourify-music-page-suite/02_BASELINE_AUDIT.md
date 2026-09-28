# 02 — Baseline Audit

## Objective

Map the current music ecosystem before changing code.

The audit must be completed before implementation begins.

## Required codebase discovery

Find and document:

### Routes and entry points

- Music page route
- Nested routes
- Query-param or tab state
- Playlist detail routes
- Artist music routes
- Upload or release-management routes
- API routes
- Server actions
- Middleware or permission checks

### Existing UI components

Search for components related to:

- Music page
- Track rows
- Album cards
- Artist cards
- Playlist cards
- Audio controls
- Global player
- Queue
- Search
- Audius
- Music uploads
- Saved tracks
- Likes
- Favorites
- Recently played
- Listening history
- Recommendations
- Provider badges
- Loading skeletons
- Empty states
- Error boundaries

### State architecture

Document:

- Player state library
- Store location
- Queue model
- Current track model
- Persistence behavior
- Route transition behavior
- Volume and seek handling
- Repeat and shuffle support
- Provider-specific adapters
- Error handling
- analytics hooks

### Database and Supabase

Find relevant tables, views, functions, triggers, storage buckets, and policies.

Potential areas:

- tracks
- releases
- albums
- artists
- saved_tracks
- liked_tracks
- playlists
- playlist_tracks
- listening_history
- play_events
- follows
- provider_tracks
- external_tracks
- Audius mappings
- music uploads
- artwork storage
- audio storage

Do not assume these names exist. Record actual names.

For each relevant database object, document:

- Purpose
- Primary keys
- Foreign keys
- Owner relationship
- Provider identifiers
- RLS policies
- Indexes
- Timestamps
- Soft-delete behavior
- Current data volume when accessible
- Known integrity risks

### APIs and integrations

Audit:

- Native music endpoints
- Audius client or adapter
- Audius discovery
- Audius streaming URL resolution
- Audius artwork retrieval
- Audius rate-limit handling
- Search endpoints
- Playlist endpoints
- Save/unsave actions
- Follow/unfollow actions
- Listening-history endpoints
- Recommendation endpoints
- Upload endpoints
- Analytics events

### Tests

Locate:

- Unit tests
- Integration tests
- Component tests
- End-to-end tests
- Player tests
- Provider adapter tests
- Playlist tests
- Save/library tests
- Search tests

### Styling and design system

Document:

- Theme variables
- Color tokens
- Radius tokens
- spacing scale
- typography
- shared cards
- buttons
- menus
- dialogs
- tabs
- responsive breakpoints
- motion utilities

## Manual UX audit

Test the current page as:

- New general user
- Returning general user
- Artist account
- Organization account
- Venue account
- Logged-out user, if route is public or accessible
- User with native saved tracks
- User with Audius saved tracks
- User with playlists
- User with no playlists
- User with playback already active

Record:

- Broken flows
- Confusing labels
- Dead controls
- Missing actions
- Empty states
- excessive blank space
- layout shift
- mobile overflow
- inaccessible controls
- incorrect permissions
- provider failures
- route resets
- playback resets
- duplicated components
- inconsistent data shapes

## Required audit outputs

Create:

- `artifacts/music-audit-report.md`
- `artifacts/music-route-map.md`
- `artifacts/music-data-map.md`
- `artifacts/music-component-inventory.md`
- `artifacts/music-risk-register.md`

Use the provided audit template.

## Audit completion gate

The audit is complete only when:

- All relevant routes are listed.
- The global player architecture is understood.
- The normalized track model is identified or its absence is confirmed.
- Native and Audius data paths are mapped.
- Playlist and library persistence are mapped.
- Current permissions are documented.
- Existing reusable components are identified.
- Current tests and blockers are documented.
- No implementation changes have been made before the audit artifacts exist.
