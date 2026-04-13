"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createEvent(userId: string, data: any) {
  const supabase = await createClient()
  // Generate unique slug from title
  const base = (data.title || data.name || 'event')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
  const suffix = Math.random().toString(36).slice(2, 8)
  const slug = `${base}-${suffix}`

  const { error } = await supabase
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

  if (error) {
    throw new Error(`Failed to create event: ${error.message}`)
  }

  revalidatePath('/artist/events')
} 