# 07 — Music Home

## Objective

Create a useful landing experience for both new and returning users.

## Required sections

### Continue Listening

Data source:

- Existing listening history
- Existing recent player state
- Existing recently played data

Display:

- Artwork
- Title
- Artist
- Provider
- Progress when available
- Resume action
- Overflow menu

Behavior:

- Hide when no history exists.
- Do not fabricate progress.
- Resume through the global player.
- Preserve the current queue when appropriate.

### Recommended on Tourify

Use available real recommendation signals.

Possible signals:

- Followed artists
- Saved tracks
- Recent genres
- Trending native tracks
- Artists tied to followed events
- Music shared by followed users

When recommendation logic is not personalized, label it honestly:

- “Recommended on Tourify”
- “Popular with Tourify listeners”
- “More to explore”

Do not use “Made for You” unless true personalization exists.

### Trending on Tourify

Show native tracks using real ranking or engagement data.

If no valid trending metric exists:

- Use “Popular on Tourify” only if supported.
- Use “Featured on Tourify” for curated data.
- Do not invent rank numbers.

### From Artists You Follow

Show new or featured music from followed artists.

Hide when:

- the user follows no artists,
- no relevant music exists,
- the relationship data is unavailable.

Provide a discover-artists action when useful.

### Explore by Genre

Use real genre metadata.

Genre cards should:

- open filtered discovery,
- have accessible labels,
- avoid purely decorative random gradients,
- use artwork or restrained graphical treatments.

### Music Near You

Only show when:

- location data is already available,
- the user has permitted location usage,
- event and artist location data are reliable.

Do not automatically request geolocation.

### Audius Highlights

Show a small integrated provider section.

Requirements:

- provider label,
- clear attribution,
- play through the global player,
- save to Tourify library when supported,
- isolated failure state.

## New-user state

When the user has no library, history, playlists, or followed artists:

- lead with discovery,
- show featured native content,
- show genre exploration,
- show Audius highlights,
- include clear actions to save tracks and create a playlist.

The page must not collapse into a mostly empty viewport.

## Completion gate

The Music Home phase is complete when:

- New users see useful discovery content.
- Returning users can continue listening.
- Every section uses real data or hides honestly.
- Playback uses the global player.
- Audius failure does not break native sections.
- Mobile layout is usable.
