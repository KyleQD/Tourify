# Current-State Audit Results

Codex must replace this template with repository-grounded findings before implementation.

## Repository baseline

- Repository root:
- Branch:
- Base commit:
- Package manager:
- Next.js / React versions:
- Supabase CLI / client versions:
- Test runner:
- Deployment target:

## Canonical music paths

| Concern | Actual path | Status | Reuse decision |
|---|---|---|---|
| Artist music page | | | |
| Enhanced uploader | | | |
| Music CRUD route | | | |
| Signed upload route | | | |
| Stream route | | | |
| Access resolver | | | |
| Jukebox context | | | |
| Admin moderation | | | |
| Mobile provider | | | |

## Database inventory

Document exact types, constraints, RLS, triggers, indexes, views, and generated types for:

- `artist_music`
- `public.music_tracks`
- `music_preview_generation_jobs`
- `user_music_library`
- marketplace listing relationship
- existing report/moderation tables

## Storage inventory

- `artist-music` configuration and policies:
- `artist-photos` configuration and policies:
- signed upload flow:
- signed stream flow:
- cleanup behavior:
- worker access pattern:

## Account and capability matrix

| Action | Artist owner | Artist team | Admin moderator | Rights reviewer | Anonymous |
|---|---:|---:|---:|---:|---:|
| Upload track | | | | | |
| Edit declaration | | | | | |
| Read private evidence | | | | | |
| Review certification | | | | | |
| View public certificate | | | | | |

## Baseline commands

| Command | Result | Existing failure? | Log/evidence |
|---|---|---:|---|
| install/dependency check | | | |
| lint | | | |
| typecheck | | | |
| unit tests | | | |
| build | | | |
| migration status | | | |
| Supabase advisors | | | |

## Existing systems to reuse

- feature flags:
- jobs/outbox:
- notifications/email:
- admin moderation:
- report/DMCA:
- audit logging:
- observability:

## Conflicts and debt

Record mock/dead/experimental paths and confirm they will not be extended.

## Architecture decisions

For each decision record: context, selected option, rejected alternatives, consequences, rollback behavior.

## Non-destructive integration map

List exact files and database objects to add or modify, with feature flag and rollback strategy.

## Blockers

Record exact blocker, impact, current safe state, owner, and unblocking condition.
