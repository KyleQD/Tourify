# 01 — Product Objective

## Product goal

Transform the existing Tourify Music page into a complete music destination that supports discovery, saved music, playlists, native Tourify tracks, Audius content, search, creator actions, and persistent playback.

The result should feel like part of the larger Tourify ecosystem rather than a generic streaming-service clone.

## User promise

The Music page should help users:

- Discover music
- Follow artists
- Save tracks and releases
- Build and manage playlists
- Continue listening across Tourify
- Explore native Tourify and partner catalogs
- Connect music with artists, events, profiles, and community activity
- Manage their own music when their account has permission

## Current baseline problems visible in the reference image

The current page appears to have:

- Excessive unused vertical space
- A large decorative header with limited functional value
- A narrow tab bar floating in a wide empty canvas
- An empty state that is too small and passive
- No visible discovery content
- No useful onboarding path for a new user
- Weak visual hierarchy
- Limited indication of global player integration
- No visible search, sorting, filtering, or provider structure
- No visible playlist-management experience
- No visible account-aware creator actions
- A page that feels unfinished despite the global shell being visually established

## Design principles

### Music-first

Artwork, artists, tracks, and playback should drive the interface.

### Useful at zero data

A user with no saved music must still have a useful page with discovery content and clear actions.

### Integrated providers

Audius should feel like a provider inside Tourify, not a separate product embedded into the page.

### Persistent playback

Playback must survive route and tab changes through the existing global player.

### Clear hierarchy

Users should immediately understand:

- what is playing,
- where they are,
- what they can do next,
- where content came from,
- how to save it,
- how to add it to a playlist.

### Honest data

Do not display fake listening metrics, engagement, trending claims, or personalization.

### Production readiness

Every major feature needs loading, error, empty, unavailable, and permission states.

## Primary page sections

Recommended top-level structure:

1. Home
2. Library
3. Discover
4. Playlists
5. Audius

The existing route structure may be retained if route migration creates unnecessary risk. The visual and interaction hierarchy must still follow this structure.

## Success criteria

The page is successful when:

- New users are shown meaningful discovery content.
- Returning users can quickly continue listening.
- Saved tracks and playlists are easy to manage.
- Native and Audius content have a shared visual language.
- Global playback remains stable.
- The page works well on desktop, tablet, and mobile.
- Creator actions appear only for authorized account types.
- Provider failures remain isolated.
- The interface feels complete, polished, and deployable.
