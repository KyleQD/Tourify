# Tourify Event Discovery & Tour Integration Suite

**Prepared for:** Tourify  
**Implementation target:** Tourify's existing Next.js App Router, TypeScript, React, Supabase/Postgres, Tailwind and shadcn-based platform  
**Primary integrations:** Ticketmaster Discovery API, Bandsintown artist-tour integration, and Tourify-native events  
**Prepared:** August 4, 2026

## Purpose

This suite defines a production-ready, non-destructive implementation plan for populating Tourify with events and tour links while preserving Tourify as the canonical product experience.

The initial system should:

1. Populate event discovery from Ticketmaster.
2. Display artist-controlled tour dates from Bandsintown when permitted and connected.
3. Keep Tourify-native events authoritative.
4. Show nearby events first when a usable location is available.
5. Support date, location, radius, category, genre, price, source, venue, artist and sort filters.
6. Deduplicate records from multiple providers into one canonical Tourify event.
7. Allow verified users to claim, enrich and associate imported events with tours.
8. Remain ready for SeatGeek, Eventbrite, DICE, Tixr, See Tickets, AXS and other future providers.

## Recommended reading order

| File | Purpose |
|---|---|
| `01_EXECUTIVE_OVERVIEW.md` | Business and product summary |
| `02_SCOPE_AND_PRODUCT_REQUIREMENTS.md` | Functional requirements, user stories and boundaries |
| `03_TARGET_ARCHITECTURE.md` | Canonical architecture and provider-adapter model |
| `04_TICKETMASTER_INTEGRATION.md` | Ticketmaster discovery design |
| `05_BANDSINTOWN_INTEGRATION.md` | Artist-tour integration and partnership-safe rollout |
| `06_DATABASE_AND_SUPABASE.md` | Additive schema, PostGIS, indexes and RLS |
| `07_GEOLOCATION_RANKING_AND_PERSONALIZATION.md` | Nearby-first behavior and ranking rules |
| `08_SEARCH_FILTERING_AND_DISCOVERY_UI.md` | Query parameters, filters, routes and UX |
| `09_INGESTION_DEDUPLICATION_CLAIMING.md` | Sync lifecycle, matching and ownership |
| `10_BACKEND_JOBS_CACHING_OBSERVABILITY.md` | APIs, background jobs, rate limits and logs |
| `11_SECURITY_PRIVACY_COMPLIANCE.md` | Secrets, RLS, location privacy and provider terms |
| `12_TESTING_ROLLOUT_DEFINITION_OF_DONE.md` | Testing, release gates and acceptance criteria |
| `13_EXPANSION_ROADMAP.md` | Future provider and product expansion |
| `14_FILE_TARGET_MAP.md` | Expected code areas, adjusted after Kimi's audit |
| `15_KIMI_MASTER_IMPLEMENTATION_PROMPT.md` | Full build-agent instructions |
| `16_IMPLEMENTATION_TRACKER.json` | Machine-readable phased task tracker |
| `17_ACCEPTANCE_TEST_MATRIX.csv` | Test scenarios and required evidence |
| `18_OFFICIAL_REFERENCES.md` | Official source references and implementation cautions |

## Core architecture decision

Tourify must not render raw provider payloads directly as its product model.

Every event shown in Tourify should resolve to a **canonical Tourify event identity**. External providers contribute source records, ticket offers, images, classifications and synchronization metadata. Native Tourify edits and verified owner edits remain separate from imported source data so that refreshes do not overwrite user-owned content.

## Non-destructive mandate

Kimi must audit the existing repository and database before selecting final table names, routes or component locations.

The implementation must:

- Never reset the database.
- Never drop or truncate existing tables.
- Never replace existing event functionality without a compatibility path.
- Use additive migrations.
- Backfill in batches.
- Protect all new exposed tables with RLS.
- Keep all external integrations behind feature flags.
- Preserve existing event URLs or provide redirects.
- Keep provider credentials server-only.
- Produce rollback steps for every deployable phase.

## Suggested branch

`feature/event-discovery-integrations`

Kimi should use the repository's established branching convention if it differs.
