/**
 * Ticket source adapter — read-only.
 *
 * Wraps the existing ticketing domain to surface organization ticket
 * collections inside the marketplace hub. This adapter NEVER writes to
 * ticketing tables and NEVER duplicates inventory.
 *
 * Only active when FEATURE_MARKETPLACE_ORGANIZATION_TICKETS + FEATURE_TICKETING_V2
 * are both enabled.
 *
 * Shape returned matches the PublicListingRow projection so the hub can
 * render ticket items alongside native marketplace listings without a
 * separate rendering path.
 */

import "server-only"
import { isTicketingV2Enabled } from "@/lib/ticketing/feature-flag"
import { isOrganizationTicketsEnabled } from "@/lib/marketplace/feature-flags"

// ---------------------------------------------------------------------------
// Virtual listing shape (mirrors PublicListingRow for hub rendering)
// ---------------------------------------------------------------------------

export interface TicketVirtualListing {
  _source: "ticket_adapter"
  id: string               // ticket_type.id — use for purchase target lookup
  seller_user_id: string   // org user_id
  storefront_id: string | null
  title: string
  description: string | null
  category: "tickets"
  product_type: "ticket"
  listing_kind: "physical"
  service_mode: null
  public_slug: null
  currency: string
  base_price: number | null
  cover_image_url: string | null
  tags: string[]
  featured_rank: null
  created_at: string
  event_id: string | null
  event_name: string | null
  event_date: string | null
  marketplace_listing_variants: Array<{
    id: string
    title: string
    price: number
    inventory_count: number | null
  }>
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

/**
 * Return ticket types from the ticketing domain for a given organization
 * storefront. Returns an empty array when either feature flag is off.
 */
export async function listStorefrontTickets(params: {
  supabase: any
  storeId: string
  organizationUserId: string
  limit?: number
}): Promise<TicketVirtualListing[]> {
  if (!isOrganizationTicketsEnabled() || !isTicketingV2Enabled()) return []

  const { supabase, storeId, organizationUserId, limit = 20 } = params

  // 1. Get ticket collection rows for this store
  const { data: collections } = await supabase
    .from("marketplace_ticket_collections")
    .select("id, event_id, ticket_type_id, display_order, is_featured")
    .eq("store_id", storeId)
    .order("display_order", { ascending: true })
    .limit(limit)

  if (!collections?.length) return []

  const ticketTypeIds = collections
    .map((c: any) => c.ticket_type_id)
    .filter(Boolean) as string[]
  const eventIds = collections
    .map((c: any) => c.event_id)
    .filter(Boolean) as string[]

  // 2. Batch-fetch ticket types
  const ticketTypeMap: Record<string, any> = {}
  if (ticketTypeIds.length) {
    const { data: types } = await supabase
      .from("ticket_types")
      .select("id, name, description, price, currency, quantity_available, quantity_sold, cover_image_url, event_id")
      .in("id", ticketTypeIds)

    for (const t of types ?? []) ticketTypeMap[t.id] = t
  }

  // 3. Batch-fetch events for names/dates
  const eventMap: Record<string, any> = {}
  const allEventIds = [
    ...eventIds,
    ...Object.values(ticketTypeMap).map((t: any) => t.event_id).filter(Boolean),
  ]
  const uniqueEventIds = [...new Set(allEventIds)]
  if (uniqueEventIds.length) {
    const { data: events } = await supabase
      .from("events_v2")
      .select("id, title, start_date, cover_image_url")
      .in("id", uniqueEventIds)

    for (const e of events ?? []) eventMap[e.id] = e
  }

  // 4. Build virtual listings
  return collections.map((col: any) => {
    const tt = ticketTypeMap[col.ticket_type_id] ?? null
    const evtId = col.event_id ?? tt?.event_id ?? null
    const evt = evtId ? eventMap[evtId] : null
    const price = tt ? Number(tt.price ?? 0) : null
    const available = tt
      ? (tt.quantity_available != null
          ? Number(tt.quantity_available) - Number(tt.quantity_sold ?? 0)
          : null)
      : null

    return {
      _source: "ticket_adapter" as const,
      id: col.ticket_type_id ?? col.event_id ?? col.id,
      seller_user_id: organizationUserId,
      storefront_id: storeId,
      title: tt?.name ?? evt?.title ?? "Ticket",
      description: tt?.description ?? null,
      category: "tickets" as const,
      product_type: "ticket" as const,
      listing_kind: "physical" as const,
      service_mode: null,
      public_slug: null,
      currency: tt?.currency ?? "USD",
      base_price: price,
      cover_image_url: tt?.cover_image_url ?? evt?.cover_image_url ?? null,
      tags: [],
      featured_rank: col.is_featured ? 0 : null,
      created_at: new Date().toISOString(),
      event_id: evtId,
      event_name: evt?.title ?? null,
      event_date: evt?.start_date ?? null,
      marketplace_listing_variants: tt
        ? [{ id: tt.id, title: tt.name ?? "Standard", price: price ?? 0, inventory_count: available }]
        : [],
    } satisfies TicketVirtualListing
  })
}
