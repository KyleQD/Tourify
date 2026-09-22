# 06 — Database and Supabase Plan

## Migration strategy

Kimi must audit the existing event, venue, artist, organization, ticketing and tour tables before generating SQL.

Use additive migrations only:

- Add nullable columns before backfilling.
- Create new relationship and index tables when safer than changing core tables.
- Add constraints after data validation.
- Use `NOT VALID` constraints where appropriate, then validate.
- Keep compatibility views or adapters when replacing a read path.
- Never reset Supabase.
- Never drop existing event data.
- Run database advisors and security checks.
- Confirm whether new tables are exposed to the Data API; current Supabase behavior may require explicit grants.
- Enable RLS on every new table in an exposed schema.

## Recommended logical model

Names are provisional and must be reconciled with the repository.

### `event_external_sources`

One row per provider event identity.

```text
id uuid primary key
event_id uuid not null references canonical event
provider text not null
provider_event_id text not null
source_url text
provider_status text
provider_updated_at timestamptz
last_fetched_at timestamptz not null
expires_at timestamptz
payload_hash text
normalized_payload jsonb
is_primary boolean default false
is_available boolean default true
last_error_code text
created_at timestamptz
updated_at timestamptz
unique(provider, provider_event_id)
```

`normalized_payload` must be minimal and retention-aware. Do not store unrestricted provider payloads by default.

### `event_ticket_offers`

```text
id uuid primary key
event_id uuid not null
source_record_id uuid
provider text
label text
url text not null
currency text
min_price numeric
max_price numeric
sale_start_at timestamptz
sale_end_at timestamptz
status text
is_primary boolean
affiliate_metadata jsonb
last_verified_at timestamptz
created_at timestamptz
updated_at timestamptz
```

### `event_discovery_index`

Search-optimized canonical projection.

```text
event_id uuid primary key
title text not null
normalized_title text not null
description_excerpt text
start_at timestamptz
end_at timestamptz
timezone text
status text
visibility text
location geography(Point, 4326)
venue_id uuid
venue_name text
city text
state_code text
country_code text
postal_code text
artist_ids uuid[]
category_keys text[]
genre_keys text[]
event_type_keys text[]
is_free boolean
price_min numeric
price_max numeric
currency text
popularity_score double precision
quality_score double precision
source_authority_score double precision
search_document tsvector
indexed_at timestamptz
```

### `event_provider_connections`

```text
id uuid primary key
owner_type text
owner_id uuid
provider text
external_identity text
display_name text
status text
connection_mode text
secret_reference text
scopes text[]
verified_at timestamptz
last_synced_at timestamptz
next_sync_at timestamptz
last_error_code text
created_by uuid
created_at timestamptz
updated_at timestamptz
unique(owner_type, owner_id, provider, external_identity)
```

Do not store raw secrets in `secret_reference`; store a pointer or identifier for the approved secret store.

### `event_sync_jobs`

```text
id uuid primary key
provider text
job_type text
dedupe_key text
payload jsonb
status text
priority integer
attempt_count integer
max_attempts integer
run_after timestamptz
locked_at timestamptz
locked_by text
last_error_code text
last_error_summary text
created_at timestamptz
updated_at timestamptz
unique(dedupe_key) where active
```

### `event_sync_runs`

Operational history:

```text
id uuid primary key
provider text
job_id uuid
started_at timestamptz
finished_at timestamptz
status text
request_count integer
records_received integer
records_created integer
records_updated integer
duplicates_matched integer
merge_candidates_created integer
rate_limit_remaining integer
error_summary text
correlation_id text
```

### `event_merge_candidates`

```text
id uuid primary key
left_event_id uuid
right_event_id uuid
source_record_id uuid
confidence_score numeric
match_reasons jsonb
status text
reviewed_by uuid
reviewed_at timestamptz
created_at timestamptz
```

### `event_claims`

```text
id uuid primary key
event_id uuid
claimant_user_id uuid
claimant_account_type text
claimant_account_id uuid
relationship_type text
evidence jsonb
status text
reviewed_by uuid
reviewed_at timestamptz
created_at timestamptz
updated_at timestamptz
```

### `event_field_overrides`

Optional field-level ownership model:

```text
id uuid primary key
event_id uuid
field_path text
value jsonb
authority_type text
authority_id uuid
locked boolean
created_by uuid
created_at timestamptz
updated_at timestamptz
unique(event_id, field_path)
```

Use only if the current event model cannot safely preserve native overrides another way.

## PostGIS

Enable PostGIS in the approved schema and use:

```sql
geography(Point, 4326)
```

Create a GiST index:

```sql
create index concurrently if not exists event_discovery_index_location_gist
on public.event_discovery_index
using gist (location);
```

The actual extension schema and qualified function names must match the Supabase project.

Important coordinate rule:

```text
POINT(longitude latitude)
```

Do not reverse longitude and latitude.

## Core indexes

- GiST on location.
- B-tree on `start_at`.
- Composite index on `(visibility, status, start_at)`.
- GIN on `search_document`.
- GIN on category and genre arrays if array filtering is selected.
- Unique provider identity index.
- Partial indexes for upcoming visible events.
- Indexes supporting job claiming and retry selection.

Kimi must validate indexes with `EXPLAIN (ANALYZE, BUFFERS)` using representative volumes.

## Nearby search function

Implement a security-invoker database function or parameterized server query that:

- Accepts latitude, longitude, radius, date boundaries and filters.
- Uses `ST_DWithin` for radius filtering.
- Uses the PostGIS nearest-neighbor operator for distance ordering where appropriate.
- Returns computed `distance_meters`.
- Applies visibility and event-status rules.
- Returns a stable cursor.

Conceptual order:

```sql
order by
  location <-> query_point,
  start_at asc,
  quality_score desc,
  event_id asc
```

## Search location persistence

Do not store precise device location automatically.

Possible storage:

- Session-only exact coordinates.
- User-selected city or approximate coordinates.
- Optional saved discovery location with explicit action.
- Unit preference.
- Default radius.

Recommended table or profile extension:

```text
user_event_discovery_preferences
- user_id
- saved_location_label
- saved_location geography(Point, 4326)
- location_precision text
- default_radius_miles
- distance_unit
- updated_at
```

RLS must restrict this record to the user.

## RLS model

### Public read

Public users may read only:

- Published, public canonical events.
- Public ticket links.
- Public source attribution required for display.

### Authenticated write

Users may write only:

- Their own search preferences.
- Their own claims.
- Events and enrichment for accounts they are authorized to manage.

### Service operations

Provider sync writes should use server-side privileged access. Never expose a service-role key to the browser.

### Admin

Admin review access must use Tourify's existing authorization model. Do not derive admin authority from user-editable metadata.

## Views and functions

- Prefer `security_invoker` views.
- Keep privileged functions in a non-exposed schema.
- Revoke default public execute permissions from privileged functions.
- Set a safe `search_path`.
- Add explicit ownership checks.
- Test anon, authenticated, owner, manager and admin roles.

## Backfill

1. Build a read-only audit report.
2. Create nullable structures.
3. Backfill coordinates and normalized fields in batches.
4. Compare old and new query results.
5. Enable dual-read logging if practical.
6. Switch a small feature-flag cohort.
7. Complete backfill.
8. Add validated constraints.
