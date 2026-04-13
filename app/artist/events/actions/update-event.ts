"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { EventWizardMainData } from "../event-wizard/event-wizard-main"

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
  
  // Get current event to check if we need to update the cover image
  const { data: currentEvent, error: fetchError } = await supabase
    .from('events')
    .select('cover_image_url')
    .eq('id', eventId)
    .eq('created_by', userId)
    .single()
  
  if (fetchError) {
    console.error('Error fetching current event:', fetchError)
    throw new Error('Failed to fetch current event')
  }
  
  // Handle cover image update
  let coverImageUrl = currentEvent.cover_image_url
  if (eventData.coverImage) {
    // Delete old image if exists
    if (currentEvent.cover_image_url) {
      const oldFileName = currentEvent.cover_image_url.split('/').pop()
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
  
  // Update event record
  const { data: event, error } = await supabase
    .from('events')
    .update({
      name: eventData.title,
      description: eventData.description,
      start_date: eventData.startDate,
      end_date: eventData.endDate,
      location: eventData.location,
      venue: eventData.venue,
      capacity: eventData.capacity,
      base_price: eventData.price,
      category: eventData.category,
      is_public: eventData.isPublic,
      cover_image_url: coverImageUrl,
      social_links: eventData.socialLinks,
      ticket_types: eventData.ticketTypes,
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