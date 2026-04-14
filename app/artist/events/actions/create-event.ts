"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createEvent(userId: string, data: any) {
  const supabase = await createClient()
  const base = (data.title || data.name || 'event')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
  const suffix = Math.random().toString(36).slice(2, 8)
  const slug = `${base}-${suffix}`

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      ...data,
      created_by: userId,
      slug,
      tickets_sold: 0,
      revenue: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select('id, slug')
    .single()

  if (error) {
    throw new Error(`Failed to create event: ${error.message}`)
  }

  if (data.status === 'published' && event?.id) {
    const eventDate = data.event_date || data.start_date || ''
    const location = data.location || data.venue || ''
    const postContent = [
      `New event: "${data.title || data.name}"`,
      eventDate ? `📅 ${eventDate}` : '',
      location ? `📍 ${location}` : '',
      data.description ? `\n${String(data.description).slice(0, 200)}` : '',
    ].filter(Boolean).join(' ')

    await supabase.from('posts').insert({
      user_id: userId,
      content: postContent,
      type: 'event',
      visibility: 'public',
      hashtags: ['event', 'livemusic'],
      metadata: {
        event_id: event.id,
        event_slug: event.slug || slug,
        event_title: data.title || data.name,
        event_date: eventDate,
        event_location: location,
      },
    }).then(({ error: postError }) => {
      if (postError) console.error('Failed to create event feed post:', postError)
    })
  }

  revalidatePath('/artist/events')
} 