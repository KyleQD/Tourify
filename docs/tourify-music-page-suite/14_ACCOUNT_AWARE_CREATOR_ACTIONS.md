# 14 — Account-Aware and Creator Actions

## Objective

Adapt the Music page to the current Tourify account and permissions without exposing unauthorized controls.

## General user

May see:

- Discover
- Save tracks
- Follow artists
- Build playlists
- Listening history
- Share music

## Artist account

When authorized, may also see:

- Upload music
- Manage releases
- Edit track metadata
- Manage artwork
- View owned music
- View music analytics
- Set availability or visibility
- Link music to artist profile

## Organization and venue accounts

Only show music-management actions that the existing product model supports.

Do not assume organizations or venues own artist music.

Potential valid actions may include:

- curate event playlists,
- associate music with an event,
- view artist music,
- manage organization-owned media if a real ownership model exists.

## Context switching

Tourify supports multiple account contexts.

The page must:

- use the active account context,
- refresh permission-aware data when context changes,
- avoid leaking personal library data into organization context,
- avoid showing creator controls from a previous context,
- preserve playback where safe.

## Server-side enforcement

UI visibility is not authorization.

Every mutation must validate:

- authenticated user,
- current account context,
- ownership,
- role,
- resource visibility,
- provider permissions.

## Upload and management actions

Do not implement upload flows unless:

- existing storage and metadata architecture is understood,
- permissions are defined,
- file validation exists,
- ownership is enforced,
- failure and progress states exist.

If upload is outside scope, link to the existing release-management flow rather than creating a partial duplicate.

## Completion gate

This phase is complete when:

- Controls match the active account context.
- Unauthorized actions are hidden and blocked server-side.
- Context switching does not leak data.
- Artist actions reuse existing management flows.
- General users retain a simple listening experience.
