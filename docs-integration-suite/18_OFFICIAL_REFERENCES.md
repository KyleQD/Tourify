# 18 — Official References

Verify these sources again immediately before implementation because APIs, quotas, terms and platform behavior can change.

## Ticketmaster

### Discovery API

- https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
- https://developer.ticketmaster.com/products-and-docs/apis/discovery-manual/v2/

Relevant capabilities include event, attraction and venue search; geographic search using `geoPoint`, radius and unit; date and classification filters; pagination; and provider source data.

### FAQ and quota

- https://developer.ticketmaster.com/support/faq/

The current FAQ states a default public API quota of 5,000 requests per day and two requests per second, with Discovery Feed suggested for higher-volume needs.

Another Ticketmaster getting-started page has historically shown a different per-second figure. The implementation must therefore use a configurable conservative limiter and inspect the actual key's response headers.

### Terms

- https://developer.ticketmaster.com/support/terms-of-use/

Important implementation topics include reasonable caching periods, removal requests, privacy disclosures, attribution, image-use restrictions and monetization restrictions.

### Discovery Feed

- https://developer.ticketmaster.com/products-and-docs/apis/discovery-feed/

Consider only after Tourify has the need and applicable access.

## Bandsintown

### API overview and access boundaries

- https://help.artists.bandsintown.com/en/articles/7053475-what-is-the-bandsintown-api

A normal key is linked to one artist unless otherwise authorized. Organizations seeking platform integration are directed to the partnership program.

### API documentation

- https://help.artists.bandsintown.com/en/articles/9186477-api-documentation

The API can return artist details and event details including date, venue, location, lineup, descriptions and ticket links.

### Usage optimization

- https://help.artists.bandsintown.com/en/articles/13142424-optimizing-api-usage

Guidance includes syncing active artists, validating artist identifiers and caching failed lookups.

### Fan calls to action

- https://help.artists.bandsintown.com/en/articles/9186761-api-for-fan-opt-ins

Use only in accordance with the approved integration mode and product requirements.

## Supabase

### PostGIS

- https://supabase.com/docs/guides/database/extensions/postgis

PostGIS supports indexable geographic points, distance ordering and bounding-box queries. Coordinate construction uses longitude before latitude.

### Changelog

- https://supabase.com/changelog

As of 2026, Supabase has announced changes to automatic Data API exposure for new public tables. Kimi must inspect the current project's Data API configuration, grants and RLS rather than assuming new tables are accessible.

### Security guidance

- https://supabase.com/docs/guides/api/securing-your-api
- https://supabase.com/docs/guides/security/product-security

## Browser geolocation

### W3C Geolocation specification

- https://www.w3.org/TR/geolocation/

The browser must obtain express user permission. The product must provide a useful denial path and handle location as sensitive data.

## Vercel Cron

- https://vercel.com/docs/cron-jobs

If Tourify uses Vercel Cron, use protected API routes and verify the `Authorization` header against `CRON_SECRET`. Confirm current plan limits before setting cadence.

## Implementation caution

The documents in this suite are architecture and implementation instructions, not a substitute for current provider agreements or legal review. Kimi must record any ambiguity in `PROVIDER_TERMS_CHECKLIST.md` and keep affected features disabled until approved.
