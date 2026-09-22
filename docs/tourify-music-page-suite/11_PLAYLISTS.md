# 11 — Playlists

## Objective

Create a complete playlist lifecycle: create, view, edit, play, reorder, share, and manage tracks.

## Playlist list page

Display:

- User-created playlists
- Saved or followed playlists when supported
- Recently updated playlists
- Ownership
- Visibility
- Track count
- Total duration
- Last updated
- Artwork mosaic
- Play action
- Context menu

## Create playlist flow

Use a modal, drawer, or dedicated route.

Fields:

- Name
- Description
- Cover artwork
- Public/private status
- Collaborative status only if truly supported

Validation:

- Required name
- Maximum lengths
- Safe text handling
- Supported image type and size
- Permission checks

After creation:

- Open the playlist
- Guide the user to add tracks
- Record analytics if existing conventions support it

## Playlist detail

Include:

- Artwork
- Name
- Description
- Owner
- Visibility
- Track count
- Total duration
- Play all
- Shuffle
- Save/follow
- Share
- Edit for owner
- Track list
- Add tracks
- Remove tracks
- Provider per track
- Unavailable-track handling

## Track order

When supported:

- Use drag-and-drop for owners
- Provide keyboard-accessible reorder controls
- Persist stable sort positions
- Prevent duplicate or conflicting order values
- Roll back failed reorder mutations

If drag-and-drop is not safe in the initial implementation, use move-up/move-down controls and document the limitation.

## Ownership and permissions

Server-side checks must enforce:

- Only owners or authorized collaborators can edit
- Only owners can delete unless collaboration rules say otherwise
- Private playlists cannot be viewed by unauthorized users
- Public playlists expose only intended metadata
- Provider tracks cannot be modified at the source

## Mixed-provider playlists

Support native and Audius tracks when architecture allows.

Requirements:

- normalized playback,
- provider badge,
- unavailable state,
- no duplicate track keys,
- stable queue order.

## Delete flow

Require confirmation.

Document whether deletion is:

- hard delete,
- soft delete,
- archived.

Follow existing system conventions.

## Completion gate

Playlists are complete when:

- Users can create playlists.
- Owners can edit metadata.
- Tracks can be added and removed.
- Ordering persists.
- Mixed-provider playback works or is explicitly blocked with a documented reason.
- Permissions are enforced server-side.
- Empty, unavailable, and error states exist.
