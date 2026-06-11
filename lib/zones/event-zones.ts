/**
 * Canonical zone helpers.
 *
 * `event_zones` (migration 20260610000200) is the unified zone entity that shifts,
 * credentials, and incidents reference. The legacy `staff_zones` and `site_map_zones`
 * tables bridge to it via `event_zone_id`.
 *
 * See: docs/domain/live-events-ontology.md §3 (Zones)
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type ZoneCategory = 'operations' | 'physical' | 'access' | 'hybrid'

export type ZoneStatus = 'active' | 'inactive' | 'reserved' | 'maintenance' | 'closed'

export interface EventZone {
  id: string
  event_id: string | null
  venue_id: string | null
  adhoc_venue_id: string | null
  name: string
  description: string | null
  category: ZoneCategory
  zone_type: string | null
  capacity: number | null
  required_staff_count: number
  assigned_staff_count: number
  supervisor_id: string | null
  is_restricted: boolean
  status: ZoneStatus
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface EventZoneScope {
  eventId?: string | null
  venueId?: string | null
  adhocVenueId?: string | null
}

export interface CreateEventZoneInput extends EventZoneScope {
  name: string
  description?: string | null
  category?: ZoneCategory
  zoneType?: string | null
  capacity?: number | null
  requiredStaffCount?: number
  supervisorId?: string | null
  isRestricted?: boolean
  status?: ZoneStatus
  metadata?: Record<string, unknown>
}

const TABLE = 'event_zones'

/** List zones for a given scope (any of event / venue / adhoc venue). */
export async function listEventZones(
  supabase: SupabaseClient,
  scope: EventZoneScope
): Promise<EventZone[]> {
  let query = supabase.from(TABLE).select('*').order('name', { ascending: true })

  if (scope.eventId) query = query.eq('event_id', scope.eventId)
  if (scope.venueId) query = query.eq('venue_id', scope.venueId)
  if (scope.adhocVenueId) query = query.eq('adhoc_venue_id', scope.adhocVenueId)

  const { data, error } = await query
  if (error) throw new Error(`Failed to list event zones: ${error.message}`)
  return (data ?? []) as EventZone[]
}

/** Fetch a single zone by id. Returns null when not found. */
export async function getEventZone(
  supabase: SupabaseClient,
  id: string
): Promise<EventZone | null> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`Failed to load event zone: ${error.message}`)
  return (data as EventZone) ?? null
}

/** Create a canonical zone. Throws a user-friendly error on failure. */
export async function createEventZone(
  supabase: SupabaseClient,
  input: CreateEventZoneInput
): Promise<EventZone> {
  if (!input.name?.trim()) throw new Error('Zone name is required')
  if (!input.eventId && !input.venueId && !input.adhocVenueId) {
    throw new Error('A zone must be scoped to an event or a venue')
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      event_id: input.eventId ?? null,
      venue_id: input.venueId ?? null,
      adhoc_venue_id: input.adhocVenueId ?? null,
      name: input.name.trim(),
      description: input.description ?? null,
      category: input.category ?? 'operations',
      zone_type: input.zoneType ?? null,
      capacity: input.capacity ?? null,
      required_staff_count: input.requiredStaffCount ?? 0,
      supervisor_id: input.supervisorId ?? null,
      is_restricted: input.isRestricted ?? false,
      status: input.status ?? 'active',
      metadata: input.metadata ?? {},
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create event zone: ${error.message}`)
  return data as EventZone
}

/**
 * Find an existing zone by (scope + name) or create it. Useful for migrating the
 * free-text `staff_shifts.zone_assignment` toward a real `zone_id` reference, and
 * for keeping legacy zone writes in sync with the canonical table.
 */
export async function resolveOrCreateEventZone(
  supabase: SupabaseClient,
  input: CreateEventZoneInput
): Promise<EventZone> {
  let query = supabase.from(TABLE).select('*').eq('name', input.name.trim()).limit(1)
  if (input.eventId) query = query.eq('event_id', input.eventId)
  else if (input.venueId) query = query.eq('venue_id', input.venueId)
  else if (input.adhocVenueId) query = query.eq('adhoc_venue_id', input.adhocVenueId)

  const { data } = await query
  if (Array.isArray(data) && data.length > 0) return data[0] as EventZone

  return createEventZone(supabase, input)
}

/** Link a legacy zone row to its canonical event_zone. */
export async function linkLegacyZone(
  supabase: SupabaseClient,
  table: 'staff_zones' | 'site_map_zones',
  legacyZoneId: string,
  eventZoneId: string
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .update({ event_zone_id: eventZoneId })
    .eq('id', legacyZoneId)
  if (error) throw new Error(`Failed to link ${table} row: ${error.message}`)
}
