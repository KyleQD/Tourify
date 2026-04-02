# News Feed Audit

## Current `/feed` Contract
- Route: `/feed`
- Page file: `app/feed/page.tsx`
- Rendered component: `components/feed/for-you-page.tsx`
- Current page model: mixed-content surface (`music`, `video`, `news`, `blog`, `forum`) with client-side filtering and sorting.

## Current API Dependencies
- `GET /api/feed/for-you`
- `GET /api/feed/rss-news`
- `GET /api/feed/blogs`
- `GET /api/feed/music`
- `GET /api/feed/videos`
- `GET /api/forums/threads`

## Current Issues Identified
- Runtime path includes mock content fallback in `for-you-page`.
- Primary ranking is effectively recency, with lightweight client sorting.
- Multi-source fan-in happens client-side, which increases payload and render complexity.
- `sortBy` parameters are not consistently respected server-side.

## Route and Navigation Entry Points Updated to `News`
- `components/nav.tsx`
- `components/unified-navigation.tsx`
- `components/venue/navigation/enhanced-sidebar.tsx`
- `app/discover/page.tsx` (tab label)
- `app/faq/page.tsx` (copy references)

## Route Entry Points Referencing `/feed`
- `components/nav.tsx`
- `components/unified-navigation.tsx`
- `app/dashboard/optimized-dashboard.tsx`
- `components/dashboard/dashboard-feed.tsx`
- `components/dashboard/enhanced-quick-actions.tsx`
- `components/dashboard/platform-features-hub.tsx`
- `components/venue/navigation/enhanced-sidebar.tsx`
- `components/venue/layouts/main-layout.tsx`
- `app/venue/components/navigation/enhanced-sidebar.tsx`
- `app/venue/components/layouts/main-layout.tsx`
- `app/components/navigation/enhanced-sidebar.tsx`
- `app/blog/[slug]/page.tsx`
- `middleware.ts`

## Migration Notes
- Keep `/feed` as canonical route for compatibility during migration.
- Introduce `/api/news/feed` and migrate UI data fetching from mixed legacy endpoints.
- Keep `/api/feed/for-you` as temporary compatibility endpoint backed by news feed output.
