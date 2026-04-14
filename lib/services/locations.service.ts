import { supabase } from '@/lib/supabase'
import type { EventLocationLink, Location } from '@/types/database.types'

export interface ListEventLocationsArgs {
  eventId: string
}

export interface AddEventLocationArgs {
  eventId: string
  locationId: string
  locationType: Location['location_type'] | string
  isPrimary?: boolean
}

export interface RemoveEventLocationArgs {
  eventId: string
  locationId: string
}

export interface CreateLocationArgs {
  locationType: Location['location_type'] | string
  name: string
  address?: string | null
  coordinates?: Record<string, any> | null
  meta?: Record<string, any> | null
}

export async function listEventLocations({ eventId }: ListEventLocationsArgs): Promise<EventLocationLink[]> {
  if (!eventId) return []
  const { data, error } = await supabase
    .from('event_locations')
    .select('*')
    .eq('event_id', eventId)
    .order('is_primary', { ascending: false })

  if (error) throw error
  return data || []
}

export async function addEventLocation({ eventId, locationId, locationType, isPrimary }: AddEventLocationArgs): Promise<EventLocationLink> {
  if (!eventId || !locationId) throw new Error('Missing eventId or locationId')

  if (isPrimary) {
    await supabase
      .from('event_locations')
      .update({ is_primary: false })
      .eq('event_id', eventId)
  }

  const { data, error } = await supabase
    .from('event_locations')
    .insert({
      event_id: eventId,
      location_id: locationId,
      location_type: locationType,
      is_primary: Boolean(isPrimary)
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function removeEventLocation({ eventId, locationId }: RemoveEventLocationArgs): Promise<boolean> {
  if (!eventId || !locationId) return false
  const { error } = await supabase
    .from('event_locations')
    .delete()
    .match({ event_id: eventId, location_id: locationId })

  if (error) throw error
  return true
}

export async function createLocation({ locationType, name, address, coordinates, meta }: CreateLocationArgs): Promise<Location> {
  if (!locationType || !name) throw new Error('Missing required fields')
  const { data, error } = await supabase
    .from('locations')
    .insert({
      location_type: locationType,
      name,
      address: address ?? null,
      coordinates: coordinates ?? null,
      meta: meta ?? null
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}


