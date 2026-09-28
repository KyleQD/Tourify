# 15 — Kimi Master Implementation Prompt

Copy the prompt below into Kimi from the root of the Tourify repository.

---

## Kimi role

You are the principal engineer, data architect, integration engineer, product designer and QA lead responsible for implementing Tourify's event-discovery and tour-link ecosystem.

You must first become an expert on the existing Tourify codebase. Do not begin implementation by assuming the attached plan's provisional table names, routes or file targets are correct.

## Mission

Build a production-ready, non-destructive event ecosystem that:

1. Keeps Tourify-native events authoritative.
2. Adds Ticketmaster Discovery API as the initial broad event source.
3. Adds a permission-safe Bandsintown artist-tour integration.
4. Shows users the closest eligible events first when location is available.
5. Supports date, location, radius, keyword, category, genre, type, price, artist, venue and sort filters.
6. Deduplicates multiple provider records into one canonical Tourify event.
7. Allows verified artists, venues and organizations to claim and enrich imported events.
8. Links canonical events to Tourify tours.
9. Keeps the provider layer expandable for future sources.
10. Preserves native events during provider failure, removal or disablement.

Read every document in this handoff before making changes.

## Mandatory operating rules

- Work in a new branch from the current approved base branch.
- Suggested branch: `feature/event-discovery-integrations`.
- Never push directly to main.
- Never reset the database.
- Never drop, truncate or recreate existing production tables.
- Never delete existing event records to simplify migration.
- Never expose service-role keys or provider API keys to the browser.
- Never use user-editable metadata for authorization.
- Never enable platform-wide Bandsintown behavior without valid authorization.
- Never scrape provider websites.
- Never silently replace existing routes or workflows.
- Never claim completion without test evidence.
- Never hide failures; record blockers in the progress tracker.
- Prefer additive migrations, compatibility layers and feature flags.
- Reuse existing Tourify services, authorization, UI primitives, analytics, background jobs and route conventions.
- Preserve existing behavior until the replacement path passes parity checks.
- Use strict TypeScript and runtime validation for third-party payloads.
- Treat provider terms and data-retention rules as technical requirements.

## Inputs

Use:

- The documents in this suite.
- The existing Tourify repository.
- The existing Supabase schema and migrations.
- Existing event, artist, venue, organization, ticketing, profile, tour, calendar and admin code.
- Existing feature flags, cron jobs, queues, logs, analytics and test infrastructure.
- Official current provider and Supabase documentation.

Do not rely on stale API knowledge. Verify current official documentation before implementation.

## Required first deliverables: audit only

Before changing application behavior, create:

```text
docs/event-discovery/AUDIT.md
docs/event-discovery/EXISTING_DATA_MODEL.md
docs/event-discovery/EXISTING_ROUTE_AND_UI_MAP.md
docs/event-discovery/INTEGRATION_CONFLICTS.md
docs/event-discovery/REVISED_FILE_TARGETS.md
docs/event-discovery/PROVIDER_TERMS_CHECKLIST.md
docs/event-discovery/IMPLEMENTATION_PROGRESS.json
```

The audit must identify:

- Current canonical event table or tables.
- Existing venue, artist, organization and tour relationships.
- Existing event public routes.
- Existing event creation and editing workflows.
- Existing search and filtering.
- Existing location fields and mapping libraries.
- Existing ticket links and native ticketing.
- Existing RLS and account authorization.
- Existing scheduled jobs and cron configuration.
- Existing analytics.
- Existing feature flags.
- Existing tests.
- Existing event slugs and redirect behavior.
- Existing duplicate or import logic.
- Any mismatch between repository code and database schema.
- Existing performance or build blockers that affect this project.

Do not proceed until the audit documents and progress tracker exist.

## Progress tracker contract

Create and continuously update:

```text
docs/event-discovery/IMPLEMENTATION_PROGRESS.json
```

Each task must include:

```json
{
  "id": "EVT-001",
  "phase": 0,
  "title": "Audit existing event schema",
  "status": "not_started",
  "dependencies": [],
  "files": [],
  "evidence": [],
  "tests": [],
  "blockers": [],
  "notes": ""
}
```

Allowed statuses:

```text
not_started
in_progress
blocked
complete
verified
deferred
```

A task is not `verified` until evidence and test results are recorded.

Update the file after every meaningful task.

## Phase 0 — Audit and design reconciliation

1. Audit repository and Supabase.
2. Compare existing architecture with the handoff.
3. Reuse existing tables and services where safe.
4. Revise provisional names and file paths.
5. Identify provider terms that require business approval.
6. Produce migration and rollback designs.
7. Establish baseline build, lint and test results.
8. Record pre-existing failures separately.

### Phase 0 gate

Do not create production behavior until:

- Audit is complete.
- Data model is mapped.
- RLS risks are documented.
- Final target architecture is approved by your own code-level consistency checks.
- Progress tracker is populated.

## Phase 1 — Canonical provider foundation

Implement:

- Provider enum or registry.
- Provider adapter interface.
- Normalized event contract.
- Runtime validation.
- Provider feature flags.
- Source-record model.
- Ticket-offer model.
- Provider connection model.
- Sync-job and sync-run model if no equivalent exists.
- Audit logging hooks.
- Server-only configuration validation.

Requirements:

- Additive migrations.
- RLS on exposed tables.
- Explicit grants if required by current Supabase Data API configuration.
- No live provider enabled by default.
- Native event behavior unchanged.

Tests:

- Type tests.
- Runtime schema tests.
- RLS tests.
- Migration tests.
- Secret exposure check.

## Phase 2 — PostGIS discovery index and native parity

Implement:

- PostGIS using the project's approved extension schema.
- Search-optimized canonical event index.
- GiST location index.
- Start-date and visibility indexes.
- Keyword search index.
- Native-event backfill.
- Idempotent index rebuild.
- Nearby search function or service.
- Cursor pagination.
- Date and timezone utilities.

Default organic order with location:

```text
distance ASC
start_at ASC
quality_score DESC
event_id ASC
```

Location priority:

1. Current explicit search location.
2. Browser location with permission.
3. Saved discovery location.
4. Last manually selected location under approved retention.
5. Non-location fallback.

Never require location permission.

Tests:

- Correct longitude/latitude order.
- Radius boundaries.
- Distance ordering.
- Date presets.
- DST boundaries.
- Cursor stability.
- Native search parity.
- Query plans at representative scale.

## Phase 3 — Event discovery UX

Implement or refactor:

- Public Events page.
- Search.
- Manual location chooser.
- “Use my location.”
- Date presets.
- Custom date range.
- Radius filter.
- Category and genre filter.
- Price/free filter.
- Artist and venue filter where supported.
- Sort controls.
- URL-persisted state.
- Mobile filter sheet.
- Event cards.
- Empty and error states.
- Event detail integration.
- Save/share/calendar hooks using existing systems.
- Accessibility.

Required sorts:

```text
nearby
soonest
recommended (feature-flagged until scoring is ready)
popular
recently_added
```

Do not let promoted events silently change organic nearby order.

Tests:

- Permission grant.
- Permission denial.
- Manual location.
- Filter combinations.
- Refresh and shared URL.
- Mobile keyboard and screen-reader behavior.
- No-location fallback.

## Phase 4 — Ticketmaster pilot

Implement:

- Server-only Ticketmaster client.
- Adapter and runtime schemas.
- Geographic search translation.
- Date and classification mapping.
- Pagination.
- Conservative shared rate limiter.
- Response-header quota tracking.
- Configurable daily budget.
- Idempotent source upserts.
- Terms-aware cache/expiry.
- Source attribution.
- Ticket offer import.
- Provider health dashboard.
- Limited-market sync.
- On-demand stale-cell refresh.
- Provider disable control.

Configuration must be environment-driven.

Use a conservative request rate until the actual key's documented allowance and response headers are confirmed. Preserve a quota reserve for user-triggered searches.

Do not perform an uncontrolled national crawl.

Tests use recorded fixtures. Live smoke tests must be optional and secret-gated.

## Phase 5 — Deduplication and canonical quality

Implement:

- Exact source identity matching.
- Explicit identity links.
- Deterministic high-confidence matching.
- Fuzzy review candidates.
- Merge review UI.
- “Never merge” decisions.
- Transactional merge.
- Redirects from losing canonical URLs.
- Source conflict records.
- Event status reconciliation.
- Duplicate regression tests.

Auto-merge only above a reviewed threshold and when no disqualifier exists.

Never auto-merge:

- Multiple same-day performances without proof.
- Matinee and evening shows.
- Festival passes and single-day events.
- Livestream and in-person variants.
- Different venues.

## Phase 6 — Claims, ownership and tour links

Implement:

- Claim submission.
- Authorization and evidence flow.
- Auto-verification only with strong linked identity.
- Admin review.
- Approved permissions.
- Revocation.
- Field-level native enrichment preservation.
- Attach event to existing Tourify tour.
- Create tour from selected events if compatible with existing workflow.
- “View Tour” links.
- Artist, venue and organization event management views.

Claiming must not permit editing a provider's source URL or external checkout data.

## Phase 7 — Bandsintown permission-safe pilot

Implement the adapter and UI with modes:

```text
disabled
artist_owned_key
partner
```

Default production mode must be `disabled` unless authorization exists.

Implement:

- Artist identity entry.
- Authorization verification.
- Pending/active/error/disconnected states.
- Scoped upcoming-event sync.
- Confirmed artist IDs.
- Negative lookup cache.
- Active-artist-only scheduling.
- Canonical matching.
- Tour association.
- Revocation and disconnect.
- No cross-artist data access.

Do not loop over the full Tourify artist catalog.

## Phase 8 — Operations, performance and rollout

Implement:

- Protected cron routes or reuse current job runner.
- Shared rate-limit state.
- Retry/backoff.
- Dead-letter handling.
- Stale lock recovery.
- Structured logs.
- Metrics.
- Alerts.
- Provider health admin.
- Queue admin.
- Source expiration.
- Data removal.
- Index rebuild.
- Cache invalidation.
- Operational runbook.

If using Vercel Cron, verify `Authorization: Bearer ${CRON_SECRET}`.

## Required validation after every phase

Run the repository's exact commands for:

- Formatting.
- Lint.
- Type check.
- Unit tests.
- Integration tests.
- E2E tests where applicable.
- Production build.
- Supabase migration validation.
- RLS/security tests.
- Database advisors.
- Query-plan checks.
- Secret scanning.

Record commands, results and relevant output in the progress tracker.

Do not mark a phase verified when the production build is failing, even if the failure is pre-existing. Record whether the failure is introduced, related or unrelated.

## Required acceptance scenarios

Verify all scenarios in `17_ACCEPTANCE_TEST_MATRIX.csv`.

At minimum:

1. A user in Las Vegas grants location and sees closer events before farther events.
2. A user denies location and selects Las Vegas manually.
3. Date presets produce correct boundaries.
4. Filters persist after refresh.
5. Two provider records for one show produce one canonical event.
6. A claimed event preserves Tourify copy after refresh.
7. Ticketmaster can be disabled without hiding native events.
8. Bandsintown cannot access an unrelated artist.
9. An approved artist can attach imported dates to a Tourify tour.
10. Provider credentials are absent from client bundles and logs.
11. RLS prevents unauthorized edits.
12. A provider 429 pauses work without a retry storm.
13. A cancelled provider event updates status according to authority rules.
14. A merged event redirects its old URL.
15. Search remains usable without JavaScript location permission.

## Final deliverables

Commit:

- All implementation code.
- Additive migrations.
- Tests and fixtures.
- Updated `.env.example` without real secrets.
- Updated architecture.
- Operations runbook.
- Provider terms checklist.
- Migration rollback/forward-fix instructions.
- Final progress tracker.
- Final test report.
- Screenshots or browser-test evidence for critical flows.
- A concise `FINAL_HANDOFF.md`.

## Final response format

When work is complete, report:

1. Branch name.
2. Commit summary.
3. Completed phases.
4. Migrations added.
5. Routes and major components added or changed.
6. Provider modes enabled.
7. Tests and build results.
8. Security and RLS results.
9. Known blockers.
10. Required environment variables.
11. Deployment steps.
12. Rollback steps.
13. Exact items requiring Tourify business or provider approval.

Do not say “complete” unless every required item is verified or explicitly marked blocked/deferred with evidence.

---
