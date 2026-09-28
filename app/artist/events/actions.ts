'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Event {
  id: string
  name: string
  date: string
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  location: string
  venue?: string
  capacity: number
  tickets_sold: number
  revenue: number
  /**
   * Canonical cover image column. DB-008: `events.cover_image_url` exists in
   * neither the active chain nor `lib/database.types.ts`; `poster_url` is the
   * chain's image column on `events`.
   */
  poster_url?: string
  created_at: string
  updated_at: string
}

export interface EventWizardMainData {
  name: string
  date: string
  location: string
  venue?: string
  capacity: number
  poster_url?: string
}

export async function fetchEvents(userId: string): Promise<Event[]> {
  const supabase = await createClient()
  // Columns are pinned instead of `select('*')` so the dashboard never depends on
  // a relation the active chain does not create (DB-008).
  const { data, error } = await supabase
    .from('events')
    .select('id, name, date, status, location, venue_name, capacity, tickets_sold, revenue, poster_url, created_at, updated_at')
    .eq('created_by', userId)
    .order('date', { ascending: true })
  
  if (error) {
    console.error('Error fetching events:', error)
    return []
  }
  return (data || []).map(row => ({
    id: row.id,
    name: row.name || 'Untitled event',
    date: row.date,
    status: (row.status as Event['status']) || 'draft',
    location: row.location || '',
    venue: row.venue_name ?? undefined,
    capacity: Number(row.capacity) || 0,
    tickets_sold: Number(row.tickets_sold) || 0,
    revenue: Number(row.revenue) || 0,
    poster_url: row.poster_url ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
}

/**
 * Normalize the wizard date into the `events` date/time pair.
 *
 * `events.date` and `events.time` are NOT NULL in the generated contract. The
 * event wizard has no time field, so when the value carries no time component
 * the row gets midnight and `start_time` stays null rather than inventing a
 * show time.
 */
function splitEventDateTime(value: unknown): { date: string; time: string } {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const iso = value.toISOString()
    return { date: iso.slice(0, 10), time: iso.slice(11, 19) }
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      const iso = parsed.toISOString()
      return { date: iso.slice(0, 10), time: iso.slice(11, 19) }
    }
    return { date: value.trim().slice(0, 10), time: '00:00:00' }
  }
  return { date: new Date().toISOString().slice(0, 10), time: '00:00:00' }
}

export async function createEvent(userId: string, data: EventWizardMainData) {
  const supabase = await createClient()
  // DB-008 column map: `venue` -> `venue_name`, `cover_image_url` -> `poster_url`.
  // `title`, `type`, `time` and `artist_id` are NOT NULL in the generated contract
  // even though the active chain only requires `artist_id`.
  const { date, time } = splitEventDateTime(data.date)
  const { error } = await supabase
    .from('events')
    .insert([{
      artist_id: userId,
      title: data.name,
      name: data.name,
      type: 'concert',
      date,
      time,
      location: data.location,
      venue_name: data.venue ?? null,
      capacity: data.capacity,
      poster_url: data.poster_url ?? null,
      created_by: userId,
      status: 'draft',
      updated_at: new Date().toISOString(),
    }])
  
  if (error) throw error
  
  revalidatePath('/artist/events')
}

export async function updateEvent(userId: string, eventId: string, data: EventWizardMainData) {
  const supabase = await createClient()
  // DB-008: `venue` -> `venue_name`, `cover_image_url` -> `poster_url`.
  const { error } = await supabase
    .from('events')
    .update({
      name: data.name,
      date: data.date,
      location: data.location,
      venue_name: data.venue ?? null,
      capacity: data.capacity,
      poster_url: data.poster_url ?? null,
    })
    .eq('id', eventId)
    .eq('created_by', userId)
  
  if (error) throw error
  
  revalidatePath('/artist/events')
}

export async function deleteEvent(userId: string, eventId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)
    .eq('created_by', userId)
  
  if (error) throw error
  
  revalidatePath('/artist/events')
} 