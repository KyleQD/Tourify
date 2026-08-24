# World Ingestion Operations — v1.0 (P15)

**Status:** ACTIVE · Domain rules: `lib/world/ingestion/operations.ts` · Runner: `scripts/world/ingestion/run-pilot.ts`

## Providers and attribution (T09/T10)

| Provider | Content | Attribution | License class | User-Agent |
|---|---|---|---|---|
| MusicBrainz | artist/place metadata | "MusicBrainz" + recording of source IDs in `world_sources` / candidate provenance | metadata-only, no commercial reuse assumed (`metadata_only` ingestion permission) | `TourifyWorldIngestion/0.1 (https://tourify.app; ingest-contact: kyleqdaley@gmail.com)` |
| Radio Browser | station directory metadata | directory provider id per row; community-contributed data | metadata only; streams never auto-stored (`metadata_only`) | same |

Rules (frozen):
- **Nothing auto-publishes.** Adapters write staging candidates + draft stations only; publication is a governed console action.
- **No raw stream URLs in public payloads or storage** until rights review approves operational records separately.
- Retention: failed/stale candidates may be retired by operators; audit events are retained permanently.
- Rate limiting: shared `RateLimiter` + bounded retries (`RETRY_POLICY`: max 3 attempts, exponential backoff capped at 30s).

## Scheduling policy (T03)

Frozen in `SCHEDULE_POLICY`; never schedule faster than these cadences:

| Provider | identity_refresh | health_refresh |
|---|---|---|
| musicbrainz | 24h | 24h (no station-health concept) |
| radio-browser | 12h | 1h (cheap uptime lookups) |

Health refresh is a separate job kind from identity ingestion (T05) so station uptime checks can run frequently without re-fetching directory identity.

## Kill switches (T07)

Fail-closed by default:
- `WORLD_INGEST_MUSICBRAINZ_ENABLED=true`
- `WORLD_INGEST_RADIO_BROWSER_ENABLED=true`
- `WORLD_INGEST_KILLED=true` — global stop, wins over everything.

The runner refuses to start unless the provider flag (or explicit `WORLD_INGEST_ALLOW_UNSAFE=true`) is set.

## Cursors / watermarks (T02)

Durable state lives in `world_ingestion_cursors` (unique per source_key+job_kind+scope). `advanceCursor` only moves watermarks forward; scheduling decisions (`decideSchedule`) read the watermark plus policy to authorize runs and record the reason on the run row (`schedule_reason`, `job_kind`).

## Failure handling (T04)

Bounded retries with dead-letter summaries (`foldDeadLetter`, `summarizeDeadLetters`). Exhausted records stay reviewable for operator retry — they are never silently dropped and never auto-published.

## Dedupe (T06)

Stable natural key: `provider|entity_kind|external_record_id`, mirrored by the staging table's unique constraint. Fuzzy duplicate checks use `normalizedAliases` (diacritic-folded, suffix-insensitive).

## Running adapters across pilots (T01)

Local isolated stack only (never Demo):

```bash
supabase start -x studio,imgproxy,inbucket,edge-runtime,logflare,vector,storage-api,pooler
supabase db reset   # replays full lineage
export WORLD_DB_URL="postgresql+supabase local url"
export WORLD_SERVICE_KEY="<local service role>"
export WORLD_INGEST_MUSICBRAINZ_ENABLED=true
export WORLD_INGEST_RADIO_BROWSER_ENABLED=true
for pilot in detroit kingston lagos london tokyo; do
  npx tsx scripts/world/ingestion/run-pilot.ts --source musicbrainz --pilot $pilot --limit 5
  npx tsx scripts/world/ingestion/run-pilot.ts --source radio-browser --pilot $pilot --limit 10
done
```

Quality funnel (created/matched/rejected/unresolved + provider failure rate) is visible in the console dashboard and quality page (T08).
