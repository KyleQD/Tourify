# 09 — Discover

## Objective

Create a music-browsing experience that exposes native Tourify content, artists, genres, and event-connected discovery.

## Featured release

A featured release module should include:

- Artwork
- Artist
- Release title
- Short description
- Play action
- Save action
- View artist
- Provider label

Do not use an oversized hero that consumes the entire viewport.

## Trending tracks

Use a track list or table.

Display:

- Rank only if a real ranking exists
- Artwork
- Track
- Artist
- Genre
- Duration
- Provider
- Play action
- Save action
- Menu

## New releases

Use real release dates.

Requirements:

- artwork grid,
- responsive layout,
- horizontal scroll on smaller screens if appropriate,
- play and save actions,
- no fabricated release labels.

## Artists to watch

Use a curated or data-supported source.

Display:

- Profile image
- Name
- Genre
- Location when available
- Follow action
- Play featured track
- View profile

Do not display unreliable follower or listener counts.

## Event-connected discovery

When data exists, surface:

- Artists performing near the user
- Music connected to saved events
- Artists tied to upcoming Tourify events
- Releases from regional artists

Keep music and event cross-links accurate.

## Genre discovery

Genres should:

- use normalized metadata,
- open filtered results,
- support browser back/forward,
- have no-result states,
- avoid duplicated genre labels.

## Mood and activity

Only implement when metadata exists or a real curation system is available.

Do not infer mood from arbitrary genre values without documenting the rule.

## Completion gate

Discover is complete when:

- Featured, trending, new releases, and artist discovery are functional or honestly omitted.
- Genre filters work.
- Event-connected content links correctly.
- All playback routes through the global player.
- No fabricated claims are visible.
