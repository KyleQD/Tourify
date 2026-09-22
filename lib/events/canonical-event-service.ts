/**
 * lib/events/canonical-event-service.ts
 *
 * Canonical event service (03_TARGET_ARCHITECTURE.md §3). Ingests
 * normalized provider events:
 *   1. upsert source record (idempotent on provider + provider_event_id)
 *   2. match against an existing canonical event (Phase 5 matcher; today:
 *      exact source identity only)
 *   3. create/update the canonical public.events row, preserving native
 *      overrides (field-level authority; native copy is never overwritten
 *      once an owner/native edit exists)
 *   4. upsert ticket offers
 *   5. reindex the discovery projection
 *
 * Server-only, service role. Native Tourify events are never modified by
 * provider sync beyond adding source links.
 */

import "server-only"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { normalizedExternalEventSchema, normalizeTitleKey } from "./providers/schemas"
import type { NormalizedExternalEvent } from "./types"
import { matchCanonicalEvent } from "./event-matcher"

export interface IngestResult {
  eventId: string
  sourceRecordId: string
  created: boolean
  matchedExisting: boolean
}

/**
 * Ingest one normalized external event. Idempotent: re-ingesting the same
 * provider identity updates the source record and canonical row in place.
 */
export async function ingestExternalEvent(rawEvent: NormalizedExternalEvent): Promise<IngestResult> {
  const event = normalizedExternalEventSchema.parse(rawEvent)
  const client = createServiceRoleClient()

  // 1. Existing source record? Then its event is canonical already.
  const { data: existingSource } = await client
    .from("event_external_sources")
    .select("id, event_id, payload_hash")
    .eq("provider", event.provider)
    .eq("provider_event_id", event.providerEventId)
    .maybeSingle()

  let eventId: string | null = existingSource?.event_id ?? null
  let created = false
  let matchedExisting = Boolean(eventId)

  // 2. No source record yet — try to match an existing canonical event.
  if (!eventId) {
    const match = await matchCanonicalEvent(event)
    if (match.eventId) {
      eventId = match.eventId
      matchedExisting = true
    }
  }

  // 3. Create the canonical row if we still have none.
  if (!eventId) {
    eventId = await createCanonicalEvent(client, event)
    created = true
  } else {
    await applyProviderRefresh(client, eventId, event)
  }

  // 4. Upsert the source record.
  const { data: sourceRow, error: sourceError } = await client
    .from("event_external_sources")
    .upsert(
      {
        event_id: eventId,
        provider: event.provider,
        provider_event_id: event.providerEventId,
        source_url: event.sourceUrl,
        provider_status: event.status,
        provider_updated_at: event.providerUpdatedAt,
        last_fetched_at: event.fetchedAt,
        payload_hash: event.rawPayloadHash,
        normalized_payload: minimalPayload(event),
        is_available: true,
        last_error_code: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider,provider_event_id" },
    )
    .select("id")
    .single()
  if (sourceError) throw sourceError

  // 5. Upsert ticket offers (checkout stays on the provider).
  for (const offer of event.ticketOffers) {
    const { error } = await client.from("event_ticket_offers").upsert(
      {
        event_id: eventId,
        source_record_id: sourceRow.id,
        provider: event.provider,
        label: offer.label,
        url: offer.url,
        currency: offer.currency,
        min_price: offer.minPrice,
        max_price: offer.maxPrice,
        sale_start_at: offer.saleStartAt,
        sale_end_at: offer.saleEndAt,
        status: offer.status,
        is_primary: offer.isPrimary,
        last_verified_at: event.fetchedAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id", ignoreDuplicates: false },
    )
    if (error) throw error
  }

  return { eventId, sourceRecordId: sourceRow.id, created, matchedExisting }
}

/** Create a new canonical public.events row from a normalized provider event. */
async function createCanonicalEvent(client: ReturnType<typeof createServiceRoleClient>, event: NormalizedExternalEvent): Promise<string> {
  const slug = await uniqueSlug(client, event.title)
  const { data, error } = await client
    .from("events")
    .insert({
      // Imported events have no owning artist user; ownership arrives via
      // the claims flow (see INTEGRATION_CONFLICTS C8).
      artist_id: null,
      creator_account_type: "organizer",
      name: event.title,
      title: event.title,
      description: event.description,
      event_type: event.classifications.find((c) => c.kind === "segment")?.key ?? "event",
      event_date: event.localDate ?? event.startAt?.slice(0, 10) ?? null,
      start_time: event.localTime ?? event.startAt?.slice(11, 19) ?? null,
      end_time: event.endAt?.slice(11, 19) ?? null,
      venue_name: event.venue?.name ?? null,
      address: event.venue?.address ?? null,
      city: event.venue?.city ?? null,
      state: event.venue?.stateCode ?? null,
      country: event.venue?.countryCode ?? null,
      latitude: event.venue?.latitude ?? null,
      longitude: event.venue?.longitude ?? null,
      genre_tags: event.classifications.filter((c) => c.kind === "genre" || c.kind === "subGenre").map((c) => c.key),
      slug,
      status: event.status === "cancelled" ? "cancelled" : "published",
      is_public: true,
    })
    .select("id")
    .single()
  if (error) throw error
  return data.id
}

/**
 * Refresh provider-controlled fields only. Native/owner-enriched fields
 * (description, genre_tags, title after claim) are never overwritten —
 * authority rules live in source-authority.ts.
 */
async function applyProviderRefresh(
  client: ReturnType<typeof createServiceRoleClient>,
  eventId: string,
  event: NormalizedExternalEvent,
): Promise<void> {
  const { data: overrides } = await client
    .from("event_field_overrides")
    .select("field_path")
    .eq("event_id", eventId)
  const locked = new Set((overrides ?? []).map((o: { field_path: string }) => o.field_path))

  const update: Record<string, unknown> = {}
  // Cancellation is always reconciled from the provider (most trustworthy
  // recent source for lifecycle status).
  if (event.status === "cancelled") update.status = "cancelled"
  if (!locked.has("name") && !locked.has("title")) {
    update.name = event.title
    update.title = event.title
  }
  if (!locked.has("event_date")) update.event_date = event.localDate ?? event.startAt?.slice(0, 10) ?? null
  if (!locked.has("start_time")) update.start_time = event.localTime ?? event.startAt?.slice(11, 19) ?? null
  if (!locked.has("venue_name")) update.venue_name = event.venue?.name ?? null
  if (!locked.has("city")) update.city = event.venue?.city ?? null
  if (!locked.has("state")) update.state = event.venue?.stateCode ?? null
  if (!locked.has("latitude")) update.latitude = event.venue?.latitude ?? null
  if (!locked.has("longitude")) update.longitude = event.venue?.longitude ?? null

  if (Object.keys(update).length > 0) {
    const { error } = await client.from("events").update(update).eq("id", eventId)
    if (error) throw error
  }
}

/** Minimal retention-aware projection; never the unrestricted raw payload. */
function minimalPayload(event: NormalizedExternalEvent) {
  return {
    title: event.title,
    normalizedTitle: normalizeTitleKey(event.title),
    status: event.status,
    startAt: event.startAt,
    localDate: event.localDate,
    localTime: event.localTime,
    timezone: event.timezone,
    venue: event.venue,
    performers: event.performers,
    classifications: event.classifications,
    imageCount: event.images.length,
    bestImageUrl: event.images.find((i) => !i.isFallback)?.url ?? event.images[0]?.url ?? null,
  }
}

async function uniqueSlug(client: ReturnType<typeof createServiceRoleClient>, title: string): Promise<string> {
  const base =
    normalizeTitleKey(title)
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "event"
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 8)}`
    const { data } = await client.from("events").select("id").eq("slug", candidate).maybeSingle()
    if (!data) return candidate
  }
  return `${base}-${Date.now().toString(36)}`
}
