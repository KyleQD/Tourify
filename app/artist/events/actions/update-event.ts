"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { EventWizardMainData } from "../event-wizard/event-wizard-main"
import type { Json } from "@/lib/database.types"

export async function updateEvent(userId: string, eventId: string, data: any) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('events')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', eventId)
    .eq('created_by', userId)

  if (error) {
    throw new Error(`Failed to update event: ${error.message}`)
  }

  revalidatePath('/artist/events')
}

export async function updateEventWithWizardData(userId: string, eventId: string, eventData: EventWizardMainData) {
  const supabase = await createClient()

  // Get current event to check if we need to update the cover image.
  // DB-008: `events.cover_image_url` is not in the active chain; the canonical
  // column on `events` is `poster_url` (DB-006 moves the public event surface to
  // `events_v2`).
  const { data: currentEvent, error: fetchError } = await supabase
    .from('events')
    .select('poster_url')
    .eq('id', eventId)
    .eq('created_by', userId)
    .single()

  if (fetchError) {
    console.error('Error fetching current event:', fetchError)
    throw new Error('Failed to fetch current event')
  }

  // Handle cover image update
  let coverImageUrl = currentEvent.poster_url
  if (eventData.coverImage) {
    // Delete old image if exists
    if (currentEvent.poster_url) {
      const oldFileName = currentEvent.poster_url.split('/').pop()
      await supabase.storage
        .from('event-covers')
        .remove([`${userId}/${oldFileName}`])
    }

    // Upload new image
    const fileExt = eventData.coverImage.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}.${fileExt}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('event-covers')
      .upload(fileName, eventData.coverImage)

    if (uploadError) {
      console.error('Error uploading cover image:', uploadError)
      throw new Error('Failed to upload cover image')
    }

    const { data: { publicUrl } } = supabase.storage
      .from('event-covers')
      .getPublicUrl(fileName)
    coverImageUrl = publicUrl
  }

  // Update event record.
  // DB-008 column map (none of the legacy names exist in the chain or in
  // lib/database.types.ts):
  //   start_date  -> start_at          end_date   -> end_time
  //   venue       -> venue_name        base_price -> ticket_price_min
  //   category    -> event_type        cover_image_url -> poster_url
  //   social_links / ticket_types -> producer_settings (the events JSON document
  //   already read by lib/artist/artist-event-visibility.ts)
  const { data: previous, error: previousError } = await supabase
    .from('events')
    .select('producer_settings')
    .eq('id', eventId)
    .eq('created_by', userId)
    .maybeSingle()

  if (previousError) {
    console.error('Error fetching event producer settings:', previousError)
    throw new Error('Failed to update event')
  }

  const existingProducerSettings =
    previous?.producer_settings && typeof previous.producer_settings === 'object' && !Array.isArray(previous.producer_settings)
      ? (previous.producer_settings as Record<string, Json>)
      : {}

  // `producer_settings` is the events JSON document; social links and ticket
  // types have no dedicated column, so they are merged into it rather than
  // dropped on every wizard save.
  const nextProducerSettings: Json = {
    ...existingProducerSettings,
    social_links: (eventData.socialLinks ?? existingProducerSettings.social_links ?? null) as Json,
    ticket_types: (eventData.ticketTypes ?? existingProducerSettings.ticket_types ?? null) as Json,
  }

  const { data: event, error } = await supabase
    .from('events')
    .update({
      name: eventData.title,
      description: eventData.description,
      start_at: eventData.startDate,
      end_time: eventData.endDate,
      location: eventData.location,
      venue_name: eventData.venue,
      capacity: eventData.capacity,
      ticket_price_min: eventData.price,
      event_type: eventData.category,
      is_public: eventData.isPublic,
      poster_url: coverImageUrl,
      producer_settings: nextProducerSettings,
      updated_at: new Date().toISOString()
    })
    .eq('id', eventId)
    .eq('created_by', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating event:', error)
    throw new Error('Failed to update event')
  }

  revalidatePath('/artist/events')
  return event
}
