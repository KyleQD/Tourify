# Artist Press Ecosystem

Press replaces the artist Blog surface. Artists manage three formats from one library at `/artist/press`.

The route is an artist dashboard segment (`press` in `ARTIST_APP_SEGMENTS`), so it keeps the left sidebar and mobile nav like Content / Music / EPK.

## Formats and distribution

| Format | Where it goes | Public URL |
|--------|---------------|------------|
| **Blog** | Artist home feed companion post | `/blog/[slug]` |
| **Article** | News → **Articles** (next to Featured) | `/blog/[slug]` |
| **Press release** | Selected recipients only + PDF | `/artist/press/releases/[id]` |

EPK (`/artist/epk`) remains the booking press kit. Press links to EPK; editors are not merged.

## Authorship scope

The Press library is **authored-only** for the acting account:

- Create stamps `posted_as_profile_id` / `posted_as_type` from acting context
- `GET /api/pulse/articles?mine=1` lists rows where `posted_as_profile_id = acting profile`
- Get / update / delete use the same profile scope (not login `user_id` alone)

General-account posts do not appear in the artist Press library.

## Analytics

`artist_blog_posts.stats` JSON tracks `{ views, likes, comments, shares }`.

- Public `/blog/[slug]` records views via `ArticleViewTracker` → `POST /api/pulse/articles/[id]/engage`
- Likes and shares persist through the same engage endpoint from `ArticleActionBar`
- Press-release recipient shares (`press_release_shares`) also bump `stats.shares`
- The Press portal shows aggregate and per-item views / likes / shares

## Key routes

- Library / editor: `/artist/press` (legacy `/artist/features/blog` redirects here)
- Release reader: `/artist/press/releases/[id]`
- APIs: `/api/pulse/articles`, `/api/pulse/articles/[id]/engage`, `/api/press/releases/[id]`, `/share`, `/pdf`
- News filter: `category=articles` on `/api/news/feed`

## Schema

- `artist_blog_posts.format` — `blog` | `article` | `press_release`
- `subtitle`, `boilerplate`, `embargo_until`, `distribution` JSONB
- `press_release_shares` — recipient authz + download tracking

Migrations:

- `20260717220000_press_content_formats.sql`
- `20260717221000_press_release_shares.sql`

## Publishing rules

- Blog publish → feed sync (`shouldSyncToFeed`)
- Article publish → news candidates (`format=article`)
- Press release publish → no public feed/News; share via recipient picker; PDF via `@react-pdf/renderer`
